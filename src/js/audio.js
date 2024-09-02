export class AudioSystem {
    constructor() {
        const context = new AudioContext();

        const gainNode = context.createGain();
        gainNode.connect(context.destination);
        gainNode.gain.value = 0.2;

        this.context = context;
        this.gainNode = gainNode;
    }

    resume() {
        const { context } = this;
        context.resume();

        return this;
    }

    suspend() {
        const { context } = this;
        context.suspend();

        return this;
    }

    /**
     * @param {AudioBuffer} buffer 
     */
    play(buffer, loop = false, offset = 0) {
        const { context, gainNode } = this;

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.connect(gainNode);
        source.start(context.currentTime + offset / 1000);

        return this;
    }
}
