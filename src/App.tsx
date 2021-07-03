import React from 'react';
import './App.scss';
import {Field} from "./components/field/Field";
import {GameMenu} from "./components/gameMenu/GameMenu";
import {StyledEngineProvider} from '@material-ui/core/styles';
import {appStore, useStore, useStoreState} from "./core/store/store";
import {AppStoreEntries} from "./core/store/types/appStore";
import {GameState} from "./core/store/types/gameState";

let storedWidth = localStorage.getItem(AppStoreEntries.width.toString());
let storedHeight = localStorage.getItem(AppStoreEntries.width.toString());
let storedMineCount = localStorage.getItem(AppStoreEntries.width.toString());

appStore
    .register(AppStoreEntries.timer, 0)
    .register(AppStoreEntries.mineCounter, 0)
    .register(AppStoreEntries.gameState, GameState.Pending)
    .register(AppStoreEntries.width, storedWidth !== null ? Number(storedWidth) : 10)
    .register(AppStoreEntries.height, storedHeight !== null ? Number(storedHeight) : 10)
    .register(AppStoreEntries.mineCount, storedMineCount !== null ? Number(storedMineCount) : 25);


function App() {
    const [gameState] = useStoreState<GameState>(AppStoreEntries.gameState);

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
