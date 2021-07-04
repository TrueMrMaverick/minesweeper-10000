import {releaseProxy, Remote, wrap} from "comlink";
import {Subject} from "../subject";
import {appStore} from "../store/store";
import {GenerateMapWorker} from "../workers/mapGenerator";
import {CellValue, isCellValueFlag, isCellValueOpen, isMine, MapCellValue} from "./types/cell";
import {AppStoreEntries} from "../store/types/appStore";
import {Queue} from "../utils/queue";
import {Timer} from "../utils/timer";
import {GameState} from "../store/types/gameState";
import {calculateNeighbours} from "../utils/calculateNeighbours";

/**
 * Class that handles map creation and handling of user's action with map.
 */
export class MinesweeperMap {
    public readonly size: number;
    private readonly _arrayBuffer: SharedArrayBuffer;

    private readonly _map: Int8Array;
    private readonly _width: number;
    private readonly _height: number;
    private readonly _totalMineCount: number;
    private readonly allocatedBytes: number;
    private readonly generators = new Array<Remote<GenerateMapWorker>>();
    private readonly generatorsWorkers = new Array<Worker>();
    private readonly timer: Timer = new Timer(appStore.getSubject(AppStoreEntries.timer));
    private readonly chainOpenQueue = new Queue<number>();
    private readonly mineCountSubj = appStore.getSubject<number>(AppStoreEntries.mineCounter);
    private readonly gameState = appStore.getSubject<GameState>(AppStoreEntries.gameState);
    private readonly cellsLeftToOpen: Subject<number>;
    private firstClick: boolean = true;
    private emptyCellIndex?: number;

    private destroyed = false;

    constructor(width: number, height: number, totalMineCount: number, private threadsNumber = 4) {
        this._width = width;
        this._height = height;
        this._totalMineCount = totalMineCount;

        this.size = width * height;

        this.allocatedBytes = this.size;

        // Handling victory condition
        this.cellsLeftToOpen = new Subject(this.size - this._totalMineCount);
        this.cellsLeftToOpen.subscribe(val => {
            if (val !== 0) {
                return;
            }
            this.gameState.next(GameState.Won);
            this.mineCountSubj.next(0);
            this.timer.stop()
        });

        // Allocating memory
        this._arrayBuffer = new SharedArrayBuffer(this.allocatedBytes);

        // Preparing access point to the map data
        this._map = new Int8Array(this._arrayBuffer);

        // Filling map with empty values
        this._map
            .fill(CellValue.mine, 0, totalMineCount)
            .fill(CellValue.notDefined, totalMineCount);

        // Initializing workers
        for (let i = 0; i < this.threadsNumber; i++) {
            const worker = new Worker('../workers/mapGenerator', {name: `map-generator-worker-${i}`, type: 'module'});
            const mapGenerator = wrap<GenerateMapWorker>(worker);
            mapGenerator.setMap(this._arrayBuffer);
            this.generators.push(mapGenerator);
            this.generatorsWorkers.push(worker);
        }
    }

    /**
     * Destroys map.
     */
    destroy() {
        if (this.destroyed) {
            return;
        }

        this.generators.forEach(generator => generator[releaseProxy]());
        this.generatorsWorkers.forEach(worker => worker.terminate());
        this.timer.clear();
        this.mineCountSubj.next(0);

        this.destroyed = true;
    }

    /**
     * Generates map using workers to perform it in plural threads.
     */
    async generate() {
        const t0 = performance.now();
        // Init generation
        let arr = await Promise.all(this.generators.map((generator, index) => generator.generateMap(index, this.threadsNumber)));

        // Saving index of random empty cell to make the first user click to be safe
        arr = arr.filter(val => val !== undefined);
        this.emptyCellIndex = arr[Math.floor(Math.random() * (arr.length - 1))];

        if (this.emptyCellIndex === undefined && this._map[this._map.length - 1] === CellValue.notDefined) {
            this.emptyCellIndex = this._map.length - 1;
        }

        // Perform calculation of neighbours for each cell
        // This action is quite heavy and takes a bit long, but I decided to do it this way instead of performing it 'on the fly' to save time on user clicks checks.
        await this.calculateNeighboursInRange({start: 0, end: this._width - 1}, {start: 0, end: this._height - 1});
        const t1 = performance.now();
        console.log(`Map generated in ${t1 - t0} milliseconds.`);

        // Initializing timer
        this.timer.start();
        this.mineCountSubj.next(this._totalMineCount);
        this.gameState.next(GameState.InGame);
    }

