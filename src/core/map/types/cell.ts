
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

export enum CellValueOpen {
    empty = 10,
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

export enum CellValueFlag {
    empty = 20,
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

export type MapCellValue = CellValue | CellValueOpen | CellValueFlag;

export function isCellValue(val: number): val is CellValue {
    return val < 10;
}

export function isCellValueOpen(val: number): val is CellValueOpen {
    return val >= 10 && val < 20;
}

export function isCellValueFlag(val: number): val is CellValueFlag {
    return val >= 20;
}

export function isMine(val: MapCellValue): boolean {
    return val === CellValue.mine || val === CellValueOpen.mine || val === CellValueFlag.mine;
}
