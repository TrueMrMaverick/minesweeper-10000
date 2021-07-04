import {Subject, useSubject} from "../subject";

export type StoreKey = string | symbol;

class Store {
    private reactiveState = new Map<StoreKey, Subject<unknown>>();

    constructor() {
        this.register = this.register.bind(this);
        this.unregister = this.unregister.bind(this);
    }

    register<T>(key: StoreKey, initialValue: T): this {
        this.reactiveState.set(key, new Subject(initialValue) as Subject<unknown>);

        return this;
    }

    unregister(key: StoreKey): boolean {
        return this.reactiveState.delete(key);
    }

    getSubject<T>(key: StoreKey): Subject<T> {
        if (!this.reactiveState.has(key)) {
            throw new Error(`Store -> entry with key ${key.toString()} was not registered in the Store`);
        }

        return this.reactiveState.get(key)! as Subject<T>;
    }

    getValue<T>(key: StoreKey): T {
        return this.getSubject<T>(key).value;
    }
}

export const appStore = new Store();


export function useStore() {
    return [
        appStore.register,
        appStore.unregister
    ];
}

export function useStoreState<T>(key: StoreKey) {
    return useSubject<T>(appStore.getSubject(key));
}


