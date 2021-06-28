import React, {CSSProperties, useEffect, useState} from "react";
import {CellState, CellValue} from "../../core/minesweeperMap";
import {CellService} from "../../core/cellService";
import {Subscription} from "../../core/subject";

export const Cell = function Cell({cellService, style}: CellProps) {
    const [state, setState] = useState(cellService.currentState);
    const {value} = cellService;

    useEffect(() => {
        const sub = cellService.state$.subscribe((state) => {
            setState(state);
        })
        return () => {
            sub.unsubscribe();
        }
    }, [cellService.state$])

    // useEffect(() => {
    //     let sub: Subscription | undefined;
    //     sub = cellService.value$.subscribe((val) => {
    //         // console.log(val);
    //         setValue(val);
    //     });
    //     return () => sub?.unsubscribe();
    // }, [cellService.value$, value])

    return (
        <div style={{...style, backgroundColor: state === CellState.closed ? 'gray' : value === CellValue.mine ? 'red' : 'green', border: '1px solid black', textAlign: 'center'}}
             onClick={cellService.handleClick}>
            {
                value !== CellValue.mine ? value : undefined
            }
        </div>
    )
};

interface CellProps {
    cellService: CellService;
    value?: CellValue;
    style: CSSProperties;
}
