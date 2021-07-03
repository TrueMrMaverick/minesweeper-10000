import {CollectionNode} from "./collectionNode";

export class Stack<T> {
    private head: CollectionNode<T> | null = null;
    private _size: number = 0;
    get size() {
        return this._size;
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
        this.head = new CollectionNode(value, this.head);
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
