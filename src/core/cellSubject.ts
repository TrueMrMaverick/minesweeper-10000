import {Observable, Subject} from "./subject";
import {CellState} from "./minesweeperMap";

export class CellService {

    private readonly stateSubject: Subject<CellState>;

    constructor(private openValue: Promise<CellState>) {
        this.stateSubject = new Subject<CellState>(CellState.closed);
    }
}
