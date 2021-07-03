import React, {ChangeEvent, useEffect, useState} from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from "@material-ui/core";
import {Subject, useSubject} from "../../core/subject";
import {AppStoreEntries} from "../../core/store/types/appStore";
import {useStoreState} from "../../core/store/store";
import {GameState} from "../../core/store/types/gameState";

export const SettingsDialog = React.memo<SettingsDialogProps>(function SettingsDialog({className, openSubj}) {
    const [open, setOpen] = useSubject(openSubj);

    const [widthState, setWidthState] = useStoreState<number>(AppStoreEntries.width);
    const [heightState, setHeightState] = useStoreState<number>(AppStoreEntries.height);
    const [mineCountState, setMineCountState] = useStoreState<number>(AppStoreEntries.mineCount);
    const [gameState, setGameState] = useStoreState<GameState>(AppStoreEntries.gameState)

    const [width, setWidth] = useState(widthState.toString());
    const [widthErrors, setWidthErrors] = useState<Array<string>>([]);
    const [height, setHeight] = useState(heightState.toString());
    const [heightErrors, setHeightErrors] = useState<Array<string>>([]);
    const [mineCount, setMineCount] = useState(mineCountState.toString());
    const [mineCountErrors, setMineCountErrors] = useState<Array<string>>([]);

    const [size, setSize] = useState(Number(width) * Number(height));
    useEffect(() => {
        setSize(Number(width) * Number(height));
    }, [width, height])

    function handleWidthChange(e: ChangeEvent<HTMLInputElement>) {
        let rawValue = e.target.value;

        if (!rawValue) {
            setWidthErrors(['This field is required']);
            setWidth(rawValue);
            return;
        }


        rawValue = rawValue.replace(/^[\d]]/g, '');
        setWidth(rawValue);

        const value = Number(rawValue);
        const errors: Array<string> = [];

        if (value < 1) {
            errors.push('Width should be greater then 1');
        } else if (value > 10000) {
            errors.push('Width should be lesser then 10000');
        }

        setWidthErrors(errors);
    }

    function handleHeightChange(e: ChangeEvent<HTMLInputElement>) {
        let rawValue = e.target.value;

        if (!rawValue) {
            setHeightErrors(['This field is required']);
            setHeight(rawValue);
            return;
        }

        rawValue = rawValue.replace(/^[\d]]/g, '');
        setHeight(rawValue);

        const value = Number(rawValue);
        const errors: Array<string> = [];

        if (value < 1) {
            errors.push('Height should be greater then 1');
        } else if (value > 10000) {
            errors.push('Height should be lesser then 10000');
        }

        setHeightErrors(errors);
    }

    function handleMineCountChange(e: ChangeEvent<HTMLInputElement>) {
        let rawValue = e.target.value;

        if (!rawValue) {
            setMineCountErrors(['This field is required']);
            setMineCount(rawValue);
            return;
        }

        rawValue = rawValue.replace(/^[\d]]/g, '');
        setMineCount(rawValue);

        const value = Number(rawValue);
        const errors: Array<string> = [];

        if (value < 1) {
            errors.push('There should be at least 1 mine :)');
        } else if (value >= size) {
            errors.push('Number of mines should be lesser then total size minus 1');
        }

        setMineCountErrors(errors);
    }

    function handleCancel() {
        setOpen(false);
    }

    function handleSubmit() {
        if (!!widthErrors.length || !!heightErrors.length || !!mineCountErrors.length) {
            return;
        }
        setWidthState(Number(width));
        localStorage.setItem(AppStoreEntries.width.toString(), width);
        setHeightState(Number(height));
        localStorage.setItem(AppStoreEntries.height.toString(), height);
        setMineCountState(Number(mineCount));
        localStorage.setItem(AppStoreEntries.mineCount.toString(), mineCount);

        setOpen(false);
        if (gameState !== GameState.Pending) {
            setGameState(GameState.Pending);
        }
        setGameState(GameState.Loading);
    }


    return (
        <Dialog open={open} className="SettingsDialog-root" onClose={handleCancel}>
            <DialogTitle>Minesweeper Game Settings</DialogTitle>
            <DialogContent className="SettingsDialog-content">
                <TextField label="Width"
                           className="SettingsDialog-textField"
                           value={width}
                           onChange={handleWidthChange}
                           error={!!widthErrors.length}
                           helperText={widthErrors[0] ?? undefined}/>
                <TextField label="Height" className="SettingsDialog-textField"
                           value={height}
                           onChange={handleHeightChange}
                           error={!!heightErrors.length}
                           helperText={heightErrors[0] ?? undefined}/>
                <TextField label="Mines"
                           className="SettingsDialog-textField"
                           value={mineCount}
                           onChange={handleMineCountChange}
                           error={!!mineCountErrors.length}
                           helperText={mineCountErrors[0] ?? undefined}/>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>
                    Cancel
                </Button>
                <Button disabled={!!widthErrors.length || !!heightErrors.length || !!mineCountErrors.length}
                        onClick={handleSubmit}>
                    Start
                </Button>
            </DialogActions>
        </Dialog>
    )
});

interface SettingsDialogProps {
    className?: string;
    openSubj: Subject<boolean>
}
