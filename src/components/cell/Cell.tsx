import React, {CSSProperties} from "react";
import {CellState} from "../../core/minesweeperMap";

export const Cell = React.memo<CellProps>(function Cell({value, style, onClick}) {
    return (
        <div style={{...style, backgroundColor: value === CellState.empty ? 'green' : 'red', border: '1px solid black'}}
             onClick={onClick}/>
    )
});

interface CellProps {
    value: CellState;
    style: CSSProperties;
    onClick: () => void
}
