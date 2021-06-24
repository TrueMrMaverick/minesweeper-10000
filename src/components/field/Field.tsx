import React, {useEffect, useState} from "react";
import {MinesweeperMap} from "../../core/minesweeperMap";
import {Cell} from "../cell/Cell";
import {AutoSizer, Grid} from "react-virtualized";

export const Field = React.memo(function Field() {
    const [width, setWidth] = useState(10000);
    const [height, setHeight] = useState(10000)

    const [map, setMap] = useState<MinesweeperMap | undefined>(undefined);


    useEffect(() => {
        MinesweeperMap.generateMap(width, height).then(result => setMap(result));
    }, [height, width])

    if (!map) {
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
                          cellRenderer={({columnIndex, rowIndex, key, style}) => (
                              <Cell style={style} key={key} value={map?.getCellValueXY(columnIndex, rowIndex)}
                                    onClick={() => console.log(`Clicked cell ${key}`)}/>)}/>
                )
            }
        </AutoSizer>
    );
});
