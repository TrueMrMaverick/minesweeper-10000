import {Queue} from "./queue";

export class SharedQueue {

    private readonly indexArray: Int32Array;
    private readonly dataArray: Int8Array;


    private get headCurrentIndex() {
        return Atomics.load(this.indexArray, 0);
    }

    private setHeadCurrentIndex(index: number) {
        if (index === this.dataArray.length - 1) {
            Atomics.store(this.indexArray, 0, 0);
            return 0;
        }
        Atomics.store(this.indexArray, 0, index);
        return index;
    }

    private get tailCurrentIndex() {
        return Atomics.load(this.indexArray, 0);
    }

    private setTailCurrentIndex(index: number) {
        if (index === this.dataArray.length - 1) {
            Atomics.store(this.indexArray, 0, 0);
            return 0;
        }
        Atomics.store(this.indexArray, 0, index);
        return index;
    }

    constructor(private queueSharedBuffer: SharedArrayBuffer) {
        this.indexArray = new Int32Array(queueSharedBuffer, 0, SharedQueue.INDEX_BYTES / Int32Array.BYTES_PER_ELEMENT);
        this.dataArray = new Int8Array(queueSharedBuffer, SharedQueue.INDEX_BYTES);

        this.setHeadCurrentIndex(0);
        this.setTailCurrentIndex(0);
    }

    private static INDEX_BYTES = 4 * 2;

    static createQueue(maxQueueSize: number): [SharedQueue, SharedArrayBuffer] {
        // We allocate twice as much as required to ensure we can loop indexes.
        const queueSharedBuffer = new SharedArrayBuffer(maxQueueSize * 8 * 2 + SharedQueue.INDEX_BYTES);

        return [new SharedQueue(queueSharedBuffer), queueSharedBuffer];
    }

    isEmpty() {
        if (this.headCurrentIndex === this.tailCurrentIndex) {

        }
    }
}
