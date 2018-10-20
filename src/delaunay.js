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
  return points;
}

const ccw = (p1, p2, p3) => {
  return (p2[1] - p1[1]) * (p3[0] - p1[0]) - (p3[1] - p1[1]) * (p2[0] - p1[0]) > 0;
}

const sortCCW = (points) => {
  let temp;
  const newPoints = points.slice();
  for (let i = 0; i < newPoints.length; i += 1) {
    if (newPoints[i][1] < newPoints[0][1] || (newPoints[i][1] === newPoints[0][1] && newPoints[i][0] < newPoints[0][0])) {
      temp = newPoints[i].slice();
      newPoints[i] = newPoints[0].slice();
      newPoints[0] = temp.slice();
    }
  }

  for (let i = 1; i < newPoints.length - 1; i += 1) {
    for (let j = 1; j < newPoints.length - i; j += 1) {
      if (!ccw(newPoints[i + j], newPoints[0], newPoints[i])) {
        temp = newPoints[i].slice();
        newPoints[i] = newPoints[i + j].slice();
        newPoints[i + j] = temp.slice();
      }
    }
  }
  return newPoints;
}

const det = (A) => {
  return A[0] * (A[4] * A[8] - A[7] * A[5]) - A[1] * (A[3] * A[8] - A[6] * A[5]) + A[2] * (A[3] * A[7] - A[6] * A[4]);
}

const getAngle = (s1, s2) => {
  const v1 = [s1[1][0] - s1[0][0], s1[1][1] - s1[0][1]];
  const v2 = [s2[1][0] - s2[0][0], s2[1][1] - s2[0][1]];
  const m1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
  const m2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
  console.log(m1, m2);
  console.log(s1, s2);
  return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2));
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
    const triangles = this.build(trianglePoints, imageData);
    let i = 0;
    targetCtx.putImageData(edgeData, 0, 0);

    targetCtx.fillStyle = 'blue';
    points.forEach(p => targetCtx.fillRect(p[0], p[1], 1, 1));

    setInterval(() => {
      targetCtx.beginPath();
      targetCtx.strokeStyle = 'red';
      const {
        a,
        b,
        c
      } = triangles[i];
      targetCtx.moveTo(a[0], a[1]);
      targetCtx.lineTo(b[0], b[1]);
      targetCtx.lineTo(c[0], c[1]);
      targetCtx.lineTo(a[0], a[1]);

      const colorI = 4 * (Math.round((a[0] + b[0] + c[0]) / 3) + Math.round((a[1] + b[1] + c[1]) / 3) * width);

      targetCtx.fillStyle = `rgb(${imageData.data[colorI]}, ${imageData.data[colorI + 1]}, ${imageData.data[colorI + 2]})`;
      targetCtx.fill();
      i = i < triangles.length - 1 ? i + 1 : 0;
    }, 5);
  }

  build(points, imageData) {
    const {
      width,
      height
    } = imageData;
    let triangles = [
      new Triangle([
        [0, 0],
        [width, 0],
        [width, height]
      ]),
      new Triangle([
        [0, 0],
        [width, height],
        [0, height]
      ]),
    ];
    let tempEdges = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = 0; j < triangles.length; j += 1) {
        if (triangles[j].contains(points[i])) {
          tempEdges.push(...triangles[j].getEdges());
          triangles.splice(j, 1);
          j--;
        }
      }
      const newTriangles = Triangle.flip(tempEdges, points[i]);
      triangles.push(...newTriangles);
      tempEdges = [];
    }

    return triangles;
  }
}

const pointEq = (a, b) => a[0] === b[0] && a[1] === b[1];

const edgeEq = (a, b) => {
  return (
    (pointEq(a[0], b[0]) && pointEq(a[1], b[1])) ||
    (pointEq(a[1], b[0]) && pointEq(a[0], b[1]))
  );
}

class Triangle {
  static flip(tEdges, d) {
    const hull = [];
    const newTriangles = [];
    tEdges.forEach(edge => {
      const i = hull.findIndex(e => edgeEq(e, edge));
      if (i !== -1) {
        hull.splice(i, 1);
      } else {
        hull.push(edge);
      }
    });
    for (let i = 0; i < hull.length; i += 1) {
      newTriangles.push(new Triangle([hull[i][0], hull[i][1], d]));
    }
    return newTriangles;
  }

  constructor(vertices) {
    if (vertices.length !== 3) {
      throw new Error('3 vertices PLEASE.');
    }
    vertices = sortCCW(vertices);
    const [a, b, c] = vertices;

    const [abx, aby] = [b[0] - a[0], b[1] - a[1]];
    const [acx, acy] = [c[0] - a[0], c[1] - a[1]];
    const t = b[0] * b[0] + b[1] * b[1] - a[0] * a[0] - a[1] * a[1];
    const u = c[0] * c[0] + c[1] * c[1] - a[0] * a[0] - a[1] * a[1];
    const s = Math.pow(2 * (abx * acy - aby * acx), -1);
    const circle = [
      ((acy) * t - (aby) * u) * s,
      ((abx) * u - (acx) * t) * s
    ];
    const [dx, dy] = [a[0] - circle[0], a[1] - circle[1]];

    this.a = a;
    this.b = b;
    this.c = c;
    this.circle = circle;
    this.rSq = dx * dx + dy * dy;
  }

  getEdges() {
    return [
      [this.a, this.b],
      [this.b, this.c],
      [this.c, this.a],
    ];
  }

  contains(d) {
    const {
      circle,
      rSq,
    } = this;
    const [dx, dy] = [d[0] - circle[0], d[1] - circle[1]];
    return dx * dx + dy * dy < rSq;
  }

  containsPoint(d) {
    const { a, b, c } = this;

    const area = 1 / 2 * (-b[1] * c[0] + a[1] * (-b[0] + c[0]) + a[0] * (b[1] - c[1]) + b[0] * c[1]);
    const sign = area < 0 ? -1 : 1;
    const s = (a[1] * c[0] - a[0] * c[1] + (c[1] - a[1]) * d[0] + (a[0] - c[0]) * d[1]) * sign;
    const t = (a[0] * b[1] - a[1] * b[0] + (a[1] - b[1]) * d[0] + (b[0] - a[0]) * d[1]) * sign;

    return s > 0 && t > 0 && (s + t) < 2 * area * sign;
  }
}