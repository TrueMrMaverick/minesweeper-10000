import {CellValue} from "../map/types/cell";

export function calculateNeighbours(map: Int8Array, columnIndex: number, rowIndex: number, width: number, height: number): number {

    let counter = 0;

    const index = height * rowIndex + columnIndex;
    const column = columnIndex;
    const row = rowIndex;

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

    if (column !== width - 1) {
        if (row !== 0 && map[index - width + 1] === CellValue.mine) {
            counter++;
        }

        if (row !== height && map[index + width + 1] === CellValue.mine) {
            counter++;
        }
    }

    return counter;
}
