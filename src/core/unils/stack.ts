class StackNode<T> {
    constructor(public value: T, public next: StackNode<T> | null = null) {
    }
}

export class Stack<T> {
    private head: StackNode<T> | null = null;
    private _size: number = 0;
    get size() {
        return this._size;
    }


    constructor() {
    }

    isEmpty() {
        return !this.head;
    }

    peek(): T | null {
        if (this.isEmpty()) {
            return null;
        }

        return this.head!.value;
    }

    push(value: T): void {
        this.head = new StackNode(value, this.head);
        this._size++;
    }

    pop(): T | null {
        if (this.isEmpty()) {
            return null;
        }
        const value = this.head!.value;
        this.head = this.head!.next;
        this._size--;
        return value
    }
}
