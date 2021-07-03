import React, {useState} from 'react';
import {IconButton, Menu, MenuItem, Paper} from "@material-ui/core";
import {MoreVert} from "@material-ui/icons";
import {GameUI} from "../gameUi/GameUI";
import {SettingsDialog} from "../settingsDialog/SettingsDialog";
import {Subject} from "../../core/subject";

export const GameMenu = React.memo<MenuProps>(function GameMenu({className}) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const [dialogOpenSubj] = useState(() => new Subject<boolean>(false));

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    return (
        <Paper className={`Menu-root ${className ?? ''}`}>
            <GameUI className="Menu-inGameUi"/>
            <div className="Menu-optionsMenu">
                <IconButton onClick={handleClick}>
                    <MoreVert />
                </IconButton>
                <Menu anchorEl={anchorEl}
                      open={open}
                      onClose={handleClose}
                      anchorOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                      }}
                      transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                      }}
                >
                    <MenuItem onClick={() => {
                        dialogOpenSubj.next(true)
                        setAnchorEl(null);
                    }}>
                        New Game
                    </MenuItem>
                </Menu>
            </div>
            <SettingsDialog openSubj={dialogOpenSubj}/>
        </Paper>
    )
});

interface MenuProps {
    className?: string;
}
