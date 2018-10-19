// Configs


const canvas = document.getElementById('canvas');
const img = document.getElementById('before-img');
window.addEventListener('load', () => {
  canvas.setAttribute('width', Math.round(img.getBoundingClientRect().width));
  canvas.setAttribute('height', Math.round(img.getBoundingClientRect().height));
  onLoad(img.src);
});

const onLoad = (src) => {
  const image = new Image();
  image.src = src;
  const delaunay = new Delaunay(image, canvas);
  delaunay.go();
}

const adjustImage = (image, target) => {
  const bWidth = target.getBoundingClientRect().width;
  const bHeight = target.getBoundingClientRect().height;
  const {
    width,
    height
  } = image;
  let scale = 1;
  if (width > bWidth) {
    scale = bWidth / width;
  }
  if (height > bHeight) {
    scale = Math.min(scale, bHeight / height);
  }
  image.width = width * scale;
  image.height = height * scale;
  return image;
}

// Filters
const gaussianBlur1D = ((size) => {
  const matrix = [];

  for (let i = 0; i < size * size; i += 1) {
    matrix[i] = 1 / (size * size);
  }
  return matrix;
})(5);

const edge = ((size) => {
  const matrix = [];
  for (let i = 0; i < size * size; i += 1) {
    matrix[i] = i === Math.floor(size * size / 2) ? -size * size + 1 : 1;
  }
  return matrix;
})(5);

const applyConvolution = (kernel, imageData) => {
  const kSize = Math.sqrt(kernel.length);
  const {
    width,
    height
  } = imageData;

  const blurredData = new Uint8ClampedArray(imageData.data.length);

  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      let [r, g, b] = [0, 0, 0];
      for (let k = 0; k < kernel.length; k += 1) {
        const ki = k % kSize - Math.floor(kSize / 2);
        const kj = Math.floor(k / kSize) - Math.floor(kSize / 2);
        r += kernel[k] * imageData.data[4 * (i + ki + (j + kj) * width)] | 0;
        g += kernel[k] * imageData.data[4 * (i + ki + (j + kj) * width) + 1] | 0;
        b += kernel[k] * imageData.data[4 * (i + ki + (j + kj) * width) + 2] | 0;
      }
      blurredData[4 * (i + j * width)] = r;
      blurredData[4 * (i + j * width) + 1] = g;
      blurredData[4 * (i + j * width) + 2] = b;
      blurredData[4 * (i + j * width) + 3] = imageData.data[4 * (i + j * width) + 3];
    }
  }

  return new ImageData(blurredData, width, height);
}

const grayScale = (imageData) => {
  const cR = 0.2126;
  const cG = 0.7152;
  const cB = 0.0722;
  const grayScaleData = new Uint8ClampedArray(imageData.data.length);
  const {
    width,
    height
  } = imageData;
  for (let i = 0; i < width * height; i += 1) {
    const [r, g, b] = [imageData.data[4 * i], imageData.data[4 * i + 1], imageData.data[4 * i + 2]];
    const grayScalePixel = cR * r + cG * g + cB * b;
    grayScaleData[4 * i] = grayScalePixel;
    grayScaleData[4 * i + 1] = grayScalePixel;
    grayScaleData[4 * i + 2] = grayScalePixel;
    grayScaleData[4 * i + 3] = 255;
  }

  return new ImageData(grayScaleData, width, height);
}

const getEdgePoints = (imageData) => {
  const {
    width,
    height
  } = imageData;
  const TOLERANCE = 50;
  const points = [];
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      if (imageData.data[4 * (width * j + i)] >= TOLERANCE) {
        points.push([i, j]);
      }
    }
  }
  console.log(points.length);
  return points;
}

class Delaunay {
  constructor(image, target) {
    // Can make this more flexible by creating a canvas and appending to target.
    this.targetCtx = target.getContext('2d');
    // adjustImage already takes in any DOM node.
    this.image = adjustImage(image, target);
  }

  go() {
    const {
      image,
      targetCtx,
    } = this;
    const {
      width,
      height
    } = image;

    // Init draw
    targetCtx.drawImage(image, 0, 0, width, height);

    const imageData = targetCtx.getImageData(0, 0, width, height);
    const grayScaleData = grayScale(imageData);
    const blurredData = applyConvolution(gaussianBlur1D, grayScaleData);
    const edgeData = applyConvolution(edge, blurredData);
    const points = getEdgePoints(edgeData);
    const POINT_RATE = 0.075;
    const trianglePoints = [];
    let pointsNum = points.length;
    for (let i = 0; i < points.length * POINT_RATE; i += 1) {
      const j = Math.random() * pointsNum-- | 0
      trianglePoints[i] = points[j];
      points.splice(j, 1);
    }
    console.log(trianglePoints);
    const datas = [imageData, grayScaleData, blurredData, edgeData];
    let i = 0;
    setInterval(() => {
      targetCtx.putImageData(datas[i], 0, 0);
      i = i < datas.length - 1 ? i + 1 : 0;
      targetCtx.fillStyle = 'blue';
      points.forEach(p => targetCtx.fillRect(p[0], p[1], 1, 1));
      targetCtx.fillStyle = 'red';
      trianglePoints.forEach(p => targetCtx.fillRect(p[0], p[1], 1, 1));
    }, 700);
    // Grayscale + blur, edge detection convolution filters.
    // Grab all pronounced edge points (exposed from edge detection).
    // Take random sample from these points, put through delaunay algorithm
    // Average colors?
  }
}