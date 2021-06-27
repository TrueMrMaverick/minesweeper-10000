// eslint-disable-next-line import/no-webpack-loader-syntax
import {proxy, releaseProxy, Remote, wrap} from "comlink";
import {CellService} from "./cellService";
import {Subject} from "./subject";
import {GenerateMapWorker} from "./workers/mapGenerator";


export class MinesweeperMap {
    private readonly _arrayBuffer: SharedArrayBuffer;
    private readonly _chunkedArray: Int8Array;

    private readonly cashedCells = new Map<string, CellService>();

    private readonly _width: number;
    private readonly _height: number;

    private readonly _totalMineCount: number;

    private readonly allocatedBytes: number;

    private readonly generators = new Array<Remote<GenerateMapWorker>>();

    private firstClick: boolean = true;
    private emptyCellIndex?: number;

    constructor(width: number, height: number, mineCount: number, private threadsNumber = 4) {
        this._width = width;
        this._height = height;
        this._totalMineCount = mineCount;

        const size = width * height;

        if (mineCount - 1 >= size) {
            const e = new Error();
            e.name = 'TOO_MANY_MINES';
            e.message = 'Map can not be created due to exceeding maximum number of mines';
            throw e;
        }

        this.allocatedBytes = size;

        // Allocating memory
        this._arrayBuffer = new SharedArrayBuffer(this.allocatedBytes);


        // Preparing access point to the map data
        this._chunkedArray = new Int8Array(this._arrayBuffer);

        this._chunkedArray
            .fill(10, 0, mineCount)
            .fill(-1, mineCount);

        for (let i = 0; i < this.threadsNumber; i++) {
            const worker = new Worker('./workers/mapGenerator', {name: `map-generator-worker-${i}`, type: 'module'});
            const mapGenerator = wrap<GenerateMapWorker>(worker);
            mapGenerator.setMap(this._arrayBuffer);
            this.generators.push(mapGenerator);
        }
    }

    get size() {
        return this._width! * this._height!;
    }

    destroy() {
        this.generators.forEach(generator => generator[releaseProxy]())
    }

    async generate() {
        const t0 = performance.now();
        let arr = await Promise.all(this.generators.map((generator, index) => generator.generateMap(index, this.threadsNumber)));
        const t1 = performance.now();
        console.log(`Map generated in ${t1 - t0} milliseconds.`);

        arr = arr.filter(val => val !== undefined);
        this.emptyCellIndex = arr[Math.floor(Math.random() * (arr.length - 1))];

        // TODO: remove
        this.cashedCells.forEach((cashedCell, key) => {
            const [columnIndex, rowIndex] = key.split('_').map(val => +val);
            (cashedCell.value$ as Subject<CellValue>).next(this.getCellValueXY(columnIndex, rowIndex))
        })
    }

    getCell(columnIndex: number, rowIndex: number): CellService {

        if (this.cashedCells.has(`${columnIndex}_${rowIndex}`)) {
            return this.cashedCells.get(`${columnIndex}_${rowIndex}`)!;
        }

        const value = this.getCellValueXY(columnIndex, rowIndex);
        const valueSubj = new Subject(value);

        const cellService = new CellService(valueSubj, columnIndex, rowIndex, this._height * rowIndex + columnIndex, async () => {

            if (this.firstClick && this.emptyCellIndex && this.getCellValueXY(columnIndex, rowIndex) === CellValue.mine) {
                const i = this._height * rowIndex + columnIndex;
                Atomics.store(this._chunkedArray, i, Atomics.exchange(this._chunkedArray, this.emptyCellIndex, Atomics.load(this._chunkedArray, i)));
                // TODO: remove
                const cI = this.emptyCellIndex % this._height;
                const rI = (this.emptyCellIndex - cI) / this._height;
                const exchangeCellService = this.cashedCells.get(`${cI}_${rI}`);
                if (!exchangeCellService) {
                    return;
                }
                (exchangeCellService.value$ as Subject<CellValue>).next(this.getCellValue(this.emptyCellIndex));
            }

            this.firstClick = false;

            const coveredCells = new Set<string>();

            await this.handleCellClick(coveredCells, columnIndex, rowIndex);

            coveredCells.forEach((key) => {

                const cellService = this.cashedCells.get(key);
                if (!cellService) {
                    return;
                }

                (cellService.value$ as Subject<CellValue>).next(this.getCellValueXY(cellService.columnIndex, cellService.rowIndex));
                (cellService.state$ as Subject<CellState>).next(CellState.open);
            })
        });

        this.cashedCells.set(`${columnIndex}_${rowIndex}`, cellService);

        return cellService;
    }

