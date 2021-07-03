import React, {CSSProperties} from "react";
import {
    CellValue,
    CellValueFlag,
    CellValueOpen,
    isCellValue,
    isCellValueFlag,
    isMine,
    MapCellValue
} from "../../core/map/types/cell";
import {Subject, useSubject} from "../../core/subject";
import {GolfCourse} from "@material-ui/icons";
import {useStoreState} from "../../core/store/store";
import {AppStoreEntries} from "../../core/store/types/appStore";
import {GameState} from "../../core/store/types/gameState";

enum CellColor {
    closed = 'gray',
    openMine = 'red',
    openEmpty = 'white'
}

function getCellValue(value: CellValue | CellValueOpen | undefined): CellValue | undefined {
    if (!value || isCellValue(value)) {
        return value;
    }

    if (value === CellValueOpen.mine || value === CellValueOpen.empty) {
        return;
    }

    return value - 10;
}

function getCellColor(value: MapCellValue): CellColor {
    if (isCellValue(value) || isCellValueFlag(value)) {
        return CellColor.closed;
    }

    if (isMine(value)) {
        return CellColor.openMine;
    }

    return CellColor.openEmpty;
}

export const Cell = function Cell({style, onClick, notifier, onContextMenu}: CellProps) {
    const [value] = useSubject(notifier);
    const [gameState] = useStoreState<GameState>(AppStoreEntries.gameState);

    return (
        <div className={`Cell-root`}
             style={{
                 ...style,
                 backgroundColor: getCellColor(value),
                 border: '1px solid black',
                 textAlign: 'center'
             }}
             onClick={onClick}
             onContextMenu={(e) => {
                 e.preventDefault();

                 onContextMenu()
             }}>
            {
                isCellValueFlag(value) || (gameState === GameState.Won && isMine(value))
                    ? <GolfCourse/>
                    : getCellValue(value)
            }
        </div>
    )
};

interface CellProps {
    value?: CellValue | CellValueOpen;
    notifier: Subject<CellValue | CellValueOpen>;
    onClick: () => void;
    onContextMenu: () => void;
    style: CSSProperties;
}

