import {expose} from "comlink";
import {CellValue} from "../map/types/cell";
import {calculateNeighbours} from "../utils/calculateNeighbours";
import {Queue} from "../utils/queue";

const exports: GenerateMapWorker = {
    calculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number): number {
        if (!this.map) {
            throw new Error('Map is undefined');
        }

        return calculateNeighbours(this.map, columnIndex, rowIndex, width, height);
    },
    recursiveCalculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number, cb: (key: string) => void) {
        if (!this.map) {
            throw new Error('Map is undefined');
        }

        if (columnIndex < 0 || rowIndex < 0 || columnIndex >= width || rowIndex >= height) {
            return;
        }

        const index = height * rowIndex + columnIndex;
        let currentValue: CellValue;
        try {
            currentValue = Atomics.load(this.map, index);
        } catch (e) {
            return;
        }

        if (currentValue !== CellValue.notDefined) {
            return;
        }

        cb(`${columnIndex}_${rowIndex}`);

        const neighboursCount = this.calculateNeighbours(columnIndex, rowIndex, width, height);

        Atomics.store(this.map, index, neighboursCount);

        if (neighboursCount !== CellValue.empty) {
            return;
        }

        this.recursiveCalculateNeighbours(columnIndex - 1, rowIndex, width, height, cb);
        this.recursiveCalculateNeighbours(columnIndex + 1, rowIndex, width, height, cb);
        this.recursiveCalculateNeighbours(columnIndex, rowIndex - 1, width, height, cb);
        this.recursiveCalculateNeighbours(columnIndex, rowIndex + 1, width, height, cb);
        this.recursiveCalculateNeighbours(columnIndex - 1, rowIndex - 1, width, height, cb);
        this.recursiveCalculateNeighbours(columnIndex - 1, rowIndex + 1, width, height, cb);
        this.recursiveCalculateNeighbours(columnIndex + 1, rowIndex - 1, width, height, cb);
        this.recursiveCalculateNeighbours(columnIndex + 1, rowIndex + 1, width, height, cb);
    },
    generateMap(startingIndex: number, offset: number) {
        if (!this.map) {
            throw new Error('Map is undefined');
        }
        // eslint-disable-next-line no-restricted-globals
        console.log(`Thread ${self.name} stated map generation`);
        let emptyCellIndex: number | undefined;
        const map = this.map;
        for (let i = startingIndex; i < map.length - 2; i += offset) {
            const j = Math.floor(Math.random() * (map.length - i - 1) + i);
            Atomics.store(map, i, Atomics.exchange(map, j, Atomics.load(map, i)));

            if (!emptyCellIndex && Atomics.load(map, i) !== CellValue.mine) {
                emptyCellIndex = i;
            }
        }

        // eslint-disable-next-line no-restricted-globals
        console.log(`Thread ${self.name} finished map generation`);
        return emptyCellIndex;
    },
    map: undefined,
    setMap(sharedArray: SharedArrayBuffer) {
        this.map = new Int8Array(sharedArray);
    },
    calculateNeighboursInRange(
        width: number,
        height: number,
        columnRange: { start: number, end: number },
        rowRange: { start: number, end: number },
        offset: number,
        cb: (columnIndex: number, rowIndex: number) => Promise<void>
    ) {
        // eslint-disable-next-line no-restricted-globals
        console.log(`Thread ${self.name} stated neighbour calculation.`);
        for (let columnIndex = columnRange.start; columnIndex <= columnRange.end; columnIndex += 1 + offset) {
            for (let rowIndex = rowRange.start; rowIndex <= rowRange.end; rowIndex++) {
                const index = height * rowIndex + columnIndex;
                if (Atomics.load(this.map!, index) === CellValue.notDefined) {
                    const neighboursCount = this.calculateNeighbours(columnIndex, rowIndex, width, height);
                    Atomics.store(this.map!, index, neighboursCount);
                    if (cb) {
                        cb(columnIndex, rowIndex);
                    }
                }
            }
        }
    },
    chainOpen(width: number, height: number, columnIndex: number, rowIndex: number): number {
        if (!this.map) {
            throw new Error('Map is undefined');
        }

        // eslint-disable-next-line no-restricted-globals
        console.log(`Thread ${self.name} stated chainOpen calculation.`);
        const chainOpenQueue = new Queue<number>();

        function getIndex(columnIndex: number, rowIndex: number) {
            if (columnIndex < 0 || columnIndex >= width) {
                return undefined;
            }
            if (rowIndex < 0 || rowIndex >= height) {
                return undefined;
            }

            return height * rowIndex + columnIndex;
        }

        chainOpenQueue.enqueue(getIndex(columnIndex, rowIndex)!);

        let openedCellsCounter = 0;

        while (!chainOpenQueue.isEmpty()) {
            const index = chainOpenQueue.dequeue();

            if (index === null) {
                break;
            }

            const columnIndex = index % width;
            const rowIndex = (index - columnIndex) / width;

            let cellValue;
            try {
                cellValue = Atomics.load(this.map, index);
            } catch (e) {
                continue;
            }
            if (cellValue >= 10) {
                continue;
            }

            Atomics.store(this.map, index, cellValue + 10);
            openedCellsCounter++;

            if (cellValue !== CellValue.empty) {
                continue;
            }

            [
                getIndex(columnIndex - 1, rowIndex - 1),
                getIndex(columnIndex - 1, rowIndex + 1),
                getIndex(columnIndex + 1, rowIndex - 1),
                getIndex(columnIndex + 1, rowIndex + 1),
                getIndex(columnIndex, rowIndex - 1),
                getIndex(columnIndex, rowIndex + 1),
                getIndex(columnIndex + 1, rowIndex),
                getIndex(columnIndex - 1, rowIndex),
            ]
                .forEach((neighbour) => {
                    if (neighbour !== undefined && Atomics.load(this.map!, neighbour) < 10) {
                        chainOpenQueue.enqueue(neighbour);
                    }
                })
        }

        // eslint-disable-next-line no-restricted-globals
        console.log(`Thread ${self.name} finished chainOpen calculation and opened: ${openedCellsCounter}`);

        return openedCellsCounter;
    }
};

export interface GenerateMapWorker {
    map?: Int8Array;

    setMap(sharedArray: SharedArrayBuffer): void;

    calculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number): number;

    recursiveCalculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number, cb: (key: string) => void): void;

    calculateNeighboursInRange(width: number, height: number, columnRange: { start: number, end: number }, rowRange: { start: number, end: number }, offset: number, cb?: (columnIndex: number, rowIndex: number) => Promise<void>): void;

    generateMap(startingIndex: number, offset: number): number | undefined;

    chainOpen(width: number, height: number, columnIndex: number, rowIndex: number): number;
}

expose(exports);

