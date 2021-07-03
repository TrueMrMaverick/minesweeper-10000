import {Subject} from "./subject";

export interface CellService {
    notifier: Subject<number>,
    onClick: () => void,
    onContextMenu: () => void
}

