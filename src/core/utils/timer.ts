import {Subject} from "../subject";

export class Timer {
    private t0: number = performance.now();
    private intervalId?: number;

    constructor(private timerSubject: Subject<number>) {
    }

    get timePassed() {
        return Math.floor((performance.now() - this.t0) / 1000);
    }

    start() {
        this.clear();
        this.t0 = performance.now();


        // @ts-ignore
        this.intervalId = setInterval(() => {
            const timePassed = this.timePassed;
            if (timePassed > 999) {
                return;
            }
            this.timerSubject.next(this.timePassed);
        }, 1000);
    }

    stop() {
        clearInterval(this.intervalId);
    }

    clear() {
        this.timerSubject.next(0);
        clearInterval(this.intervalId);
    }
}
