import {CellValue} from "../map/types/cell";

export function calculateNeighbours(map: Int8Array, columnIndex: number, rowIndex: number, width: number, height: number): number {

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
}
