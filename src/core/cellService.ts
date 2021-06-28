import {Observable, Subject} from "./subject";
import {CellState, CellValue} from "./minesweeperMap";

export class CellService {

    private readonly stateSubj: Subject<CellState>;
    private handlingClick: boolean = false;

    constructor(private _value: CellValue, public columnIndex: number, public rowIndex: number, public index: number, private mapHandleClick: () => Promise<void>) {
        this.stateSubj = new Subject<CellState>(CellState.closed);

        this.handleClick = this.handleClick.bind(this);
    }

    get state$(): Observable<CellState> {
        return this.stateSubj;
    }

    get value(): CellValue {
        return this._value;
    }

    get currentState(): CellState {
        return this.stateSubj.currentValue;
    }

    updateAndOpen(value: CellValue) {
        this._value = value;
        this.open();
    }

    open() {
        this.stateSubj.next(CellState.open);
    }

    handleClick() {
        // if (this.handlingClick || this.stateSubj.currentValue === CellState.open) {
        //     return;
        // }

        this.mapHandleClick();
    }
}

export {};
