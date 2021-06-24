// @ts-ignore
onmessage = function (e: MessageEvent<SharedArrayBuffer>) {
    debugger;
    const chunkedArray = new Uint8Array(e.data);
    for (let i = 0; i < chunkedArray.length; i++) {
        const num = Math.random() * parseInt('11111111', 2) | 0;
        chunkedArray[i] = num;
    }


    // @ts-ignore
    postMessage({status: 'finished'});
}
