# NeuEncode

Minimal GIF encoder using LZW compression and Anthony Dekker’s NeuQuant color quantization

# Usage

### Constructor

`NeuEncode(frames, width, height, delays, quality)`

|   Parameter    |  Type   |          Description                                               | Required |  Default   |
| :------------: | :-----: | :----------------------------------------------------------------: | :------: | :--------: |
|    `frames`    | Array   | RGBA frame buffers (CanvasRenderingContext2D.getImageData().data)  |   yes    |    n/a     |
|    `width`     | Number  | Frame width in pixels                                              |   yes    |    n/a     |
|    `height`    | Number  | Frame height in pixels                                             |   yes    |    n/a     |
|    `delays`    | Array   | Per-frame delays in ms                                             |    no    |    50      |
|   `quality`    | Number  | NeuQuant quality (1–30, lower is better/slower)                    |    no    |    15      |


### Methods

|     Method     |  Parameter |    Description                    |
| :------------: | :--------: | :-------------------------------: |
|    `encode`    | n/a        | Runs the GIF encoding process     |
|    `export`    | n/a        | Returns encoded GIF as Uint8Array |