    /**
     * Returns left click handler for the cell
     * @param columnIndex
     * @param rowIndex
     */
    getCellClickHandler(columnIndex: number, rowIndex: number): () => MapCellValue | undefined {
        return () => {
            // If there something going on already we skip this action
            if (this.gameState.value !== GameState.InGame) {
                return;
            }

            let cellValue = this.getCellValueXY(columnIndex, rowIndex);

            if (cellValue === undefined || isCellValueOpen(cellValue) || isCellValueFlag(cellValue)) {
                return;
            }

            if (this.firstClick && cellValue === CellValue.mine) {
                cellValue = this.handleMineFirstClick(columnIndex, rowIndex, cellValue);
            }

            this.firstClick = false;

            // Handle loose
            if (cellValue === CellValue.mine) {
                this.timer.stop();
                this.gameState.next(GameState.Lost);
                return;
            }

            // Handle simple open
            if (cellValue !== CellValue.empty) {
                const newCellValue = cellValue + 10;
                this.setCellValueXY(columnIndex, rowIndex, newCellValue);
                this.cellsLeftToOpen.next(this.cellsLeftToOpen.value - 1);
                // @ts-ignore
                if (this.gameState.value === GameState.Refreshing) {
                    this.gameState.next(GameState.InGame)
                }
                return newCellValue;
            }

            // Handle chain open id click was performed on empty cell
            this.gameState.next(GameState.Refreshing);
            const t0 = performance.now();
            this.chainOpen({columnIndex, rowIndex}).then((openedCells) => {
                this.cellsLeftToOpen.next(this.cellsLeftToOpen.value - openedCells);
                console.log(`Chain open performed in ${performance.now() - t0}.`);
                this.gameState.next(GameState.InGame);
            });
        }
    }

    /**
     * Returns right click handler for the cell
     * @param columnIndex
     * @param rowIndex
     */
    getCellContextMenuHandler(columnIndex: number, rowIndex: number): () => MapCellValue | undefined {
        return () => {
            if (this.gameState.value !== GameState.InGame) {
                return;
            }

            const cellValue = this.getCellValueXY(columnIndex, rowIndex);
            if (cellValue === undefined || isCellValueOpen(cellValue)) {
                return;
            }

            let newCellValue;

            if (isCellValueFlag(cellValue)) {
                if (this.mineCountSubj.value === this._totalMineCount) {
                    return;
                }
                newCellValue = cellValue - 20;
                this.setCellValueXY(columnIndex, rowIndex, newCellValue);
                this.mineCountSubj.next(this.mineCountSubj.value + 1);
            } else {
                if (this.mineCountSubj.value === 0) {
                    return;
                }
                newCellValue = cellValue + 20;
                this.setCellValueXY(columnIndex, rowIndex, newCellValue);
                this.mineCountSubj.next(this.mineCountSubj.value - 1);
            }

            return newCellValue;
        };
    }

    /**
     * Returns index of the cell or undefined if there is no such cell
     * @param columnIndex
     * @param rowIndex
     */
    getIndex(columnIndex: number, rowIndex: number) {
        if (columnIndex < 0 || columnIndex >= this._width) {
            return undefined;
        }
        if (rowIndex < 0 || rowIndex >= this._height) {
            return undefined;
        }
        return this._height * rowIndex + columnIndex;
    }

    getCellValueXY(columnIndex: number, rowIndex: number) {
        if (columnIndex === undefined || rowIndex === undefined) {
            return undefined;
        }

        return this.getCellValue(this._height * rowIndex + columnIndex);
    }

    setCellValueXY(columnIndex: number, rowIndex: number, value: MapCellValue) {
        return this.setCellValue(this._height * rowIndex + columnIndex, value);
    }

    setCellValue(index: number, value: MapCellValue) {
        Atomics.store(this._map, index, value);
    }

    getCellValue(index: number): MapCellValue {
        return Atomics.load(this._map, index);
    }

