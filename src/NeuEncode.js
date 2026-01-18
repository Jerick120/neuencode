import { NeuQuant } from './NeuQuant.js'
import { LZWEncoder } from './LZWEncoder.js'

class ByteArray {
    constructor() {
        this.data = []
    }
    writeByte(b) {
        this.data.push(b & 0xff)
    }
    writeBytes(arr, off = 0, len = arr.length) {
        for (let i = off; i < off + len; i++) this.data.push(arr[i])
    }
    writeUTFBytes(str) {
        for (let i = 0; i < str.length; i++) this.writeByte(str.charCodeAt(i))
    }
    writeShort(v) {
        this.writeByte(v & 0xff)
        this.writeByte((v >> 8) & 0xff)
    }
    getData() {
        return new Uint8Array(this.data)
    }
}

export class NeuEncode {
    constructor(frames, width, height, delays = null, quality = 15) {
        this.frames = frames
        this.width = width
        this.height = height
        this.quality = quality

        this.out = new ByteArray()
        this.palette = null

        if (delays !== null) {
            if (!Array.isArray(delays)) {
                throw new TypeError('delays must be an array')
            }
            if (delays.length !== frames.length) {
                throw new Error('delays array length must match frames length')
            }
            for (const d of delays) {
                if (!Number.isInteger(d) || d < 0) {
                    throw new Error('each delay must be a non-negative integer (ms)')
                }
            }
        }

        this.delays = delays
    }

    encode() {
        this.#buildPalette()

        this.#writeHeader()
        this.#writeLSD()
        this.#writePalette()
        this.#writeNetscape()

        for (let i = 0; i < this.frames.length; i++) {
            const rgba = this.frames[i]
            const indexed = this.#indexFrame(rgba)

            this.#writeGCE(i)
            this.#writeImageDesc()
            this.#writePixels(indexed)
        }

        this.out.writeByte(0x3b)

    }

    export() {
        return this.out.getData()
    }

    /* ---------- palette + indexing ---------- */

    #indexFrame(rgba) {
        const indexed = new Uint8Array(this.width * this.height)
        let p = 0

        for (let i = 0; i < rgba.length; i += 4) {
            const a = rgba[i + 3]
            const r = a === 0 ? 0 : rgba[i]
            const g = a === 0 ? 0 : rgba[i + 1]
            const b = a === 0 ? 0 : rgba[i + 2]

            indexed[p++] = this.quant.lookupRGB(r, g, b)
        }

        return indexed
    }

    #buildPalette() {
        const sampleRGB = []

        for (let f = 0; f < this.frames.length; f += 2) {
            const rgba = this.frames[f]

            for (let i = 0; i < rgba.length; i += 8) {
                sampleRGB.push(
                    rgba[i],
                    rgba[i + 1],
                    rgba[i + 2]
                )
            }
        }

        const quant = new NeuQuant(
            new Uint8Array(sampleRGB),
            this.quality
        )

        quant.buildColormap()

        this.palette = quant.getColormap()
        this.quant = quant
    }


    /* ---------- GIF structure ---------- */

    #writeHeader() {
        this.out.writeUTFBytes('GIF89a')
    }

    #writeLSD() {
        this.out.writeShort(this.width)
        this.out.writeShort(this.height)
        this.out.writeByte(0xF7) // global table, 256 colors
        this.out.writeByte(0)
        this.out.writeByte(0)
    }

    #writePalette() {
        this.out.writeBytes(this.palette)
        for (let i = this.palette.length; i < 768; i++) {
            this.out.writeByte(0)
        }
    }

    #writeNetscape() {
        this.out.writeByte(0x21)
        this.out.writeByte(0xff)
        this.out.writeByte(11)
        this.out.writeUTFBytes('NETSCAPE2.0')
        this.out.writeByte(3)
        this.out.writeByte(1)
        this.out.writeShort(0) // loop forever
        this.out.writeByte(0)
    }

    #writeGCE(frameIndex) {
        let delayCs = 5 // 50ms
        if (this.delays) {
            delayCs = Math.round(this.delays[frameIndex] / 10)
            if (delayCs < 2) delayCs = 2
            if (delayCs > 65535) delayCs = 65535
        }

        this.out.writeByte(0x21)
        this.out.writeByte(0xf9)
        this.out.writeByte(4)
        this.out.writeByte(0x08) // dispose=2
        this.out.writeShort(delayCs)
        this.out.writeByte(0)
        this.out.writeByte(0)
    }

    #writeImageDesc() {
        this.out.writeByte(0x2c)
        this.out.writeShort(0)
        this.out.writeShort(0)
        this.out.writeShort(this.width)
        this.out.writeShort(this.height)
        this.out.writeByte(0)
    }

    #writePixels(indexed) {
        const lzw = new LZWEncoder(
            this.width,
            this.height,
            indexed,
            8
        )
        lzw.encode(this.out)
    }
}