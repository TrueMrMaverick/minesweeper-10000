import React, {useEffect, useState} from "react";
import {MinesweeperMap} from "../../core/map/minesweeperMap";
import {Cell} from "../cell/Cell";
import {AutoSizer, Grid} from "react-virtualized";
import {useStoreState} from "../../core/store/store";
import {AppStoreEntries} from "../../core/store/types/appStore";
import {GameState} from "../../core/store/types/gameState";

export const Field = function Field() {
    const [width] = useStoreState<number>(AppStoreEntries.width);
    const [height] = useStoreState<number>(AppStoreEntries.height);
    const [mineCount] = useStoreState<number>(AppStoreEntries.mineCount);
    const [gameState] = useStoreState<GameState>(AppStoreEntries.gameState);

    const [map, setMap] = useState<MinesweeperMap | undefined>(undefined);

    const [isMapLoading, setIsMapLoading] = useState(true);

    useEffect(() => {
        const map = new MinesweeperMap(width, height, mineCount);
        setMap(map)
        const sub = map.loading$.subscribe((val) => {
            setIsMapLoading(val);
            console.log('Map loading status update: ', val)
        });
        map.generate();
        return () => {
            map.destroy();
            sub.unsubscribe();
        };
    }, [])

    if (!map || isMapLoading || gameState === GameState.Loading) {
        return <></>;
    }

    return (
        <>
            <div>
                <AutoSizer style={{width: '100%', height: 'calc(100vh - 75px)'}}>
                    {
                        ({width: gridWidth, height: gridHeight}) => (
                            <Grid rowCount={height}
                                  columnCount={width}
                                  rowHeight={25}
                                  height={gridHeight}
                                  width={gridWidth}
                                  columnWidth={25}
                                  cellRenderer={({columnIndex, rowIndex, key, style}) => {

                                      const cell = map!.getCell(columnIndex, rowIndex);

                                      return (
                                          <Cell style={style} key={key}
                                                onClick={cell.onClick}
                                                onContextMenu={cell.onContextMenu}
                                                notifier={cell.notifier}
                                          />)
                                  }}
                            />)
                    }
                </AutoSizer>
            </div>
        </>
    );
};
