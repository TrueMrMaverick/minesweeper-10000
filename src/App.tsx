import React, {useEffect, useState} from 'react';
import './App.scss';
import {Field} from "./components/field/Field";
import {GameMenu} from "./components/gameMenu/GameMenu";
import {StyledEngineProvider} from '@material-ui/core/styles';
import {appStore, useStoreState} from "./core/store/store";
import {AppStoreEntries} from "./core/store/types/appStore";
import {GameState} from "./core/store/types/gameState";
import {LocalStorage} from "./core/utils/localStorage";
import {defaultMapOptions} from "./core/store/types/mapOptions";
import {Subject} from "./core/subject";


appStore
    .register(AppStoreEntries.timer, 0)
    .register(AppStoreEntries.mineCounter, 0)
    .register(AppStoreEntries.gameState, GameState.Pending)
    .register(AppStoreEntries.mapOptions, LocalStorage.getMapOptions() ?? defaultMapOptions);


function App() {
    const [gameState] = useStoreState<GameState>(AppStoreEntries.gameState);
    const [renderField, setRenderField] = useState<boolean>(false);
    useEffect(() => {
        const sub = (appStore.getSubject(AppStoreEntries.gameState) as Subject<GameState>)
            .subscribe(gameState => {
                const isPending = gameState === GameState.Pending;
                if (renderField !== isPending) {
                    setRenderField(isPending);
                }
            })

        return () => sub.unsubscribe();
    }, []);

    return (
        <StyledEngineProvider injectFirst>
            <GameMenu/>
            {
                gameState !== GameState.Pending && <Field/>
            }
        </StyledEngineProvider>
    );
}

export default App;
