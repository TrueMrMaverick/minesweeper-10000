import {CollectionNode} from "./collectionNode";

export class Queue<T> {
    private head: CollectionNode<T> | null = null;
    private tail: CollectionNode<T> | null = null;

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

    enqueue(value: T): this {
        const newNode =  new CollectionNode(value);

        this._size++;

        if (this.isEmpty()) {
            this.tail = newNode;
            this.head = newNode;

            return this;
        }

        this.tail!.next = newNode;
        this.tail = newNode;

        return this;
    }

    dequeue(): T | null {
        if (this.isEmpty()) {
            return null;
        }
        const value = this.head!.value;
        this.head = this.head!.next;
        this._size--;
        return value
    }

}
