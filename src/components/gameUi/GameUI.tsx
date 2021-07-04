import React from 'react';
import {ReactComponent as Happy} from "../../assets/happy.svg";
import {ReactComponent as Sad} from "../../assets/sad.svg";
import {ReactComponent as Surprised} from "../../assets/surprised.svg";
import {ReactComponent as Victorious} from "../../assets/victorious.svg";
import {AppStoreEntries} from "../../core/store/types/appStore";
import {useStoreState} from "../../core/store/store";
import {GameState} from "../../core/store/types/gameState";

const Face = React.memo<{ gameState: GameState, onClick: () => void, className: string}>(function Face({gameState, onClick, className}) {
    let Component;

    switch (gameState) {
        case GameState.Pending:
        case GameState.InGame:
            Component = Happy;
            break;
        case GameState.Loading:
        case GameState.Refreshing:
            Component = Surprised;
            break;
        case GameState.Lost:
            Component = Sad;
            break;
        case GameState.Won:
            Component = Victorious;
            break;
    }

    return <Component className={className} onClick={onClick}/>
});

export const GameUI = React.memo<GameUIProps>(function GameUI({className}) {

    const [mineCounter] = useStoreState<number>(AppStoreEntries.mineCounter);
    const [gameState, setGameState] = useStoreState<GameState>(AppStoreEntries.gameState);
    const [timer] = useStoreState<number>(AppStoreEntries.timer);

    return (
        <div className={`GameUI-root ${className ?? ''}`}>
            <div className="GameUI-numberBoxContainer">
                {
                    gameState !== GameState.Pending &&
                    <div className="GameUI-numberBox">
                        {mineCounter}
                    </div>
                }
            </div>
            <Face className="GameUI-face" gameState={gameState} onClick={() => {
                if (gameState === GameState.Loading) {
                    return;
                }
                setGameState(GameState.Pending);
                setGameState(GameState.Loading);
            }}/>
            <div className="GameUI-numberBoxContainer">
                {
                    gameState !== GameState.Pending &&
                    <div className="GameUI-numberBox">
                        {timer}
                    </div>
                }
            </div>
        </div>
    )
});

interface GameUIProps {
    className?: string;
}
