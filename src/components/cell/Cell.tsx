import React, {Component, CSSProperties} from "react";
import {CellValue, CellValueOpen, isCellValue, isCellValueFlag, isMine, MapCellValue} from "../../core/map/types/cell";
import {GolfCourse} from "@material-ui/icons";
import {GameState} from "../../core/store/types/gameState";
import {MinesweeperMap} from "../../core/map/minesweeperMap";

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

function getCellColor(value: MapCellValue | undefined, gameState: GameState): CellColor {
    if (value === undefined) {
        return CellColor.openEmpty;
    }

    if (gameState === GameState.Lost && isMine(value)) {
        return CellColor.openMine;
    }

    if (isCellValue(value) || isCellValueFlag(value)) {
        return CellColor.closed;
    }

    if (isMine(value)) {
        return CellColor.openMine;
    }

    return CellColor.openEmpty;
}

export class Cell extends Component<CellProps, { value?: MapCellValue }> {

    private readonly onClick: () =>  MapCellValue | undefined;
    private readonly onContextMenu: () =>  MapCellValue | undefined;

    constructor(props: CellProps) {
        super(props);

        const {map, columnIndex, rowIndex} = this.props;

        this.onClick = map.getCellClickHandler(columnIndex, rowIndex);
        this.onContextMenu = map.getCellContextMenuHandler(columnIndex, rowIndex);

        this.state = {
            value: map.getCellValueXY(columnIndex, rowIndex)
        }
    }

    shouldComponentUpdate(nextProps: Readonly<CellProps>, nextState: Readonly<{ value: MapCellValue }>, nextContext: any): boolean {
        // const {gameState, columnIndex, rowIndex} = this.props;
        // console.log(`Cell_${columnIndex}_${rowIndex} game state is ${gameState} next state is ${nextProps.gameState}.`);
        if (nextProps.gameState === GameState.InGame) {
           return  nextState.value !== this.state.value;
        }

        return (nextProps.gameState === GameState.Won || nextProps.gameState === GameState.Lost) && isMine(nextState.value);
    }

    static getDerivedStateFromProps(nextProps: CellProps, prevState: {value: MapCellValue}) {
        const {
            columnIndex,
            rowIndex,
            gameState,
            map
        } = nextProps;
        if (!(gameState === GameState.InGame || gameState === GameState.Won || gameState === GameState.Lost)) {
            return null;
        }

        return {
            value: map.getCellValueXY(columnIndex, rowIndex)
        }
    }


    render() {
        const {
            style,
            columnIndex,
            rowIndex,
            gameState
        } = this.props;

        const {value} = this.state;

            // console.log(`Cell_${columnIndex}_${rowIndex} rendered.`);
        if (value === undefined) {
            return <div style={{...style, backgroundColor: "white"}}/>
        }


        return (
            <div className={`Cell-root`}
                 style={{
                     ...style,
                     backgroundColor: getCellColor(value, gameState)
                 }}
                 onClick={(e) => {
                     const newValue = this.onClick();
                     if (newValue !== undefined && newValue !== value) {
                         this.setState({value: newValue});
                     }
                 }}
                 onContextMenu={(e) => {
                     e.preventDefault();

                     const newValue = this.onContextMenu();
                     if (newValue !== undefined && newValue !== value) {
                         this.setState({value: newValue});
                     }
                 }}>
                {
                    value && (isCellValueFlag(value) || (gameState === GameState.Won && isMine(value)))
                        ? <GolfCourse/>
                        : getCellValue(value)
                }
            </div>
        )
    }
}

// export const Cell = React.memo(function Cell({
//                                                  style,
//                                                  map,
//                                                  columnIndex,
//                                                  rowIndex,
//                                                  gameState
//                                              }: CellProps) {
//     const [value, setValue] = useState<MapCellValue>(() => map.getCellValueXY(columnIndex, rowIndex));
//     const onClick = useMemo(() => map.getCellClickHandler(columnIndex, rowIndex), [map, columnIndex, rowIndex]);
//     const onContextMenu = useMemo(() => map.getCellContextMenuHandler(columnIndex, rowIndex), [columnIndex, map, rowIndex]);
//
//     useEffect(() => {
//         if (gameState === GameState.Refreshing || gameState === GameState.Loading || gameState === GameState.Pending) {
//             return;
//         }
//
//         const newValue = map.getCellValueXY(columnIndex, rowIndex);
//         if (value !== newValue) {
//             setValue(newValue);
//         }
//     }, [gameState]);
//
//     // console.log(`Cell_${columnIndex}_${rowIndex} rendered.`)
//
//     if (value === undefined) {
//         return <div style={{...style, backgroundColor: "white"}}/>
//     }
//
//     return (
//         <div className={`Cell-root`}
//              style={{
//                  ...style,
//                  backgroundColor: getCellColor(value, gameState)
//              }}
//              onClick={(e) => {
//                  const newValue = onClick();
//                  if (newValue !== undefined && newValue !== value) {
//                      setValue(newValue);
//                  }
//              }}
//              onContextMenu={(e) => {
//                  e.preventDefault();
//
//                  const newValue = onContextMenu();
//                  if (newValue !== undefined && newValue !== value) {
//                      setValue(newValue);
//                  }
//              }}>
//             {
//                 value && (isCellValueFlag(value) || (gameState === GameState.Won && isMine(value)))
//                     ? <GolfCourse/>
//                     : getCellValue(value)
//             }
//         </div>
//     )
// });

interface CellProps {
    gameState: GameState;
    style: CSSProperties;
    map: MinesweeperMap;
    columnIndex: number;
    rowIndex: number;
}

