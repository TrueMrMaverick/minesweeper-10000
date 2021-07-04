import {releaseProxy, Remote, wrap} from "comlink";
import {Observable, Subject} from "../subject";
import {appStore} from "../store/store";
import {GenerateMapWorker} from "../workers/mapGenerator";
import {CellValue, isCellValueFlag, isCellValueOpen, isMine, MapCellValue} from "./types/cell";
import {AppStoreEntries} from "../store/types/appStore";
import {Queue} from "../utils/queue";
import {Timer} from "../utils/timer";
import {GameState} from "../store/types/gameState";
import {calculateNeighbours} from "../utils/calculateNeighbours";


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

        if (totalMineCount - 1 >= this.size) {
            const e = new Error();
            e.name = 'TOO_MANY_MINES';
            e.message = 'Map can not be created due to exceeding maximum number of mines';
            throw e;
        }

        this.allocatedBytes = this.size;

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

        this._map
            .fill(CellValue.mine, 0, totalMineCount)
            .fill(CellValue.notDefined, totalMineCount);

        for (let i = 0; i < this.threadsNumber; i++) {
            const worker = new Worker('../workers/mapGenerator', {name: `map-generator-worker-${i}`, type: 'module'});
            const mapGenerator = wrap<GenerateMapWorker>(worker);
            mapGenerator.setMap(this._arrayBuffer);
            this.generators.push(mapGenerator);
            this.generatorsWorkers.push(worker);
        }
    }

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

    async generate() {
        const t0 = performance.now();
        let arr = await Promise.all(this.generators.map((generator, index) => generator.generateMap(index, this.threadsNumber)));
        // this._map.fill(CellValue.notDefined);
        // this._map[8] = CellValue.mine;
        await this.calculateNeighboursInRange({start: 0, end: this._width - 1}, {start: 0, end: this._height - 1});
        const t1 = performance.now();
        console.log(`Map generated in ${t1 - t0} milliseconds.`);

        arr = arr.filter(val => val !== undefined);
        this.emptyCellIndex = arr[Math.floor(Math.random() * (arr.length - 1))];

        this.timer.start();
        this.mineCountSubj.next(this._totalMineCount);
        this.gameState.next(GameState.InGame);
    }

    getCellClickHandler(columnIndex: number, rowIndex: number): () => MapCellValue | undefined {
        return () => {
            if (this.gameState.value !== GameState.InGame) {
                return;
            }

            let cellValue = this.getCellValueXY(columnIndex, rowIndex);

            if (cellValue === undefined || isCellValueOpen(cellValue) || isCellValueFlag(cellValue)) {
                return;
            }

            if (this.firstClick && this.emptyCellIndex && cellValue === CellValue.mine) {
                this.gameState.next(GameState.Refreshing);

                this.setCellValue(this.emptyCellIndex, CellValue.mine);

                this.setCellValueXY(columnIndex, rowIndex, this.calculateNeighbours(columnIndex, rowIndex));

                cellValue = this.getCellValueXY(columnIndex, rowIndex)!;

                [
                    this.getIndex(columnIndex - 1, rowIndex - 1),
                    this.getIndex(columnIndex - 1, rowIndex + 1),
                    this.getIndex(columnIndex + 1, rowIndex - 1),
                    this.getIndex(columnIndex + 1, rowIndex + 1),
                    this.getIndex(columnIndex, rowIndex - 1),
                    this.getIndex(columnIndex, rowIndex + 1),
                    this.getIndex(columnIndex + 1, rowIndex),
                    this.getIndex(columnIndex - 1, rowIndex),
                ].forEach((neighbour) => {
                    if (neighbour === undefined) {
                        return;
                    }

                    let neighbourValue = this.getCellValue(neighbour);

                    if (isMine(neighbourValue)) {
                        return;
                    }

                    this.setCellValue(neighbour, neighbourValue - 1);
                });

                const emptyCellCol = this.emptyCellIndex % this._width;
                const emptyCellRow = (this.emptyCellIndex - emptyCellCol) / this._width;

                [
                    this.getIndex(emptyCellCol - 1, emptyCellRow - 1),
                    this.getIndex(emptyCellCol - 1, emptyCellRow + 1),
                    this.getIndex(emptyCellCol + 1, emptyCellRow - 1),
                    this.getIndex(emptyCellCol + 1, emptyCellRow + 1),
                    this.getIndex(emptyCellCol, emptyCellRow - 1),
                    this.getIndex(emptyCellCol, emptyCellRow + 1),
                    this.getIndex(emptyCellCol + 1, emptyCellRow),
                    this.getIndex(emptyCellCol - 1, emptyCellRow),
                ].forEach((neighbour) => {
                    if (neighbour === undefined) {
                        return;
                    }

                    let neighbourValue = this.getCellValue(neighbour);

                    if (isMine(neighbourValue)) {
                        return;
                    }

                    this.setCellValue(neighbour, neighbourValue + 1);
                });
            }

            this.firstClick = false;

            if (cellValue === CellValue.mine) {
                this.gameState.next(GameState.Lost);
                return;
            }


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

            this.gameState.next(GameState.Refreshing);
            const t0 = performance.now();
            this.chainOpen({columnIndex, rowIndex});
            console.log(`Chain open performed in ${performance.now() - t0}.`);
            this.gameState.next(GameState.InGame);
        }
    }

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

    private calculateNeighbours(columnIndex: number, rowIndex: number) {
        return calculateNeighbours(this._map, columnIndex, rowIndex, this._width, this._height);
    }

    private chainOpen(initiator: { columnIndex: number, rowIndex: number }) {
        this.chainOpenQueue.enqueue(this._height * initiator.rowIndex + initiator.columnIndex);

        while (!this.chainOpenQueue.isEmpty()) {
            const index = this.chainOpenQueue.dequeue();

            if (index === null) {
                break;
            }

            const columnIndex = index % this._width;
            const rowIndex = (index - columnIndex) / this._width;

            let cellValue;
            try {
                cellValue = this.getCellValue(index);
            } catch (e) {
                continue;
            }
            if (cellValue >= 10) {
                continue;
            }

            this.setCellValue(index, cellValue + 10);
            this.cellsLeftToOpen.next(this.cellsLeftToOpen.value - 1);

            if (cellValue !== CellValue.empty) {
                continue;
            }

            [
                this.getIndex(columnIndex - 1, rowIndex - 1),
                this.getIndex(columnIndex - 1, rowIndex + 1),
                this.getIndex(columnIndex + 1, rowIndex - 1),
                this.getIndex(columnIndex + 1, rowIndex + 1),
                this.getIndex(columnIndex, rowIndex - 1),
                this.getIndex(columnIndex, rowIndex + 1),
                this.getIndex(columnIndex + 1, rowIndex),
                this.getIndex(columnIndex - 1, rowIndex),
            ].forEach((neighbour) => {
                if (neighbour !== undefined && this.getCellValue(neighbour) < 10) {
                    this.chainOpenQueue.enqueue(neighbour);
                }
            })
        }
    }
}

