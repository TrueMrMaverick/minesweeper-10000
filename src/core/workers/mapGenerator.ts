import {expose} from "comlink";
import {CellValue} from "../map/types/cell";

const exports: GenerateMapWorker = {
    calculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number): number {
        if (!this.map) {
            throw new Error('Map is undefined');
        }

        const map = this.map;

        let counter = 0;

        const index = height * rowIndex + columnIndex;
        const column = columnIndex;
        const row = rowIndex;

        // const checkedIndex = 2;

        if (column !== 0 && map[index - 1] === CellValue.mine) {
            counter++;
            // if (index === checkedIndex) {
            //     console.log('left')
            // }
        }

        if (column !== width - 1 && map[index + 1] === CellValue.mine) {
            counter++;
            // if (index === checkedIndex) {
            //     console.log('right')
            // }
        }

        if (row !== 0 && map[index - width] === CellValue.mine) {
            counter++;
            // if (index === checkedIndex) {
            //     console.log('top')
            // }
        }

        if (row !== height && map[index + width] === CellValue.mine) {
            counter++;
            // if (index === checkedIndex) {
            //     console.log('bottom');
            // }
        }

        if (column !== 0) {
            if (row !== 0 && map[index - width - 1] === CellValue.mine) {
                counter++;
                // if (index === checkedIndex) {
                //     console.log('left-top')
                // }
            }

            if (row !== height && map[index + width - 1] === CellValue.mine) {
                counter++;

                // if (index === checkedIndex) {
                //     console.log('left-bottom')
                // }
            }
        }

        if (column !== width - 1) {
            if (row !== 0 && map[index - width + 1] === CellValue.mine) {
                counter++;

                // if (index === checkedIndex) {
                //     console.log('right-top')
                // }
            }

            if (row !== height && map[index + width + 1] === CellValue.mine) {
                counter++;

                // if (index === checkedIndex) {
                //     console.log('right-bottom')
                // }
            }
        }

        return counter;
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
        // const lockedIndices = new Int32Array(this.lockedIndices);
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
    }
};

export interface GenerateMapWorker {
    map?: Int8Array;

    setMap(sharedArray: SharedArrayBuffer): void;

    calculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number): number;

    recursiveCalculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number, cb: (key: string) => void): void;

    calculateNeighboursInRange(width: number, height: number, columnRange: { start: number, end: number }, rowRange: { start: number, end: number }, offset: number, cb?: (columnIndex: number, rowIndex: number) => Promise<void>): void;

    generateMap(startingIndex: number, offset: number): number | undefined
}

expose(exports);

