import React, {useEffect, useRef, useState} from "react";
import {MinesweeperMap} from "../../core/map/minesweeperMap";
import {Cell} from "../cell/Cell";
import {AutoSizer, Grid} from "react-virtualized";
import {appStore} from "../../core/store/store";
import {AppStoreEntries} from "../../core/store/types/appStore";
import {MapOptions} from "../../core/store/types/mapOptions";
import {Subject, Subscription} from "../../core/subject";
import {GameState} from "../../core/store/types/gameState";

export const Field = React.memo(function Field() {
    const [mapOptions, setMapOptions] = useState<MapOptions | undefined>();
    const [map, setMap] = useState<MinesweeperMap | undefined>(undefined);
    const [isMapLoading, setIsMapLoading] = useState(true);

    useEffect(() => {
        let mapLoadingSub: Subscription | undefined;
        let newMap: MinesweeperMap | undefined;
        const sub = (appStore.getSubject(AppStoreEntries.mapOptions) as Subject<MapOptions>).subscribe(newOptions => {

            const {width, height, mineCount} = newOptions;
            newMap?.destroy();
            newMap = new MinesweeperMap(width, height, mineCount);
            setMap(newMap)
            mapLoadingSub = newMap.loading$.subscribe((val) => {
                setIsMapLoading(val);
                setMapOptions(newOptions);
                console.log('Map loading status update: ', val)
            });
            newMap.generate();
        })

        return () => {
            sub.unsubscribe();
            mapLoadingSub?.unsubscribe();
            newMap?.destroy();
        }
    }, []);

    const [gameState, setGameState] = useState(appStore.getValue(AppStoreEntries.gameState) as GameState);
    const gridRef = useRef<Grid>();
    useEffect(() => {
        const sub = (appStore.getSubject(AppStoreEntries.gameState) as Subject<GameState>)
            .subscribe(newGameState => {
                console.log('New game state: ', newGameState);
                if (!gridRef.current || gameState === newGameState) {
                    return;
                }

                // if (newGameState === GameState.Refreshing || newGameState === GameState.InGame || newGameState === GameState.Won || newGameState === GameState.Lost) {
                //     gridRef.current.forceUpdate();
                // }

                setGameState(newGameState);
            });

        return () => sub.unsubscribe();
    }, [])

    if (!map || isMapLoading || !mapOptions) {
        return <></>;
    }

    console.log('Grid rendered');
    const {width, height} = mapOptions;

    return (
        <>
            <div>
                <AutoSizer style={{width: '100%', height: 'calc(100vh - 75px)'}}>
                    {
                        ({width: gridWidth, height: gridHeight}) => (<>
                            {/* @ts-ignore */}
                            <Grid ref={gridRef}
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
});
