/*
  LZWEncoder.js

  Authors
  Kevin Weiner (original Java version - kweiner@fmsware.com)
  Thibault Imbert (AS3 version - bytearray.org)
  Johan Nordberg (JS version - code@johan-nordberg.com)

  Acknowledgements
  GIFCOMPR.C - GIF Image compression routines
  Lempel-Ziv compression based on 'compress'. GIF modifications by
  David Rowley (mgardi@watdcsu.waterloo.edu)
  GIF Image compression - modified 'compress'
  Based on: compress.c - File compression ala IEEE Computer, June 1984.
  By Authors: Spencer W. Thomas (decvax!harpo!utah-cs!utah-gr!thomas)
  Jim McKie (decvax!mcvax!jim)
  Steve Davies (decvax!vax135!petsd!peora!srd)
  Ken Turkowski (decvax!decwrl!turtlevax!ken)
  James A. Woods (decvax!ihnp4!ames!jaw)
  Joe Orost (decvax!vax135!petsd!joe)
*/

const EOF = -1
const BITS = 12
const HSIZE = 5003 // 80% occupancy

const masks = [
  0x0000, 0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f,
  0x00ff, 0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff
]

export class LZWEncoder {
  constructor(width, height, pixels, colorDepth) {
    this.width = width
    this.height = height
    this.pixels = pixels

    this.initCodeSize = Math.max(2, colorDepth)

    this.accum = new Uint8Array(256)
    this.htab = new Int32Array(HSIZE)
    this.codetab = new Int32Array(HSIZE)

    this.cur_accum = 0
    this.cur_bits = 0
    this.a_count = 0

    this.free_ent = 0
    this.maxcode = 0
    this.clear_flg = false

    this.g_init_bits = 0
    this.ClearCode = 0
    this.EOFCode = 0

    this.remaining = 0
    this.curPixel = 0
    this.n_bits = 0
  }

  encode = (outs) => {
    outs.writeByte(this.initCodeSize)
    this.remaining = this.width * this.height
    this.curPixel = 0
    this.#compress(this.initCodeSize + 1, outs)
    outs.writeByte(0)
  }

  // Add a character to the end of the current packet, and if it is 254
  // characters, flush the packet to disk.
  #char_out = (c, outs) => {
    this.accum[this.a_count++] = c
    if (this.a_count >= 254) this.#flush_char(outs)
  }

  // Flush the packet to disk, and reset the accumulator
  #flush_char = (outs) => {
    if (this.a_count > 0) {
      outs.writeByte(this.a_count)
      outs.writeBytes(this.accum, 0, this.a_count)
      this.a_count = 0
    }
  }

  // Clear out the hash table
  // table clear for block compress
  #cl_hash = (hsize) => {
    for (let i = 0; i < hsize; i++) this.htab[i] = -1
  }

  #cl_block = (outs) => {
    this.#cl_hash(HSIZE)
    this.free_ent = this.ClearCode + 2
    this.clear_flg = true
    this.#output(this.ClearCode, outs)
  }

  #MAXCODE = (n_bits) => (1 << n_bits) - 1

  // Return the next pixel from the image
  #nextPixel = () => {
    if (this.remaining === 0) return EOF
    this.remaining--
    return this.pixels[this.curPixel++] & 0xff
  }

  #compress = (init_bits, outs) => {
    let fcode, c, i, ent, disp, hsize_reg, hshift

    this.g_init_bits = init_bits
    this.clear_flg = false
    this.n_bits = this.g_init_bits
    this.maxcode = this.#MAXCODE(this.n_bits)

    this.ClearCode = 1 << (init_bits - 1)
    this.EOFCode = this.ClearCode + 1
    this.free_ent = this.ClearCode + 2

    this.a_count = 0

    ent = this.#nextPixel()

    hshift = 0
    for (fcode = HSIZE; fcode < 65536; fcode <<= 1) hshift++
    hshift = 8 - hshift

    hsize_reg = HSIZE
    this.#cl_hash(hsize_reg)

    this.#output(this.ClearCode, outs)

    outer: while ((c = this.#nextPixel()) !== EOF) {
      fcode = (c << BITS) + ent
      i = (c << hshift) ^ ent

      if (this.htab[i] === fcode) {
        ent = this.codetab[i]
        continue
      } else if (this.htab[i] >= 0) {
        disp = hsize_reg - i
        if (i === 0) disp = 1
        do {
          if ((i -= disp) < 0) i += hsize_reg
          if (this.htab[i] === fcode) {
            ent = this.codetab[i]
            continue outer
          }
        } while (this.htab[i] >= 0)
      }

      this.#output(ent, outs)
      ent = c

      if (this.free_ent < (1 << BITS)) {
        this.codetab[i] = this.free_ent++
        this.htab[i] = fcode
      } else {
        this.#cl_block(outs)
      }
    }

    this.#output(ent, outs)
    this.#output(this.EOFCode, outs)
  }

  #output = (code, outs) => {
    this.cur_accum &= masks[this.cur_bits]

    if (this.cur_bits > 0) this.cur_accum |= code << this.cur_bits
    else this.cur_accum = code

    this.cur_bits += this.n_bits

    while (this.cur_bits >= 8) {
      this.#char_out(this.cur_accum & 0xff, outs)
      this.cur_accum >>= 8
      this.cur_bits -= 8
    }

    // If the next entry is going to be too big for the code size,
    // then increase it, if possible.
    if (this.free_ent > this.maxcode || this.clear_flg) {
      if (this.clear_flg) {
        this.maxcode = this.#MAXCODE((this.n_bits = this.g_init_bits))
        this.clear_flg = false
      } else {
        this.n_bits++
        this.maxcode = this.n_bits === BITS ? (1 << BITS) : this.#MAXCODE(this.n_bits)
      }
    }

    if (code === this.EOFCode) {
      while (this.cur_bits > 0) {
        this.#char_out(this.cur_accum & 0xff, outs)
        this.cur_accum >>= 8
        this.cur_bits -= 8
      }
      this.#flush_char(outs)
    }
  }
}