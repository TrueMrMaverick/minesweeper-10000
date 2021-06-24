import * as path from "path";
import {Observable} from "./subject";
import {CellService} from "./cellSubject";
// eslint-disable-next-line import/no-webpack-loader-syntax
import * as mapGeneratorPath from "file-loader?name=[name].js!./workers/mapGenerator";

export class MinesweeperMap {
    private _arrayBuffer?: SharedArrayBuffer;
    private _chunkedArray?: Uint8Array;


    private _width?: number;
    private _height?: number;

    private trailingByteOffset?: number;
    private allocatedBytes?: number;

    get size() {
        return this._width! * this._height!;
    }

    getCellValueXY(columnIndex: number, rowIndex: number) {
        return this.getCellValue(this._height! * rowIndex + columnIndex - 1)
    }

    getCellValue(index: number): CellState;
    getCellValue(index: number): number {
        const offset = index % 8;
        const chunkIndex = (index - offset) / 8;
        const x = this._chunkedArray![chunkIndex];
        const result = (x >> (7 - offset)) & 1;

        return result;
    }

    public static async generateMap(width: number, height: number): Promise<MinesweeperMap> {
        const map = new MinesweeperMap()

        // Set up width and height
        map._width = width;
        map._height = height;

        const size = width * height;

        // Calculating meaningful bits of the last byte
        map.trailingByteOffset = (width * height) % 8;

        // Calculating number of required bytes
        map.allocatedBytes = (size - map.trailingByteOffset) / 8 + 1;

        // Allocating memory
        map._arrayBuffer = new SharedArrayBuffer(map.allocatedBytes);

        // Preparing access point to the map data
        map._chunkedArray = new Uint8Array(map._arrayBuffer);

        // MinesweeperMap generation
        if (window.Worker) {
            const worker = new Worker(mapGeneratorPath);
            worker.postMessage(map._arrayBuffer);

            worker.onmessage = function (e: MessageEvent<{status: string}>) {
                if (e.data.status === 'finished') {
                    console.log('ready')
                }
            }
        } else {
            for (let i = 0; i < map._chunkedArray.length; i++) {
                const num = Math.random() * parseInt('11111111', 2) | 0;
                map._chunkedArray[i] = num;
            }
        }

        // MinesweeperMap generation
        for (let i = 0; i < map._chunkedArray.length; i++) {
            const num = Math.random() * parseInt('11111111', 2) | 0;
            map._chunkedArray[i] = num;
        }

        return map;
    }
}

export enum CellState {
    closed = -2,
    empty,
    mine,
    one,
    two,
    three,
    four,
    five,
    six,
    seven,
    eight
}

function calcHammingWeight(x: number): number {
    x = x - ((x >> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    return ((x + (x >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
}
