// eslint-disable-next-line import/no-webpack-loader-syntax
import {proxy, releaseProxy, Remote, wrap} from "comlink";
import {CellService} from "./cellService";
import {Observable, Subject} from "./subject";
import {GenerateMapWorker} from "./workers/mapGenerator";
import {Stack} from "./unils/stack";


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

    private loadingSubj = new Subject(true);

    get loading$(): Observable<boolean> {
        return this.loadingSubj;
    }

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
            .fill(CellValue.mine, 0, mineCount)
            .fill(CellValue.notDefined, mineCount);

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
        this.loadingSubj.next(true);
        const t0 = performance.now();
        let arr = await Promise.all(this.generators.map((generator, index) => generator.generateMap(index, this.threadsNumber)));
        await this.calculateNeighboursInRange({start: 0, end: this._width - 1}, {start: 0, end: this._height - 1});
        const t1 = performance.now();
        console.log(`Map generated in ${t1 - t0} milliseconds.`);

        arr = arr.filter(val => val !== undefined);
        this.emptyCellIndex = arr[Math.floor(Math.random() * (arr.length - 1))];

        this.loadingSubj.next(false);
    }

    getCell(columnIndex: number, rowIndex: number): CellService {

        if (this.cashedCells.has(`${columnIndex}_${rowIndex}`)) {
            return this.cashedCells.get(`${columnIndex}_${rowIndex}`)!;
        }

        const value = this.getCellValueXY(columnIndex, rowIndex);

        const cellService = new CellService(value, columnIndex, rowIndex, this._height * rowIndex + columnIndex, async () => {

            const cellValue = this.getCellValueXY(columnIndex, rowIndex);

            if (this.firstClick && this.emptyCellIndex && cellValue === CellValue.mine) {
                const i = this._height * rowIndex + columnIndex;
                Atomics.store(this._chunkedArray, i, Atomics.exchange(this._chunkedArray, this.emptyCellIndex, Atomics.load(this._chunkedArray, i)));
            }

            this.firstClick = false;

            this.chainOpen(cellService);
        });

        this.cashedCells.set(`${columnIndex}_${rowIndex}`, cellService);

        return cellService;
    }

    private chainOpen(initiator: CellService) {
        const stack = new Stack<CellService>();
        stack.push(initiator);

        while (!stack.isEmpty()) {
            const cellService = stack.pop();
            // console.log('Current stack size: ', stack.size);
            if (!cellService) {
                break;
            }
            const {index, columnIndex, rowIndex, currentState} = cellService;
            if (currentState === CellState.open) {
                continue;
            }
            const cellValue = this.getCellValue(index);
            cellService.updateAndOpen(cellValue);
            if (cellValue !== CellValue.empty) {
                continue;
            }

            [
                this.cashedCells.get(`${columnIndex - 1}_${rowIndex}`),
                this.cashedCells.get(`${columnIndex + 1}_${rowIndex}`),
                this.cashedCells.get(`${columnIndex}_${rowIndex - 1}`),
                this.cashedCells.get(`${columnIndex}_${rowIndex + 1}`),
                this.cashedCells.get(`${columnIndex - 1}_${rowIndex - 1}`),
                this.cashedCells.get(`${columnIndex - 1}_${rowIndex + 1}`),
                this.cashedCells.get(`${columnIndex + 1}_${rowIndex - 1}`),
                this.cashedCells.get(`${columnIndex + 1}_${rowIndex + 1}`),
            ].forEach((neighbour) => {
                if (neighbour) {
                    stack.push(neighbour);
                }
            })
        }

        console.log('Chain open finished');
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
        const t0 = performance.now();
        await Promise.all(
            this.generators.map((generator, index) => {
                return generator.calculateNeighboursInRange(
                    this._width,
                    this._height,
                    columnRange,
                    rowRange,
                    index,
                    // proxy(async (columnIndex, rowIndex) => {
                    //     const cellService = this.cashedCells.get(`${columnIndex}_${rowIndex}`);
                    //     if (!cellService) {
                    //         return;
                    //     }
                    // })
                )
            })
        );
        const t1 = performance.now();
        console.log(`Range calculated in ${t1 - t0}`);
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
    mine,
}
