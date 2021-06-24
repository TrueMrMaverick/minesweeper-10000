export class Subject<T> implements Observable<T> {
    private subscribers = new Map<number, (val: T) => void>();
    private nextSubIndex = 0;

    constructor(private value: T) {
    }

    next(value: T): void {
        this.value = value;
        this.subscribers.forEach((notifier) => notifier(this.value));
    }

    complete() {
        this.subscribers.clear();
    }

    subscribe(next: (val: T) => void): Subscription {
        const index = this.nextSubIndex;
        this.nextSubIndex += 1;
        this.subscribers.set(index, next);

        return {
            unsubscribe: () => {
                this.subscribers.delete(index);
            }
        }
    }
}

export interface Observable<T> {
    subscribe(next: (val: T) => void): Subscription;
}

export interface Subscription {
    unsubscribe(): void;
}
