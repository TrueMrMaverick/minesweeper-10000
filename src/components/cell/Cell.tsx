import React, {CSSProperties, useEffect, useState} from "react";
import {CellState, CellValue} from "../../core/minesweeperMap";
import {CellService} from "../../core/cellService";
import {Subscription} from "../../core/subject";

export const Cell = React.memo<CellProps>(function Cell({cellService, style}) {
    const [value, setValue] = useState(cellService.cashedValue);
    const [state, setState] = useState(cellService.currentState);

    useEffect(() => {
        let valueSub: Subscription | undefined;
        const sub = cellService.state$.subscribe((state) => {
            valueSub = cellService.value$.subscribe((newValue) => {
                setValue(newValue);
                setState(state);
            })
        })
        return () => {
            sub.unsubscribe();
            valueSub?.unsubscribe();
        }
    }, [cellService.state$, cellService.value$])

    // useEffect(() => {
    //     let sub: Subscription | undefined;
    //     sub = cellService.value$.subscribe((val) => {
    //         // console.log(val);
    //         setValue(val);
    //     });
    //     return () => sub?.unsubscribe();
    // }, [cellService.value$, value])

    return (
        <div style={{...style, backgroundColor: /*state === CellState.closed ? 'gray' :*/ value === CellValue.mine ? 'red' : 'green', border: '1px solid black', textAlign: 'center'}}
             onClick={cellService.handleClick}>
            {
                value !== CellValue.mine ? value : undefined
            }
        </div>
    )
});

interface CellProps {
    cellService: CellService;
    value?: CellValue;
    style: CSSProperties;
    onClick: () => void
}
