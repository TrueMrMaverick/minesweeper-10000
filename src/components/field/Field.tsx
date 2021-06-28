import React, {useEffect, useState} from "react";
import {MinesweeperMap} from "../../core/minesweeperMap";
import {Cell} from "../cell/Cell";
import {AutoSizer, Grid} from "react-virtualized";

export const Field = React.memo(function Field() {
    const [width, setWidth] = useState(100);
    const [height, setHeight] = useState(100);
    const [mineCount, setMineCount] = useState(50);

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

    if (!map || isMapLoading) {
        return <></>;
    }

    return (
        <>
            <div style={{width: '100%', height: '75px', backgroundColor: 'black'}}>
                Header
            </div>
            <div>
                <AutoSizer style={{width: '100%', height: 'calc(100vh - 40px)'}}>
                    {
                        ({width: gridWidth, height: gridHeight}) => (
                            <Grid rowCount={height}
                                  columnCount={width}
                                  rowHeight={25}
                                  height={gridHeight}
                                  width={gridWidth}
                                  columnWidth={25}
                                  onSectionRendered={({columnStartIndex, columnStopIndex, rowStartIndex, rowStopIndex}) => {
                                      // map?.calculateNeighboursInRange(
                                      //     {start: columnStartIndex, end: columnStopIndex},
                                      //     {start: rowStartIndex, end: rowStopIndex}
                                      // )
                                  }}
                                  cellRenderer={({columnIndex, rowIndex, key, style}) => {

                                      const cell = map?.getCell(columnIndex, rowIndex);

                                      return (
                                          <Cell style={style} key={key} cellService={cell}/>)
                                  }}
                            />)
                    }
                </AutoSizer>
            </div>
        </>
    );
});
