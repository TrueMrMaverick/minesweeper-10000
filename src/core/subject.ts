import {useEffect, useState} from "react";

export class Subject<T> implements Observable<T> {
    private subscribers = new Map<number, (val: T) => void>();
    private nextSubIndex = 0;

    constructor(private _value: T) {
    }

    get value() {
        return this._value;
    }

    next(value: T): void {
        this._value = value;
        // this.subscribers.forEach((notifier) => notifier(this._value))
        this.subscribers.forEach((notifier) => queueMicrotask(() => notifier(value)))

    }

    complete() {
        this.subscribers.clear();
    }

    subscribe(next: (val: T) => void, skipFirst = false): Subscription {
        const index = this.nextSubIndex;
        this.nextSubIndex += 1;
        this.subscribers.set(index, next);

        if (!skipFirst) {
            queueMicrotask(() => next(this._value));
        }

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

export function useSubject<T>(subject: Subject<T>, skipFirst = true): [T, (val: T) => void] {
    const [value, setValue] = useState(subject.value);

    useEffect(() => {
        const sub = subject.subscribe(setValue, skipFirst);
        return () => sub.unsubscribe();
    }, []);

    return [value, (val: T) => subject.next(val)];
}

