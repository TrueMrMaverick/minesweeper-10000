import React, {useEffect, useState} from "react";
import {MinesweeperMap} from "../../core/map/minesweeperMap";
import {Cell} from "../cell/Cell";
import {AutoSizer, Grid} from "react-virtualized";
import {appStore} from "../../core/store/store";
import {AppStoreEntries} from "../../core/store/types/appStore";
import {MapOptions} from "../../core/store/types/mapOptions";
import {Subject} from "../../core/subject";
import {GameState} from "../../core/store/types/gameState";

export const Field = /*React.memo(*/function Field() {
    const [mapOptions, setMapOptions] = useState<MapOptions | undefined>();
    const [map, setMap] = useState<MinesweeperMap | undefined>(undefined);
    const [gameState, setGameState] = useState(appStore.getValue(AppStoreEntries.gameState) as GameState);

    useEffect(() => {
        const gameStateSub = (appStore.getSubject(AppStoreEntries.gameState) as Subject<GameState>).subscribe(newGameState => {
            setGameState(newGameState);
        })

        return () => {
            gameStateSub.unsubscribe();
        }
    }, []);

    useEffect(() => {
        let newMap: MinesweeperMap | undefined;

        if (gameState === GameState.Loading) {
            map?.destroy();
            setMap(undefined);
            const sub = (appStore.getSubject(AppStoreEntries.mapOptions) as Subject<MapOptions>).subscribe(newOptions => {
                sub.unsubscribe();

                const {width, height, mineCount} = newOptions;
                map?.destroy();
                newMap = new MinesweeperMap(width, height, mineCount);
                setMap(newMap)
                setMapOptions(newOptions);
                newMap.generate();
            })
        }
    }, [gameState])

    if (!map  || !mapOptions || gameState === GameState.Loading) {
        return <></>;
    }

    const {width, height} = mapOptions;
    return (
        <>
            <div>
                <AutoSizer style={{width: '100%', height: 'calc(100vh - 75px)'}}>
                    {
                        ({width: gridWidth, height: gridHeight}) => (<>
                            <Grid
                                rowCount={height}
                                columnCount={width}
                                rowHeight={25}
                                height={gridHeight}
                                width={gridWidth}
                                columnWidth={25}
                                cellRenderer={({columnIndex, rowIndex, key, style}) => {
                                    return (
                                        <Cell style={style}
                                              key={key}
                                              gameState={gameState}
                                              map={map!}
                                              columnIndex={columnIndex}
                                              rowIndex={rowIndex}
                                        />)
                                }}
                            />
                        </>)
                    }
                </AutoSizer>
            </div>
        </>
    );
}/*)*/;
