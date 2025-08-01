(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@tensorflow/tfjs-core')) :
    typeof define === 'function' && define.amd ? define(['exports', '@tensorflow/tfjs-core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.faceapi = global.faceapi || {}, global.tf));
})(this, (function (exports, tf) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var tf__namespace = /*#__PURE__*/_interopNamespaceDefault(tf);

    function drawContour(ctx, points, isClosed = false) {
        ctx.beginPath();
        points.slice(1).forEach(({ x, y }, prevIdx) => {
            const from = points[prevIdx];
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(x, y);
        });
        if (isClosed) {
            const from = points[points.length - 1];
            const to = points[0];
            if (!from || !to) {
                return;
            }
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
        }
        ctx.stroke();
    }

    class Dimensions {
        constructor(width, height) {
            if (!isValidNumber(width) || !isValidNumber(height)) {
                throw new Error(`Dimensions.constructor - expected width and height to be valid numbers, instead have ${JSON.stringify({ width, height })}`);
            }
            this._width = width;
            this._height = height;
        }
        get width() { return this._width; }
        get height() { return this._height; }
        reverse() {
            return new Dimensions(1 / this.width, 1 / this.height);
        }
    }

    function isTensor(tensor, dim) {
        return tensor instanceof tf__namespace.Tensor && tensor.shape.length === dim;
    }
    function isTensor1D(tensor) {
        return isTensor(tensor, 1);
    }
    function isTensor2D(tensor) {
        return isTensor(tensor, 2);
    }
    function isTensor3D(tensor) {
        return isTensor(tensor, 3);
    }
    function isTensor4D(tensor) {
        return isTensor(tensor, 4);
    }
    function isFloat(num) {
        return num % 1 !== 0;
    }
    function isEven(num) {
        return num % 2 === 0;
    }
    function round(num, prec = 2) {
        const f = Math.pow(10, prec);
        return Math.floor(num * f) / f;
    }
    function isDimensions(obj) {
        return obj && obj.width && obj.height;
    }
    function computeReshapedDimensions({ width, height }, inputSize) {
        const scale = inputSize / Math.max(height, width);
        return new Dimensions(Math.round(width * scale), Math.round(height * scale));
    }
    function getCenterPoint(pts) {
        return pts.reduce((sum, pt) => sum.add(pt), new Point(0, 0))
            .div(new Point(pts.length, pts.length));
    }
    function range(num, start, step) {
        return Array(num).fill(0).map((_, i) => start + (i * step));
    }
    function isValidNumber(num) {
        return !!num && num !== Infinity && num !== -Infinity && !isNaN(num) || num === 0;
    }
    function isValidProbablitiy(num) {
        return isValidNumber(num) && 0 <= num && num <= 1.0;
    }

    var index$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        computeReshapedDimensions: computeReshapedDimensions,
        getCenterPoint: getCenterPoint,
        isDimensions: isDimensions,
        isEven: isEven,
        isFloat: isFloat,
        isTensor: isTensor,
        isTensor1D: isTensor1D,
        isTensor2D: isTensor2D,
        isTensor3D: isTensor3D,
        isTensor4D: isTensor4D,
        isValidNumber: isValidNumber,
        isValidProbablitiy: isValidProbablitiy,
        range: range,
        round: round
    });

    class Point {
        constructor(x, y) {
            this._x = x;
            this._y = y;
        }
        get x() { return this._x; }
        get y() { return this._y; }
        add(pt) {
            return new Point(this.x + pt.x, this.y + pt.y);
        }
        sub(pt) {
            return new Point(this.x - pt.x, this.y - pt.y);
        }
        mul(pt) {
            return new Point(this.x * pt.x, this.y * pt.y);
        }
        div(pt) {
            return new Point(this.x / pt.x, this.y / pt.y);
        }
        abs() {
            return new Point(Math.abs(this.x), Math.abs(this.y));
        }
        magnitude() {
            return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        }
        floor() {
            return new Point(Math.floor(this.x), Math.floor(this.y));
        }
    }

    class Box {
        static isRect(rect) {
            return !!rect && [rect.x, rect.y, rect.width, rect.height].every(isValidNumber);
        }
        static assertIsValidBox(box, callee, allowNegativeDimensions = false) {
            if (!Box.isRect(box)) {
                throw new Error(`${callee} - invalid box: ${JSON.stringify(box)}, expected object with properties x, y, width, height`);
            }
            if (!allowNegativeDimensions && (box.width < 0 || box.height < 0)) {
                throw new Error(`${callee} - width (${box.width}) and height (${box.height}) must be positive numbers`);
            }
        }
        constructor(_box, allowNegativeDimensions = true) {
            const box = (_box || {});
            const isBbox = [box.left, box.top, box.right, box.bottom].every(isValidNumber);
            const isRect = [box.x, box.y, box.width, box.height].every(isValidNumber);
            if (!isRect && !isBbox) {
                throw new Error(`Box.constructor - expected box to be IBoundingBox | IRect, instead have ${JSON.stringify(box)}`);
            }
            const [x, y, width, height] = isRect
                ? [box.x, box.y, box.width, box.height]
                : [box.left, box.top, box.right - box.left, box.bottom - box.top];
            Box.assertIsValidBox({ x, y, width, height }, 'Box.constructor', allowNegativeDimensions);
            this._x = x;
            this._y = y;
            this._width = width;
            this._height = height;
        }
        get x() { return this._x; }
        get y() { return this._y; }
        get width() { return this._width; }
        get height() { return this._height; }
        get left() { return this.x; }
        get top() { return this.y; }
        get right() { return this.x + this.width; }
        get bottom() { return this.y + this.height; }
        get area() { return this.width * this.height; }
        get topLeft() { return new Point(this.left, this.top); }
        get topRight() { return new Point(this.right, this.top); }
        get bottomLeft() { return new Point(this.left, this.bottom); }
        get bottomRight() { return new Point(this.right, this.bottom); }
        round() {
            const [x, y, width, height] = [this.x, this.y, this.width, this.height]
                .map(val => Math.round(val));
            return new Box({ x, y, width, height });
        }
        floor() {
            const [x, y, width, height] = [this.x, this.y, this.width, this.height]
                .map(val => Math.floor(val));
            return new Box({ x, y, width, height });
        }
        toSquare() {
            let { x, y, width, height } = this;
            const diff = Math.abs(width - height);
            if (width < height) {
                x -= (diff / 2);
                width += diff;
            }
            if (height < width) {
                y -= (diff / 2);
                height += diff;
            }
            return new Box({ x, y, width, height });
        }
        rescale(s) {
            const scaleX = isDimensions(s) ? s.width : s;
            const scaleY = isDimensions(s) ? s.height : s;
            return new Box({
                x: this.x * scaleX,
                y: this.y * scaleY,
                width: this.width * scaleX,
                height: this.height * scaleY
            });
        }
        pad(padX, padY) {
            let [x, y, width, height] = [
                this.x - (padX / 2),
                this.y - (padY / 2),
                this.width + padX,
                this.height + padY
            ];
            return new Box({ x, y, width, height });
        }
        clipAtImageBorders(imgWidth, imgHeight) {
            const { x, y, right, bottom } = this;
            const clippedX = Math.max(x, 0);
            const clippedY = Math.max(y, 0);
            const newWidth = right - clippedX;
            const newHeight = bottom - clippedY;
            const clippedWidth = Math.min(newWidth, imgWidth - clippedX);
            const clippedHeight = Math.min(newHeight, imgHeight - clippedY);
            return (new Box({ x: clippedX, y: clippedY, width: clippedWidth, height: clippedHeight })).floor();
        }
        shift(sx, sy) {
            const { width, height } = this;
            const x = this.x + sx;
            const y = this.y + sy;
            return new Box({ x, y, width, height });
        }
        padAtBorders(imageHeight, imageWidth) {
            const w = this.width + 1;
            const h = this.height + 1;
            let dx = 1;
            let dy = 1;
            let edx = w;
            let edy = h;
            let x = this.left;
            let y = this.top;
            let ex = this.right;
            let ey = this.bottom;
            if (ex > imageWidth) {
                edx = -ex + imageWidth + w;
                ex = imageWidth;
            }
            if (ey > imageHeight) {
                edy = -ey + imageHeight + h;
                ey = imageHeight;
            }
            if (x < 1) {
                edy = 2 - x;
                x = 1;
            }
            if (y < 1) {
                edy = 2 - y;
                y = 1;
            }
            return { dy, edy, dx, edx, y, ey, x, ex, w, h };
        }
        calibrate(region) {
            return new Box({
                left: this.left + (region.left * this.width),
                top: this.top + (region.top * this.height),
                right: this.right + (region.right * this.width),
                bottom: this.bottom + (region.bottom * this.height)
            }).toSquare().round();
        }
    }

    class BoundingBox extends Box {
        constructor(left, top, right, bottom, allowNegativeDimensions = false) {
            super({ left, top, right, bottom }, allowNegativeDimensions);
        }
    }

    class ObjectDetection {
        constructor(score, classScore, className, relativeBox, imageDims) {
            this._imageDims = new Dimensions(imageDims.width, imageDims.height);
            this._score = score;
            this._classScore = classScore;
            this._className = className;
            this._box = new Box(relativeBox).rescale(this._imageDims);
        }
        get score() { return this._score; }
        get classScore() { return this._classScore; }
        get className() { return this._className; }
        get box() { return this._box; }
        get imageDims() { return this._imageDims; }
        get imageWidth() { return this.imageDims.width; }
        get imageHeight() { return this.imageDims.height; }
        get relativeBox() { return new Box(this._box).rescale(this.imageDims.reverse()); }
        forSize(width, height) {
            return new ObjectDetection(this.score, this.classScore, this.className, this.relativeBox, { width, height });
        }
    }

    class FaceDetection extends ObjectDetection {
        constructor(score, relativeBox, imageDims) {
            super(score, score, '', relativeBox, imageDims);
        }
        forSize(width, height) {
            const { score, relativeBox, imageDims } = super.forSize(width, height);
            return new FaceDetection(score, relativeBox, imageDims);
        }
    }

    function iou(box1, box2, isIOU = true) {
        const width = Math.max(0.0, Math.min(box1.right, box2.right) - Math.max(box1.left, box2.left));
        const height = Math.max(0.0, Math.min(box1.bottom, box2.bottom) - Math.max(box1.top, box2.top));
        const interSection = width * height;
        return isIOU
            ? interSection / (box1.area + box2.area - interSection)
            : interSection / Math.min(box1.area, box2.area);
    }

    function minBbox(pts) {
        const xs = pts.map(pt => pt.x);
        const ys = pts.map(pt => pt.y);
        const minX = xs.reduce((min, x) => x < min ? x : min, Infinity);
        const minY = ys.reduce((min, y) => y < min ? y : min, Infinity);
        const maxX = xs.reduce((max, x) => max < x ? x : max, 0);
        const maxY = ys.reduce((max, y) => max < y ? y : max, 0);
        return new BoundingBox(minX, minY, maxX, maxY);
    }

    function nonMaxSuppression$1(boxes, scores, iouThreshold, isIOU = true) {
        let indicesSortedByScore = scores
            .map((score, boxIndex) => ({ score, boxIndex }))
            .sort((c1, c2) => c1.score - c2.score)
            .map(c => c.boxIndex);
        const pick = [];
        while (indicesSortedByScore.length > 0) {
            const curr = indicesSortedByScore.pop();
            pick.push(curr);
            const indices = indicesSortedByScore;
            const outputs = [];
            for (let i = 0; i < indices.length; i++) {
                const idx = indices[i];
                const currBox = boxes[curr];
                const idxBox = boxes[idx];
                outputs.push(iou(currBox, idxBox, isIOU));
            }
            indicesSortedByScore = indicesSortedByScore.filter((_, j) => outputs[j] <= iouThreshold);
        }
        return pick;
    }

    function normalize$1(x, meanRgb) {
        return tf__namespace.tidy(() => {
            const [r, g, b] = meanRgb;
            const avg_r = tf__namespace.fill([...x.shape.slice(0, 3), 1], r);
            const avg_g = tf__namespace.fill([...x.shape.slice(0, 3), 1], g);
            const avg_b = tf__namespace.fill([...x.shape.slice(0, 3), 1], b);
            const avg_rgb = tf__namespace.concat([avg_r, avg_g, avg_b], 3);
            return tf__namespace.sub(x, avg_rgb);
        });
    }

    /**
     * Pads the smaller dimension of an image tensor with zeros, such that width === height.
     *
     * @param imgTensor The image tensor.
     * @param isCenterImage (optional, default: false) If true, add an equal amount of padding on
     * both sides of the minor dimension oof the image.
     * @returns The padded tensor with width === height.
     */
    function padToSquare(imgTensor, isCenterImage = false) {
        return tf__namespace.tidy(() => {
            const [height, width] = imgTensor.shape.slice(1);
            if (height === width) {
                return imgTensor;
            }
            const dimDiff = Math.abs(height - width);
            const paddingAmount = Math.round(dimDiff * (isCenterImage ? 0.5 : 1));
            const paddingAxis = height > width ? 2 : 1;
            const createPaddingTensor = (paddingAmount) => {
                const paddingTensorShape = imgTensor.shape.slice();
                paddingTensorShape[paddingAxis] = paddingAmount;
                return tf__namespace.fill(paddingTensorShape, 0);
            };
            const paddingTensorAppend = createPaddingTensor(paddingAmount);
            const remainingPaddingAmount = dimDiff - paddingTensorAppend.shape[paddingAxis];
            const paddingTensorPrepend = isCenterImage && remainingPaddingAmount
                ? createPaddingTensor(remainingPaddingAmount)
                : null;
            const tensorsToStack = [
                paddingTensorPrepend,
                imgTensor,
                paddingTensorAppend
            ]
                .filter(t => !!t)
                .map((t) => tf__namespace.cast(t, 'float32'));
            return tf__namespace.concat(tensorsToStack, paddingAxis);
        });
    }

    function shuffleArray(inputArray) {
        const array = inputArray.slice();
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const x = array[i];
            array[i] = array[j];
            array[j] = x;
        }
        return array;
    }

    function sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    function inverseSigmoid(x) {
        return Math.log(x / (1 - x));
    }

    class Rect extends Box {
        constructor(x, y, width, height, allowNegativeDimensions = false) {
            super({ x, y, width, height }, allowNegativeDimensions);
        }
    }

    // face alignment constants
    const relX = 0.5;
    const relY = 0.43;
    const relScale = 0.45;
    class FaceLandmarks {
        constructor(relativeFaceLandmarkPositions, imgDims, shift = new Point(0, 0)) {
            const { width, height } = imgDims;
            this._imgDims = new Dimensions(width, height);
            this._shift = shift;
            this._positions = relativeFaceLandmarkPositions.map(pt => pt.mul(new Point(width, height)).add(shift));
        }
        get shift() { return new Point(this._shift.x, this._shift.y); }
        get imageWidth() { return this._imgDims.width; }
        get imageHeight() { return this._imgDims.height; }
        get positions() { return this._positions; }
        get relativePositions() {
            return this._positions.map(pt => pt.sub(this._shift).div(new Point(this.imageWidth, this.imageHeight)));
        }
        forSize(width, height) {
            return new this.constructor(this.relativePositions, { width, height });
        }
        shiftBy(x, y) {
            return new this.constructor(this.relativePositions, this._imgDims, new Point(x, y));
        }
        shiftByPoint(pt) {
            return this.shiftBy(pt.x, pt.y);
        }
        /**
         * Aligns the face landmarks after face detection from the relative positions of the faces
         * bounding box, or it's current shift. This function should be used to align the face images
         * after face detection has been performed, before they are passed to the face recognition net.
         * This will make the computed face descriptor more accurate.
         *
         * @param detection (optional) The bounding box of the face or the face detection result. If
         * no argument was passed the position of the face landmarks are assumed to be relative to
         * it's current shift.
         * @returns The bounding box of the aligned face.
         */
        align(detection, options = {}) {
            if (detection) {
                const box = detection instanceof FaceDetection
                    ? detection.box.floor()
                    : new Box(detection);
                return this.shiftBy(box.x, box.y).align(null, options);
            }
            const { useDlibAlignment, minBoxPadding } = Object.assign({}, { useDlibAlignment: false, minBoxPadding: 0.2 }, options);
            if (useDlibAlignment) {
                return this.alignDlib();
            }
            return this.alignMinBbox(minBoxPadding);
        }
        alignDlib() {
            const centers = this.getRefPointsForAlignment();
            const [leftEyeCenter, rightEyeCenter, mouthCenter] = centers;
            const distToMouth = (pt) => mouthCenter.sub(pt).magnitude();
            const eyeToMouthDist = (distToMouth(leftEyeCenter) + distToMouth(rightEyeCenter)) / 2;
            const size = Math.floor(eyeToMouthDist / relScale);
            const refPoint = getCenterPoint(centers);
            // TODO: pad in case rectangle is out of image bounds
            const x = Math.floor(Math.max(0, refPoint.x - (relX * size)));
            const y = Math.floor(Math.max(0, refPoint.y - (relY * size)));
            return new Rect(x, y, Math.min(size, this.imageWidth + x), Math.min(size, this.imageHeight + y));
        }
        alignMinBbox(padding) {
            const box = minBbox(this.positions);
            return box.pad(box.width * padding, box.height * padding);
        }
        getRefPointsForAlignment() {
            throw new Error('getRefPointsForAlignment not implemented by base class');
        }
    }

    class FaceLandmarks5 extends FaceLandmarks {
        getRefPointsForAlignment() {
            const pts = this.positions;
            return [
                pts[0],
                pts[1],
                getCenterPoint([pts[3], pts[4]])
            ];
        }
    }

    class FaceLandmarks68 extends FaceLandmarks {
        getJawOutline() {
            return this.positions.slice(0, 17);
        }
        getLeftEyeBrow() {
            return this.positions.slice(17, 22);
        }
        getRightEyeBrow() {
            return this.positions.slice(22, 27);
        }
        getNose() {
            return this.positions.slice(27, 36);
        }
        getLeftEye() {
            return this.positions.slice(36, 42);
        }
        getRightEye() {
            return this.positions.slice(42, 48);
        }
        getMouth() {
            return this.positions.slice(48, 68);
        }
        getRefPointsForAlignment() {
            return [
                this.getLeftEye(),
                this.getRightEye(),
                this.getMouth()
            ].map(getCenterPoint);
        }
    }

    class FaceMatch {
        constructor(label, distance) {
            this._label = label;
            this._distance = distance;
        }
        get label() { return this._label; }
        get distance() { return this._distance; }
        toString(withDistance = true) {
            return `${this.label}${withDistance ? ` (${round(this.distance)})` : ''}`;
        }
    }

    class LabeledBox extends Box {
        static assertIsValidLabeledBox(box, callee) {
            Box.assertIsValidBox(box, callee);
            if (!isValidNumber(box.label)) {
                throw new Error(`${callee} - expected property label (${box.label}) to be a number`);
            }
        }
        constructor(box, label) {
            super(box);
            this._label = label;
        }
        get label() { return this._label; }
    }

    class LabeledFaceDescriptors {
        constructor(label, descriptors) {
            if (!(typeof label === 'string')) {
                throw new Error('LabeledFaceDescriptors - constructor expected label to be a string');
            }
            if (!Array.isArray(descriptors) || descriptors.some(desc => !(desc instanceof Float32Array))) {
                throw new Error('LabeledFaceDescriptors - constructor expected descriptors to be an array of Float32Array');
            }
            this._label = label;
            this._descriptors = descriptors;
        }
        get label() { return this._label; }
        get descriptors() { return this._descriptors; }
        toJSON() {
            return {
                label: this.label,
                descriptors: this.descriptors.map((d) => Array.from(d))
            };
        }
        static fromJSON(json) {
            const descriptors = json.descriptors.map((d) => {
                return new Float32Array(d);
            });
            return new LabeledFaceDescriptors(json.label, descriptors);
        }
    }

    class PredictedBox extends LabeledBox {
        static assertIsValidPredictedBox(box, callee) {
            LabeledBox.assertIsValidLabeledBox(box, callee);
            if (!isValidProbablitiy(box.score)
                || !isValidProbablitiy(box.classScore)) {
                throw new Error(`${callee} - expected properties score (${box.score}) and (${box.classScore}) to be a number between [0, 1]`);
            }
        }
        constructor(box, label, score, classScore) {
            super(box, label);
            this._score = score;
            this._classScore = classScore;
        }
        get score() { return this._score; }
        get classScore() { return this._classScore; }
    }

    function isWithFaceDetection(obj) {
        return obj['detection'] instanceof FaceDetection;
    }
    function extendWithFaceDetection(sourceObj, detection) {
        const extension = { detection };
        return Object.assign({}, sourceObj, extension);
    }

    function createBrowserEnv() {
        const fetch = window['fetch'] || function () {
            throw new Error('fetch - missing fetch implementation for browser environment');
        };
        const readFile = function () {
            throw new Error('readFile - filesystem not available for browser environment');
        };
        return {
            Canvas: HTMLCanvasElement,
            CanvasRenderingContext2D: CanvasRenderingContext2D,
            Image: HTMLImageElement,
            ImageData: ImageData,
            Video: HTMLVideoElement,
            createCanvasElement: () => document.createElement('canvas'),
            createImageElement: () => document.createElement('img'),
            fetch,
            readFile
        };
    }

    function createFileSystem(fs) {
        let requireFsError = '';
        if (!fs) {
            try {
                fs = require('fs');
            }
            catch (err) {
                requireFsError = err.toString();
            }
        }
        const readFile = fs
            ? function (filePath) {
                return new Promise((res, rej) => {
                    fs.readFile(filePath, function (err, buffer) {
                        return err ? rej(err) : res(buffer);
                    });
                });
            }
            : function () {
                throw new Error(`readFile - failed to require fs in nodejs environment with error: ${requireFsError}`);
            };
        return {
            readFile
        };
    }

    function createNodejsEnv() {
        const Canvas = global['Canvas'] || global['HTMLCanvasElement'];
        const Image = global['Image'] || global['HTMLImageElement'];
        const createCanvasElement = function () {
            if (Canvas) {
                return new Canvas();
            }
            throw new Error('createCanvasElement - missing Canvas implementation for nodejs environment');
        };
        const createImageElement = function () {
            if (Image) {
                return new Image();
            }
            throw new Error('createImageElement - missing Image implementation for nodejs environment');
        };
        const fetch = global['fetch'] || function () {
            throw new Error('fetch - missing fetch implementation for nodejs environment');
        };
        const fileSystem = createFileSystem();
        return {
            Canvas: Canvas || class {
            },
            CanvasRenderingContext2D: global['CanvasRenderingContext2D'] || class {
            },
            Image: Image || class {
            },
            ImageData: global['ImageData'] || class {
            },
            Video: global['HTMLVideoElement'] || class {
            },
            createCanvasElement,
            createImageElement,
            fetch,
            ...fileSystem
        };
    }

    function isBrowser() {
        return typeof window === 'object'
            && typeof document !== 'undefined'
            && typeof HTMLImageElement !== 'undefined'
            && typeof HTMLCanvasElement !== 'undefined'
            && typeof HTMLVideoElement !== 'undefined'
            && typeof ImageData !== 'undefined'
            && typeof CanvasRenderingContext2D !== 'undefined';
    }

    function isNodejs() {
        return typeof global === 'object'
            && typeof require === 'function'
            && typeof module !== 'undefined'
            // issues with gatsby.js: module.exports is undefined
            // && !!module.exports
            && typeof process !== 'undefined' && !!process.version;
    }

    let environment;
    function getEnv() {
        if (!environment) {
            throw new Error('getEnv - environment is not defined, check isNodejs() and isBrowser()');
        }
        return environment;
    }
    function setEnv(env) {
        environment = env;
    }
    function initialize() {
        // check for isBrowser() first to prevent electron renderer process
        // to be initialized with wrong environment due to isNodejs() returning true
        if (isBrowser()) {
            return setEnv(createBrowserEnv());
        }
        if (isNodejs()) {
            return setEnv(createNodejsEnv());
        }
    }
    function monkeyPatch(env) {
        if (!environment) {
            initialize();
        }
        if (!environment) {
            throw new Error('monkeyPatch - environment is not defined, check isNodejs() and isBrowser()');
        }
        const { Canvas = environment.Canvas, Image = environment.Image } = env;
        environment.Canvas = Canvas;
        environment.Image = Image;
        environment.createCanvasElement = env.createCanvasElement || (() => new Canvas());
        environment.createImageElement = env.createImageElement || (() => new Image());
        environment.ImageData = env.ImageData || environment.ImageData;
        environment.Video = env.Video || environment.Video;
        environment.fetch = env.fetch || environment.fetch;
        environment.readFile = env.readFile || environment.readFile;
    }
    const env = {
        getEnv,
        setEnv,
        initialize,
        createBrowserEnv,
        createFileSystem,
        createNodejsEnv,
        monkeyPatch,
        isBrowser,
        isNodejs
    };
    initialize();

    function resolveInput(arg) {
        if (!env.isNodejs() && typeof arg === 'string') {
            return document.getElementById(arg);
        }
        return arg;
    }

    function getContext2dOrThrow(canvasArg) {
        const { Canvas, CanvasRenderingContext2D } = env.getEnv();
        if (canvasArg instanceof CanvasRenderingContext2D) {
            return canvasArg;
        }
        const canvas = resolveInput(canvasArg);
        if (!(canvas instanceof Canvas)) {
            throw new Error('resolveContext2d - expected canvas to be of instance of Canvas');
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('resolveContext2d - canvas 2d context is null');
        }
        return ctx;
    }

    var AnchorPosition;
    (function (AnchorPosition) {
        AnchorPosition["TOP_LEFT"] = "TOP_LEFT";
        AnchorPosition["TOP_RIGHT"] = "TOP_RIGHT";
        AnchorPosition["BOTTOM_LEFT"] = "BOTTOM_LEFT";
        AnchorPosition["BOTTOM_RIGHT"] = "BOTTOM_RIGHT";
    })(AnchorPosition || (AnchorPosition = {}));
    class DrawTextFieldOptions {
        constructor(options = {}) {
            const { anchorPosition, backgroundColor, fontColor, fontSize, fontStyle, padding } = options;
            this.anchorPosition = anchorPosition || AnchorPosition.TOP_LEFT;
            this.backgroundColor = backgroundColor || 'rgba(0, 0, 0, 0.5)';
            this.fontColor = fontColor || 'rgba(255, 255, 255, 1)';
            this.fontSize = fontSize || 14;
            this.fontStyle = fontStyle || 'Georgia';
            this.padding = padding || 4;
        }
    }
    class DrawTextField {
        constructor(text, anchor, options = {}) {
            this.text = typeof text === 'string'
                ? [text]
                : (text instanceof DrawTextField ? text.text : text);
            this.anchor = anchor;
            this.options = new DrawTextFieldOptions(options);
        }
        measureWidth(ctx) {
            const { padding } = this.options;
            return this.text.map(l => ctx.measureText(l).width).reduce((w0, w1) => w0 < w1 ? w1 : w0, 0) + (2 * padding);
        }
        measureHeight() {
            const { fontSize, padding } = this.options;
            return this.text.length * fontSize + (2 * padding);
        }
        getUpperLeft(ctx, canvasDims) {
            const { anchorPosition } = this.options;
            const isShiftLeft = anchorPosition === AnchorPosition.BOTTOM_RIGHT || anchorPosition === AnchorPosition.TOP_RIGHT;
            const isShiftTop = anchorPosition === AnchorPosition.BOTTOM_LEFT || anchorPosition === AnchorPosition.BOTTOM_RIGHT;
            const textFieldWidth = this.measureWidth(ctx);
            const textFieldHeight = this.measureHeight();
            const x = (isShiftLeft ? this.anchor.x - textFieldWidth : this.anchor.x);
            const y = isShiftTop ? this.anchor.y - textFieldHeight : this.anchor.y;
            // adjust anchor if text box exceeds canvas borders
            if (canvasDims) {
                const { width, height } = canvasDims;
                const newX = Math.max(Math.min(x, width - textFieldWidth), 0);
                const newY = Math.max(Math.min(y, height - textFieldHeight), 0);
                return { x: newX, y: newY };
            }
            return { x, y };
        }
        draw(canvasArg) {
            const canvas = resolveInput(canvasArg);
            const ctx = getContext2dOrThrow(canvas);
            const { backgroundColor, fontColor, fontSize, fontStyle, padding } = this.options;
            ctx.font = `${fontSize}px ${fontStyle}`;
            const maxTextWidth = this.measureWidth(ctx);
            const textHeight = this.measureHeight();
            ctx.fillStyle = backgroundColor;
            const upperLeft = this.getUpperLeft(ctx, canvas);
            ctx.fillRect(upperLeft.x, upperLeft.y, maxTextWidth, textHeight);
            ctx.fillStyle = fontColor;
            this.text.forEach((textLine, i) => {
                const x = padding + upperLeft.x;
                const y = padding + upperLeft.y + ((i + 1) * fontSize);
                ctx.fillText(textLine, x, y);
            });
        }
    }

    class DrawBoxOptions {
        constructor(options = {}) {
            const { boxColor, lineWidth, label, drawLabelOptions } = options;
            this.boxColor = boxColor || 'rgba(0, 0, 255, 1)';
            this.lineWidth = lineWidth || 2;
            this.label = label;
            const defaultDrawLabelOptions = {
                anchorPosition: AnchorPosition.BOTTOM_LEFT,
                backgroundColor: this.boxColor
            };
            this.drawLabelOptions = new DrawTextFieldOptions(Object.assign({}, defaultDrawLabelOptions, drawLabelOptions));
        }
    }
    class DrawBox {
        constructor(box, options = {}) {
            this.box = new Box(box);
            this.options = new DrawBoxOptions(options);
        }
        draw(canvasArg) {
            const ctx = getContext2dOrThrow(canvasArg);
            const { boxColor, lineWidth } = this.options;
            const { x, y, width, height } = this.box;
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x, y, width, height);
            const { label } = this.options;
            if (label) {
                new DrawTextField([label], { x: x - (lineWidth / 2), y }, this.options.drawLabelOptions).draw(canvasArg);
            }
        }
    }

    function drawDetections(canvasArg, detections) {
        const detectionsArray = Array.isArray(detections) ? detections : [detections];
        detectionsArray.forEach(det => {
            const score = det instanceof FaceDetection
                ? det.score
                : (isWithFaceDetection(det) ? det.detection.score : undefined);
            const box = det instanceof FaceDetection
                ? det.box
                : (isWithFaceDetection(det) ? det.detection.box : new Box(det));
            const label = score ? `${round(score)}` : undefined;
            new DrawBox(box, { label }).draw(canvasArg);
        });
    }

    function isMediaLoaded(media) {
        const { Image, Video } = env.getEnv();
        return (media instanceof Image && media.complete)
            || (media instanceof Video && media.readyState >= 3);
    }

    function awaitMediaLoaded(media) {
        return new Promise((resolve, reject) => {
            if (media instanceof env.getEnv().Canvas || isMediaLoaded(media)) {
                return resolve();
            }
            function onLoad(e) {
                if (!e.currentTarget)
                    return;
                e.currentTarget.removeEventListener('load', onLoad);
                e.currentTarget.removeEventListener('error', onError);
                resolve();
            }
            function onError(e) {
                if (!e.currentTarget)
                    return;
                e.currentTarget.removeEventListener('load', onLoad);
                e.currentTarget.removeEventListener('error', onError);
                reject(e);
            }
            media.addEventListener('load', onLoad);
            media.addEventListener('error', onError);
        });
    }

    function bufferToImage(buf) {
        return new Promise((resolve, reject) => {
            if (!(buf instanceof Blob)) {
                return reject('bufferToImage - expected buf to be of type: Blob');
            }
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result !== 'string') {
                    return reject('bufferToImage - expected reader.result to be a string, in onload');
                }
                const img = env.getEnv().createImageElement();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(buf);
        });
    }

    function getMediaDimensions(input) {
        const { Image, Video } = env.getEnv();
        if (input instanceof Image) {
            return new Dimensions(input.naturalWidth, input.naturalHeight);
        }
        if (input instanceof Video) {
            return new Dimensions(input.videoWidth, input.videoHeight);
        }
        return new Dimensions(input.width, input.height);
    }

    function createCanvas({ width, height }) {
        const { createCanvasElement } = env.getEnv();
        const canvas = createCanvasElement();
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
    function createCanvasFromMedia(media, dims) {
        const { ImageData } = env.getEnv();
        if (!(media instanceof ImageData) && !isMediaLoaded(media)) {
            throw new Error('createCanvasFromMedia - media has not finished loading yet');
        }
        const { width, height } = dims || getMediaDimensions(media);
        const canvas = createCanvas({ width, height });
        if (media instanceof ImageData) {
            getContext2dOrThrow(canvas).putImageData(media, 0, 0);
        }
        else {
            getContext2dOrThrow(canvas).drawImage(media, 0, 0, width, height);
        }
        return canvas;
    }

    async function imageTensorToCanvas(imgTensor, canvas) {
        const targetCanvas = canvas || env.getEnv().createCanvasElement();
        const [height, width, numChannels] = imgTensor.shape.slice(isTensor4D(imgTensor) ? 1 : 0);
        const imgTensor3D = tf__namespace.tidy(() => tf__namespace.cast(tf__namespace.reshape(imgTensor, [height, width, numChannels]), 'int32'));
        await tf__namespace.browser.toPixels(imgTensor3D, targetCanvas);
        imgTensor3D.dispose();
        return targetCanvas;
    }

    function isMediaElement(input) {
        const { Image, Canvas, Video } = env.getEnv();
        return input instanceof Image
            || input instanceof Canvas
            || input instanceof Video;
    }

    function imageToSquare(input, inputSize, centerImage = false) {
        const { Image, Canvas } = env.getEnv();
        if (!(input instanceof Image || input instanceof Canvas)) {
            throw new Error('imageToSquare - expected arg0 to be HTMLImageElement | HTMLCanvasElement');
        }
        const dims = getMediaDimensions(input);
        const scale = inputSize / Math.max(dims.height, dims.width);
        const width = scale * dims.width;
        const height = scale * dims.height;
        const targetCanvas = createCanvas({ width: inputSize, height: inputSize });
        const inputCanvas = input instanceof Canvas ? input : createCanvasFromMedia(input);
        const offset = Math.abs(width - height) / 2;
        const dx = centerImage && width < height ? offset : 0;
        const dy = centerImage && height < width ? offset : 0;
        getContext2dOrThrow(targetCanvas).drawImage(inputCanvas, dx, dy, width, height);
        return targetCanvas;
    }

    class NetInput {
        constructor(inputs, treatAsBatchInput = false) {
            this._imageTensors = [];
            this._canvases = [];
            this._treatAsBatchInput = false;
            this._inputDimensions = [];
            if (!Array.isArray(inputs)) {
                throw new Error(`NetInput.constructor - expected inputs to be an Array of TResolvedNetInput or to be instanceof tf.Tensor4D, instead have ${inputs}`);
            }
            this._treatAsBatchInput = treatAsBatchInput;
            this._batchSize = inputs.length;
            inputs.forEach((input, idx) => {
                if (isTensor3D(input)) {
                    this._imageTensors[idx] = input;
                    this._inputDimensions[idx] = input.shape;
                    return;
                }
                if (isTensor4D(input)) {
                    const batchSize = input.shape[0];
                    if (batchSize !== 1) {
                        throw new Error(`NetInput - tf.Tensor4D with batchSize ${batchSize} passed, but not supported in input array`);
                    }
                    this._imageTensors[idx] = input;
                    this._inputDimensions[idx] = input.shape.slice(1);
                    return;
                }
                const canvas = input instanceof env.getEnv().Canvas ? input : createCanvasFromMedia(input);
                this._canvases[idx] = canvas;
                this._inputDimensions[idx] = [canvas.height, canvas.width, 3];
            });
        }
        get imageTensors() {
            return this._imageTensors;
        }
        get canvases() {
            return this._canvases;
        }
        get isBatchInput() {
            return this.batchSize > 1 || this._treatAsBatchInput;
        }
        get batchSize() {
            return this._batchSize;
        }
        get inputDimensions() {
            return this._inputDimensions;
        }
        get inputSize() {
            return this._inputSize;
        }
        get reshapedInputDimensions() {
            return range(this.batchSize, 0, 1).map((_, batchIdx) => this.getReshapedInputDimensions(batchIdx));
        }
        getInput(batchIdx) {
            return this.canvases[batchIdx] || this.imageTensors[batchIdx];
        }
        getInputDimensions(batchIdx) {
            return this._inputDimensions[batchIdx];
        }
        getInputHeight(batchIdx) {
            return this._inputDimensions[batchIdx][0];
        }
        getInputWidth(batchIdx) {
            return this._inputDimensions[batchIdx][1];
        }
        getReshapedInputDimensions(batchIdx) {
            if (typeof this.inputSize !== 'number') {
                throw new Error('getReshapedInputDimensions - inputSize not set, toBatchTensor has not been called yet');
            }
            const width = this.getInputWidth(batchIdx);
            const height = this.getInputHeight(batchIdx);
            return computeReshapedDimensions({ width, height }, this.inputSize);
        }
        /**
         * Create a batch tensor from all input canvases and tensors
         * with size [batchSize, inputSize, inputSize, 3].
         *
         * @param inputSize Height and width of the tensor.
         * @param isCenterImage (optional, default: false) If true, add an equal amount of padding on
         * both sides of the minor dimension oof the image.
         * @returns The batch tensor.
         */
        toBatchTensor(inputSize, isCenterInputs = true) {
            this._inputSize = inputSize;
            return tf__namespace.tidy(() => {
                const inputTensors = range(this.batchSize, 0, 1).map(batchIdx => {
                    const input = this.getInput(batchIdx);
                    if (input instanceof tf__namespace.Tensor) {
                        let imgTensor = isTensor4D(input) ? input : tf__namespace.expandDims(input);
                        imgTensor = padToSquare(imgTensor, isCenterInputs);
                        if (imgTensor.shape[1] !== inputSize || imgTensor.shape[2] !== inputSize) {
                            imgTensor = tf__namespace.image.resizeBilinear(imgTensor, [inputSize, inputSize]);
                        }
                        return tf__namespace.reshape(imgTensor, [inputSize, inputSize, 3]);
                    }
                    if (input instanceof env.getEnv().Canvas) {
                        return tf__namespace.browser.fromPixels(imageToSquare(input, inputSize, isCenterInputs));
                    }
                    throw new Error(`toBatchTensor - at batchIdx ${batchIdx}, expected input to be instanceof tf.Tensor or instanceof HTMLCanvasElement, instead have ${input}`);
                });
                const batchTensor = tf__namespace.reshape(tf__namespace.stack(inputTensors.map(t => tf__namespace.cast(t, 'float32'))), [this.batchSize, inputSize, inputSize, 3]);
                return batchTensor;
            });
        }
    }

    /**
     * Validates the input to make sure, they are valid net inputs and awaits all media elements
     * to be finished loading.
     *
     * @param input The input, which can be a media element or an array of different media elements.
     * @returns A NetInput instance, which can be passed into one of the neural networks.
     */
    async function toNetInput(inputs) {
        if (inputs instanceof NetInput) {
            return inputs;
        }
        let inputArgArray = Array.isArray(inputs)
            ? inputs
            : [inputs];
        if (!inputArgArray.length) {
            throw new Error('toNetInput - empty array passed as input');
        }
        const getIdxHint = (idx) => Array.isArray(inputs) ? ` at input index ${idx}:` : '';
        const inputArray = inputArgArray.map(resolveInput);
        inputArray.forEach((input, i) => {
            if (!isMediaElement(input) && !isTensor3D(input) && !isTensor4D(input)) {
                if (typeof inputArgArray[i] === 'string') {
                    throw new Error(`toNetInput -${getIdxHint(i)} string passed, but could not resolve HTMLElement for element id ${inputArgArray[i]}`);
                }
                throw new Error(`toNetInput -${getIdxHint(i)} expected media to be of type HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | tf.Tensor3D, or to be an element id`);
            }
            if (isTensor4D(input)) {
                // if tf.Tensor4D is passed in the input array, the batch size has to be 1
                const batchSize = input.shape[0];
                if (batchSize !== 1) {
                    throw new Error(`toNetInput -${getIdxHint(i)} tf.Tensor4D with batchSize ${batchSize} passed, but not supported in input array`);
                }
            }
        });
        // wait for all media elements being loaded
        await Promise.all(inputArray.map(input => isMediaElement(input) && awaitMediaLoaded(input)));
        return new NetInput(inputArray, Array.isArray(inputs));
    }

    /**
     * Extracts the image regions containing the detected faces.
     *
     * @param input The image that face detection has been performed on.
     * @param detections The face detection results or face bounding boxes for that image.
     * @returns The Canvases of the corresponding image region for each detected face.
     */
    async function extractFaces(input, detections) {
        const { Canvas } = env.getEnv();
        let canvas = input;
        if (!(input instanceof Canvas)) {
            const netInput = await toNetInput(input);
            if (netInput.batchSize > 1) {
                throw new Error('extractFaces - batchSize > 1 not supported');
            }
            const tensorOrCanvas = netInput.getInput(0);
            canvas = tensorOrCanvas instanceof Canvas
                ? tensorOrCanvas
                : await imageTensorToCanvas(tensorOrCanvas);
        }
        const ctx = getContext2dOrThrow(canvas);
        const boxes = detections.map(det => det instanceof FaceDetection
            ? det.forSize(canvas.width, canvas.height).box.floor()
            : det)
            .map(box => box.clipAtImageBorders(canvas.width, canvas.height));
        return boxes.map(({ x, y, width, height }) => {
            const faceImg = createCanvas({ width, height });
            getContext2dOrThrow(faceImg)
                .putImageData(ctx.getImageData(x, y, width, height), 0, 0);
            return faceImg;
        });
    }

    /**
     * Extracts the tensors of the image regions containing the detected faces.
     * Useful if you want to compute the face descriptors for the face images.
     * Using this method is faster then extracting a canvas for each face and
     * converting them to tensors individually.
     *
     * @param imageTensor The image tensor that face detection has been performed on.
     * @param detections The face detection results or face bounding boxes for that image.
     * @returns Tensors of the corresponding image region for each detected face.
     */
    async function extractFaceTensors(imageTensor, detections) {
        if (!isTensor3D(imageTensor) && !isTensor4D(imageTensor)) {
            throw new Error('extractFaceTensors - expected image tensor to be 3D or 4D');
        }
        if (isTensor4D(imageTensor) && imageTensor.shape[0] > 1) {
            throw new Error('extractFaceTensors - batchSize > 1 not supported');
        }
        return tf__namespace.tidy(() => {
            const [imgHeight, imgWidth, numChannels] = imageTensor.shape.slice(isTensor4D(imageTensor) ? 1 : 0);
            const boxes = detections.map(det => det instanceof FaceDetection
                ? det.forSize(imgWidth, imgHeight).box
                : det)
                .map(box => box.clipAtImageBorders(imgWidth, imgHeight));
            const faceTensors = boxes.map(({ x, y, width, height }) => tf__namespace.slice(tf__namespace.reshape(imageTensor, [imgHeight, imgWidth, numChannels]), [y, x, 0], [height, width, numChannels]));
            return faceTensors;
        });
    }

    async function fetchOrThrow(url, init) {
        const fetch = env.getEnv().fetch;
        const res = await fetch(url, init);
        if (!(res.status < 400)) {
            throw new Error(`failed to fetch: (${res.status}) ${res.statusText}, from url: ${res.url}`);
        }
        return res;
    }

    async function fetchImage(uri) {
        const res = await fetchOrThrow(uri);
        const blob = await (res).blob();
        if (!blob.type.startsWith('image/')) {
            throw new Error(`fetchImage - expected blob type to be of type image/*, instead have: ${blob.type}, for url: ${res.url}`);
        }
        return bufferToImage(blob);
    }

    async function fetchJson(uri) {
        return (await fetchOrThrow(uri)).json();
    }

    async function fetchNetWeights(uri) {
        return new Float32Array(await (await fetchOrThrow(uri)).arrayBuffer());
    }

    function getModelUris(uri, defaultModelName) {
        const defaultManifestFilename = `${defaultModelName}-weights_manifest.json`;
        if (!uri) {
            return {
                modelBaseUri: '',
                manifestUri: defaultManifestFilename
            };
        }
        if (uri === '/') {
            return {
                modelBaseUri: '/',
                manifestUri: `/${defaultManifestFilename}`
            };
        }
        const protocol = uri.startsWith('http://') ? 'http://' : uri.startsWith('https://') ? 'https://' : '';
        uri = uri.replace(protocol, '');
        const parts = uri.split('/').filter(s => s);
        const manifestFile = uri.endsWith('.json')
            ? parts[parts.length - 1]
            : defaultManifestFilename;
        let modelBaseUri = protocol + (uri.endsWith('.json') ? parts.slice(0, parts.length - 1) : parts).join('/');
        modelBaseUri = uri.startsWith('/') ? `/${modelBaseUri}` : modelBaseUri;
        return {
            modelBaseUri,
            manifestUri: modelBaseUri === '/' ? `/${manifestFile}` : `${modelBaseUri}/${manifestFile}`
        };
    }

    async function loadWeightMap(uri, defaultModelName) {
        const { manifestUri, modelBaseUri } = getModelUris(uri, defaultModelName);
        const manifest = await fetchJson(manifestUri);
        return tf__namespace.io.loadWeights(manifest, modelBaseUri);
    }

    function matchDimensions(input, reference, useMediaDimensions = false) {
        const { width, height } = useMediaDimensions
            ? getMediaDimensions(reference)
            : reference;
        input.width = width;
        input.height = height;
        return { width, height };
    }

    class NeuralNetwork {
        constructor(_name) {
            this._name = _name;
            this._params = undefined;
            this._paramMappings = [];
        }
        get params() { return this._params; }
        get paramMappings() { return this._paramMappings; }
        get isLoaded() { return !!this.params; }
        getParamFromPath(paramPath) {
            const { obj, objProp } = this.traversePropertyPath(paramPath);
            return obj[objProp];
        }
        reassignParamFromPath(paramPath, tensor) {
            const { obj, objProp } = this.traversePropertyPath(paramPath);
            obj[objProp].dispose();
            obj[objProp] = tensor;
        }
        getParamList() {
            return this._paramMappings.map(({ paramPath }) => ({
                path: paramPath,
                tensor: this.getParamFromPath(paramPath)
            }));
        }
        getTrainableParams() {
            return this.getParamList().filter(param => param.tensor instanceof tf__namespace.Variable);
        }
        getFrozenParams() {
            return this.getParamList().filter(param => !(param.tensor instanceof tf__namespace.Variable));
        }
        variable() {
            this.getFrozenParams().forEach(({ path, tensor }) => {
                this.reassignParamFromPath(path, tensor.variable());
            });
        }
        freeze() {
            this.getTrainableParams().forEach(({ path, tensor: variable }) => {
                const tensor = tf__namespace.tensor(variable.dataSync());
                variable.dispose();
                this.reassignParamFromPath(path, tensor);
            });
        }
        dispose(throwOnRedispose = true) {
            this.getParamList().forEach(param => {
                if (throwOnRedispose && param.tensor.isDisposed) {
                    throw new Error(`param tensor has already been disposed for path ${param.path}`);
                }
                param.tensor.dispose();
            });
            this._params = undefined;
        }
        serializeParams() {
            return new Float32Array(this.getParamList()
                .map(({ tensor }) => Array.from(tensor.dataSync()))
                .reduce((flat, arr) => flat.concat(arr)));
        }
        async load(weightsOrUrl) {
            if (weightsOrUrl instanceof Float32Array) {
                this.extractWeights(weightsOrUrl);
                return;
            }
            await this.loadFromUri(weightsOrUrl);
        }
        async loadFromUri(uri) {
            if (uri && typeof uri !== 'string') {
                throw new Error(`${this._name}.loadFromUri - expected model uri`);
            }
            const weightMap = await loadWeightMap(uri, this.getDefaultModelName());
            this.loadFromWeightMap(weightMap);
        }
        async loadFromDisk(filePath) {
            if (filePath && typeof filePath !== 'string') {
                throw new Error(`${this._name}.loadFromDisk - expected model file path`);
            }
            const { readFile } = env.getEnv();
            const { manifestUri, modelBaseUri } = getModelUris(filePath, this.getDefaultModelName());
            const fetchWeightsFromDisk = (filePaths) => Promise.all(filePaths.map(filePath => readFile(filePath).then(buf => buf.buffer)));
            const loadWeights = tf__namespace.io.weightsLoaderFactory(fetchWeightsFromDisk);
            const manifest = JSON.parse((await readFile(manifestUri)).toString());
            const weightMap = await loadWeights(manifest, modelBaseUri);
            this.loadFromWeightMap(weightMap);
        }
        loadFromWeightMap(weightMap) {
            const { paramMappings, params } = this.extractParamsFromWeigthMap(weightMap);
            this._paramMappings = paramMappings;
            this._params = params;
        }
        extractWeights(weights) {
            const { paramMappings, params } = this.extractParams(weights);
            this._paramMappings = paramMappings;
            this._params = params;
        }
        traversePropertyPath(paramPath) {
            if (!this.params) {
                throw new Error(`traversePropertyPath - model has no loaded params`);
            }
            const result = paramPath.split('/').reduce((res, objProp) => {
                if (!res.nextObj.hasOwnProperty(objProp)) {
                    throw new Error(`traversePropertyPath - object does not have property ${objProp}, for path ${paramPath}`);
                }
                return { obj: res.nextObj, objProp, nextObj: res.nextObj[objProp] };
            }, { nextObj: this.params });
            const { obj, objProp } = result;
            if (!obj || !objProp || !(obj[objProp] instanceof tf__namespace.Tensor)) {
                throw new Error(`traversePropertyPath - parameter is not a tensor, for path ${paramPath}`);
            }
            return { obj, objProp };
        }
    }

    function depthwiseSeparableConv$1(x, params, stride) {
        return tf__namespace.tidy(() => {
            let out = tf__namespace.separableConv2d(x, params.depthwise_filter, params.pointwise_filter, stride, 'same');
            out = tf__namespace.add(out, params.bias);
            return out;
        });
    }

    function denseBlock3(x, denseBlockParams, isFirstLayer = false) {
        return tf__namespace.tidy(() => {
            const out1 = tf__namespace.relu(isFirstLayer
                ? tf__namespace.add(tf__namespace.conv2d(x, denseBlockParams.conv0.filters, [2, 2], 'same'), denseBlockParams.conv0.bias)
                : depthwiseSeparableConv$1(x, denseBlockParams.conv0, [2, 2]));
            const out2 = depthwiseSeparableConv$1(out1, denseBlockParams.conv1, [1, 1]);
            const in3 = tf__namespace.relu(tf__namespace.add(out1, out2));
            const out3 = depthwiseSeparableConv$1(in3, denseBlockParams.conv2, [1, 1]);
            return tf__namespace.relu(tf__namespace.add(out1, tf__namespace.add(out2, out3)));
        });
    }
    function denseBlock4(x, denseBlockParams, isFirstLayer = false, isScaleDown = true) {
        return tf__namespace.tidy(() => {
            const out1 = tf__namespace.relu(isFirstLayer
                ? tf__namespace.add(tf__namespace.conv2d(x, denseBlockParams.conv0.filters, isScaleDown ? [2, 2] : [1, 1], 'same'), denseBlockParams.conv0.bias)
                : depthwiseSeparableConv$1(x, denseBlockParams.conv0, isScaleDown ? [2, 2] : [1, 1]));
            const out2 = depthwiseSeparableConv$1(out1, denseBlockParams.conv1, [1, 1]);
            const in3 = tf__namespace.relu(tf__namespace.add(out1, out2));
            const out3 = depthwiseSeparableConv$1(in3, denseBlockParams.conv2, [1, 1]);
            const in4 = tf__namespace.relu(tf__namespace.add(out1, tf__namespace.add(out2, out3)));
            const out4 = depthwiseSeparableConv$1(in4, denseBlockParams.conv3, [1, 1]);
            return tf__namespace.relu(tf__namespace.add(out1, tf__namespace.add(out2, tf__namespace.add(out3, out4))));
        });
    }

    function convLayer$1(x, params, padding = 'same', withRelu = false) {
        return tf__namespace.tidy(() => {
            const out = tf__namespace.add(tf__namespace.conv2d(x, params.filters, [1, 1], padding), params.bias);
            return withRelu ? tf__namespace.relu(out) : out;
        });
    }

    function disposeUnusedWeightTensors(weightMap, paramMappings) {
        Object.keys(weightMap).forEach(path => {
            if (!paramMappings.some(pm => pm.originalPath === path)) {
                weightMap[path].dispose();
            }
        });
    }

    function extractConvParamsFactory(extractWeights, paramMappings) {
        return function (channelsIn, channelsOut, filterSize, mappedPrefix) {
            const filters = tf__namespace.tensor4d(extractWeights(channelsIn * channelsOut * filterSize * filterSize), [filterSize, filterSize, channelsIn, channelsOut]);
            const bias = tf__namespace.tensor1d(extractWeights(channelsOut));
            paramMappings.push({ paramPath: `${mappedPrefix}/filters` }, { paramPath: `${mappedPrefix}/bias` });
            return { filters, bias };
        };
    }

    function extractFCParamsFactory(extractWeights, paramMappings) {
        return function (channelsIn, channelsOut, mappedPrefix) {
            const fc_weights = tf__namespace.tensor2d(extractWeights(channelsIn * channelsOut), [channelsIn, channelsOut]);
            const fc_bias = tf__namespace.tensor1d(extractWeights(channelsOut));
            paramMappings.push({ paramPath: `${mappedPrefix}/weights` }, { paramPath: `${mappedPrefix}/bias` });
            return {
                weights: fc_weights,
                bias: fc_bias
            };
        };
    }

    class SeparableConvParams {
        constructor(depthwise_filter, pointwise_filter, bias) {
            this.depthwise_filter = depthwise_filter;
            this.pointwise_filter = pointwise_filter;
            this.bias = bias;
        }
    }

    function extractSeparableConvParamsFactory(extractWeights, paramMappings) {
        return function (channelsIn, channelsOut, mappedPrefix) {
            const depthwise_filter = tf__namespace.tensor4d(extractWeights(3 * 3 * channelsIn), [3, 3, channelsIn, 1]);
            const pointwise_filter = tf__namespace.tensor4d(extractWeights(channelsIn * channelsOut), [1, 1, channelsIn, channelsOut]);
            const bias = tf__namespace.tensor1d(extractWeights(channelsOut));
            paramMappings.push({ paramPath: `${mappedPrefix}/depthwise_filter` }, { paramPath: `${mappedPrefix}/pointwise_filter` }, { paramPath: `${mappedPrefix}/bias` });
            return new SeparableConvParams(depthwise_filter, pointwise_filter, bias);
        };
    }
    function loadSeparableConvParamsFactory(extractWeightEntry) {
        return function (prefix) {
            const depthwise_filter = extractWeightEntry(`${prefix}/depthwise_filter`, 4);
            const pointwise_filter = extractWeightEntry(`${prefix}/pointwise_filter`, 4);
            const bias = extractWeightEntry(`${prefix}/bias`, 1);
            return new SeparableConvParams(depthwise_filter, pointwise_filter, bias);
        };
    }

    function extractWeightEntryFactory(weightMap, paramMappings) {
        return function (originalPath, paramRank, mappedPath) {
            const tensor = weightMap[originalPath];
            if (!isTensor(tensor, paramRank)) {
                throw new Error(`expected weightMap[${originalPath}] to be a Tensor${paramRank}D, instead have ${tensor}`);
            }
            paramMappings.push({ originalPath, paramPath: mappedPath || originalPath });
            return tensor;
        };
    }

    function extractWeightsFactory(weights) {
        let remainingWeights = weights;
        function extractWeights(numWeights) {
            const ret = remainingWeights.slice(0, numWeights);
            remainingWeights = remainingWeights.slice(numWeights);
            return ret;
        }
        function getRemainingWeights() {
            return remainingWeights;
        }
        return {
            extractWeights,
            getRemainingWeights
        };
    }

    function extractorsFactory$9(extractWeights, paramMappings) {
        const extractConvParams = extractConvParamsFactory(extractWeights, paramMappings);
        const extractSeparableConvParams = extractSeparableConvParamsFactory(extractWeights, paramMappings);
        function extractDenseBlock3Params(channelsIn, channelsOut, mappedPrefix, isFirstLayer = false) {
            const conv0 = isFirstLayer
                ? extractConvParams(channelsIn, channelsOut, 3, `${mappedPrefix}/conv0`)
                : extractSeparableConvParams(channelsIn, channelsOut, `${mappedPrefix}/conv0`);
            const conv1 = extractSeparableConvParams(channelsOut, channelsOut, `${mappedPrefix}/conv1`);
            const conv2 = extractSeparableConvParams(channelsOut, channelsOut, `${mappedPrefix}/conv2`);
            return { conv0, conv1, conv2 };
        }
        function extractDenseBlock4Params(channelsIn, channelsOut, mappedPrefix, isFirstLayer = false) {
            const { conv0, conv1, conv2 } = extractDenseBlock3Params(channelsIn, channelsOut, mappedPrefix, isFirstLayer);
            const conv3 = extractSeparableConvParams(channelsOut, channelsOut, `${mappedPrefix}/conv3`);
            return { conv0, conv1, conv2, conv3 };
        }
        return {
            extractDenseBlock3Params,
            extractDenseBlock4Params
        };
    }

    function extractParams$7(weights) {
        const paramMappings = [];
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const { extractDenseBlock4Params } = extractorsFactory$9(extractWeights, paramMappings);
        const dense0 = extractDenseBlock4Params(3, 32, 'dense0', true);
        const dense1 = extractDenseBlock4Params(32, 64, 'dense1');
        const dense2 = extractDenseBlock4Params(64, 128, 'dense2');
        const dense3 = extractDenseBlock4Params(128, 256, 'dense3');
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        return {
            paramMappings,
            params: { dense0, dense1, dense2, dense3 }
        };
    }

    function loadConvParamsFactory(extractWeightEntry) {
        return function (prefix) {
            const filters = extractWeightEntry(`${prefix}/filters`, 4);
            const bias = extractWeightEntry(`${prefix}/bias`, 1);
            return { filters, bias };
        };
    }

    function loadParamsFactory$1(weightMap, paramMappings) {
        const extractWeightEntry = extractWeightEntryFactory(weightMap, paramMappings);
        const extractConvParams = loadConvParamsFactory(extractWeightEntry);
        const extractSeparableConvParams = loadSeparableConvParamsFactory(extractWeightEntry);
        function extractDenseBlock3Params(prefix, isFirstLayer = false) {
            const conv0 = isFirstLayer
                ? extractConvParams(`${prefix}/conv0`)
                : extractSeparableConvParams(`${prefix}/conv0`);
            const conv1 = extractSeparableConvParams(`${prefix}/conv1`);
            const conv2 = extractSeparableConvParams(`${prefix}/conv2`);
            return { conv0, conv1, conv2 };
        }
        function extractDenseBlock4Params(prefix, isFirstLayer = false) {
            const conv0 = isFirstLayer
                ? extractConvParams(`${prefix}/conv0`)
                : extractSeparableConvParams(`${prefix}/conv0`);
            const conv1 = extractSeparableConvParams(`${prefix}/conv1`);
            const conv2 = extractSeparableConvParams(`${prefix}/conv2`);
            const conv3 = extractSeparableConvParams(`${prefix}/conv3`);
            return { conv0, conv1, conv2, conv3 };
        }
        return {
            extractDenseBlock3Params,
            extractDenseBlock4Params
        };
    }

    function extractParamsFromWeigthMap$7(weightMap) {
        const paramMappings = [];
        const { extractDenseBlock4Params } = loadParamsFactory$1(weightMap, paramMappings);
        const params = {
            dense0: extractDenseBlock4Params('dense0', true),
            dense1: extractDenseBlock4Params('dense1'),
            dense2: extractDenseBlock4Params('dense2'),
            dense3: extractDenseBlock4Params('dense3')
        };
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params, paramMappings };
    }

    class FaceFeatureExtractor extends NeuralNetwork {
        constructor() {
            super('FaceFeatureExtractor');
        }
        forwardInput(input) {
            const { params } = this;
            if (!params) {
                throw new Error('FaceFeatureExtractor - load model before inference');
            }
            return tf__namespace.tidy(() => {
                const batchTensor = input.toBatchTensor(112, true);
                const meanRgb = [122.782, 117.001, 104.298];
                const normalized = tf__namespace.div(normalize$1(batchTensor, meanRgb), tf__namespace.scalar(255));
                let out = denseBlock4(normalized, params.dense0, true);
                out = denseBlock4(out, params.dense1);
                out = denseBlock4(out, params.dense2);
                out = denseBlock4(out, params.dense3);
                out = tf__namespace.avgPool(out, [7, 7], [2, 2], 'valid');
                return out;
            });
        }
        async forward(input) {
            return this.forwardInput(await toNetInput(input));
        }
        getDefaultModelName() {
            return 'face_feature_extractor_model';
        }
        extractParamsFromWeigthMap(weightMap) {
            return extractParamsFromWeigthMap$7(weightMap);
        }
        extractParams(weights) {
            return extractParams$7(weights);
        }
    }

    function fullyConnectedLayer(x, params) {
        return tf__namespace.tidy(() => tf__namespace.add(tf__namespace.matMul(x, params.weights), params.bias));
    }

    function extractParams$6(weights, channelsIn, channelsOut) {
        const paramMappings = [];
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const extractFCParams = extractFCParamsFactory(extractWeights, paramMappings);
        const fc = extractFCParams(channelsIn, channelsOut, 'fc');
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        return {
            paramMappings,
            params: { fc }
        };
    }

    function extractParamsFromWeigthMap$6(weightMap) {
        const paramMappings = [];
        const extractWeightEntry = extractWeightEntryFactory(weightMap, paramMappings);
        function extractFcParams(prefix) {
            const weights = extractWeightEntry(`${prefix}/weights`, 2);
            const bias = extractWeightEntry(`${prefix}/bias`, 1);
            return { weights, bias };
        }
        const params = {
            fc: extractFcParams('fc')
        };
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params, paramMappings };
    }

    function seperateWeightMaps(weightMap) {
        const featureExtractorMap = {};
        const classifierMap = {};
        Object.keys(weightMap).forEach(key => {
            const map = key.startsWith('fc') ? classifierMap : featureExtractorMap;
            map[key] = weightMap[key];
        });
        return { featureExtractorMap, classifierMap };
    }

    class FaceProcessor extends NeuralNetwork {
        constructor(_name, faceFeatureExtractor) {
            super(_name);
            this._faceFeatureExtractor = faceFeatureExtractor;
        }
        get faceFeatureExtractor() {
            return this._faceFeatureExtractor;
        }
        runNet(input) {
            const { params } = this;
            if (!params) {
                throw new Error(`${this._name} - load model before inference`);
            }
            return tf__namespace.tidy(() => {
                const bottleneckFeatures = input instanceof NetInput
                    ? this.faceFeatureExtractor.forwardInput(input)
                    : input;
                return fullyConnectedLayer(tf__namespace.reshape(bottleneckFeatures, [bottleneckFeatures.shape[0], -1]), params.fc);
            });
        }
        dispose(throwOnRedispose = true) {
            this.faceFeatureExtractor.dispose(throwOnRedispose);
            super.dispose(throwOnRedispose);
        }
        loadClassifierParams(weights) {
            const { params, paramMappings } = this.extractClassifierParams(weights);
            this._params = params;
            this._paramMappings = paramMappings;
        }
        extractClassifierParams(weights) {
            return extractParams$6(weights, this.getClassifierChannelsIn(), this.getClassifierChannelsOut());
        }
        extractParamsFromWeigthMap(weightMap) {
            const { featureExtractorMap, classifierMap } = seperateWeightMaps(weightMap);
            this.faceFeatureExtractor.loadFromWeightMap(featureExtractorMap);
            return extractParamsFromWeigthMap$6(classifierMap);
        }
        extractParams(weights) {
            const cIn = this.getClassifierChannelsIn();
            const cOut = this.getClassifierChannelsOut();
            const classifierWeightSize = (cOut * cIn) + cOut;
            const featureExtractorWeights = weights.slice(0, weights.length - classifierWeightSize);
            const classifierWeights = weights.slice(weights.length - classifierWeightSize);
            this.faceFeatureExtractor.extractWeights(featureExtractorWeights);
            return this.extractClassifierParams(classifierWeights);
        }
    }

    const FACE_EXPRESSION_LABELS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];
    class FaceExpressions {
        constructor(probabilities) {
            if (probabilities.length !== 7) {
                throw new Error(`FaceExpressions.constructor - expected probabilities.length to be 7, have: ${probabilities.length}`);
            }
            FACE_EXPRESSION_LABELS.forEach((expression, idx) => {
                this[expression] = probabilities[idx];
            });
        }
        asSortedArray() {
            return FACE_EXPRESSION_LABELS
                .map(expression => ({ expression, probability: this[expression] }))
                .sort((e0, e1) => e1.probability - e0.probability);
        }
    }

    class FaceExpressionNet extends FaceProcessor {
        constructor(faceFeatureExtractor = new FaceFeatureExtractor()) {
            super('FaceExpressionNet', faceFeatureExtractor);
        }
        forwardInput(input) {
            return tf__namespace.tidy(() => tf__namespace.softmax(this.runNet(input)));
        }
        async forward(input) {
            return this.forwardInput(await toNetInput(input));
        }
        async predictExpressions(input) {
            const netInput = await toNetInput(input);
            const out = await this.forwardInput(netInput);
            const probabilitesByBatch = await Promise.all(tf__namespace.unstack(out).map(async (t) => {
                const data = await t.data();
                t.dispose();
                return data;
            }));
            out.dispose();
            const predictionsByBatch = probabilitesByBatch
                .map(probabilites => new FaceExpressions(probabilites));
            return netInput.isBatchInput
                ? predictionsByBatch
                : predictionsByBatch[0];
        }
        getDefaultModelName() {
            return 'face_expression_model';
        }
        getClassifierChannelsIn() {
            return 256;
        }
        getClassifierChannelsOut() {
            return 7;
        }
    }

    function isWithFaceExpressions(obj) {
        return obj['expressions'] instanceof FaceExpressions;
    }
    function extendWithFaceExpressions(sourceObj, expressions) {
        const extension = { expressions };
        return Object.assign({}, sourceObj, extension);
    }

    function drawFaceExpressions(canvasArg, faceExpressions, minConfidence = 0.1, textFieldAnchor) {
        const faceExpressionsArray = Array.isArray(faceExpressions) ? faceExpressions : [faceExpressions];
        faceExpressionsArray.forEach(e => {
            const expr = e instanceof FaceExpressions
                ? e
                : (isWithFaceExpressions(e) ? e.expressions : undefined);
            if (!expr) {
                throw new Error('drawFaceExpressions - expected faceExpressions to be FaceExpressions | WithFaceExpressions<{}> or array thereof');
            }
            const sorted = expr.asSortedArray();
            const resultsToDisplay = sorted.filter(expr => expr.probability > minConfidence);
            const anchor = isWithFaceDetection(e)
                ? e.detection.box.bottomLeft
                : (textFieldAnchor || new Point(0, 0));
            const drawTextField = new DrawTextField(resultsToDisplay.map(expr => `${expr.expression} (${round(expr.probability)})`), anchor);
            drawTextField.draw(canvasArg);
        });
    }

    function isWithFaceLandmarks(obj) {
        return isWithFaceDetection(obj)
            && obj['landmarks'] instanceof FaceLandmarks
            && obj['unshiftedLandmarks'] instanceof FaceLandmarks
            && obj['alignedRect'] instanceof FaceDetection;
    }
    function extendWithFaceLandmarks(sourceObj, unshiftedLandmarks) {
        const { box: shift } = sourceObj.detection;
        const landmarks = unshiftedLandmarks.shiftBy(shift.x, shift.y);
        const rect = landmarks.align();
        const { imageDims } = sourceObj.detection;
        const alignedRect = new FaceDetection(sourceObj.detection.score, rect.rescale(imageDims.reverse()), imageDims);
        const extension = {
            landmarks,
            unshiftedLandmarks,
            alignedRect
        };
        return Object.assign({}, sourceObj, extension);
    }

    class DrawFaceLandmarksOptions {
        constructor(options = {}) {
            const { drawLines = true, drawPoints = true, lineWidth, lineColor, pointSize, pointColor } = options;
            this.drawLines = drawLines;
            this.drawPoints = drawPoints;
            this.lineWidth = lineWidth || 1;
            this.pointSize = pointSize || 2;
            this.lineColor = lineColor || 'rgba(0, 255, 255, 1)';
            this.pointColor = pointColor || 'rgba(255, 0, 255, 1)';
        }
    }
    class DrawFaceLandmarks {
        constructor(faceLandmarks, options = {}) {
            this.faceLandmarks = faceLandmarks;
            this.options = new DrawFaceLandmarksOptions(options);
        }
        draw(canvasArg) {
            const ctx = getContext2dOrThrow(canvasArg);
            const { drawLines, drawPoints, lineWidth, lineColor, pointSize, pointColor } = this.options;
            if (drawLines && this.faceLandmarks instanceof FaceLandmarks68) {
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = lineWidth;
                drawContour(ctx, this.faceLandmarks.getJawOutline());
                drawContour(ctx, this.faceLandmarks.getLeftEyeBrow());
                drawContour(ctx, this.faceLandmarks.getRightEyeBrow());
                drawContour(ctx, this.faceLandmarks.getNose());
                drawContour(ctx, this.faceLandmarks.getLeftEye(), true);
                drawContour(ctx, this.faceLandmarks.getRightEye(), true);
                drawContour(ctx, this.faceLandmarks.getMouth(), true);
            }
            if (drawPoints) {
                ctx.strokeStyle = pointColor;
                ctx.fillStyle = pointColor;
                const drawPoint = (pt) => {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pointSize, 0, 2 * Math.PI);
                    ctx.fill();
                };
                this.faceLandmarks.positions.forEach(drawPoint);
            }
        }
    }
    function drawFaceLandmarks(canvasArg, faceLandmarks) {
        const faceLandmarksArray = Array.isArray(faceLandmarks) ? faceLandmarks : [faceLandmarks];
        faceLandmarksArray.forEach(f => {
            const landmarks = f instanceof FaceLandmarks
                ? f
                : (isWithFaceLandmarks(f) ? f.landmarks : undefined);
            if (!landmarks) {
                throw new Error('drawFaceLandmarks - expected faceExpressions to be FaceLandmarks | WithFaceLandmarks<WithFaceDetection<{}>> or array thereof');
            }
            new DrawFaceLandmarks(landmarks).draw(canvasArg);
        });
    }

    var index = /*#__PURE__*/Object.freeze({
        __proto__: null,
        get AnchorPosition () { return AnchorPosition; },
        DrawBox: DrawBox,
        DrawBoxOptions: DrawBoxOptions,
        DrawFaceLandmarks: DrawFaceLandmarks,
        DrawFaceLandmarksOptions: DrawFaceLandmarksOptions,
        DrawTextField: DrawTextField,
        DrawTextFieldOptions: DrawTextFieldOptions,
        drawContour: drawContour,
        drawDetections: drawDetections,
        drawFaceExpressions: drawFaceExpressions,
        drawFaceLandmarks: drawFaceLandmarks
    });

    function extractorsFactory$8(extractWeights, paramMappings) {
        const extractConvParams = extractConvParamsFactory(extractWeights, paramMappings);
        const extractSeparableConvParams = extractSeparableConvParamsFactory(extractWeights, paramMappings);
        function extractReductionBlockParams(channelsIn, channelsOut, mappedPrefix) {
            const separable_conv0 = extractSeparableConvParams(channelsIn, channelsOut, `${mappedPrefix}/separable_conv0`);
            const separable_conv1 = extractSeparableConvParams(channelsOut, channelsOut, `${mappedPrefix}/separable_conv1`);
            const expansion_conv = extractConvParams(channelsIn, channelsOut, 1, `${mappedPrefix}/expansion_conv`);
            return { separable_conv0, separable_conv1, expansion_conv };
        }
        function extractMainBlockParams(channels, mappedPrefix) {
            const separable_conv0 = extractSeparableConvParams(channels, channels, `${mappedPrefix}/separable_conv0`);
            const separable_conv1 = extractSeparableConvParams(channels, channels, `${mappedPrefix}/separable_conv1`);
            const separable_conv2 = extractSeparableConvParams(channels, channels, `${mappedPrefix}/separable_conv2`);
            return { separable_conv0, separable_conv1, separable_conv2 };
        }
        return {
            extractConvParams,
            extractSeparableConvParams,
            extractReductionBlockParams,
            extractMainBlockParams
        };
    }
    function extractParams$5(weights, numMainBlocks) {
        const paramMappings = [];
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const { extractConvParams, extractSeparableConvParams, extractReductionBlockParams, extractMainBlockParams } = extractorsFactory$8(extractWeights, paramMappings);
        const entry_flow_conv_in = extractConvParams(3, 32, 3, 'entry_flow/conv_in');
        const entry_flow_reduction_block_0 = extractReductionBlockParams(32, 64, 'entry_flow/reduction_block_0');
        const entry_flow_reduction_block_1 = extractReductionBlockParams(64, 128, 'entry_flow/reduction_block_1');
        const entry_flow = {
            conv_in: entry_flow_conv_in,
            reduction_block_0: entry_flow_reduction_block_0,
            reduction_block_1: entry_flow_reduction_block_1
        };
        const middle_flow = {};
        range(numMainBlocks, 0, 1).forEach((idx) => {
            middle_flow[`main_block_${idx}`] = extractMainBlockParams(128, `middle_flow/main_block_${idx}`);
        });
        const exit_flow_reduction_block = extractReductionBlockParams(128, 256, 'exit_flow/reduction_block');
        const exit_flow_separable_conv = extractSeparableConvParams(256, 512, 'exit_flow/separable_conv');
        const exit_flow = {
            reduction_block: exit_flow_reduction_block,
            separable_conv: exit_flow_separable_conv
        };
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        return {
            paramMappings,
            params: { entry_flow, middle_flow, exit_flow }
        };
    }

    function loadParamsFactory(weightMap, paramMappings) {
        const extractWeightEntry = extractWeightEntryFactory(weightMap, paramMappings);
        const extractConvParams = loadConvParamsFactory(extractWeightEntry);
        const extractSeparableConvParams = loadSeparableConvParamsFactory(extractWeightEntry);
        function extractReductionBlockParams(mappedPrefix) {
            const separable_conv0 = extractSeparableConvParams(`${mappedPrefix}/separable_conv0`);
            const separable_conv1 = extractSeparableConvParams(`${mappedPrefix}/separable_conv1`);
            const expansion_conv = extractConvParams(`${mappedPrefix}/expansion_conv`);
            return { separable_conv0, separable_conv1, expansion_conv };
        }
        function extractMainBlockParams(mappedPrefix) {
            const separable_conv0 = extractSeparableConvParams(`${mappedPrefix}/separable_conv0`);
            const separable_conv1 = extractSeparableConvParams(`${mappedPrefix}/separable_conv1`);
            const separable_conv2 = extractSeparableConvParams(`${mappedPrefix}/separable_conv2`);
            return { separable_conv0, separable_conv1, separable_conv2 };
        }
        return {
            extractConvParams,
            extractSeparableConvParams,
            extractReductionBlockParams,
            extractMainBlockParams
        };
    }
    function extractParamsFromWeigthMap$5(weightMap, numMainBlocks) {
        const paramMappings = [];
        const { extractConvParams, extractSeparableConvParams, extractReductionBlockParams, extractMainBlockParams } = loadParamsFactory(weightMap, paramMappings);
        const entry_flow_conv_in = extractConvParams('entry_flow/conv_in');
        const entry_flow_reduction_block_0 = extractReductionBlockParams('entry_flow/reduction_block_0');
        const entry_flow_reduction_block_1 = extractReductionBlockParams('entry_flow/reduction_block_1');
        const entry_flow = {
            conv_in: entry_flow_conv_in,
            reduction_block_0: entry_flow_reduction_block_0,
            reduction_block_1: entry_flow_reduction_block_1
        };
        const middle_flow = {};
        range(numMainBlocks, 0, 1).forEach((idx) => {
            middle_flow[`main_block_${idx}`] = extractMainBlockParams(`middle_flow/main_block_${idx}`);
        });
        const exit_flow_reduction_block = extractReductionBlockParams('exit_flow/reduction_block');
        const exit_flow_separable_conv = extractSeparableConvParams('exit_flow/separable_conv');
        const exit_flow = {
            reduction_block: exit_flow_reduction_block,
            separable_conv: exit_flow_separable_conv
        };
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params: { entry_flow, middle_flow, exit_flow }, paramMappings };
    }

    function conv$1(x, params, stride) {
        return tf__namespace.add(tf__namespace.conv2d(x, params.filters, stride, 'same'), params.bias);
    }
    function reductionBlock(x, params, isActivateInput = true) {
        let out = isActivateInput ? tf__namespace.relu(x) : x;
        out = depthwiseSeparableConv$1(out, params.separable_conv0, [1, 1]);
        out = depthwiseSeparableConv$1(tf__namespace.relu(out), params.separable_conv1, [1, 1]);
        out = tf__namespace.maxPool(out, [3, 3], [2, 2], 'same');
        out = tf__namespace.add(out, conv$1(x, params.expansion_conv, [2, 2]));
        return out;
    }
    function mainBlock(x, params) {
        let out = depthwiseSeparableConv$1(tf__namespace.relu(x), params.separable_conv0, [1, 1]);
        out = depthwiseSeparableConv$1(tf__namespace.relu(out), params.separable_conv1, [1, 1]);
        out = depthwiseSeparableConv$1(tf__namespace.relu(out), params.separable_conv2, [1, 1]);
        out = tf__namespace.add(out, x);
        return out;
    }
    class TinyXception extends NeuralNetwork {
        constructor(numMainBlocks) {
            super('TinyXception');
            this._numMainBlocks = numMainBlocks;
        }
        forwardInput(input) {
            const { params } = this;
            if (!params) {
                throw new Error('TinyXception - load model before inference');
            }
            return tf__namespace.tidy(() => {
                const batchTensor = input.toBatchTensor(112, true);
                const meanRgb = [122.782, 117.001, 104.298];
                const normalized = tf__namespace.div(normalize$1(batchTensor, meanRgb), tf__namespace.scalar(256));
                let out = tf__namespace.relu(conv$1(normalized, params.entry_flow.conv_in, [2, 2]));
                out = reductionBlock(out, params.entry_flow.reduction_block_0, false);
                out = reductionBlock(out, params.entry_flow.reduction_block_1);
                range(this._numMainBlocks, 0, 1).forEach((idx) => {
                    out = mainBlock(out, params.middle_flow[`main_block_${idx}`]);
                });
                out = reductionBlock(out, params.exit_flow.reduction_block);
                out = tf__namespace.relu(depthwiseSeparableConv$1(out, params.exit_flow.separable_conv, [1, 1]));
                return out;
            });
        }
        async forward(input) {
            return this.forwardInput(await toNetInput(input));
        }
        getDefaultModelName() {
            return 'tiny_xception_model';
        }
        extractParamsFromWeigthMap(weightMap) {
            return extractParamsFromWeigthMap$5(weightMap, this._numMainBlocks);
        }
        extractParams(weights) {
            return extractParams$5(weights, this._numMainBlocks);
        }
    }

    function extractParams$4(weights) {
        const paramMappings = [];
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const extractFCParams = extractFCParamsFactory(extractWeights, paramMappings);
        const age = extractFCParams(512, 1, 'fc/age');
        const gender = extractFCParams(512, 2, 'fc/gender');
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        return {
            paramMappings,
            params: { fc: { age, gender } }
        };
    }

    function extractParamsFromWeigthMap$4(weightMap) {
        const paramMappings = [];
        const extractWeightEntry = extractWeightEntryFactory(weightMap, paramMappings);
        function extractFcParams(prefix) {
            const weights = extractWeightEntry(`${prefix}/weights`, 2);
            const bias = extractWeightEntry(`${prefix}/bias`, 1);
            return { weights, bias };
        }
        const params = {
            fc: {
                age: extractFcParams('fc/age'),
                gender: extractFcParams('fc/gender')
            }
        };
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params, paramMappings };
    }

    exports.Gender = void 0;
    (function (Gender) {
        Gender["FEMALE"] = "female";
        Gender["MALE"] = "male";
    })(exports.Gender || (exports.Gender = {}));

    class AgeGenderNet extends NeuralNetwork {
        constructor(faceFeatureExtractor = new TinyXception(2)) {
            super('AgeGenderNet');
            this._faceFeatureExtractor = faceFeatureExtractor;
        }
        get faceFeatureExtractor() {
            return this._faceFeatureExtractor;
        }
        runNet(input) {
            const { params } = this;
            if (!params) {
                throw new Error(`${this._name} - load model before inference`);
            }
            return tf__namespace.tidy(() => {
                const bottleneckFeatures = input instanceof NetInput
                    ? this.faceFeatureExtractor.forwardInput(input)
                    : input;
                const pooled = tf__namespace.reshape(tf__namespace.avgPool(bottleneckFeatures, [7, 7], [2, 2], 'valid'), [bottleneckFeatures.shape[0], -1]);
                const age = tf__namespace.reshape(fullyConnectedLayer(pooled, params.fc.age), [pooled.shape[0]]);
                const gender = fullyConnectedLayer(pooled, params.fc.gender);
                return { age, gender };
            });
        }
        forwardInput(input) {
            return tf__namespace.tidy(() => {
                const { age, gender } = this.runNet(input);
                return { age, gender: tf__namespace.softmax(gender) };
            });
        }
        async forward(input) {
            return this.forwardInput(await toNetInput(input));
        }
        async predictAgeAndGender(input) {
            const netInput = await toNetInput(input);
            const out = await this.forwardInput(netInput);
            const ages = tf__namespace.unstack(out.age);
            const genders = tf__namespace.unstack(out.gender);
            const ageAndGenderTensors = ages.map((ageTensor, i) => ({
                ageTensor,
                genderTensor: genders[i]
            }));
            const predictionsByBatch = await Promise.all(ageAndGenderTensors.map(async ({ ageTensor, genderTensor }) => {
                const age = (await ageTensor.data())[0];
                const probMale = (await genderTensor.data())[0];
                const isMale = probMale > 0.5;
                const gender = isMale ? exports.Gender.MALE : exports.Gender.FEMALE;
                const genderProbability = isMale ? probMale : (1 - probMale);
                ageTensor.dispose();
                genderTensor.dispose();
                return { age, gender, genderProbability };
            }));
            out.age.dispose();
            out.gender.dispose();
            return netInput.isBatchInput
                ? predictionsByBatch
                : predictionsByBatch[0];
        }
        getDefaultModelName() {
            return 'age_gender_model';
        }
        dispose(throwOnRedispose = true) {
            this.faceFeatureExtractor.dispose(throwOnRedispose);
            super.dispose(throwOnRedispose);
        }
        loadClassifierParams(weights) {
            const { params, paramMappings } = this.extractClassifierParams(weights);
            this._params = params;
            this._paramMappings = paramMappings;
        }
        extractClassifierParams(weights) {
            return extractParams$4(weights);
        }
        extractParamsFromWeigthMap(weightMap) {
            const { featureExtractorMap, classifierMap } = seperateWeightMaps(weightMap);
            this.faceFeatureExtractor.loadFromWeightMap(featureExtractorMap);
            return extractParamsFromWeigthMap$4(classifierMap);
        }
        extractParams(weights) {
            const classifierWeightSize = (512 * 1 + 1) + (512 * 2 + 2);
            const featureExtractorWeights = weights.slice(0, weights.length - classifierWeightSize);
            const classifierWeights = weights.slice(weights.length - classifierWeightSize);
            this.faceFeatureExtractor.extractWeights(featureExtractorWeights);
            return this.extractClassifierParams(classifierWeights);
        }
    }

    class FaceLandmark68NetBase extends FaceProcessor {
        postProcess(output, inputSize, originalDimensions) {
            const inputDimensions = originalDimensions.map(({ width, height }) => {
                const scale = inputSize / Math.max(height, width);
                return {
                    width: width * scale,
                    height: height * scale
                };
            });
            const batchSize = inputDimensions.length;
            return tf__namespace.tidy(() => {
                const createInterleavedTensor = (fillX, fillY) => tf__namespace.reshape(tf__namespace.stack([
                    tf__namespace.fill([68], fillX),
                    tf__namespace.fill([68], fillY)
                ], 1), [1, 136]);
                const getPadding = (batchIdx, cond) => {
                    const { width, height } = inputDimensions[batchIdx];
                    return cond(width, height) ? Math.abs(width - height) / 2 : 0;
                };
                const getPaddingX = (batchIdx) => getPadding(batchIdx, (w, h) => w < h);
                const getPaddingY = (batchIdx) => getPadding(batchIdx, (w, h) => h < w);
                const landmarkTensors = tf__namespace.div(tf__namespace.sub(tf__namespace.mul(output, tf__namespace.fill([batchSize, 136], inputSize)), tf__namespace.stack(Array.from(Array(batchSize), (_, batchIdx) => createInterleavedTensor(getPaddingX(batchIdx), getPaddingY(batchIdx))))), tf__namespace.stack(Array.from(Array(batchSize), (_, batchIdx) => createInterleavedTensor(inputDimensions[batchIdx].width, inputDimensions[batchIdx].height))));
                return landmarkTensors;
            });
        }
        forwardInput(input) {
            return tf__namespace.tidy(() => {
                const out = this.runNet(input);
                return this.postProcess(out, input.inputSize, input.inputDimensions.map(([height, width]) => ({ height, width })));
            });
        }
        async forward(input) {
            return this.forwardInput(await toNetInput(input));
        }
        async detectLandmarks(input) {
            const netInput = await toNetInput(input);
            const landmarkTensors = tf__namespace.tidy(() => tf__namespace.unstack(this.forwardInput(netInput)));
            const landmarksForBatch = await Promise.all(landmarkTensors.map(async (landmarkTensor, batchIdx) => {
                const landmarksArray = Array.from(await landmarkTensor.data());
                const xCoords = landmarksArray.filter((_, i) => isEven(i));
                const yCoords = landmarksArray.filter((_, i) => !isEven(i));
                return new FaceLandmarks68(Array(68).fill(0).map((_, i) => new Point(xCoords[i], yCoords[i])), {
                    height: netInput.getInputHeight(batchIdx),
                    width: netInput.getInputWidth(batchIdx),
                });
            }));
            landmarkTensors.forEach(t => t.dispose());
            return netInput.isBatchInput
                ? landmarksForBatch
                : landmarksForBatch[0];
        }
        getClassifierChannelsOut() {
            return 136;
        }
    }

    class FaceLandmark68Net extends FaceLandmark68NetBase {
        constructor(faceFeatureExtractor = new FaceFeatureExtractor()) {
            super('FaceLandmark68Net', faceFeatureExtractor);
        }
        getDefaultModelName() {
            return 'face_landmark_68_model';
        }
        getClassifierChannelsIn() {
            return 256;
        }
    }

    function extractParamsFromWeigthMapTiny(weightMap) {
        const paramMappings = [];
        const { extractDenseBlock3Params } = loadParamsFactory$1(weightMap, paramMappings);
        const params = {
            dense0: extractDenseBlock3Params('dense0', true),
            dense1: extractDenseBlock3Params('dense1'),
            dense2: extractDenseBlock3Params('dense2')
        };
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params, paramMappings };
    }

    function extractParamsTiny(weights) {
        const paramMappings = [];
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const { extractDenseBlock3Params } = extractorsFactory$9(extractWeights, paramMappings);
        const dense0 = extractDenseBlock3Params(3, 32, 'dense0', true);
        const dense1 = extractDenseBlock3Params(32, 64, 'dense1');
        const dense2 = extractDenseBlock3Params(64, 128, 'dense2');
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        return {
            paramMappings,
            params: { dense0, dense1, dense2 }
        };
    }

    class TinyFaceFeatureExtractor extends NeuralNetwork {
        constructor() {
            super('TinyFaceFeatureExtractor');
        }
        forwardInput(input) {
            const { params } = this;
            if (!params) {
                throw new Error('TinyFaceFeatureExtractor - load model before inference');
            }
            return tf__namespace.tidy(() => {
                const batchTensor = input.toBatchTensor(112, true);
                const meanRgb = [122.782, 117.001, 104.298];
                const normalized = tf__namespace.div(normalize$1(batchTensor, meanRgb), tf__namespace.scalar(255));
                let out = denseBlock3(normalized, params.dense0, true);
                out = denseBlock3(out, params.dense1);
                out = denseBlock3(out, params.dense2);
                out = tf__namespace.avgPool(out, [14, 14], [2, 2], 'valid');
                return out;
            });
        }
        async forward(input) {
            return this.forwardInput(await toNetInput(input));
        }
        getDefaultModelName() {
            return 'face_feature_extractor_tiny_model';
        }
        extractParamsFromWeigthMap(weightMap) {
            return extractParamsFromWeigthMapTiny(weightMap);
        }
        extractParams(weights) {
            return extractParamsTiny(weights);
        }
    }

    class FaceLandmark68TinyNet extends FaceLandmark68NetBase {
        constructor(faceFeatureExtractor = new TinyFaceFeatureExtractor()) {
            super('FaceLandmark68TinyNet', faceFeatureExtractor);
        }
        getDefaultModelName() {
            return 'face_landmark_68_tiny_model';
        }
        getClassifierChannelsIn() {
            return 128;
        }
    }

    class FaceLandmarkNet extends FaceLandmark68Net {
    }

    function scale(x, params) {
        return tf__namespace.add(tf__namespace.mul(x, params.weights), params.biases);
    }

    function convLayer(x, params, strides, withRelu, padding = 'same') {
        const { filters, bias } = params.conv;
        let out = tf__namespace.conv2d(x, filters, strides, padding);
        out = tf__namespace.add(out, bias);
        out = scale(out, params.scale);
        return withRelu ? tf__namespace.relu(out) : out;
    }
    function conv(x, params) {
        return convLayer(x, params, [1, 1], true);
    }
    function convNoRelu(x, params) {
        return convLayer(x, params, [1, 1], false);
    }
    function convDown(x, params) {
        return convLayer(x, params, [2, 2], true, 'valid');
    }

    function extractorsFactory$7(extractWeights, paramMappings) {
        function extractFilterValues(numFilterValues, numFilters, filterSize) {
            const weights = extractWeights(numFilterValues);
            const depth = weights.length / (numFilters * filterSize * filterSize);
            if (isFloat(depth)) {
                throw new Error(`depth has to be an integer: ${depth}, weights.length: ${weights.length}, numFilters: ${numFilters}, filterSize: ${filterSize}`);
            }
            return tf__namespace.tidy(() => tf__namespace.transpose(tf__namespace.tensor4d(weights, [numFilters, depth, filterSize, filterSize]), [2, 3, 1, 0]));
        }
        function extractConvParams(numFilterValues, numFilters, filterSize, mappedPrefix) {
            const filters = extractFilterValues(numFilterValues, numFilters, filterSize);
            const bias = tf__namespace.tensor1d(extractWeights(numFilters));
            paramMappings.push({ paramPath: `${mappedPrefix}/filters` }, { paramPath: `${mappedPrefix}/bias` });
            return { filters, bias };
        }
        function extractScaleLayerParams(numWeights, mappedPrefix) {
            const weights = tf__namespace.tensor1d(extractWeights(numWeights));
            const biases = tf__namespace.tensor1d(extractWeights(numWeights));
            paramMappings.push({ paramPath: `${mappedPrefix}/weights` }, { paramPath: `${mappedPrefix}/biases` });
            return {
                weights,
                biases
            };
        }
        function extractConvLayerParams(numFilterValues, numFilters, filterSize, mappedPrefix) {
            const conv = extractConvParams(numFilterValues, numFilters, filterSize, `${mappedPrefix}/conv`);
            const scale = extractScaleLayerParams(numFilters, `${mappedPrefix}/scale`);
            return { conv, scale };
        }
        function extractResidualLayerParams(numFilterValues, numFilters, filterSize, mappedPrefix, isDown = false) {
            const conv1 = extractConvLayerParams((isDown ? 0.5 : 1) * numFilterValues, numFilters, filterSize, `${mappedPrefix}/conv1`);
            const conv2 = extractConvLayerParams(numFilterValues, numFilters, filterSize, `${mappedPrefix}/conv2`);
            return { conv1, conv2 };
        }
        return {
            extractConvLayerParams,
            extractResidualLayerParams
        };
    }
    function extractParams$3(weights) {
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const paramMappings = [];
        const { extractConvLayerParams, extractResidualLayerParams } = extractorsFactory$7(extractWeights, paramMappings);
        const conv32_down = extractConvLayerParams(4704, 32, 7, 'conv32_down');
        const conv32_1 = extractResidualLayerParams(9216, 32, 3, 'conv32_1');
        const conv32_2 = extractResidualLayerParams(9216, 32, 3, 'conv32_2');
        const conv32_3 = extractResidualLayerParams(9216, 32, 3, 'conv32_3');
        const conv64_down = extractResidualLayerParams(36864, 64, 3, 'conv64_down', true);
        const conv64_1 = extractResidualLayerParams(36864, 64, 3, 'conv64_1');
        const conv64_2 = extractResidualLayerParams(36864, 64, 3, 'conv64_2');
        const conv64_3 = extractResidualLayerParams(36864, 64, 3, 'conv64_3');
        const conv128_down = extractResidualLayerParams(147456, 128, 3, 'conv128_down', true);
        const conv128_1 = extractResidualLayerParams(147456, 128, 3, 'conv128_1');
        const conv128_2 = extractResidualLayerParams(147456, 128, 3, 'conv128_2');
        const conv256_down = extractResidualLayerParams(589824, 256, 3, 'conv256_down', true);
        const conv256_1 = extractResidualLayerParams(589824, 256, 3, 'conv256_1');
        const conv256_2 = extractResidualLayerParams(589824, 256, 3, 'conv256_2');
        const conv256_down_out = extractResidualLayerParams(589824, 256, 3, 'conv256_down_out');
        const fc = tf__namespace.tidy(() => tf__namespace.transpose(tf__namespace.tensor2d(extractWeights(256 * 128), [128, 256]), [1, 0]));
        paramMappings.push({ paramPath: `fc` });
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        const params = {
            conv32_down,
            conv32_1,
            conv32_2,
            conv32_3,
            conv64_down,
            conv64_1,
            conv64_2,
            conv64_3,
            conv128_down,
            conv128_1,
            conv128_2,
            conv256_down,
            conv256_1,
            conv256_2,
            conv256_down_out,
            fc
        };
        return { params, paramMappings };
    }

    function extractorsFactory$6(weightMap, paramMappings) {
        const extractWeightEntry = extractWeightEntryFactory(weightMap, paramMappings);
        function extractScaleLayerParams(prefix) {
            const weights = extractWeightEntry(`${prefix}/scale/weights`, 1);
            const biases = extractWeightEntry(`${prefix}/scale/biases`, 1);
            return { weights, biases };
        }
        function extractConvLayerParams(prefix) {
            const filters = extractWeightEntry(`${prefix}/conv/filters`, 4);
            const bias = extractWeightEntry(`${prefix}/conv/bias`, 1);
            const scale = extractScaleLayerParams(prefix);
            return { conv: { filters, bias }, scale };
        }
        function extractResidualLayerParams(prefix) {
            return {
                conv1: extractConvLayerParams(`${prefix}/conv1`),
                conv2: extractConvLayerParams(`${prefix}/conv2`)
            };
        }
        return {
            extractConvLayerParams,
            extractResidualLayerParams
        };
    }
    function extractParamsFromWeigthMap$3(weightMap) {
        const paramMappings = [];
        const { extractConvLayerParams, extractResidualLayerParams } = extractorsFactory$6(weightMap, paramMappings);
        const conv32_down = extractConvLayerParams('conv32_down');
        const conv32_1 = extractResidualLayerParams('conv32_1');
        const conv32_2 = extractResidualLayerParams('conv32_2');
        const conv32_3 = extractResidualLayerParams('conv32_3');
        const conv64_down = extractResidualLayerParams('conv64_down');
        const conv64_1 = extractResidualLayerParams('conv64_1');
        const conv64_2 = extractResidualLayerParams('conv64_2');
        const conv64_3 = extractResidualLayerParams('conv64_3');
        const conv128_down = extractResidualLayerParams('conv128_down');
        const conv128_1 = extractResidualLayerParams('conv128_1');
        const conv128_2 = extractResidualLayerParams('conv128_2');
        const conv256_down = extractResidualLayerParams('conv256_down');
        const conv256_1 = extractResidualLayerParams('conv256_1');
        const conv256_2 = extractResidualLayerParams('conv256_2');
        const conv256_down_out = extractResidualLayerParams('conv256_down_out');
        const fc = weightMap['fc'];
        paramMappings.push({ originalPath: 'fc', paramPath: 'fc' });
        if (!isTensor2D(fc)) {
            throw new Error(`expected weightMap[fc] to be a Tensor2D, instead have ${fc}`);
        }
        const params = {
            conv32_down,
            conv32_1,
            conv32_2,
            conv32_3,
            conv64_down,
            conv64_1,
            conv64_2,
            conv64_3,
            conv128_down,
            conv128_1,
            conv128_2,
            conv256_down,
            conv256_1,
            conv256_2,
            conv256_down_out,
            fc
        };
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params, paramMappings };
    }

    function residual(x, params) {
        let out = conv(x, params.conv1);
        out = convNoRelu(out, params.conv2);
        out = tf__namespace.add(out, x);
        out = tf__namespace.relu(out);
        return out;
    }
    function residualDown(x, params) {
        let out = convDown(x, params.conv1);
        out = convNoRelu(out, params.conv2);
        let pooled = tf__namespace.avgPool(x, 2, 2, 'valid');
        const zeros = tf__namespace.zeros(pooled.shape);
        const isPad = pooled.shape[3] !== out.shape[3];
        const isAdjustShape = pooled.shape[1] !== out.shape[1] || pooled.shape[2] !== out.shape[2];
        if (isAdjustShape) {
            const padShapeX = [...out.shape];
            padShapeX[1] = 1;
            const zerosW = tf__namespace.zeros(padShapeX);
            out = tf__namespace.concat([out, zerosW], 1);
            const padShapeY = [...out.shape];
            padShapeY[2] = 1;
            const zerosH = tf__namespace.zeros(padShapeY);
            out = tf__namespace.concat([out, zerosH], 2);
        }
        pooled = isPad ? tf__namespace.concat([pooled, zeros], 3) : pooled;
        out = tf__namespace.add(pooled, out);
        out = tf__namespace.relu(out);
        return out;
    }

    class FaceRecognitionNet extends NeuralNetwork {
        constructor() {
            super('FaceRecognitionNet');
        }
        forwardInput(input) {
            const { params } = this;
            if (!params) {
                throw new Error('FaceRecognitionNet - load model before inference');
            }
            return tf__namespace.tidy(() => {
                const batchTensor = tf__namespace.cast(input.toBatchTensor(150, true), 'float32');
                const meanRgb = [122.782, 117.001, 104.298];
                const normalized = tf__namespace.div(normalize$1(batchTensor, meanRgb), tf__namespace.scalar(256));
                let out = convDown(normalized, params.conv32_down);
                out = tf__namespace.maxPool(out, [3, 3], 2, 'valid');
                out = residual(out, params.conv32_1);
                out = residual(out, params.conv32_2);
                out = residual(out, params.conv32_3);
                out = residualDown(out, params.conv64_down);
                out = residual(out, params.conv64_1);
                out = residual(out, params.conv64_2);
                out = residual(out, params.conv64_3);
                out = residualDown(out, params.conv128_down);
                out = residual(out, params.conv128_1);
                out = residual(out, params.conv128_2);
                out = residualDown(out, params.conv256_down);
                out = residual(out, params.conv256_1);
                out = residual(out, params.conv256_2);
                out = residualDown(out, params.conv256_down_out);
                const globalAvg = tf__namespace.mean(out, [1, 2]);
                const fullyConnected = tf__namespace.matMul(globalAvg, params.fc);
                return fullyConnected;
            });
        }
        async forward(input) {
            return this.forwardInput(await toNetInput(input));
        }
        async computeFaceDescriptor(input) {
            const netInput = await toNetInput(input);
            const faceDescriptorTensors = tf__namespace.tidy(() => tf__namespace.unstack(this.forwardInput(netInput)));
            const faceDescriptorsForBatch = await Promise.all(faceDescriptorTensors.map(t => t.data()));
            faceDescriptorTensors.forEach(t => t.dispose());
            return netInput.isBatchInput
                ? faceDescriptorsForBatch
                : faceDescriptorsForBatch[0];
        }
        getDefaultModelName() {
            return 'face_recognition_model';
        }
        extractParamsFromWeigthMap(weightMap) {
            return extractParamsFromWeigthMap$3(weightMap);
        }
        extractParams(weights) {
            return extractParams$3(weights);
        }
    }

    function createFaceRecognitionNet(weights) {
        const net = new FaceRecognitionNet();
        net.extractWeights(weights);
        return net;
    }

    function extendWithFaceDescriptor(sourceObj, descriptor) {
        const extension = { descriptor };
        return Object.assign({}, sourceObj, extension);
    }

    function isWithAge(obj) {
        return typeof obj['age'] === 'number';
    }
    function extendWithAge(sourceObj, age) {
        const extension = { age };
        return Object.assign({}, sourceObj, extension);
    }

    function isWithGender(obj) {
        return (obj['gender'] === exports.Gender.MALE || obj['gender'] === exports.Gender.FEMALE)
            && isValidProbablitiy(obj['genderProbability']);
    }
    function extendWithGender(sourceObj, gender, genderProbability) {
        const extension = { gender, genderProbability };
        return Object.assign({}, sourceObj, extension);
    }

    class MtcnnOptions {
        constructor({ minFaceSize, scaleFactor, maxNumScales, scoreThresholds, scaleSteps } = {}) {
            this._name = 'MtcnnOptions';
            this._minFaceSize = minFaceSize || 20;
            this._scaleFactor = scaleFactor || 0.709;
            this._maxNumScales = maxNumScales || 10;
            this._scoreThresholds = scoreThresholds || [0.6, 0.7, 0.7];
            this._scaleSteps = scaleSteps;
            if (typeof this._minFaceSize !== 'number' || this._minFaceSize < 0) {
                throw new Error(`${this._name} - expected minFaceSize to be a number > 0`);
            }
            if (typeof this._scaleFactor !== 'number' || this._scaleFactor <= 0 || this._scaleFactor >= 1) {
                throw new Error(`${this._name} - expected scaleFactor to be a number between 0 and 1`);
            }
            if (typeof this._maxNumScales !== 'number' || this._maxNumScales < 0) {
                throw new Error(`${this._name} - expected maxNumScales to be a number > 0`);
            }
            if (!Array.isArray(this._scoreThresholds)
                || this._scoreThresholds.length !== 3
                || this._scoreThresholds.some(th => typeof th !== 'number')) {
                throw new Error(`${this._name} - expected scoreThresholds to be an array of numbers of length 3`);
            }
            if (this._scaleSteps
                && (!Array.isArray(this._scaleSteps) || this._scaleSteps.some(th => typeof th !== 'number'))) {
                throw new Error(`${this._name} - expected scaleSteps to be an array of numbers`);
            }
        }
        get minFaceSize() { return this._minFaceSize; }
        get scaleFactor() { return this._scaleFactor; }
        get maxNumScales() { return this._maxNumScales; }
        get scoreThresholds() { return this._scoreThresholds; }
        get scaleSteps() { return this._scaleSteps; }
    }

    function extractorsFactory$5(extractWeights, paramMappings) {
        function extractDepthwiseConvParams(numChannels, mappedPrefix) {
            const filters = tf__namespace.tensor4d(extractWeights(3 * 3 * numChannels), [3, 3, numChannels, 1]);
            const batch_norm_scale = tf__namespace.tensor1d(extractWeights(numChannels));
            const batch_norm_offset = tf__namespace.tensor1d(extractWeights(numChannels));
            const batch_norm_mean = tf__namespace.tensor1d(extractWeights(numChannels));
            const batch_norm_variance = tf__namespace.tensor1d(extractWeights(numChannels));
            paramMappings.push({ paramPath: `${mappedPrefix}/filters` }, { paramPath: `${mappedPrefix}/batch_norm_scale` }, { paramPath: `${mappedPrefix}/batch_norm_offset` }, { paramPath: `${mappedPrefix}/batch_norm_mean` }, { paramPath: `${mappedPrefix}/batch_norm_variance` });
            return {
                filters,
                batch_norm_scale,
                batch_norm_offset,
                batch_norm_mean,
                batch_norm_variance
            };
        }
        function extractConvParams(channelsIn, channelsOut, filterSize, mappedPrefix, isPointwiseConv) {
            const filters = tf__namespace.tensor4d(extractWeights(channelsIn * channelsOut * filterSize * filterSize), [filterSize, filterSize, channelsIn, channelsOut]);
            const bias = tf__namespace.tensor1d(extractWeights(channelsOut));
            paramMappings.push({ paramPath: `${mappedPrefix}/filters` }, { paramPath: `${mappedPrefix}/${isPointwiseConv ? 'batch_norm_offset' : 'bias'}` });
            return { filters, bias };
        }
        function extractPointwiseConvParams(channelsIn, channelsOut, filterSize, mappedPrefix) {
            const { filters, bias } = extractConvParams(channelsIn, channelsOut, filterSize, mappedPrefix, true);
            return {
                filters,
                batch_norm_offset: bias
            };
        }
        function extractConvPairParams(channelsIn, channelsOut, mappedPrefix) {
            const depthwise_conv = extractDepthwiseConvParams(channelsIn, `${mappedPrefix}/depthwise_conv`);
            const pointwise_conv = extractPointwiseConvParams(channelsIn, channelsOut, 1, `${mappedPrefix}/pointwise_conv`);
            return { depthwise_conv, pointwise_conv };
        }
        function extractMobilenetV1Params() {
            const conv_0 = extractPointwiseConvParams(3, 32, 3, 'mobilenetv1/conv_0');
            const conv_1 = extractConvPairParams(32, 64, 'mobilenetv1/conv_1');
            const conv_2 = extractConvPairParams(64, 128, 'mobilenetv1/conv_2');
            const conv_3 = extractConvPairParams(128, 128, 'mobilenetv1/conv_3');
            const conv_4 = extractConvPairParams(128, 256, 'mobilenetv1/conv_4');
            const conv_5 = extractConvPairParams(256, 256, 'mobilenetv1/conv_5');
            const conv_6 = extractConvPairParams(256, 512, 'mobilenetv1/conv_6');
            const conv_7 = extractConvPairParams(512, 512, 'mobilenetv1/conv_7');
            const conv_8 = extractConvPairParams(512, 512, 'mobilenetv1/conv_8');
            const conv_9 = extractConvPairParams(512, 512, 'mobilenetv1/conv_9');
            const conv_10 = extractConvPairParams(512, 512, 'mobilenetv1/conv_10');
            const conv_11 = extractConvPairParams(512, 512, 'mobilenetv1/conv_11');
            const conv_12 = extractConvPairParams(512, 1024, 'mobilenetv1/conv_12');
            const conv_13 = extractConvPairParams(1024, 1024, 'mobilenetv1/conv_13');
            return {
                conv_0,
                conv_1,
                conv_2,
                conv_3,
                conv_4,
                conv_5,
                conv_6,
                conv_7,
                conv_8,
                conv_9,
                conv_10,
                conv_11,
                conv_12,
                conv_13
            };
        }
        function extractPredictionLayerParams() {
            const conv_0 = extractPointwiseConvParams(1024, 256, 1, 'prediction_layer/conv_0');
            const conv_1 = extractPointwiseConvParams(256, 512, 3, 'prediction_layer/conv_1');
            const conv_2 = extractPointwiseConvParams(512, 128, 1, 'prediction_layer/conv_2');
            const conv_3 = extractPointwiseConvParams(128, 256, 3, 'prediction_layer/conv_3');
            const conv_4 = extractPointwiseConvParams(256, 128, 1, 'prediction_layer/conv_4');
            const conv_5 = extractPointwiseConvParams(128, 256, 3, 'prediction_layer/conv_5');
            const conv_6 = extractPointwiseConvParams(256, 64, 1, 'prediction_layer/conv_6');
            const conv_7 = extractPointwiseConvParams(64, 128, 3, 'prediction_layer/conv_7');
            const box_encoding_0_predictor = extractConvParams(512, 12, 1, 'prediction_layer/box_predictor_0/box_encoding_predictor');
            const class_predictor_0 = extractConvParams(512, 9, 1, 'prediction_layer/box_predictor_0/class_predictor');
            const box_encoding_1_predictor = extractConvParams(1024, 24, 1, 'prediction_layer/box_predictor_1/box_encoding_predictor');
            const class_predictor_1 = extractConvParams(1024, 18, 1, 'prediction_layer/box_predictor_1/class_predictor');
            const box_encoding_2_predictor = extractConvParams(512, 24, 1, 'prediction_layer/box_predictor_2/box_encoding_predictor');
            const class_predictor_2 = extractConvParams(512, 18, 1, 'prediction_layer/box_predictor_2/class_predictor');
            const box_encoding_3_predictor = extractConvParams(256, 24, 1, 'prediction_layer/box_predictor_3/box_encoding_predictor');
            const class_predictor_3 = extractConvParams(256, 18, 1, 'prediction_layer/box_predictor_3/class_predictor');
            const box_encoding_4_predictor = extractConvParams(256, 24, 1, 'prediction_layer/box_predictor_4/box_encoding_predictor');
            const class_predictor_4 = extractConvParams(256, 18, 1, 'prediction_layer/box_predictor_4/class_predictor');
            const box_encoding_5_predictor = extractConvParams(128, 24, 1, 'prediction_layer/box_predictor_5/box_encoding_predictor');
            const class_predictor_5 = extractConvParams(128, 18, 1, 'prediction_layer/box_predictor_5/class_predictor');
            const box_predictor_0 = {
                box_encoding_predictor: box_encoding_0_predictor,
                class_predictor: class_predictor_0
            };
            const box_predictor_1 = {
                box_encoding_predictor: box_encoding_1_predictor,
                class_predictor: class_predictor_1
            };
            const box_predictor_2 = {
                box_encoding_predictor: box_encoding_2_predictor,
                class_predictor: class_predictor_2
            };
            const box_predictor_3 = {
                box_encoding_predictor: box_encoding_3_predictor,
                class_predictor: class_predictor_3
            };
            const box_predictor_4 = {
                box_encoding_predictor: box_encoding_4_predictor,
                class_predictor: class_predictor_4
            };
            const box_predictor_5 = {
                box_encoding_predictor: box_encoding_5_predictor,
                class_predictor: class_predictor_5
            };
            return {
                conv_0,
                conv_1,
                conv_2,
                conv_3,
                conv_4,
                conv_5,
                conv_6,
                conv_7,
                box_predictor_0,
                box_predictor_1,
                box_predictor_2,
                box_predictor_3,
                box_predictor_4,
                box_predictor_5
            };
        }
        return {
            extractMobilenetV1Params,
            extractPredictionLayerParams
        };
    }
    function extractParams$2(weights) {
        const paramMappings = [];
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const { extractMobilenetV1Params, extractPredictionLayerParams } = extractorsFactory$5(extractWeights, paramMappings);
        const mobilenetv1 = extractMobilenetV1Params();
        const prediction_layer = extractPredictionLayerParams();
        const extra_dim = tf__namespace.tensor3d(extractWeights(5118 * 4), [1, 5118, 4]);
        const output_layer = {
            extra_dim
        };
        paramMappings.push({ paramPath: 'output_layer/extra_dim' });
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        return {
            params: {
                mobilenetv1,
                prediction_layer,
                output_layer
            },
            paramMappings
        };
    }

    function extractorsFactory$4(weightMap, paramMappings) {
        const extractWeightEntry = extractWeightEntryFactory(weightMap, paramMappings);
        function extractPointwiseConvParams(prefix, idx, mappedPrefix) {
            const filters = extractWeightEntry(`${prefix}/Conv2d_${idx}_pointwise/weights`, 4, `${mappedPrefix}/filters`);
            const batch_norm_offset = extractWeightEntry(`${prefix}/Conv2d_${idx}_pointwise/convolution_bn_offset`, 1, `${mappedPrefix}/batch_norm_offset`);
            return { filters, batch_norm_offset };
        }
        function extractConvPairParams(idx) {
            const mappedPrefix = `mobilenetv1/conv_${idx}`;
            const prefixDepthwiseConv = `MobilenetV1/Conv2d_${idx}_depthwise`;
            const mappedPrefixDepthwiseConv = `${mappedPrefix}/depthwise_conv`;
            const mappedPrefixPointwiseConv = `${mappedPrefix}/pointwise_conv`;
            const filters = extractWeightEntry(`${prefixDepthwiseConv}/depthwise_weights`, 4, `${mappedPrefixDepthwiseConv}/filters`);
            const batch_norm_scale = extractWeightEntry(`${prefixDepthwiseConv}/BatchNorm/gamma`, 1, `${mappedPrefixDepthwiseConv}/batch_norm_scale`);
            const batch_norm_offset = extractWeightEntry(`${prefixDepthwiseConv}/BatchNorm/beta`, 1, `${mappedPrefixDepthwiseConv}/batch_norm_offset`);
            const batch_norm_mean = extractWeightEntry(`${prefixDepthwiseConv}/BatchNorm/moving_mean`, 1, `${mappedPrefixDepthwiseConv}/batch_norm_mean`);
            const batch_norm_variance = extractWeightEntry(`${prefixDepthwiseConv}/BatchNorm/moving_variance`, 1, `${mappedPrefixDepthwiseConv}/batch_norm_variance`);
            return {
                depthwise_conv: {
                    filters,
                    batch_norm_scale,
                    batch_norm_offset,
                    batch_norm_mean,
                    batch_norm_variance
                },
                pointwise_conv: extractPointwiseConvParams('MobilenetV1', idx, mappedPrefixPointwiseConv)
            };
        }
        function extractMobilenetV1Params() {
            return {
                conv_0: extractPointwiseConvParams('MobilenetV1', 0, 'mobilenetv1/conv_0'),
                conv_1: extractConvPairParams(1),
                conv_2: extractConvPairParams(2),
                conv_3: extractConvPairParams(3),
                conv_4: extractConvPairParams(4),
                conv_5: extractConvPairParams(5),
                conv_6: extractConvPairParams(6),
                conv_7: extractConvPairParams(7),
                conv_8: extractConvPairParams(8),
                conv_9: extractConvPairParams(9),
                conv_10: extractConvPairParams(10),
                conv_11: extractConvPairParams(11),
                conv_12: extractConvPairParams(12),
                conv_13: extractConvPairParams(13)
            };
        }
        function extractConvParams(prefix, mappedPrefix) {
            const filters = extractWeightEntry(`${prefix}/weights`, 4, `${mappedPrefix}/filters`);
            const bias = extractWeightEntry(`${prefix}/biases`, 1, `${mappedPrefix}/bias`);
            return { filters, bias };
        }
        function extractBoxPredictorParams(idx) {
            const box_encoding_predictor = extractConvParams(`Prediction/BoxPredictor_${idx}/BoxEncodingPredictor`, `prediction_layer/box_predictor_${idx}/box_encoding_predictor`);
            const class_predictor = extractConvParams(`Prediction/BoxPredictor_${idx}/ClassPredictor`, `prediction_layer/box_predictor_${idx}/class_predictor`);
            return { box_encoding_predictor, class_predictor };
        }
        function extractPredictionLayerParams() {
            return {
                conv_0: extractPointwiseConvParams('Prediction', 0, 'prediction_layer/conv_0'),
                conv_1: extractPointwiseConvParams('Prediction', 1, 'prediction_layer/conv_1'),
                conv_2: extractPointwiseConvParams('Prediction', 2, 'prediction_layer/conv_2'),
                conv_3: extractPointwiseConvParams('Prediction', 3, 'prediction_layer/conv_3'),
                conv_4: extractPointwiseConvParams('Prediction', 4, 'prediction_layer/conv_4'),
                conv_5: extractPointwiseConvParams('Prediction', 5, 'prediction_layer/conv_5'),
                conv_6: extractPointwiseConvParams('Prediction', 6, 'prediction_layer/conv_6'),
                conv_7: extractPointwiseConvParams('Prediction', 7, 'prediction_layer/conv_7'),
                box_predictor_0: extractBoxPredictorParams(0),
                box_predictor_1: extractBoxPredictorParams(1),
                box_predictor_2: extractBoxPredictorParams(2),
                box_predictor_3: extractBoxPredictorParams(3),
                box_predictor_4: extractBoxPredictorParams(4),
                box_predictor_5: extractBoxPredictorParams(5)
            };
        }
        return {
            extractMobilenetV1Params,
            extractPredictionLayerParams
        };
    }
    function extractParamsFromWeigthMap$2(weightMap) {
        const paramMappings = [];
        const { extractMobilenetV1Params, extractPredictionLayerParams } = extractorsFactory$4(weightMap, paramMappings);
        const extra_dim = weightMap['Output/extra_dim'];
        paramMappings.push({ originalPath: 'Output/extra_dim', paramPath: 'output_layer/extra_dim' });
        if (!isTensor3D(extra_dim)) {
            throw new Error(`expected weightMap['Output/extra_dim'] to be a Tensor3D, instead have ${extra_dim}`);
        }
        const params = {
            mobilenetv1: extractMobilenetV1Params(),
            prediction_layer: extractPredictionLayerParams(),
            output_layer: {
                extra_dim
            }
        };
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params, paramMappings };
    }

    function pointwiseConvLayer(x, params, strides) {
        return tf__namespace.tidy(() => {
            let out = tf__namespace.conv2d(x, params.filters, strides, 'same');
            out = tf__namespace.add(out, params.batch_norm_offset);
            return tf__namespace.clipByValue(out, 0, 6);
        });
    }

    const epsilon = 0.0010000000474974513;
    function depthwiseConvLayer(x, params, strides) {
        return tf__namespace.tidy(() => {
            let out = tf__namespace.depthwiseConv2d(x, params.filters, strides, 'same');
            out = tf__namespace.batchNorm(out, params.batch_norm_mean, params.batch_norm_variance, params.batch_norm_offset, params.batch_norm_scale, epsilon);
            return tf__namespace.clipByValue(out, 0, 6);
        });
    }
    function getStridesForLayerIdx(layerIdx) {
        return [2, 4, 6, 12].some(idx => idx === layerIdx) ? [2, 2] : [1, 1];
    }
    function mobileNetV1(x, params) {
        return tf__namespace.tidy(() => {
            let conv11 = null;
            let out = pointwiseConvLayer(x, params.conv_0, [2, 2]);
            const convPairParams = [
                params.conv_1,
                params.conv_2,
                params.conv_3,
                params.conv_4,
                params.conv_5,
                params.conv_6,
                params.conv_7,
                params.conv_8,
                params.conv_9,
                params.conv_10,
                params.conv_11,
                params.conv_12,
                params.conv_13
            ];
            convPairParams.forEach((param, i) => {
                const layerIdx = i + 1;
                const depthwiseConvStrides = getStridesForLayerIdx(layerIdx);
                out = depthwiseConvLayer(out, param.depthwise_conv, depthwiseConvStrides);
                out = pointwiseConvLayer(out, param.pointwise_conv, [1, 1]);
                if (layerIdx === 11) {
                    conv11 = out;
                }
            });
            if (conv11 === null) {
                throw new Error('mobileNetV1 - output of conv layer 11 is null');
            }
            return {
                out,
                conv11: conv11
            };
        });
    }

    function nonMaxSuppression(boxes, scores, maxOutputSize, iouThreshold, scoreThreshold) {
        const numBoxes = boxes.shape[0];
        const outputSize = Math.min(maxOutputSize, numBoxes);
        const candidates = scores
            .map((score, boxIndex) => ({ score, boxIndex }))
            .filter(c => c.score > scoreThreshold)
            .sort((c1, c2) => c2.score - c1.score);
        const suppressFunc = (x) => x <= iouThreshold ? 1 : 0;
        const selected = [];
        candidates.forEach(c => {
            if (selected.length >= outputSize) {
                return;
            }
            const originalScore = c.score;
            for (let j = selected.length - 1; j >= 0; --j) {
                const iou = IOU(boxes, c.boxIndex, selected[j]);
                if (iou === 0.0) {
                    continue;
                }
                c.score *= suppressFunc(iou);
                if (c.score <= scoreThreshold) {
                    break;
                }
            }
            if (originalScore === c.score) {
                selected.push(c.boxIndex);
            }
        });
        return selected;
    }
    function IOU(boxes, i, j) {
        const boxesData = boxes.arraySync();
        const yminI = Math.min(boxesData[i][0], boxesData[i][2]);
        const xminI = Math.min(boxesData[i][1], boxesData[i][3]);
        const ymaxI = Math.max(boxesData[i][0], boxesData[i][2]);
        const xmaxI = Math.max(boxesData[i][1], boxesData[i][3]);
        const yminJ = Math.min(boxesData[j][0], boxesData[j][2]);
        const xminJ = Math.min(boxesData[j][1], boxesData[j][3]);
        const ymaxJ = Math.max(boxesData[j][0], boxesData[j][2]);
        const xmaxJ = Math.max(boxesData[j][1], boxesData[j][3]);
        const areaI = (ymaxI - yminI) * (xmaxI - xminI);
        const areaJ = (ymaxJ - yminJ) * (xmaxJ - xminJ);
        if (areaI <= 0 || areaJ <= 0) {
            return 0.0;
        }
        const intersectionYmin = Math.max(yminI, yminJ);
        const intersectionXmin = Math.max(xminI, xminJ);
        const intersectionYmax = Math.min(ymaxI, ymaxJ);
        const intersectionXmax = Math.min(xmaxI, xmaxJ);
        const intersectionArea = Math.max(intersectionYmax - intersectionYmin, 0.0) *
            Math.max(intersectionXmax - intersectionXmin, 0.0);
        return intersectionArea / (areaI + areaJ - intersectionArea);
    }

    function getCenterCoordinatesAndSizesLayer(x) {
        const vec = tf__namespace.unstack(tf__namespace.transpose(x, [1, 0]));
        const sizes = [
            tf__namespace.sub(vec[2], vec[0]),
            tf__namespace.sub(vec[3], vec[1])
        ];
        const centers = [
            tf__namespace.add(vec[0], tf__namespace.div(sizes[0], tf__namespace.scalar(2))),
            tf__namespace.add(vec[1], tf__namespace.div(sizes[1], tf__namespace.scalar(2)))
        ];
        return {
            sizes,
            centers
        };
    }
    function decodeBoxesLayer(x0, x1) {
        const { sizes, centers } = getCenterCoordinatesAndSizesLayer(x0);
        const vec = tf__namespace.unstack(tf__namespace.transpose(x1, [1, 0]));
        const div0_out = tf__namespace.div(tf__namespace.mul(tf__namespace.exp(tf__namespace.div(vec[2], tf__namespace.scalar(5))), sizes[0]), tf__namespace.scalar(2));
        const add0_out = tf__namespace.add(tf__namespace.mul(tf__namespace.div(vec[0], tf__namespace.scalar(10)), sizes[0]), centers[0]);
        const div1_out = tf__namespace.div(tf__namespace.mul(tf__namespace.exp(tf__namespace.div(vec[3], tf__namespace.scalar(5))), sizes[1]), tf__namespace.scalar(2));
        const add1_out = tf__namespace.add(tf__namespace.mul(tf__namespace.div(vec[1], tf__namespace.scalar(10)), sizes[1]), centers[1]);
        return tf__namespace.transpose(tf__namespace.stack([
            tf__namespace.sub(add0_out, div0_out),
            tf__namespace.sub(add1_out, div1_out),
            tf__namespace.add(add0_out, div0_out),
            tf__namespace.add(add1_out, div1_out)
        ]), [1, 0]);
    }
    function outputLayer(boxPredictions, classPredictions, params) {
        return tf__namespace.tidy(() => {
            const batchSize = boxPredictions.shape[0];
            let boxes = decodeBoxesLayer(tf__namespace.reshape(tf__namespace.tile(params.extra_dim, [batchSize, 1, 1]), [-1, 4]), tf__namespace.reshape(boxPredictions, [-1, 4]));
            boxes = tf__namespace.reshape(boxes, [batchSize, (boxes.shape[0] / batchSize), 4]);
            const scoresAndClasses = tf__namespace.sigmoid(tf__namespace.slice(classPredictions, [0, 0, 1], [-1, -1, -1]));
            let scores = tf__namespace.slice(scoresAndClasses, [0, 0, 0], [-1, -1, 1]);
            scores = tf__namespace.reshape(scores, [batchSize, scores.shape[1]]);
            const boxesByBatch = tf__namespace.unstack(boxes);
            const scoresByBatch = tf__namespace.unstack(scores);
            return {
                boxes: boxesByBatch,
                scores: scoresByBatch
            };
        });
    }

    function boxPredictionLayer(x, params) {
        return tf__namespace.tidy(() => {
            const batchSize = x.shape[0];
            const boxPredictionEncoding = tf__namespace.reshape(convLayer$1(x, params.box_encoding_predictor), [batchSize, -1, 1, 4]);
            const classPrediction = tf__namespace.reshape(convLayer$1(x, params.class_predictor), [batchSize, -1, 3]);
            return {
                boxPredictionEncoding,
                classPrediction
            };
        });
    }

    function predictionLayer(x, conv11, params) {
        return tf__namespace.tidy(() => {
            const conv0 = pointwiseConvLayer(x, params.conv_0, [1, 1]);
            const conv1 = pointwiseConvLayer(conv0, params.conv_1, [2, 2]);
            const conv2 = pointwiseConvLayer(conv1, params.conv_2, [1, 1]);
            const conv3 = pointwiseConvLayer(conv2, params.conv_3, [2, 2]);
            const conv4 = pointwiseConvLayer(conv3, params.conv_4, [1, 1]);
            const conv5 = pointwiseConvLayer(conv4, params.conv_5, [2, 2]);
            const conv6 = pointwiseConvLayer(conv5, params.conv_6, [1, 1]);
            const conv7 = pointwiseConvLayer(conv6, params.conv_7, [2, 2]);
            const boxPrediction0 = boxPredictionLayer(conv11, params.box_predictor_0);
            const boxPrediction1 = boxPredictionLayer(x, params.box_predictor_1);
            const boxPrediction2 = boxPredictionLayer(conv1, params.box_predictor_2);
            const boxPrediction3 = boxPredictionLayer(conv3, params.box_predictor_3);
            const boxPrediction4 = boxPredictionLayer(conv5, params.box_predictor_4);
            const boxPrediction5 = boxPredictionLayer(conv7, params.box_predictor_5);
            const boxPredictions = tf__namespace.concat([
                boxPrediction0.boxPredictionEncoding,
                boxPrediction1.boxPredictionEncoding,
                boxPrediction2.boxPredictionEncoding,
                boxPrediction3.boxPredictionEncoding,
                boxPrediction4.boxPredictionEncoding,
                boxPrediction5.boxPredictionEncoding
            ], 1);
            const classPredictions = tf__namespace.concat([
                boxPrediction0.classPrediction,
                boxPrediction1.classPrediction,
                boxPrediction2.classPrediction,
                boxPrediction3.classPrediction,
                boxPrediction4.classPrediction,
                boxPrediction5.classPrediction
            ], 1);
            return {
                boxPredictions,
                classPredictions
            };
        });
    }

    class SsdMobilenetv1Options {
        constructor({ minConfidence, maxResults } = {}) {
            this._name = 'SsdMobilenetv1Options';
            this._minConfidence = minConfidence || 0.5;
            this._maxResults = maxResults || 100;
            if (typeof this._minConfidence !== 'number' || this._minConfidence <= 0 || this._minConfidence >= 1) {
                throw new Error(`${this._name} - expected minConfidence to be a number between 0 and 1`);
            }
            if (typeof this._maxResults !== 'number') {
                throw new Error(`${this._name} - expected maxResults to be a number`);
            }
        }
        get minConfidence() { return this._minConfidence; }
        get maxResults() { return this._maxResults; }
    }

    class SsdMobilenetv1 extends NeuralNetwork {
        constructor() {
            super('SsdMobilenetv1');
        }
        forwardInput(input) {
            const { params } = this;
            if (!params) {
                throw new Error('SsdMobilenetv1 - load model before inference');
            }
            return tf__namespace.tidy(() => {
                const batchTensor = tf__namespace.cast(input.toBatchTensor(512, false), 'float32');
                const x = tf__namespace.sub(tf__namespace.mul(batchTensor, tf__namespace.scalar(0.007843137718737125)), tf__namespace.scalar(1));
                const features = mobileNetV1(x, params.mobilenetv1);
                const { boxPredictions, classPredictions } = predictionLayer(features.out, features.conv11, params.prediction_layer);
                return outputLayer(boxPredictions, classPredictions, params.output_layer);
            });
        }
        async forward(input) {
            return this.forwardInput(await toNetInput(input));
        }
        async locateFaces(input, options = {}) {
            const { maxResults, minConfidence } = new SsdMobilenetv1Options(options);
            const netInput = await toNetInput(input);
            const { boxes: _boxes, scores: _scores } = this.forwardInput(netInput);
            // TODO batches
            const boxes = _boxes[0];
            const scores = _scores[0];
            for (let i = 1; i < _boxes.length; i++) {
                _boxes[i].dispose();
                _scores[i].dispose();
            }
            // TODO find a better way to filter by minConfidence
            const scoresData = Array.from(await scores.data());
            const iouThreshold = 0.5;
            const indices = nonMaxSuppression(boxes, scoresData, maxResults, iouThreshold, minConfidence);
            const reshapedDims = netInput.getReshapedInputDimensions(0);
            const inputSize = netInput.inputSize;
            const padX = inputSize / reshapedDims.width;
            const padY = inputSize / reshapedDims.height;
            const boxesData = await boxes.array();
            const results = indices
                .map(idx => {
                const [top, bottom] = [
                    Math.max(0, boxesData[idx][0]),
                    Math.min(1.0, boxesData[idx][2])
                ].map(val => val * padY);
                const [left, right] = [
                    Math.max(0, boxesData[idx][1]),
                    Math.min(1.0, boxesData[idx][3])
                ].map(val => val * padX);
                return new FaceDetection(scoresData[idx], new Rect(left, top, right - left, bottom - top), {
                    height: netInput.getInputHeight(0),
                    width: netInput.getInputWidth(0)
                });
            });
            boxes.dispose();
            scores.dispose();
            return results;
        }
        getDefaultModelName() {
            return 'ssd_mobilenetv1_model';
        }
        extractParamsFromWeigthMap(weightMap) {
            return extractParamsFromWeigthMap$2(weightMap);
        }
        extractParams(weights) {
            return extractParams$2(weights);
        }
    }

    function createSsdMobilenetv1(weights) {
        const net = new SsdMobilenetv1();
        net.extractWeights(weights);
        return net;
    }
    function createFaceDetectionNet(weights) {
        return createSsdMobilenetv1(weights);
    }
    // alias for backward compatibily
    class FaceDetectionNet extends SsdMobilenetv1 {
    }

    const IOU_THRESHOLD$1 = 0.4;
    const BOX_ANCHORS$1 = [
        new Point(0.738768, 0.874946),
        new Point(2.42204, 2.65704),
        new Point(4.30971, 7.04493),
        new Point(10.246, 4.59428),
        new Point(12.6868, 11.8741)
    ];
    const BOX_ANCHORS_SEPARABLE = [
        new Point(1.603231, 2.094468),
        new Point(6.041143, 7.080126),
        new Point(2.882459, 3.518061),
        new Point(4.266906, 5.178857),
        new Point(9.041765, 10.66308)
    ];
    const MEAN_RGB_SEPARABLE = [117.001, 114.697, 97.404];
    const DEFAULT_MODEL_NAME = 'tiny_yolov2_model';
    const DEFAULT_MODEL_NAME_SEPARABLE_CONV = 'tiny_yolov2_separable_conv_model';

    const isNumber = (arg) => typeof arg === 'number';
    function validateConfig(config) {
        if (!config) {
            throw new Error(`invalid config: ${config}`);
        }
        if (typeof config.withSeparableConvs !== 'boolean') {
            throw new Error(`config.withSeparableConvs has to be a boolean, have: ${config.withSeparableConvs}`);
        }
        if (!isNumber(config.iouThreshold) || config.iouThreshold < 0 || config.iouThreshold > 1.0) {
            throw new Error(`config.iouThreshold has to be a number between [0, 1], have: ${config.iouThreshold}`);
        }
        if (!Array.isArray(config.classes)
            || !config.classes.length
            || !config.classes.every((c) => typeof c === 'string')) {
            throw new Error(`config.classes has to be an array class names: string[], have: ${JSON.stringify(config.classes)}`);
        }
        if (!Array.isArray(config.anchors)
            || !config.anchors.length
            || !config.anchors.map((a) => a || {}).every((a) => isNumber(a.x) && isNumber(a.y))) {
            throw new Error(`config.anchors has to be an array of { x: number, y: number }, have: ${JSON.stringify(config.anchors)}`);
        }
        if (config.meanRgb && (!Array.isArray(config.meanRgb)
            || config.meanRgb.length !== 3
            || !config.meanRgb.every(isNumber))) {
            throw new Error(`config.meanRgb has to be an array of shape [number, number, number], have: ${JSON.stringify(config.meanRgb)}`);
        }
    }

    function leaky(x) {
        return tf__namespace.tidy(() => {
            const min = tf__namespace.mul(x, tf__namespace.scalar(0.10000000149011612));
            return tf__namespace.add(tf__namespace.relu(tf__namespace.sub(x, min)), min);
            //return tf.maximum(x, min)
        });
    }

    function convWithBatchNorm(x, params) {
        return tf__namespace.tidy(() => {
            let out = tf__namespace.pad(x, [[0, 0], [1, 1], [1, 1], [0, 0]]);
            out = tf__namespace.conv2d(out, params.conv.filters, [1, 1], 'valid');
            out = tf__namespace.sub(out, params.bn.sub);
            out = tf__namespace.mul(out, params.bn.truediv);
            out = tf__namespace.add(out, params.conv.bias);
            return leaky(out);
        });
    }

    function depthwiseSeparableConv(x, params) {
        return tf__namespace.tidy(() => {
            let out = tf__namespace.pad(x, [[0, 0], [1, 1], [1, 1], [0, 0]]);
            out = tf__namespace.separableConv2d(out, params.depthwise_filter, params.pointwise_filter, [1, 1], 'valid');
            out = tf__namespace.add(out, params.bias);
            return leaky(out);
        });
    }

    function extractorsFactory$3(extractWeights, paramMappings) {
        const extractConvParams = extractConvParamsFactory(extractWeights, paramMappings);
        function extractBatchNormParams(size, mappedPrefix) {
            const sub = tf__namespace.tensor1d(extractWeights(size));
            const truediv = tf__namespace.tensor1d(extractWeights(size));
            paramMappings.push({ paramPath: `${mappedPrefix}/sub` }, { paramPath: `${mappedPrefix}/truediv` });
            return { sub, truediv };
        }
        function extractConvWithBatchNormParams(channelsIn, channelsOut, mappedPrefix) {
            const conv = extractConvParams(channelsIn, channelsOut, 3, `${mappedPrefix}/conv`);
            const bn = extractBatchNormParams(channelsOut, `${mappedPrefix}/bn`);
            return { conv, bn };
        }
        const extractSeparableConvParams = extractSeparableConvParamsFactory(extractWeights, paramMappings);
        return {
            extractConvParams,
            extractConvWithBatchNormParams,
            extractSeparableConvParams
        };
    }
    function extractParams$1(weights, config, boxEncodingSize, filterSizes) {
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const paramMappings = [];
        const { extractConvParams, extractConvWithBatchNormParams, extractSeparableConvParams } = extractorsFactory$3(extractWeights, paramMappings);
        let params;
        if (config.withSeparableConvs) {
            const [s0, s1, s2, s3, s4, s5, s6, s7, s8] = filterSizes;
            const conv0 = config.isFirstLayerConv2d
                ? extractConvParams(s0, s1, 3, 'conv0')
                : extractSeparableConvParams(s0, s1, 'conv0');
            const conv1 = extractSeparableConvParams(s1, s2, 'conv1');
            const conv2 = extractSeparableConvParams(s2, s3, 'conv2');
            const conv3 = extractSeparableConvParams(s3, s4, 'conv3');
            const conv4 = extractSeparableConvParams(s4, s5, 'conv4');
            const conv5 = extractSeparableConvParams(s5, s6, 'conv5');
            const conv6 = s7 ? extractSeparableConvParams(s6, s7, 'conv6') : undefined;
            const conv7 = s8 ? extractSeparableConvParams(s7, s8, 'conv7') : undefined;
            const conv8 = extractConvParams(s8 || s7 || s6, 5 * boxEncodingSize, 1, 'conv8');
            params = { conv0, conv1, conv2, conv3, conv4, conv5, conv6, conv7, conv8 };
        }
        else {
            const [s0, s1, s2, s3, s4, s5, s6, s7, s8] = filterSizes;
            const conv0 = extractConvWithBatchNormParams(s0, s1, 'conv0');
            const conv1 = extractConvWithBatchNormParams(s1, s2, 'conv1');
            const conv2 = extractConvWithBatchNormParams(s2, s3, 'conv2');
            const conv3 = extractConvWithBatchNormParams(s3, s4, 'conv3');
            const conv4 = extractConvWithBatchNormParams(s4, s5, 'conv4');
            const conv5 = extractConvWithBatchNormParams(s5, s6, 'conv5');
            const conv6 = extractConvWithBatchNormParams(s6, s7, 'conv6');
            const conv7 = extractConvWithBatchNormParams(s7, s8, 'conv7');
            const conv8 = extractConvParams(s8, 5 * boxEncodingSize, 1, 'conv8');
            params = { conv0, conv1, conv2, conv3, conv4, conv5, conv6, conv7, conv8 };
        }
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        return { params, paramMappings };
    }

    function extractorsFactory$2(weightMap, paramMappings) {
        const extractWeightEntry = extractWeightEntryFactory(weightMap, paramMappings);
        function extractBatchNormParams(prefix) {
            const sub = extractWeightEntry(`${prefix}/sub`, 1);
            const truediv = extractWeightEntry(`${prefix}/truediv`, 1);
            return { sub, truediv };
        }
        function extractConvParams(prefix) {
            const filters = extractWeightEntry(`${prefix}/filters`, 4);
            const bias = extractWeightEntry(`${prefix}/bias`, 1);
            return { filters, bias };
        }
        function extractConvWithBatchNormParams(prefix) {
            const conv = extractConvParams(`${prefix}/conv`);
            const bn = extractBatchNormParams(`${prefix}/bn`);
            return { conv, bn };
        }
        const extractSeparableConvParams = loadSeparableConvParamsFactory(extractWeightEntry);
        return {
            extractConvParams,
            extractConvWithBatchNormParams,
            extractSeparableConvParams
        };
    }
    function extractParamsFromWeigthMap$1(weightMap, config) {
        const paramMappings = [];
        const { extractConvParams, extractConvWithBatchNormParams, extractSeparableConvParams } = extractorsFactory$2(weightMap, paramMappings);
        let params;
        if (config.withSeparableConvs) {
            const numFilters = (config.filterSizes && config.filterSizes.length || 9);
            params = {
                conv0: config.isFirstLayerConv2d ? extractConvParams('conv0') : extractSeparableConvParams('conv0'),
                conv1: extractSeparableConvParams('conv1'),
                conv2: extractSeparableConvParams('conv2'),
                conv3: extractSeparableConvParams('conv3'),
                conv4: extractSeparableConvParams('conv4'),
                conv5: extractSeparableConvParams('conv5'),
                conv6: numFilters > 7 ? extractSeparableConvParams('conv6') : undefined,
                conv7: numFilters > 8 ? extractSeparableConvParams('conv7') : undefined,
                conv8: extractConvParams('conv8')
            };
        }
        else {
            params = {
                conv0: extractConvWithBatchNormParams('conv0'),
                conv1: extractConvWithBatchNormParams('conv1'),
                conv2: extractConvWithBatchNormParams('conv2'),
                conv3: extractConvWithBatchNormParams('conv3'),
                conv4: extractConvWithBatchNormParams('conv4'),
                conv5: extractConvWithBatchNormParams('conv5'),
                conv6: extractConvWithBatchNormParams('conv6'),
                conv7: extractConvWithBatchNormParams('conv7'),
                conv8: extractConvParams('conv8')
            };
        }
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params, paramMappings };
    }

    exports.TinyYolov2SizeType = void 0;
    (function (TinyYolov2SizeType) {
        TinyYolov2SizeType[TinyYolov2SizeType["XS"] = 224] = "XS";
        TinyYolov2SizeType[TinyYolov2SizeType["SM"] = 320] = "SM";
        TinyYolov2SizeType[TinyYolov2SizeType["MD"] = 416] = "MD";
        TinyYolov2SizeType[TinyYolov2SizeType["LG"] = 608] = "LG";
    })(exports.TinyYolov2SizeType || (exports.TinyYolov2SizeType = {}));
    class TinyYolov2Options {
        constructor({ inputSize, scoreThreshold } = {}) {
            this._name = 'TinyYolov2Options';
            this._inputSize = inputSize || 416;
            this._scoreThreshold = scoreThreshold || 0.5;
            if (typeof this._inputSize !== 'number' || this._inputSize % 32 !== 0) {
                throw new Error(`${this._name} - expected inputSize to be a number divisible by 32`);
            }
            if (typeof this._scoreThreshold !== 'number' || this._scoreThreshold <= 0 || this._scoreThreshold >= 1) {
                throw new Error(`${this._name} - expected scoreThreshold to be a number between 0 and 1`);
            }
        }
        get inputSize() { return this._inputSize; }
        get scoreThreshold() { return this._scoreThreshold; }
    }

    class TinyYolov2Base extends NeuralNetwork {
        constructor(config) {
            super('TinyYolov2');
            validateConfig(config);
            this._config = config;
        }
        get config() {
            return this._config;
        }
        get withClassScores() {
            return this.config.withClassScores || this.config.classes.length > 1;
        }
        get boxEncodingSize() {
            return 5 + (this.withClassScores ? this.config.classes.length : 0);
        }
        runTinyYolov2(x, params) {
            let out = convWithBatchNorm(x, params.conv0);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = convWithBatchNorm(out, params.conv1);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = convWithBatchNorm(out, params.conv2);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = convWithBatchNorm(out, params.conv3);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = convWithBatchNorm(out, params.conv4);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = convWithBatchNorm(out, params.conv5);
            out = tf__namespace.maxPool(out, [2, 2], [1, 1], 'same');
            out = convWithBatchNorm(out, params.conv6);
            out = convWithBatchNorm(out, params.conv7);
            return convLayer$1(out, params.conv8, 'valid', false);
        }
        runMobilenet(x, params) {
            let out = this.config.isFirstLayerConv2d
                ? leaky(convLayer$1(x, params.conv0, 'valid', false))
                : depthwiseSeparableConv(x, params.conv0);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = depthwiseSeparableConv(out, params.conv1);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = depthwiseSeparableConv(out, params.conv2);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = depthwiseSeparableConv(out, params.conv3);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = depthwiseSeparableConv(out, params.conv4);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = depthwiseSeparableConv(out, params.conv5);
            out = tf__namespace.maxPool(out, [2, 2], [1, 1], 'same');
            out = params.conv6 ? depthwiseSeparableConv(out, params.conv6) : out;
            out = params.conv7 ? depthwiseSeparableConv(out, params.conv7) : out;
            return convLayer$1(out, params.conv8, 'valid', false);
        }
        forwardInput(input, inputSize) {
            const { params } = this;
            if (!params) {
                throw new Error('TinyYolov2 - load model before inference');
            }
            return tf__namespace.tidy(() => {
                let batchTensor = tf__namespace.cast(input.toBatchTensor(inputSize, false), 'float32');
                batchTensor = this.config.meanRgb
                    ? normalize$1(batchTensor, this.config.meanRgb)
                    : batchTensor;
                batchTensor = tf__namespace.div(batchTensor, tf__namespace.scalar(256));
                return this.config.withSeparableConvs
                    ? this.runMobilenet(batchTensor, params)
                    : this.runTinyYolov2(batchTensor, params);
            });
        }
        async forward(input, inputSize) {
            return await this.forwardInput(await toNetInput(input), inputSize);
        }
        async detect(input, forwardParams = {}) {
            const { inputSize, scoreThreshold } = new TinyYolov2Options(forwardParams);
            const netInput = await toNetInput(input);
            const out = await this.forwardInput(netInput, inputSize);
            const out0 = tf__namespace.tidy(() => tf__namespace.expandDims(tf__namespace.unstack(out)[0]));
            const inputDimensions = {
                width: netInput.getInputWidth(0),
                height: netInput.getInputHeight(0)
            };
            const results = await this.extractBoxes(out0, netInput.getReshapedInputDimensions(0), scoreThreshold);
            out.dispose();
            out0.dispose();
            const boxes = results.map(res => res.box);
            const scores = results.map(res => res.score);
            const classScores = results.map(res => res.classScore);
            const classNames = results.map(res => this.config.classes[res.label]);
            const indices = nonMaxSuppression$1(boxes.map(box => box.rescale(inputSize)), scores, this.config.iouThreshold, true);
            const detections = indices.map(idx => new ObjectDetection(scores[idx], classScores[idx], classNames[idx], boxes[idx], inputDimensions));
            return detections;
        }
        getDefaultModelName() {
            return '';
        }
        extractParamsFromWeigthMap(weightMap) {
            return extractParamsFromWeigthMap$1(weightMap, this.config);
        }
        extractParams(weights) {
            const filterSizes = this.config.filterSizes || TinyYolov2Base.DEFAULT_FILTER_SIZES;
            const numFilters = filterSizes ? filterSizes.length : undefined;
            if (numFilters !== 7 && numFilters !== 8 && numFilters !== 9) {
                throw new Error(`TinyYolov2 - expected 7 | 8 | 9 convolutional filters, but found ${numFilters} filterSizes in config`);
            }
            return extractParams$1(weights, this.config, this.boxEncodingSize, filterSizes);
        }
        async extractBoxes(outputTensor, inputBlobDimensions, scoreThreshold) {
            const { width, height } = inputBlobDimensions;
            const inputSize = Math.max(width, height);
            const correctionFactorX = inputSize / width;
            const correctionFactorY = inputSize / height;
            const numCells = outputTensor.shape[1];
            const numBoxes = this.config.anchors.length;
            const [boxesTensor, scoresTensor, classScoresTensor] = tf__namespace.tidy(() => {
                const reshaped = tf__namespace.reshape(outputTensor, [numCells, numCells, numBoxes, this.boxEncodingSize]);
                const boxes = tf__namespace.slice(reshaped, [0, 0, 0, 0], [numCells, numCells, numBoxes, 4]);
                const scores = tf__namespace.slice(reshaped, [0, 0, 0, 4], [numCells, numCells, numBoxes, 1]);
                const classScores = this.withClassScores
                    ? tf__namespace.softmax(tf__namespace.slice(reshaped, [0, 0, 0, 5], [numCells, numCells, numBoxes, this.config.classes.length]), 3)
                    : tf__namespace.scalar(0);
                return [boxes, scores, classScores];
            });
            const results = [];
            const scoresData = await scoresTensor.array();
            const boxesData = await boxesTensor.array();
            for (let row = 0; row < numCells; row++) {
                for (let col = 0; col < numCells; col++) {
                    for (let anchor = 0; anchor < numBoxes; anchor++) {
                        const score = sigmoid(scoresData[row][col][anchor][0]);
                        if (!scoreThreshold || score > scoreThreshold) {
                            const ctX = ((col + sigmoid(boxesData[row][col][anchor][0])) / numCells) * correctionFactorX;
                            const ctY = ((row + sigmoid(boxesData[row][col][anchor][1])) / numCells) * correctionFactorY;
                            const width = ((Math.exp(boxesData[row][col][anchor][2]) * this.config.anchors[anchor].x) / numCells) * correctionFactorX;
                            const height = ((Math.exp(boxesData[row][col][anchor][3]) * this.config.anchors[anchor].y) / numCells) * correctionFactorY;
                            const x = (ctX - (width / 2));
                            const y = (ctY - (height / 2));
                            const pos = { row, col, anchor };
                            const { classScore, label } = this.withClassScores
                                ? await this.extractPredictedClass(classScoresTensor, pos)
                                : { classScore: 1, label: 0 };
                            results.push({
                                box: new BoundingBox(x, y, x + width, y + height),
                                score: score,
                                classScore: score * classScore,
                                label,
                                ...pos
                            });
                        }
                    }
                }
            }
            boxesTensor.dispose();
            scoresTensor.dispose();
            classScoresTensor.dispose();
            return results;
        }
        async extractPredictedClass(classesTensor, pos) {
            const { row, col, anchor } = pos;
            const classesData = await classesTensor.array();
            return Array(this.config.classes.length).fill(0)
                .map((_, i) => classesData[row][col][anchor][i])
                .map((classScore, label) => ({
                classScore,
                label
            }))
                .reduce((max, curr) => max.classScore > curr.classScore ? max : curr);
        }
    }
    TinyYolov2Base.DEFAULT_FILTER_SIZES = [
        3, 16, 32, 64, 128, 256, 512, 1024, 1024
    ];

    class TinyYolov2 extends TinyYolov2Base {
        constructor(withSeparableConvs = true) {
            const config = Object.assign({}, {
                withSeparableConvs,
                iouThreshold: IOU_THRESHOLD$1,
                classes: ['face']
            }, withSeparableConvs
                ? {
                    anchors: BOX_ANCHORS_SEPARABLE,
                    meanRgb: MEAN_RGB_SEPARABLE
                }
                : {
                    anchors: BOX_ANCHORS$1,
                    withClassScores: true
                });
            super(config);
        }
        get withSeparableConvs() {
            return this.config.withSeparableConvs;
        }
        get anchors() {
            return this.config.anchors;
        }
        async locateFaces(input, forwardParams) {
            const objectDetections = await this.detect(input, forwardParams);
            return objectDetections.map(det => new FaceDetection(det.score, det.relativeBox, { width: det.imageWidth, height: det.imageHeight }));
        }
        getDefaultModelName() {
            return this.withSeparableConvs ? DEFAULT_MODEL_NAME_SEPARABLE_CONV : DEFAULT_MODEL_NAME;
        }
        extractParamsFromWeigthMap(weightMap) {
            return super.extractParamsFromWeigthMap(weightMap);
        }
    }

    function createTinyYolov2(weights, withSeparableConvs = true) {
        const net = new TinyYolov2(withSeparableConvs);
        net.extractWeights(weights);
        return net;
    }

    class TinyFaceDetectorOptions extends TinyYolov2Options {
        constructor() {
            super(...arguments);
            this._name = 'TinyFaceDetectorOptions';
        }
    }

    class ComposableTask {
        async then(onfulfilled) {
            return onfulfilled(await this.run());
        }
        async run() {
            throw new Error('ComposableTask - run is not implemented');
        }
    }

    async function extractAllFacesAndComputeResults(parentResults, input, computeResults, extractedFaces, getRectForAlignment = ({ alignedRect }) => alignedRect) {
        const faceBoxes = parentResults.map(parentResult => isWithFaceLandmarks(parentResult)
            ? getRectForAlignment(parentResult)
            : parentResult.detection);
        const faces = extractedFaces || (input instanceof tf__namespace.Tensor
            ? await extractFaceTensors(input, faceBoxes)
            : await extractFaces(input, faceBoxes));
        const results = await computeResults(faces);
        faces.forEach(f => f instanceof tf__namespace.Tensor && f.dispose());
        return results;
    }
    async function extractSingleFaceAndComputeResult(parentResult, input, computeResult, extractedFaces, getRectForAlignment) {
        return extractAllFacesAndComputeResults([parentResult], input, async (faces) => computeResult(faces[0]), extractedFaces, getRectForAlignment);
    }

    function bgrToRgbTensor(tensor) {
        return tf__namespace.tidy(() => tf__namespace.stack(tf__namespace.unstack(tensor, 3).reverse(), 3));
    }

    const CELL_STRIDE = 2;
    const CELL_SIZE = 12;

    function extractorsFactory$1(extractWeights, paramMappings) {
        const extractConvParams = extractConvParamsFactory(extractWeights, paramMappings);
        const extractFCParams = extractFCParamsFactory(extractWeights, paramMappings);
        function extractPReluParams(size, paramPath) {
            const alpha = tf__namespace.tensor1d(extractWeights(size));
            paramMappings.push({ paramPath });
            return alpha;
        }
        function extractSharedParams(numFilters, mappedPrefix, isRnet = false) {
            const conv1 = extractConvParams(numFilters[0], numFilters[1], 3, `${mappedPrefix}/conv1`);
            const prelu1_alpha = extractPReluParams(numFilters[1], `${mappedPrefix}/prelu1_alpha`);
            const conv2 = extractConvParams(numFilters[1], numFilters[2], 3, `${mappedPrefix}/conv2`);
            const prelu2_alpha = extractPReluParams(numFilters[2], `${mappedPrefix}/prelu2_alpha`);
            const conv3 = extractConvParams(numFilters[2], numFilters[3], isRnet ? 2 : 3, `${mappedPrefix}/conv3`);
            const prelu3_alpha = extractPReluParams(numFilters[3], `${mappedPrefix}/prelu3_alpha`);
            return { conv1, prelu1_alpha, conv2, prelu2_alpha, conv3, prelu3_alpha };
        }
        function extractPNetParams() {
            const sharedParams = extractSharedParams([3, 10, 16, 32], 'pnet');
            const conv4_1 = extractConvParams(32, 2, 1, 'pnet/conv4_1');
            const conv4_2 = extractConvParams(32, 4, 1, 'pnet/conv4_2');
            return { ...sharedParams, conv4_1, conv4_2 };
        }
        function extractRNetParams() {
            const sharedParams = extractSharedParams([3, 28, 48, 64], 'rnet', true);
            const fc1 = extractFCParams(576, 128, 'rnet/fc1');
            const prelu4_alpha = extractPReluParams(128, 'rnet/prelu4_alpha');
            const fc2_1 = extractFCParams(128, 2, 'rnet/fc2_1');
            const fc2_2 = extractFCParams(128, 4, 'rnet/fc2_2');
            return { ...sharedParams, fc1, prelu4_alpha, fc2_1, fc2_2 };
        }
        function extractONetParams() {
            const sharedParams = extractSharedParams([3, 32, 64, 64], 'onet');
            const conv4 = extractConvParams(64, 128, 2, 'onet/conv4');
            const prelu4_alpha = extractPReluParams(128, 'onet/prelu4_alpha');
            const fc1 = extractFCParams(1152, 256, 'onet/fc1');
            const prelu5_alpha = extractPReluParams(256, 'onet/prelu5_alpha');
            const fc2_1 = extractFCParams(256, 2, 'onet/fc2_1');
            const fc2_2 = extractFCParams(256, 4, 'onet/fc2_2');
            const fc2_3 = extractFCParams(256, 10, 'onet/fc2_3');
            return { ...sharedParams, conv4, prelu4_alpha, fc1, prelu5_alpha, fc2_1, fc2_2, fc2_3 };
        }
        return {
            extractPNetParams,
            extractRNetParams,
            extractONetParams
        };
    }
    function extractParams(weights) {
        const { extractWeights, getRemainingWeights } = extractWeightsFactory(weights);
        const paramMappings = [];
        const { extractPNetParams, extractRNetParams, extractONetParams } = extractorsFactory$1(extractWeights, paramMappings);
        const pnet = extractPNetParams();
        const rnet = extractRNetParams();
        const onet = extractONetParams();
        if (getRemainingWeights().length !== 0) {
            throw new Error(`weights remaing after extract: ${getRemainingWeights().length}`);
        }
        return { params: { pnet, rnet, onet }, paramMappings };
    }

    function extractorsFactory(weightMap, paramMappings) {
        const extractWeightEntry = extractWeightEntryFactory(weightMap, paramMappings);
        function extractConvParams(prefix) {
            const filters = extractWeightEntry(`${prefix}/weights`, 4, `${prefix}/filters`);
            const bias = extractWeightEntry(`${prefix}/bias`, 1);
            return { filters, bias };
        }
        function extractFCParams(prefix) {
            const weights = extractWeightEntry(`${prefix}/weights`, 2);
            const bias = extractWeightEntry(`${prefix}/bias`, 1);
            return { weights, bias };
        }
        function extractPReluParams(paramPath) {
            return extractWeightEntry(paramPath, 1);
        }
        function extractSharedParams(prefix) {
            const conv1 = extractConvParams(`${prefix}/conv1`);
            const prelu1_alpha = extractPReluParams(`${prefix}/prelu1_alpha`);
            const conv2 = extractConvParams(`${prefix}/conv2`);
            const prelu2_alpha = extractPReluParams(`${prefix}/prelu2_alpha`);
            const conv3 = extractConvParams(`${prefix}/conv3`);
            const prelu3_alpha = extractPReluParams(`${prefix}/prelu3_alpha`);
            return { conv1, prelu1_alpha, conv2, prelu2_alpha, conv3, prelu3_alpha };
        }
        function extractPNetParams() {
            const sharedParams = extractSharedParams('pnet');
            const conv4_1 = extractConvParams('pnet/conv4_1');
            const conv4_2 = extractConvParams('pnet/conv4_2');
            return { ...sharedParams, conv4_1, conv4_2 };
        }
        function extractRNetParams() {
            const sharedParams = extractSharedParams('rnet');
            const fc1 = extractFCParams('rnet/fc1');
            const prelu4_alpha = extractPReluParams('rnet/prelu4_alpha');
            const fc2_1 = extractFCParams('rnet/fc2_1');
            const fc2_2 = extractFCParams('rnet/fc2_2');
            return { ...sharedParams, fc1, prelu4_alpha, fc2_1, fc2_2 };
        }
        function extractONetParams() {
            const sharedParams = extractSharedParams('onet');
            const conv4 = extractConvParams('onet/conv4');
            const prelu4_alpha = extractPReluParams('onet/prelu4_alpha');
            const fc1 = extractFCParams('onet/fc1');
            const prelu5_alpha = extractPReluParams('onet/prelu5_alpha');
            const fc2_1 = extractFCParams('onet/fc2_1');
            const fc2_2 = extractFCParams('onet/fc2_2');
            const fc2_3 = extractFCParams('onet/fc2_3');
            return { ...sharedParams, conv4, prelu4_alpha, fc1, prelu5_alpha, fc2_1, fc2_2, fc2_3 };
        }
        return {
            extractPNetParams,
            extractRNetParams,
            extractONetParams
        };
    }
    function extractParamsFromWeigthMap(weightMap) {
        const paramMappings = [];
        const { extractPNetParams, extractRNetParams, extractONetParams } = extractorsFactory(weightMap, paramMappings);
        const pnet = extractPNetParams();
        const rnet = extractRNetParams();
        const onet = extractONetParams();
        disposeUnusedWeightTensors(weightMap, paramMappings);
        return { params: { pnet, rnet, onet }, paramMappings };
    }

    function getSizesForScale(scale, [height, width]) {
        return {
            height: Math.floor(height * scale),
            width: Math.floor(width * scale)
        };
    }

    function pyramidDown(minFaceSize, scaleFactor, dims) {
        const [height, width] = dims;
        const m = CELL_SIZE / minFaceSize;
        const scales = [];
        let minLayer = Math.min(height, width) * m;
        let exp = 0;
        while (minLayer >= 12) {
            scales.push(m * Math.pow(scaleFactor, exp));
            minLayer = minLayer * scaleFactor;
            exp += 1;
        }
        return scales;
    }

    class MtcnnBox extends Box {
        constructor(left, top, right, bottom) {
            super({ left, top, right, bottom }, true);
        }
    }

    function normalize(x) {
        return tf__namespace.tidy(() => tf__namespace.mul(tf__namespace.sub(x, tf__namespace.scalar(127.5)), tf__namespace.scalar(0.0078125)));
    }

    function prelu(x, alpha) {
        return tf__namespace.tidy(() => tf__namespace.add(tf__namespace.relu(x), tf__namespace.mul(alpha, tf__namespace.neg(tf__namespace.relu(tf__namespace.neg(x))))));
    }

    function sharedLayer(x, params, isPnet = false) {
        return tf__namespace.tidy(() => {
            let out = convLayer$1(x, params.conv1, 'valid');
            out = prelu(out, params.prelu1_alpha);
            out = tf__namespace.maxPool(out, isPnet ? [2, 2] : [3, 3], [2, 2], 'same');
            out = convLayer$1(out, params.conv2, 'valid');
            out = prelu(out, params.prelu2_alpha);
            out = isPnet ? out : tf__namespace.maxPool(out, [3, 3], [2, 2], 'valid');
            out = convLayer$1(out, params.conv3, 'valid');
            out = prelu(out, params.prelu3_alpha);
            return out;
        });
    }

    function PNet(x, params) {
        return tf__namespace.tidy(() => {
            let out = sharedLayer(x, params, true);
            const conv = convLayer$1(out, params.conv4_1, 'valid');
            const max = tf__namespace.expandDims(tf__namespace.max(conv, 3), 3);
            const prob = tf__namespace.softmax(tf__namespace.sub(conv, max), 3);
            const regions = convLayer$1(out, params.conv4_2, 'valid');
            return { prob, regions };
        });
    }

    function rescaleAndNormalize(x, scale) {
        return tf__namespace.tidy(() => {
            const { height, width } = getSizesForScale(scale, x.shape.slice(1));
            const resized = tf__namespace.image.resizeBilinear(x, [height, width]);
            const normalized = normalize(resized);
            return tf__namespace.transpose(normalized, [0, 2, 1, 3]);
        });
    }
    function extractBoundingBoxes(scoresTensor, regionsTensor, scale, scoreThreshold) {
        // TODO: fix this!, maybe better to use tf.gather here
        const indices = [];
        const scoresData = scoresTensor.arraySync();
        for (let y = 0; y < scoresTensor.shape[0]; y++) {
            for (let x = 0; x < scoresTensor.shape[1]; x++) {
                if (scoresData[y][x] >= scoreThreshold) {
                    indices.push(new Point(x, y));
                }
            }
        }
        const boundingBoxes = indices.map(idx => {
            const cell = new BoundingBox(Math.round((idx.y * CELL_STRIDE + 1) / scale), Math.round((idx.x * CELL_STRIDE + 1) / scale), Math.round((idx.y * CELL_STRIDE + CELL_SIZE) / scale), Math.round((idx.x * CELL_STRIDE + CELL_SIZE) / scale));
            const score = scoresData[idx.y][idx.x];
            const regionsData = regionsTensor.arraySync();
            const region = new MtcnnBox(regionsData[idx.y][idx.x][0], regionsData[idx.y][idx.x][1], regionsData[idx.y][idx.x][2], regionsData[idx.y][idx.x][3]);
            return {
                cell,
                score,
                region
            };
        });
        return boundingBoxes;
    }
    function stage1(imgTensor, scales, scoreThreshold, params, stats) {
        stats.stage1 = [];
        const pnetOutputs = scales.map((scale) => tf__namespace.tidy(() => {
            const statsForScale = { scale };
            const resized = rescaleAndNormalize(imgTensor, scale);
            let ts = Date.now();
            const { prob, regions } = PNet(resized, params);
            statsForScale.pnet = Date.now() - ts;
            const scoresTensor = tf__namespace.unstack(tf__namespace.unstack(prob, 3)[1])[0];
            const regionsTensor = tf__namespace.unstack(regions)[0];
            return {
                scoresTensor,
                regionsTensor,
                scale,
                statsForScale
            };
        }));
        const boxesForScale = pnetOutputs.map(({ scoresTensor, regionsTensor, scale, statsForScale }) => {
            const boundingBoxes = extractBoundingBoxes(scoresTensor, regionsTensor, scale, scoreThreshold);
            scoresTensor.dispose();
            regionsTensor.dispose();
            if (!boundingBoxes.length) {
                stats.stage1.push(statsForScale);
                return [];
            }
            let ts = Date.now();
            const indices = nonMaxSuppression$1(boundingBoxes.map(bbox => bbox.cell), boundingBoxes.map(bbox => bbox.score), 0.5);
            statsForScale.nms = Date.now() - ts;
            statsForScale.numBoxes = indices.length;
            stats.stage1.push(statsForScale);
            return indices.map(boxIdx => boundingBoxes[boxIdx]);
        });
        const allBoxes = boxesForScale.reduce((all, boxes) => all.concat(boxes), []);
        let finalBoxes = [];
        let finalScores = [];
        if (allBoxes.length > 0) {
            let ts = Date.now();
            const indices = nonMaxSuppression$1(allBoxes.map(bbox => bbox.cell), allBoxes.map(bbox => bbox.score), 0.7);
            stats.stage1_nms = Date.now() - ts;
            finalScores = indices.map(idx => allBoxes[idx].score);
            finalBoxes = indices
                .map(idx => allBoxes[idx])
                .map(({ cell, region }) => new BoundingBox(cell.left + (region.left * cell.width), cell.top + (region.top * cell.height), cell.right + (region.right * cell.width), cell.bottom + (region.bottom * cell.height)).toSquare().round());
        }
        return {
            boxes: finalBoxes,
            scores: finalScores
        };
    }

    async function extractImagePatches(img, boxes, { width, height }) {
        const imgCtx = getContext2dOrThrow(img);
        const bitmaps = await Promise.all(boxes.map(async (box) => {
            // TODO: correct padding
            const { y, ey, x, ex } = box.padAtBorders(img.height, img.width);
            const fromX = x - 1;
            const fromY = y - 1;
            const imgData = imgCtx.getImageData(fromX, fromY, (ex - fromX), (ey - fromY));
            return env.isNodejs() ? createCanvasFromMedia(imgData) : createImageBitmap(imgData);
        }));
        const imagePatchesDatas = [];
        bitmaps.forEach(bmp => {
            const patch = createCanvas({ width, height });
            const patchCtx = getContext2dOrThrow(patch);
            patchCtx.drawImage(bmp, 0, 0, width, height);
            const { data } = patchCtx.getImageData(0, 0, width, height);
            const currData = [];
            // RGBA -> BGR
            for (let i = 0; i < data.length; i += 4) {
                currData.push(data[i + 2]);
                currData.push(data[i + 1]);
                currData.push(data[i]);
            }
            imagePatchesDatas.push(currData);
        });
        return imagePatchesDatas.map(data => {
            const t = tf__namespace.tidy(() => {
                const imagePatchTensor = tf__namespace.transpose(tf__namespace.tensor4d(data, [1, width, height, 3]), [0, 2, 1, 3]);
                return normalize(tf__namespace.cast(imagePatchTensor, 'float32'));
            });
            return t;
        });
    }

    function RNet(x, params) {
        return tf__namespace.tidy(() => {
            const convOut = sharedLayer(x, params);
            const vectorized = tf__namespace.reshape(convOut, [convOut.shape[0], params.fc1.weights.shape[0]]);
            const fc1 = fullyConnectedLayer(vectorized, params.fc1);
            const prelu4 = prelu(fc1, params.prelu4_alpha);
            const fc2_1 = fullyConnectedLayer(prelu4, params.fc2_1);
            const max = tf__namespace.expandDims(tf__namespace.max(fc2_1, 1), 1);
            const prob = tf__namespace.softmax(tf__namespace.sub(fc2_1, max), 1);
            const regions = fullyConnectedLayer(prelu4, params.fc2_2);
            const scores = tf__namespace.unstack(prob, 1)[1];
            return { scores, regions };
        });
    }

    async function stage2(img, inputBoxes, scoreThreshold, params, stats) {
        let ts = Date.now();
        const rnetInputs = await extractImagePatches(img, inputBoxes, { width: 24, height: 24 });
        stats.stage2_extractImagePatches = Date.now() - ts;
        ts = Date.now();
        const rnetOuts = rnetInputs.map(rnetInput => {
            const out = RNet(rnetInput, params);
            rnetInput.dispose();
            return out;
        });
        stats.stage2_rnet = Date.now() - ts;
        const scoresTensor = rnetOuts.length > 1
            ? tf__namespace.concat(rnetOuts.map(out => out.scores))
            : rnetOuts[0].scores;
        const scores = Array.from(await scoresTensor.data());
        scoresTensor.dispose();
        const indices = scores
            .map((score, idx) => ({ score, idx }))
            .filter(c => c.score > scoreThreshold)
            .map(({ idx }) => idx);
        const filteredBoxes = indices.map(idx => inputBoxes[idx]);
        const filteredScores = indices.map(idx => scores[idx]);
        let finalBoxes = [];
        let finalScores = [];
        if (filteredBoxes.length > 0) {
            ts = Date.now();
            const indicesNms = nonMaxSuppression$1(filteredBoxes, filteredScores, 0.7);
            stats.stage2_nms = Date.now() - ts;
            const regions = indicesNms.map(idx => {
                const regionsData = rnetOuts[indices[idx]].regions.arraySync();
                return new MtcnnBox(regionsData[0][0], regionsData[0][1], regionsData[0][2], regionsData[0][3]);
            });
            finalScores = indicesNms.map(idx => filteredScores[idx]);
            finalBoxes = indicesNms.map((idx, i) => filteredBoxes[idx].calibrate(regions[i]));
        }
        rnetOuts.forEach(t => {
            t.regions.dispose();
            t.scores.dispose();
        });
        return {
            boxes: finalBoxes,
            scores: finalScores
        };
    }

    function ONet(x, params) {
        return tf__namespace.tidy(() => {
            let out = sharedLayer(x, params);
            out = tf__namespace.maxPool(out, [2, 2], [2, 2], 'same');
            out = convLayer$1(out, params.conv4, 'valid');
            out = prelu(out, params.prelu4_alpha);
            const vectorized = tf__namespace.reshape(out, [out.shape[0], params.fc1.weights.shape[0]]);
            const fc1 = fullyConnectedLayer(vectorized, params.fc1);
            const prelu5 = prelu(fc1, params.prelu5_alpha);
            const fc2_1 = fullyConnectedLayer(prelu5, params.fc2_1);
            const max = tf__namespace.expandDims(tf__namespace.max(fc2_1, 1), 1);
            const prob = tf__namespace.softmax(tf__namespace.sub(fc2_1, max), 1);
            const regions = fullyConnectedLayer(prelu5, params.fc2_2);
            const points = fullyConnectedLayer(prelu5, params.fc2_3);
            const scores = tf__namespace.unstack(prob, 1)[1];
            return { scores, regions, points };
        });
    }

    async function stage3(img, inputBoxes, scoreThreshold, params, stats) {
        let ts = Date.now();
        const onetInputs = await extractImagePatches(img, inputBoxes, { width: 48, height: 48 });
        stats.stage3_extractImagePatches = Date.now() - ts;
        ts = Date.now();
        const onetOuts = onetInputs.map(onetInput => {
            const out = ONet(onetInput, params);
            onetInput.dispose();
            return out;
        });
        stats.stage3_onet = Date.now() - ts;
        const scoresTensor = onetOuts.length > 1
            ? tf__namespace.concat(onetOuts.map(out => out.scores))
            : onetOuts[0].scores;
        const scores = Array.from(await scoresTensor.data());
        scoresTensor.dispose();
        const indices = scores
            .map((score, idx) => ({ score, idx }))
            .filter(c => c.score > scoreThreshold)
            .map(({ idx }) => idx);
        const filteredRegions = indices.map(idx => {
            const regionsData = onetOuts[idx].regions.arraySync();
            return new MtcnnBox(regionsData[0][0], regionsData[0][1], regionsData[0][2], regionsData[0][3]);
        });
        const filteredBoxes = indices
            .map((idx, i) => inputBoxes[idx].calibrate(filteredRegions[i]));
        const filteredScores = indices.map(idx => scores[idx]);
        let finalBoxes = [];
        let finalScores = [];
        let points = [];
        if (filteredBoxes.length > 0) {
            ts = Date.now();
            const indicesNms = nonMaxSuppression$1(filteredBoxes, filteredScores, 0.7, false);
            stats.stage3_nms = Date.now() - ts;
            finalBoxes = indicesNms.map(idx => filteredBoxes[idx]);
            finalScores = indicesNms.map(idx => filteredScores[idx]);
            points = indicesNms.map((idx, i) => Array(5).fill(0).map((_, ptIdx) => {
                const pointsData = onetOuts[idx].points.arraySync();
                return new Point(((pointsData[0][ptIdx] * (finalBoxes[i].width + 1)) + finalBoxes[i].left), ((pointsData[0][ptIdx + 5] * (finalBoxes[i].height + 1)) + finalBoxes[i].top));
            }));
        }
        onetOuts.forEach(t => {
            t.regions.dispose();
            t.scores.dispose();
            t.points.dispose();
        });
        return {
            boxes: finalBoxes,
            scores: finalScores,
            points
        };
    }

    class Mtcnn extends NeuralNetwork {
        constructor() {
            super('Mtcnn');
        }
        async load(weightsOrUrl) {
            console.warn('mtcnn is deprecated and will be removed soon');
            return super.load(weightsOrUrl);
        }
        async loadFromDisk(filePath) {
            console.warn('mtcnn is deprecated and will be removed soon');
            return super.loadFromDisk(filePath);
        }
        async forwardInput(input, forwardParams = {}) {
            const { params } = this;
            if (!params) {
                throw new Error('Mtcnn - load model before inference');
            }
            const inputCanvas = input.canvases[0];
            if (!inputCanvas) {
                throw new Error('Mtcnn - inputCanvas is not defined, note that passing tensors into Mtcnn.forwardInput is not supported yet.');
            }
            const stats = {};
            const tsTotal = Date.now();
            const imgTensor = tf__namespace.tidy(() => tf__namespace.cast(bgrToRgbTensor(tf__namespace.expandDims(tf__namespace.browser.fromPixels(inputCanvas))), 'float32'));
            const onReturn = (results) => {
                // dispose tensors on return
                imgTensor.dispose();
                stats.total = Date.now() - tsTotal;
                return results;
            };
            const [height, width] = imgTensor.shape.slice(1);
            const { minFaceSize, scaleFactor, maxNumScales, scoreThresholds, scaleSteps } = new MtcnnOptions(forwardParams);
            const scales = (scaleSteps || pyramidDown(minFaceSize, scaleFactor, [height, width]))
                .filter(scale => {
                const sizes = getSizesForScale(scale, [height, width]);
                return Math.min(sizes.width, sizes.height) > CELL_SIZE;
            })
                .slice(0, maxNumScales);
            stats.scales = scales;
            stats.pyramid = scales.map(scale => getSizesForScale(scale, [height, width]));
            let ts = Date.now();
            const out1 = await stage1(imgTensor, scales, scoreThresholds[0], params.pnet, stats);
            stats.total_stage1 = Date.now() - ts;
            if (!out1.boxes.length) {
                return onReturn({ results: [], stats });
            }
            stats.stage2_numInputBoxes = out1.boxes.length;
            // using the inputCanvas to extract and resize the image patches, since it is faster
            // than doing this on the gpu
            ts = Date.now();
            const out2 = await stage2(inputCanvas, out1.boxes, scoreThresholds[1], params.rnet, stats);
            stats.total_stage2 = Date.now() - ts;
            if (!out2.boxes.length) {
                return onReturn({ results: [], stats });
            }
            stats.stage3_numInputBoxes = out2.boxes.length;
            ts = Date.now();
            const out3 = await stage3(inputCanvas, out2.boxes, scoreThresholds[2], params.onet, stats);
            stats.total_stage3 = Date.now() - ts;
            const results = out3.boxes.map((box, idx) => extendWithFaceLandmarks(extendWithFaceDetection({}, new FaceDetection(out3.scores[idx], new Rect(box.left / width, box.top / height, box.width / width, box.height / height), {
                height,
                width
            })), new FaceLandmarks5(out3.points[idx].map(pt => pt.sub(new Point(box.left, box.top)).div(new Point(box.width, box.height))), { width: box.width, height: box.height })));
            return onReturn({ results, stats });
        }
        async forward(input, forwardParams = {}) {
            return (await this.forwardInput(await toNetInput(input), forwardParams)).results;
        }
        async forwardWithStats(input, forwardParams = {}) {
            return this.forwardInput(await toNetInput(input), forwardParams);
        }
        getDefaultModelName() {
            return 'mtcnn_model';
        }
        extractParamsFromWeigthMap(weightMap) {
            return extractParamsFromWeigthMap(weightMap);
        }
        extractParams(weights) {
            return extractParams(weights);
        }
    }

    const IOU_THRESHOLD = 0.4;
    const BOX_ANCHORS = [
        new Point(1.603231, 2.094468),
        new Point(6.041143, 7.080126),
        new Point(2.882459, 3.518061),
        new Point(4.266906, 5.178857),
        new Point(9.041765, 10.66308)
    ];
    const MEAN_RGB = [117.001, 114.697, 97.404];

    class TinyFaceDetector extends TinyYolov2Base {
        constructor() {
            const config = {
                withSeparableConvs: true,
                iouThreshold: IOU_THRESHOLD,
                classes: ['face'],
                anchors: BOX_ANCHORS,
                meanRgb: MEAN_RGB,
                isFirstLayerConv2d: true,
                filterSizes: [3, 16, 32, 64, 128, 256, 512]
            };
            super(config);
        }
        get anchors() {
            return this.config.anchors;
        }
        async locateFaces(input, forwardParams) {
            const objectDetections = await this.detect(input, forwardParams);
            return objectDetections.map(det => new FaceDetection(det.score, det.relativeBox, { width: det.imageWidth, height: det.imageHeight }));
        }
        getDefaultModelName() {
            return 'tiny_face_detector_model';
        }
        extractParamsFromWeigthMap(weightMap) {
            return super.extractParamsFromWeigthMap(weightMap);
        }
    }

    const nets = {
        ssdMobilenetv1: new SsdMobilenetv1(),
        tinyFaceDetector: new TinyFaceDetector(),
        tinyYolov2: new TinyYolov2(),
        mtcnn: new Mtcnn(),
        faceLandmark68Net: new FaceLandmark68Net(),
        faceLandmark68TinyNet: new FaceLandmark68TinyNet(),
        faceRecognitionNet: new FaceRecognitionNet(),
        faceExpressionNet: new FaceExpressionNet(),
        ageGenderNet: new AgeGenderNet()
    };
    /**
     * Attempts to detect all faces in an image using SSD Mobilenetv1 Network.
     *
     * @param input The input image.
     * @param options (optional, default: see SsdMobilenetv1Options constructor for default parameters).
     * @returns Bounding box of each face with score.
     */
    const ssdMobilenetv1 = (input, options) => nets.ssdMobilenetv1.locateFaces(input, options);
    /**
     * Attempts to detect all faces in an image using the Tiny Face Detector.
     *
     * @param input The input image.
     * @param options (optional, default: see TinyFaceDetectorOptions constructor for default parameters).
     * @returns Bounding box of each face with score.
     */
    const tinyFaceDetector = (input, options) => nets.tinyFaceDetector.locateFaces(input, options);
    /**
     * Attempts to detect all faces in an image using the Tiny Yolov2 Network.
     *
     * @param input The input image.
     * @param options (optional, default: see TinyYolov2Options constructor for default parameters).
     * @returns Bounding box of each face with score.
     */
    const tinyYolov2 = (input, options) => nets.tinyYolov2.locateFaces(input, options);
    /**
     * Attempts to detect all faces in an image and the 5 point face landmarks
     * of each detected face using the MTCNN Network.
     *
     * @param input The input image.
     * @param options (optional, default: see MtcnnOptions constructor for default parameters).
     * @returns Bounding box of each face with score and 5 point face landmarks.
     */
    const mtcnn = (input, options) => nets.mtcnn.forward(input, options);
    /**
     * Detects the 68 point face landmark positions of the face shown in an image.
     *
     * @param inputs The face image extracted from the bounding box of a face. Can
     * also be an array of input images, which will be batch processed.
     * @returns 68 point face landmarks or array thereof in case of batch input.
     */
    const detectFaceLandmarks = (input) => nets.faceLandmark68Net.detectLandmarks(input);
    /**
     * Detects the 68 point face landmark positions of the face shown in an image
     * using a tinier version of the 68 point face landmark model, which is slightly
     * faster at inference, but also slightly less accurate.
     *
     * @param inputs The face image extracted from the bounding box of a face. Can
     * also be an array of input images, which will be batch processed.
     * @returns 68 point face landmarks or array thereof in case of batch input.
     */
    const detectFaceLandmarksTiny = (input) => nets.faceLandmark68TinyNet.detectLandmarks(input);
    /**
     * Computes a 128 entry vector (face descriptor / face embeddings) from the face shown in an image,
     * which uniquely represents the features of that persons face. The computed face descriptor can
     * be used to measure the similarity between faces, by computing the euclidean distance of two
     * face descriptors.
     *
     * @param inputs The face image extracted from the aligned bounding box of a face. Can
     * also be an array of input images, which will be batch processed.
     * @returns Face descriptor with 128 entries or array thereof in case of batch input.
     */
    const computeFaceDescriptor = (input) => nets.faceRecognitionNet.computeFaceDescriptor(input);
    /**
     * Recognizes the facial expressions from a face image.
     *
     * @param inputs The face image extracted from the bounding box of a face. Can
     * also be an array of input images, which will be batch processed.
     * @returns Facial expressions with corresponding probabilities or array thereof in case of batch input.
     */
    const recognizeFaceExpressions = (input) => nets.faceExpressionNet.predictExpressions(input);
    /**
     * Predicts age and gender from a face image.
     *
     * @param inputs The face image extracted from the bounding box of a face. Can
     * also be an array of input images, which will be batch processed.
     * @returns Predictions with age, gender and gender probability or array thereof in case of batch input.
     */
    const predictAgeAndGender = (input) => nets.ageGenderNet.predictAgeAndGender(input);
    const loadSsdMobilenetv1Model = (url) => nets.ssdMobilenetv1.load(url);
    const loadTinyFaceDetectorModel = (url) => nets.tinyFaceDetector.load(url);
    const loadMtcnnModel = (url) => nets.mtcnn.load(url);
    const loadTinyYolov2Model = (url) => nets.tinyYolov2.load(url);
    const loadFaceLandmarkModel = (url) => nets.faceLandmark68Net.load(url);
    const loadFaceLandmarkTinyModel = (url) => nets.faceLandmark68TinyNet.load(url);
    const loadFaceRecognitionModel = (url) => nets.faceRecognitionNet.load(url);
    const loadFaceExpressionModel = (url) => nets.faceExpressionNet.load(url);
    const loadAgeGenderModel = (url) => nets.ageGenderNet.load(url);
    // backward compatibility
    const loadFaceDetectionModel = loadSsdMobilenetv1Model;
    const locateFaces = ssdMobilenetv1;
    const detectLandmarks = detectFaceLandmarks;

    class PredictFaceExpressionsTaskBase extends ComposableTask {
        constructor(parentTask, input, extractedFaces) {
            super();
            this.parentTask = parentTask;
            this.input = input;
            this.extractedFaces = extractedFaces;
        }
    }
    class PredictAllFaceExpressionsTask extends PredictFaceExpressionsTaskBase {
        async run() {
            const parentResults = await this.parentTask;
            const faceExpressionsByFace = await extractAllFacesAndComputeResults(parentResults, this.input, async (faces) => await Promise.all(faces.map(face => nets.faceExpressionNet.predictExpressions(face))), this.extractedFaces);
            return parentResults.map((parentResult, i) => extendWithFaceExpressions(parentResult, faceExpressionsByFace[i]));
        }
        withAgeAndGender() {
            return new PredictAllAgeAndGenderTask(this, this.input);
        }
    }
    class PredictSingleFaceExpressionsTask extends PredictFaceExpressionsTaskBase {
        async run() {
            const parentResult = await this.parentTask;
            if (!parentResult) {
                return;
            }
            const faceExpressions = await extractSingleFaceAndComputeResult(parentResult, this.input, face => nets.faceExpressionNet.predictExpressions(face), this.extractedFaces);
            return extendWithFaceExpressions(parentResult, faceExpressions);
        }
        withAgeAndGender() {
            return new PredictSingleAgeAndGenderTask(this, this.input);
        }
    }
    class PredictAllFaceExpressionsWithFaceAlignmentTask extends PredictAllFaceExpressionsTask {
        withAgeAndGender() {
            return new PredictAllAgeAndGenderWithFaceAlignmentTask(this, this.input);
        }
        withFaceDescriptors() {
            return new ComputeAllFaceDescriptorsTask(this, this.input);
        }
    }
    class PredictSingleFaceExpressionsWithFaceAlignmentTask extends PredictSingleFaceExpressionsTask {
        withAgeAndGender() {
            return new PredictSingleAgeAndGenderWithFaceAlignmentTask(this, this.input);
        }
        withFaceDescriptor() {
            return new ComputeSingleFaceDescriptorTask(this, this.input);
        }
    }

    class PredictAgeAndGenderTaskBase extends ComposableTask {
        constructor(parentTask, input, extractedFaces) {
            super();
            this.parentTask = parentTask;
            this.input = input;
            this.extractedFaces = extractedFaces;
        }
    }
    class PredictAllAgeAndGenderTask extends PredictAgeAndGenderTaskBase {
        async run() {
            const parentResults = await this.parentTask;
            const ageAndGenderByFace = await extractAllFacesAndComputeResults(parentResults, this.input, async (faces) => await Promise.all(faces.map(face => nets.ageGenderNet.predictAgeAndGender(face))), this.extractedFaces);
            return parentResults.map((parentResult, i) => {
                const { age, gender, genderProbability } = ageAndGenderByFace[i];
                return extendWithAge(extendWithGender(parentResult, gender, genderProbability), age);
            });
        }
        withFaceExpressions() {
            return new PredictAllFaceExpressionsTask(this, this.input);
        }
    }
    class PredictSingleAgeAndGenderTask extends PredictAgeAndGenderTaskBase {
        async run() {
            const parentResult = await this.parentTask;
            if (!parentResult) {
                return;
            }
            const { age, gender, genderProbability } = await extractSingleFaceAndComputeResult(parentResult, this.input, face => nets.ageGenderNet.predictAgeAndGender(face), this.extractedFaces);
            return extendWithAge(extendWithGender(parentResult, gender, genderProbability), age);
        }
        withFaceExpressions() {
            return new PredictSingleFaceExpressionsTask(this, this.input);
        }
    }
    class PredictAllAgeAndGenderWithFaceAlignmentTask extends PredictAllAgeAndGenderTask {
        withFaceExpressions() {
            return new PredictAllFaceExpressionsWithFaceAlignmentTask(this, this.input);
        }
        withFaceDescriptors() {
            return new ComputeAllFaceDescriptorsTask(this, this.input);
        }
    }
    class PredictSingleAgeAndGenderWithFaceAlignmentTask extends PredictSingleAgeAndGenderTask {
        withFaceExpressions() {
            return new PredictSingleFaceExpressionsWithFaceAlignmentTask(this, this.input);
        }
        withFaceDescriptor() {
            return new ComputeSingleFaceDescriptorTask(this, this.input);
        }
    }

    class ComputeFaceDescriptorsTaskBase extends ComposableTask {
        constructor(parentTask, input) {
            super();
            this.parentTask = parentTask;
            this.input = input;
        }
    }
    class ComputeAllFaceDescriptorsTask extends ComputeFaceDescriptorsTaskBase {
        async run() {
            const parentResults = await this.parentTask;
            const descriptors = await extractAllFacesAndComputeResults(parentResults, this.input, faces => Promise.all(faces.map(face => nets.faceRecognitionNet.computeFaceDescriptor(face))), null, parentResult => parentResult.landmarks.align(null, { useDlibAlignment: true }));
            return descriptors.map((descriptor, i) => extendWithFaceDescriptor(parentResults[i], descriptor));
        }
        withFaceExpressions() {
            return new PredictAllFaceExpressionsWithFaceAlignmentTask(this, this.input);
        }
        withAgeAndGender() {
            return new PredictAllAgeAndGenderWithFaceAlignmentTask(this, this.input);
        }
    }
    class ComputeSingleFaceDescriptorTask extends ComputeFaceDescriptorsTaskBase {
        async run() {
            const parentResult = await this.parentTask;
            if (!parentResult) {
                return;
            }
            const descriptor = await extractSingleFaceAndComputeResult(parentResult, this.input, face => nets.faceRecognitionNet.computeFaceDescriptor(face), null, parentResult => parentResult.landmarks.align(null, { useDlibAlignment: true }));
            return extendWithFaceDescriptor(parentResult, descriptor);
        }
        withFaceExpressions() {
            return new PredictSingleFaceExpressionsWithFaceAlignmentTask(this, this.input);
        }
        withAgeAndGender() {
            return new PredictSingleAgeAndGenderWithFaceAlignmentTask(this, this.input);
        }
    }

    class DetectFaceLandmarksTaskBase extends ComposableTask {
        constructor(parentTask, input, useTinyLandmarkNet) {
            super();
            this.parentTask = parentTask;
            this.input = input;
            this.useTinyLandmarkNet = useTinyLandmarkNet;
        }
        get landmarkNet() {
            return this.useTinyLandmarkNet
                ? nets.faceLandmark68TinyNet
                : nets.faceLandmark68Net;
        }
    }
    class DetectAllFaceLandmarksTask extends DetectFaceLandmarksTaskBase {
        async run() {
            const parentResults = await this.parentTask;
            const detections = parentResults.map(res => res.detection);
            const faces = this.input instanceof tf__namespace.Tensor
                ? await extractFaceTensors(this.input, detections)
                : await extractFaces(this.input, detections);
            const faceLandmarksByFace = await Promise.all(faces.map(face => this.landmarkNet.detectLandmarks(face)));
            faces.forEach(f => f instanceof tf__namespace.Tensor && f.dispose());
            return parentResults.map((parentResult, i) => extendWithFaceLandmarks(parentResult, faceLandmarksByFace[i]));
        }
        withFaceExpressions() {
            return new PredictAllFaceExpressionsWithFaceAlignmentTask(this, this.input);
        }
        withAgeAndGender() {
            return new PredictAllAgeAndGenderWithFaceAlignmentTask(this, this.input);
        }
        withFaceDescriptors() {
            return new ComputeAllFaceDescriptorsTask(this, this.input);
        }
    }
    class DetectSingleFaceLandmarksTask extends DetectFaceLandmarksTaskBase {
        async run() {
            const parentResult = await this.parentTask;
            if (!parentResult) {
                return;
            }
            const { detection } = parentResult;
            const faces = this.input instanceof tf__namespace.Tensor
                ? await extractFaceTensors(this.input, [detection])
                : await extractFaces(this.input, [detection]);
            const landmarks = await this.landmarkNet.detectLandmarks(faces[0]);
            faces.forEach(f => f instanceof tf__namespace.Tensor && f.dispose());
            return extendWithFaceLandmarks(parentResult, landmarks);
        }
        withFaceExpressions() {
            return new PredictSingleFaceExpressionsWithFaceAlignmentTask(this, this.input);
        }
        withAgeAndGender() {
            return new PredictSingleAgeAndGenderWithFaceAlignmentTask(this, this.input);
        }
        withFaceDescriptor() {
            return new ComputeSingleFaceDescriptorTask(this, this.input);
        }
    }

    class DetectFacesTaskBase extends ComposableTask {
        constructor(input, options = new SsdMobilenetv1Options()) {
            super();
            this.input = input;
            this.options = options;
        }
    }
    class DetectAllFacesTask extends DetectFacesTaskBase {
        async run() {
            const { input, options } = this;
            if (options instanceof MtcnnOptions) {
                return (await nets.mtcnn.forward(input, options))
                    .map(result => result.detection);
            }
            const faceDetectionFunction = options instanceof TinyFaceDetectorOptions
                ? (input) => nets.tinyFaceDetector.locateFaces(input, options)
                : (options instanceof SsdMobilenetv1Options
                    ? (input) => nets.ssdMobilenetv1.locateFaces(input, options)
                    : (options instanceof TinyYolov2Options
                        ? (input) => nets.tinyYolov2.locateFaces(input, options)
                        : null));
            if (!faceDetectionFunction) {
                throw new Error('detectFaces - expected options to be instance of TinyFaceDetectorOptions | SsdMobilenetv1Options | MtcnnOptions | TinyYolov2Options');
            }
            return faceDetectionFunction(input);
        }
        runAndExtendWithFaceDetections() {
            return new Promise(async (res) => {
                const detections = await this.run();
                return res(detections.map(detection => extendWithFaceDetection({}, detection)));
            });
        }
        withFaceLandmarks(useTinyLandmarkNet = false) {
            return new DetectAllFaceLandmarksTask(this.runAndExtendWithFaceDetections(), this.input, useTinyLandmarkNet);
        }
        withFaceExpressions() {
            return new PredictAllFaceExpressionsTask(this.runAndExtendWithFaceDetections(), this.input);
        }
        withAgeAndGender() {
            return new PredictAllAgeAndGenderTask(this.runAndExtendWithFaceDetections(), this.input);
        }
    }
    class DetectSingleFaceTask extends DetectFacesTaskBase {
        async run() {
            const faceDetections = await new DetectAllFacesTask(this.input, this.options);
            let faceDetectionWithHighestScore = faceDetections[0];
            faceDetections.forEach(faceDetection => {
                if (faceDetection.score > faceDetectionWithHighestScore.score) {
                    faceDetectionWithHighestScore = faceDetection;
                }
            });
            return faceDetectionWithHighestScore;
        }
        runAndExtendWithFaceDetection() {
            return new Promise(async (res) => {
                const detection = await this.run();
                return res(detection ? extendWithFaceDetection({}, detection) : undefined);
            });
        }
        withFaceLandmarks(useTinyLandmarkNet = false) {
            return new DetectSingleFaceLandmarksTask(this.runAndExtendWithFaceDetection(), this.input, useTinyLandmarkNet);
        }
        withFaceExpressions() {
            return new PredictSingleFaceExpressionsTask(this.runAndExtendWithFaceDetection(), this.input);
        }
        withAgeAndGender() {
            return new PredictSingleAgeAndGenderTask(this.runAndExtendWithFaceDetection(), this.input);
        }
    }

    function detectSingleFace(input, options = new SsdMobilenetv1Options()) {
        return new DetectSingleFaceTask(input, options);
    }
    function detectAllFaces(input, options = new SsdMobilenetv1Options()) {
        return new DetectAllFacesTask(input, options);
    }

    // export allFaces API for backward compatibility
    async function allFacesSsdMobilenetv1(input, minConfidence) {
        console.warn('allFacesSsdMobilenetv1 is deprecated and will be removed soon, use the high level api instead');
        return await detectAllFaces(input, new SsdMobilenetv1Options(minConfidence ? { minConfidence } : {}))
            .withFaceLandmarks()
            .withFaceDescriptors();
    }
    async function allFacesTinyYolov2(input, forwardParams = {}) {
        console.warn('allFacesTinyYolov2 is deprecated and will be removed soon, use the high level api instead');
        return await detectAllFaces(input, new TinyYolov2Options(forwardParams))
            .withFaceLandmarks()
            .withFaceDescriptors();
    }
    async function allFacesMtcnn(input, forwardParams = {}) {
        console.warn('allFacesMtcnn is deprecated and will be removed soon, use the high level api instead');
        return await detectAllFaces(input, new MtcnnOptions(forwardParams))
            .withFaceLandmarks()
            .withFaceDescriptors();
    }
    const allFaces = allFacesSsdMobilenetv1;

    function euclideanDistance(arr1, arr2) {
        if (arr1.length !== arr2.length)
            throw new Error('euclideanDistance: arr1.length !== arr2.length');
        const desc1 = Array.from(arr1);
        const desc2 = Array.from(arr2);
        return Math.sqrt(desc1
            .map((val, i) => val - desc2[i])
            .reduce((res, diff) => res + Math.pow(diff, 2), 0));
    }

    class FaceMatcher {
        constructor(inputs, distanceThreshold = 0.6) {
            this._distanceThreshold = distanceThreshold;
            const inputArray = Array.isArray(inputs) ? inputs : [inputs];
            if (!inputArray.length) {
                throw new Error(`FaceRecognizer.constructor - expected atleast one input`);
            }
            let count = 1;
            const createUniqueLabel = () => `person ${count++}`;
            this._labeledDescriptors = inputArray.map((desc) => {
                if (desc instanceof LabeledFaceDescriptors) {
                    return desc;
                }
                if (desc instanceof Float32Array) {
                    return new LabeledFaceDescriptors(createUniqueLabel(), [desc]);
                }
                if (desc.descriptor && desc.descriptor instanceof Float32Array) {
                    return new LabeledFaceDescriptors(createUniqueLabel(), [desc.descriptor]);
                }
                throw new Error(`FaceRecognizer.constructor - expected inputs to be of type LabeledFaceDescriptors | WithFaceDescriptor<any> | Float32Array | Array<LabeledFaceDescriptors | WithFaceDescriptor<any> | Float32Array>`);
            });
        }
        get labeledDescriptors() { return this._labeledDescriptors; }
        get distanceThreshold() { return this._distanceThreshold; }
        computeMeanDistance(queryDescriptor, descriptors) {
            return descriptors
                .map(d => euclideanDistance(d, queryDescriptor))
                .reduce((d1, d2) => d1 + d2, 0)
                / (descriptors.length || 1);
        }
        matchDescriptor(queryDescriptor) {
            return this.labeledDescriptors
                .map(({ descriptors, label }) => new FaceMatch(label, this.computeMeanDistance(queryDescriptor, descriptors)))
                .reduce((best, curr) => best.distance < curr.distance ? best : curr);
        }
        findBestMatch(queryDescriptor) {
            const bestMatch = this.matchDescriptor(queryDescriptor);
            return bestMatch.distance < this.distanceThreshold
                ? bestMatch
                : new FaceMatch('unknown', bestMatch.distance);
        }
        toJSON() {
            return {
                distanceThreshold: this.distanceThreshold,
                labeledDescriptors: this.labeledDescriptors.map((ld) => ld.toJSON())
            };
        }
        static fromJSON(json) {
            const labeledDescriptors = json.labeledDescriptors
                .map((ld) => LabeledFaceDescriptors.fromJSON(ld));
            return new FaceMatcher(labeledDescriptors, json.distanceThreshold);
        }
    }

    function createMtcnn(weights) {
        const net = new Mtcnn();
        net.extractWeights(weights);
        return net;
    }

    function createTinyFaceDetector(weights) {
        const net = new TinyFaceDetector();
        net.extractWeights(weights);
        return net;
    }

    function resizeResults(results, dimensions) {
        const { width, height } = new Dimensions(dimensions.width, dimensions.height);
        if (width <= 0 || height <= 0) {
            throw new Error(`resizeResults - invalid dimensions: ${JSON.stringify({ width, height })}`);
        }
        if (Array.isArray(results)) {
            return results.map(obj => resizeResults(obj, { width, height }));
        }
        if (isWithFaceLandmarks(results)) {
            const resizedDetection = results.detection.forSize(width, height);
            const resizedLandmarks = results.unshiftedLandmarks.forSize(resizedDetection.box.width, resizedDetection.box.height);
            return extendWithFaceLandmarks(extendWithFaceDetection(results, resizedDetection), resizedLandmarks);
        }
        if (isWithFaceDetection(results)) {
            return extendWithFaceDetection(results, results.detection.forSize(width, height));
        }
        if (results instanceof FaceLandmarks || results instanceof FaceDetection) {
            return results.forSize(width, height);
        }
        return results;
    }

    exports.tf = tf__namespace;
    exports.AgeGenderNet = AgeGenderNet;
    exports.BoundingBox = BoundingBox;
    exports.Box = Box;
    exports.ComposableTask = ComposableTask;
    exports.ComputeAllFaceDescriptorsTask = ComputeAllFaceDescriptorsTask;
    exports.ComputeFaceDescriptorsTaskBase = ComputeFaceDescriptorsTaskBase;
    exports.ComputeSingleFaceDescriptorTask = ComputeSingleFaceDescriptorTask;
    exports.DetectAllFaceLandmarksTask = DetectAllFaceLandmarksTask;
    exports.DetectAllFacesTask = DetectAllFacesTask;
    exports.DetectFaceLandmarksTaskBase = DetectFaceLandmarksTaskBase;
    exports.DetectFacesTaskBase = DetectFacesTaskBase;
    exports.DetectSingleFaceLandmarksTask = DetectSingleFaceLandmarksTask;
    exports.DetectSingleFaceTask = DetectSingleFaceTask;
    exports.Dimensions = Dimensions;
    exports.FACE_EXPRESSION_LABELS = FACE_EXPRESSION_LABELS;
    exports.FaceDetection = FaceDetection;
    exports.FaceDetectionNet = FaceDetectionNet;
    exports.FaceExpressionNet = FaceExpressionNet;
    exports.FaceExpressions = FaceExpressions;
    exports.FaceLandmark68Net = FaceLandmark68Net;
    exports.FaceLandmark68TinyNet = FaceLandmark68TinyNet;
    exports.FaceLandmarkNet = FaceLandmarkNet;
    exports.FaceLandmarks = FaceLandmarks;
    exports.FaceLandmarks5 = FaceLandmarks5;
    exports.FaceLandmarks68 = FaceLandmarks68;
    exports.FaceMatch = FaceMatch;
    exports.FaceMatcher = FaceMatcher;
    exports.FaceRecognitionNet = FaceRecognitionNet;
    exports.LabeledBox = LabeledBox;
    exports.LabeledFaceDescriptors = LabeledFaceDescriptors;
    exports.Mtcnn = Mtcnn;
    exports.MtcnnOptions = MtcnnOptions;
    exports.NetInput = NetInput;
    exports.NeuralNetwork = NeuralNetwork;
    exports.ObjectDetection = ObjectDetection;
    exports.Point = Point;
    exports.PredictedBox = PredictedBox;
    exports.Rect = Rect;
    exports.SsdMobilenetv1 = SsdMobilenetv1;
    exports.SsdMobilenetv1Options = SsdMobilenetv1Options;
    exports.TinyFaceDetector = TinyFaceDetector;
    exports.TinyFaceDetectorOptions = TinyFaceDetectorOptions;
    exports.TinyYolov2 = TinyYolov2;
    exports.TinyYolov2Options = TinyYolov2Options;
    exports.allFaces = allFaces;
    exports.allFacesMtcnn = allFacesMtcnn;
    exports.allFacesSsdMobilenetv1 = allFacesSsdMobilenetv1;
    exports.allFacesTinyYolov2 = allFacesTinyYolov2;
    exports.awaitMediaLoaded = awaitMediaLoaded;
    exports.bufferToImage = bufferToImage;
    exports.computeFaceDescriptor = computeFaceDescriptor;
    exports.createCanvas = createCanvas;
    exports.createCanvasFromMedia = createCanvasFromMedia;
    exports.createFaceDetectionNet = createFaceDetectionNet;
    exports.createFaceRecognitionNet = createFaceRecognitionNet;
    exports.createMtcnn = createMtcnn;
    exports.createSsdMobilenetv1 = createSsdMobilenetv1;
    exports.createTinyFaceDetector = createTinyFaceDetector;
    exports.createTinyYolov2 = createTinyYolov2;
    exports.detectAllFaces = detectAllFaces;
    exports.detectFaceLandmarks = detectFaceLandmarks;
    exports.detectFaceLandmarksTiny = detectFaceLandmarksTiny;
    exports.detectLandmarks = detectLandmarks;
    exports.detectSingleFace = detectSingleFace;
    exports.draw = index;
    exports.env = env;
    exports.euclideanDistance = euclideanDistance;
    exports.extendWithAge = extendWithAge;
    exports.extendWithFaceDescriptor = extendWithFaceDescriptor;
    exports.extendWithFaceDetection = extendWithFaceDetection;
    exports.extendWithFaceExpressions = extendWithFaceExpressions;
    exports.extendWithFaceLandmarks = extendWithFaceLandmarks;
    exports.extendWithGender = extendWithGender;
    exports.extractFaceTensors = extractFaceTensors;
    exports.extractFaces = extractFaces;
    exports.fetchImage = fetchImage;
    exports.fetchJson = fetchJson;
    exports.fetchNetWeights = fetchNetWeights;
    exports.fetchOrThrow = fetchOrThrow;
    exports.getContext2dOrThrow = getContext2dOrThrow;
    exports.getMediaDimensions = getMediaDimensions;
    exports.imageTensorToCanvas = imageTensorToCanvas;
    exports.imageToSquare = imageToSquare;
    exports.inverseSigmoid = inverseSigmoid;
    exports.iou = iou;
    exports.isMediaElement = isMediaElement;
    exports.isMediaLoaded = isMediaLoaded;
    exports.isWithAge = isWithAge;
    exports.isWithFaceDetection = isWithFaceDetection;
    exports.isWithFaceExpressions = isWithFaceExpressions;
    exports.isWithFaceLandmarks = isWithFaceLandmarks;
    exports.isWithGender = isWithGender;
    exports.loadAgeGenderModel = loadAgeGenderModel;
    exports.loadFaceDetectionModel = loadFaceDetectionModel;
    exports.loadFaceExpressionModel = loadFaceExpressionModel;
    exports.loadFaceLandmarkModel = loadFaceLandmarkModel;
    exports.loadFaceLandmarkTinyModel = loadFaceLandmarkTinyModel;
    exports.loadFaceRecognitionModel = loadFaceRecognitionModel;
    exports.loadMtcnnModel = loadMtcnnModel;
    exports.loadSsdMobilenetv1Model = loadSsdMobilenetv1Model;
    exports.loadTinyFaceDetectorModel = loadTinyFaceDetectorModel;
    exports.loadTinyYolov2Model = loadTinyYolov2Model;
    exports.loadWeightMap = loadWeightMap;
    exports.locateFaces = locateFaces;
    exports.matchDimensions = matchDimensions;
    exports.minBbox = minBbox;
    exports.mtcnn = mtcnn;
    exports.nets = nets;
    exports.nonMaxSuppression = nonMaxSuppression$1;
    exports.normalize = normalize$1;
    exports.padToSquare = padToSquare;
    exports.predictAgeAndGender = predictAgeAndGender;
    exports.recognizeFaceExpressions = recognizeFaceExpressions;
    exports.resizeResults = resizeResults;
    exports.resolveInput = resolveInput;
    exports.shuffleArray = shuffleArray;
    exports.sigmoid = sigmoid;
    exports.ssdMobilenetv1 = ssdMobilenetv1;
    exports.tinyFaceDetector = tinyFaceDetector;
    exports.tinyYolov2 = tinyYolov2;
    exports.toNetInput = toNetInput;
    exports.utils = index$1;
    exports.validateConfig = validateConfig;

}));
//# sourceMappingURL=face-api.js.map
