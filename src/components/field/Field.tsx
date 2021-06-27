import React, {useEffect, useState} from "react";
import {MinesweeperMap} from "../../core/minesweeperMap";
import {Cell} from "../cell/Cell";
import {AutoSizer, Grid} from "react-virtualized";

export const Field = React.memo(function Field() {
    const [width, setWidth] = useState(50);
    const [height, setHeight] = useState(50);
    const [mineCount, setMineCount] = useState(15 * 15);

    const [map, setMap] = useState<MinesweeperMap | undefined>(undefined);
    const [isMapReady, setIsMapReady] = useState(false)


    useEffect(() => {
        const map = new MinesweeperMap(width, height, mineCount);
        setMap(map)
        map.generate().then(() => setIsMapReady(true))
        return () => map.destroy();
    }, [])

    if (!map || !isMapReady) {
        return <></>;
    }

    return (
        <AutoSizer style={{width: '100%', height: '100vh'}}>
            {
                ({width: gridWidth, height: gridHeight}) => (
                    <Grid rowCount={height}
                          columnCount={width}
                          rowHeight={25}
                          height={gridHeight}
                          width={gridWidth}
                          columnWidth={25}
                          onSectionRendered={({columnStartIndex, columnStopIndex, rowStartIndex, rowStopIndex}) => {
                              map?.calculateNeighboursInRange(
                                  {start: columnStartIndex, end: columnStopIndex},
                                  {start: rowStartIndex, end: rowStopIndex}
                              )
                              // console.log('onSectionRendered column: ', columnStartIndex, columnStopIndex);
                              // console.log('onSectionRendered row: ', rowStartIndex, rowStopIndex);
                          }}
                          cellRenderer={({columnIndex, rowIndex, key, style}) => {

                              const cell = map?.getCell(columnIndex, rowIndex);

                              return (
                                  <Cell style={style} key={key} cellService={cell}
                                        onClick={() => console.log(`Clicked cell ${key}`)}/>)
                          }}
                    />)
            }
        </AutoSizer>
    );
});
