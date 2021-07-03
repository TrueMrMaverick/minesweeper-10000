export class CollectionNode<T> {
    constructor(public value: T, public next: CollectionNode<T> | null = null) {
    }
}