    async handleCellClick(coveredCells: Set<string>, columnIndex: number, rowIndex: number, initial = false) {
        const currentValue = this.getCellValueXY(columnIndex, rowIndex);

        if (currentValue !== CellValue.notDefined) {
            return;
        }

        coveredCells.add(`${columnIndex}_${rowIndex}`);

        const neighboursCount = await this.calculateNeighbours(columnIndex, rowIndex);
        this.setCellValueXY(columnIndex, rowIndex, neighboursCount);

        if (neighboursCount !== CellValue.empty) {
            return;
        }

        const cb = proxy((value: string) => coveredCells.add(value));

        const taskGetter = (condition: boolean) => (cI: number, rI: number) => async (generator: Remote<GenerateMapWorker>) => {
            if (condition) {
                await generator.recursiveCalculateNeighbours(cI, rI, this._width, this._height, cb);
            }
        }

        const tasks = [
            taskGetter(columnIndex !== 0)(columnIndex - 1, rowIndex),
            taskGetter(columnIndex !== this._width - 1)(columnIndex + 1, rowIndex),
            taskGetter(rowIndex !== 0)(columnIndex, rowIndex - 1),
            taskGetter(rowIndex !== this._height - 1)(columnIndex, rowIndex + 1),
            taskGetter(columnIndex !== 0 && rowIndex !== 0)(columnIndex - 1, rowIndex - 1),
            taskGetter(columnIndex !== 0 && rowIndex !== this._height - 1)(columnIndex - 1, rowIndex + 1),
            taskGetter(columnIndex !== this._width - 1 && rowIndex !== 0)(columnIndex + 1, rowIndex - 1),
            taskGetter(columnIndex !== this._width - 1 && rowIndex !== this._height - 1)(columnIndex + 1, rowIndex + 1),
        ];

        function callTask(generator: Remote<GenerateMapWorker>) {
            return new Promise<void>(async (resolve) => {
                if (tasks.length === 0) {
                    resolve();
                    return;
                }
                await tasks.shift()!(generator);
                await callTask(generator)
                resolve();
            });

        }

        await Promise.all([this.generators[0]].map(callTask));
    }

    getCellValueXY(columnIndex: number, rowIndex: number) {
        return this.getCellValue(this._height * rowIndex + columnIndex);
    }

    setCellValueXY(columnIndex: number, rowIndex: number, value: CellValue) {
        return this.setCellValue(this._height * rowIndex + columnIndex, value);
    }

    setCellValue(index: number, value: CellValue) {
        Atomics.store(this._chunkedArray, index, value);
    }

    getCellValue(index: number): CellValue;

    getCellValue(index: number): number {
        return Atomics.load(this._chunkedArray, index);
    }

    async calculateNeighboursInRange(columnRange: { start: number, end: number }, rowRange: { start: number, end: number }) {
        await this.generators[0].calculateNeighboursInRange(this._width, this._height, columnRange, rowRange, proxy(() => {

        }));
    }

    private async calculateNeighbours(columnIndex: number, rowIndex: number): Promise<CellValue> {
        const map = this._chunkedArray;

        let counter = 0;

        const index = this._height * rowIndex + columnIndex;
        const column = columnIndex;
        const row = rowIndex;
        const width = this._width;
        const height = this._height;

        if (column !== 0 && map[index - 1] === 10) {
            counter++;
        }

        if (column !== width - 1 && map[index + 1] === 10) {
            counter++;
        }

        if (row !== 0 && map[index - width] === 10) {
            counter++;
        }

        if (row !== height && map[index + width] === 10) {
            counter++;
        }

        if (column !== 0) {
            if (row !== 0 && map[index - width - 1] === 10) {
                counter++;
            }

            if (row !== height && map[index + width - 1] === 10) {
                counter++;
            }
        }

        if (column !== width) {
            if (row !== 0 && map[index - width + 1] === 10) {
                counter++;
            }

            if (row !== height && map[index + width + 1] === 10) {
                counter++;
            }
        }

        return counter;
    }
}

export enum CellState {
    closed,
    open
}

export enum CellValue {
    notDefined = -1,
    empty = 0,
    one,
    two,
    three,
    four,
    five,
    six,
    seven,
    eight,
    mine = 10,
}
