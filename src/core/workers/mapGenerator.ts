import {expose} from "comlink";

enum CellValue {
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
        // const width = this._width;
        // const height = this._height;

        if (column !== 0 && map[index - 1] === CellValue.mine) {
            counter++;
        }

        if (column !== width - 1 && map[index + 1] === CellValue.mine) {
            counter++;
        }

        if (row !== 0 && map[index - width] === CellValue.mine) {
            counter++;
        }

        if (row !== height && map[index + width] === CellValue.mine) {
            counter++;
        }

        if (column !== 0) {
            if (row !== 0 && map[index - width - 1] === CellValue.mine) {
                counter++;
            }

            if (row !== height && map[index + width - 1] === CellValue.mine) {
                counter++;
            }
        }

        if (column !== width) {
            if (row !== 0 && map[index - width + 1] === CellValue.mine) {
                counter++;
            }

            if (row !== height && map[index + width + 1] === CellValue.mine) {
                counter++;
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

        // if (columnIndex !== 0) {
        // }
        //
        // if (columnIndex !== width - 1) {
        // }
        //
        // if (rowIndex !== 0) {
        // }
        //
        // if (rowIndex !== height - 1) {
        // }
        //
        // if (columnIndex !== 0) {
        //     if (rowIndex !== 0) {
        //     }
        //
        //     if (rowIndex !== height - 1) {
        //     }
        // }
        //
        // if (columnIndex !== 0) {
        //     if (rowIndex !== 0) {
        //     }
        //
        //     if (rowIndex !== height - 1) {
        //     }
        // }
        //
        // if (columnIndex !== width - 1) {
        //     if (rowIndex !== 0) {
        //     }
        //
        //     if (rowIndex !== height - 1) {
        //     }
        // }
    },
    generateMap(startingIndex: number, offset: number) {
        if (!this.map) {
            throw new Error('Map is undefined');
        }
        console.log(`Thread with index ${startingIndex} started`);
        let emptyCellIndex: number | undefined;
        const map = this.map;
        // const lockedIndices = new Int32Array(this.lockedIndices);
        for (let i = startingIndex; i < map.length - 2; i += offset) {
            const j = Math.floor(Math.random() * (map.length - i - 1) + i);
            Atomics.store(map, i, Atomics.exchange(map, j, Atomics.load(map, i)));

            if (!emptyCellIndex && Atomics.load(map, i) !== CellValue.mine) {
                emptyCellIndex = i;
            }
            // const exchanged = map[i];
            // map[i] = map[j];
            // map[j] = exchanged;
        }

        return emptyCellIndex;
    },
    // height: 0,
    // setHeight(height: number) {
    //     this.height = height;
    // },
    map: undefined,
    setMap(sharedArray: SharedArrayBuffer) {
        this.map = new Int8Array(sharedArray);
    },
    calculateNeighboursInRange(width: number, height: number, columnRange: { start: number, end: number }, rowRange: { start: number, end: number }, cb: (val: number) => void) {
        for (let columnIndex = columnRange.start; columnIndex < columnRange.end; columnIndex++) {
            for (let rowIndex = rowRange.start; rowIndex < rowRange.end; rowIndex++) {
                const index = height * rowIndex + columnIndex;
                if (Atomics.load(this.map!, index) === CellValue.notDefined) {
                    const neighboursCount = this.calculateNeighbours(columnIndex, rowIndex, width, height);
                    Atomics.store(this.map!, index, neighboursCount);
                    // cb(neighboursCount);
                }
            }
        }
    }

    // lockedIndices: undefined,
    // setLockedIndices(sharedArray: SharedArrayBuffer) {
    //     this.lockedIndices = sharedArray;
    // },
    // shuffleRange(columnRange: {start: number, end: number}, rowRange: {start: number, end: number}) {
    //     if (!this.sharedArray) {
    //         throw new Error('Shared Array is undefined');
    //     }
    //
    //     const map = new Int8Array(this.sharedArray);
    //     for (let i = columnRange.start; i < columnRange.end; i++) {
    //         for (let j = rowRange.start; j < rowRange.end; j++) {
    //             const index = this.height * j + i;
    //             const exchangeIndex = Math.floor(Math.random() * (map.length - index - 1) + index);
    //             const exchanged = map[index];
    //             if (exchanged !== -1) {
    //                 continue;
    //             }
    //             map[index] = map[exchangeIndex];
    //             map[exchangeIndex] = exchanged;
    //         }
    //     }
    // }
};

export interface GenerateMapWorker {
    // height: number;
    map?: Int8Array;

    setMap(sharedArray: SharedArrayBuffer): void;

    calculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number): number;

    recursiveCalculateNeighbours(columnIndex: number, rowIndex: number, width: number, height: number, cb: (key: string) => void): void;

    calculateNeighboursInRange(width: number, height: number, columnRange: { start: number, end: number }, rowRange: { start: number, end: number }, cb: (val: number) => void): void;

    // lockedIndices?: SharedArrayBuffer;
    // setHeight(height: number): void;
    // setLockedIndices(sharedArray: SharedArrayBuffer): void;
    // shuffleRange(columnRange: {start: number, end: number}, rowRange: {start: number, end: number}): void;
    generateMap(startingIndex: number, offset: number): number | undefined
}

expose(exports);