    /**
     * Performs neighbour calculation in provided range.
     * @param columnRange
     * @param rowRange
     */
    async calculateNeighboursInRange(columnRange: { start: number, end: number }, rowRange: { start: number, end: number }) {
        const t0 = performance.now();
        await Promise.all(
            this.generators.map((generator, index) => {
                return generator.calculateNeighboursInRange(
                    this._width,
                    this._height,
                    columnRange,
                    rowRange,
                    index
                )
            })
        );
        const t1 = performance.now();
        console.log(`Range calculated in ${t1 - t0}`);
    }

    /**
     * Handle the first click on the map if it was mine click.
     * @param columnIndex
     * @param rowIndex
     * @param cellValue
     * @private
     */
    private handleMineFirstClick(columnIndex: number, rowIndex: number, cellValue: MapCellValue): MapCellValue {
        if (!this.emptyCellIndex) {
            return cellValue;
        }
        this.gameState.next(GameState.Refreshing);

        // Update clicked cell
        this.setCellValue(this.emptyCellIndex, CellValue.mine);

        this.setCellValueXY(columnIndex, rowIndex, this.calculateNeighbours(columnIndex, rowIndex));

        cellValue = this.getCellValueXY(columnIndex, rowIndex)!;

        this.getCellNeighbours(columnIndex, rowIndex)
            .forEach((neighbour) => {
                if (neighbour === undefined) {
                    return;
                }

                let neighbourValue = this.getCellValue(neighbour);

                if (isMine(neighbourValue)) {
                    return;
                }

                this.setCellValue(neighbour, neighbourValue - 1);
            });

        // Update previously empty cell
        const emptyCellCol = this.emptyCellIndex % this._width;
        const emptyCellRow = (this.emptyCellIndex - emptyCellCol) / this._width;

        this.getCellNeighbours(emptyCellCol, emptyCellRow)
            .forEach((neighbour) => {
                if (neighbour === undefined) {
                    return;
                }

                let neighbourValue = this.getCellValue(neighbour);

                if (isMine(neighbourValue)) {
                    return;
                }

                this.setCellValue(neighbour, neighbourValue + 1);
            });
        return cellValue;
    }

    /**
     * Calculate cell neighbours.
     * @param columnIndex
     * @param rowIndex
     * @private
     */
    private calculateNeighbours(columnIndex: number, rowIndex: number) {
        return calculateNeighbours(this._map, columnIndex, rowIndex, this._width, this._height);
    }

    /**
     * Handle chain open of the empty cells.
     *
     * NOTE: This method uses breadth-first search to perform opening. It might be improved with multi-threading but due to lack of locks
     * in JS Atomics I was not able to implement this quickly.
     * @param initiator
     * @private
     */
    private async chainOpen(initiator: { columnIndex: number, rowIndex: number }): Promise<number> {
        const index = this.getIndex(initiator.columnIndex, initiator.rowIndex)!;

        const columnIndex = index % this._width;
        const rowIndex = (index - columnIndex) / this._width;

        let cellValue;
        try {
            cellValue = this.getCellValue(index);
        } catch (e) {
            return 1;
        }
        if (cellValue >= 10) {
            return 1;
        }

        this.setCellValue(index, cellValue + 10);

        if (cellValue !== CellValue.empty) {
            return 0;
        }

        const neighbours = this.getCellNeighbours(columnIndex, rowIndex).filter(neighbour => neighbour !== undefined) as Array<number>;

        return (await Promise.all(neighbours.map((neighbour, neighbourIndex) => {
            const generatorIndex = neighbourIndex % this.threadsNumber;
            const columnIndex = neighbour % this._width;
            const rowIndex = (neighbour - columnIndex) / this._width;

            return this.generators[generatorIndex].chainOpen(this._width, this._height, columnIndex, rowIndex)
        }))).reduce((acc, val) => acc + val) + 1;
    }

    /**
     * Returns indexes of the provided cell neighbours.
     * @param columnIndex
     * @param rowIndex
     * @private
     */
    private getCellNeighbours(columnIndex: number, rowIndex: number) {
        return [
            this.getIndex(columnIndex - 1, rowIndex - 1),
            this.getIndex(columnIndex - 1, rowIndex + 1),
            this.getIndex(columnIndex + 1, rowIndex - 1),
            this.getIndex(columnIndex + 1, rowIndex + 1),
            this.getIndex(columnIndex, rowIndex - 1),
            this.getIndex(columnIndex, rowIndex + 1),
            this.getIndex(columnIndex + 1, rowIndex),
            this.getIndex(columnIndex - 1, rowIndex),
        ]
    }
}

