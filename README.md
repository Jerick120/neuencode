# NeuEncode

Lightweight GIF encoder based on LZWEncoder & Anthony Dekker's NeuQuant

# Usage

### Constructor

`NeuEncode(frames, width, height, delays, quality)`

|   Parameter    |  Type   |          Description                                   | Required |  Default   |
| :------------: | :-----: | :----------------------------------------------------: | :------: | :--------: |
|    `frames`    | array   | array of pixel data via canvas `getImageData` method   |   yes    |    n/a     |
|    `width`     | number  | the width of images in pixels                          |   yes    |    n/a     |
|    `height`    | number  | the height of images in pixels                         |   yes    |    n/a     |
|    `delays`    | array   | array of delays in ms for each frame                   |    no    |    50ms    |
|   `quality`    | number  | number between 1-30, lower is better/slower            |    no    |    15      |


### Methods

|     Method     |  Parameter |    Description     |
| :------------: | :--------: | :----------------: |
|    `encode`    | n/a        | begin encoding     |
|    `export`    | n/a        | export buffer      |

