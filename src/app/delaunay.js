const DelaunayTriangulator = (() => {
  // Configs
  const POINT_RATE = 0.01;
  const BLUR_KERNEL_DIMS = 5;
  const EDGE_KERNEL_DIMS = 5;


  // Filter Kernels
  const gaussianBlur1D = ((size) => {
    const matrix = [];

    for (let i = 0; i < size * size; i += 1) {
      matrix[i] = 1 / (size * size);
    }
    return matrix;
  })(BLUR_KERNEL_DIMS);

  const edge = ((size) => {
    const matrix = [];
    for (let i = 0; i < size * size; i += 1) {
      matrix[i] = i === Math.floor(size * size / 2) ? -size * size + 1 : 1;
    }
    return matrix;
  })(EDGE_KERNEL_DIMS);


  // Util Methods

  /**
   * Adjusts image dimensions to fit target viewport.
   * @param {Image} image - image node.
   * @param {Node} target - Target DOM node to be drawn on/over.
   */
  const adjustImage = (image, target) => {
    const bWidth = target.getBoundingClientRect().width;
    const {
      naturalWidth,
      naturalHeight,
    } = image;
    let scale = 1;
    if (naturalWidth > bWidth) {
      scale = bWidth / naturalWidth;
    }
    image.width = naturalWidth * scale;
    image.height = naturalHeight * scale;
    return image;
  }

  /**
   * Applies a kernel matrix to image data's pixel color values.
   * @param {Array<Array<number>>} kernel - Kernel Matrix.
   * @param {ImageData} imageData - Input image data.
   */
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
  
  /**
   * Returns true if path through input points forms a ccw turn.
   * @param {Array<number>} p1 - Beginning of path.
   * @param {Array<number>} p2 - Middle point of path.
   * @param {Array<number>} p3 - Point to be checked.
   */
  const ccw = (p1, p2, p3) => {
    return (p2[1] - p1[1]) * (p3[0] - p1[0]) - (p3[1] - p1[1]) * (p2[0] - p1[0]) > 0;
  }
    
  /**
   * Returns true if edges share endpoints.
   * @param {Array<Array<number>>} a - Edge 1.
   * @param {Array<Array<number>>} b - Edge 2.
   */
  const edgeEq = (a, b) => {
    return (
      (pointEq(a[0], b[0]) && pointEq(a[1], b[1])) ||
      (pointEq(a[1], b[0]) && pointEq(a[0], b[1]))
    );
  }

  /**
   * Returns true if input points are equal.
   * @param {Array<number>} a - Point 1.
   * @param {Array<number>} b - Point 2.
   */
  const pointEq = (a, b) => a[0] === b[0] && a[1] === b[1];


  // Filter Methods

  /**
   * Applies a grayscale filter to image.
   * @param {ImageData} imageData - Input image data.
   */
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

  /**
   * Returns pixels above a certain lightness threshold.
   * @param {ImageData} imageData - Input image data.
   */
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


  /**
   * @class
   * Generates and renders Delaunay triangulations of input image.
   */
  class Delaunay {
    constructor(img, target) {
      this.img = img;
      this.target = target;
      this.appendedCanvas = null;
      this.targetCtx = null;

      // Debounce resize handler
      let timeoutId;
      window.addEventListener('resize', () => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          this.initCtx();
          this.generate();
        }, 300);
      });
    }

    /**
     * Initializes canvas context that will be drawn on.
     */
    initCtx() {
      const {
        target,
        img,
        appendedCanvas,
      } = this;

      const image = new Image();
      image.src = img.src;
      const { width, height } = img.getBoundingClientRect();
      if (appendedCanvas) {
        target.removeChild(appendedCanvas);
      }
      if (target.getContext) {
        target.setAttribute('width', Math.round(width));
        target.setAttribute('height', Math.round(height));

        this.targetCtx = target.getContext('2d');
      } else {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('width', Math.round(width));
        canvas.setAttribute('height', Math.round(height));
        target.appendChild(canvas);
        this.appendedCanvas = canvas;

        this.targetCtx = canvas.getContext('2d');
      }
      this.image = adjustImage(image, target);
    }

    /**
     * Generates triangulation and draws it on/over target node.
     */
    generate() {
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
      const trianglePoints = [];
      const pointsNum = points.length;

      for (let i = 0; i < pointsNum * POINT_RATE; i += 1) {
        const j = Math.random() * points.length | 0;
        trianglePoints[i] = points[j];
        points.splice(j, 1);
      }
      const triangles = this.generatePoints(trianglePoints, imageData);
      targetCtx.putImageData(edgeData, 0, 0);

      targetCtx.fillStyle = 'blue';
      points.forEach(p => targetCtx.fillRect(p[0], p[1], 1, 1));

      this.drawTrianglesAnimated(triangles, imageData);
    }

    /**
     * 
     * @param {Array} points - Array of triangle vertices.
     * @param {ImageData} imageData - original image ImageData object.
     */
    generatePoints(points, imageData) {
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
          if (triangles[j].inCircumCircle(points[i])) {
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

    /**
     * Returns average color of pixels in area given by input triangle.
     * @param {Triangle} t - Area to average color over.
     * @param {ImageData} imageData - underlying image data.
     */
    getTriangleColor(t, imageData) {
      const {
        width
      } = imageData;
      const {
        a,
        b,
        c,
      } = t;
      const sum = [0, 0, 0];
      let count = 0;
      for (let i = Math.min(a[0], b[0], c[0]); i < Math.max(a[0], b[0], c[0]); i += 1) {
        for (let j = Math.min(a[1], b[1], c[1]); j < Math.max(a[1], b[1], c[1]); j += 1) {
          if (t.containsPoint([i, j])) {
            const colorI = 4 * (i + j * width);
            sum[0] += imageData.data[colorI];
            sum[1] += imageData.data[colorI + 1];
            sum[2] += imageData.data[colorI + 2];
            count += 1;
          }
        }
      }
      return `rgb(${sum.map(s => s / count | 0).join(', ')})`;
    }

    /**
     * Returns color of centroid pixel of input triangle.
     * @param {Triangle} t - Triangle to fill in.
     * @param {ImageData} imageData - underlying image data.
     */
    getTriangleColorQuick(t, imageData) {
      const {
        width
      } = imageData;
      const {
        a,
        b,
        c
      } = t;
      const colorI = 4 * (Math.round(a[0] + b[0] + c[0]) / 3 + Math.round((a[1] + b[1] + c[1]) / 3) * width);
      return `rgb(${imageData.data[colorI]}, ${imageData.data[colorI + 1]}, ${imageData.data[colorI] + 2})`;
    }

    /**
     * Renders triangles to target context.
     * @param {Array<Triangle>} triangles - List of triangles to render.
     * @param {ImageData} imageData - underlying image data.
     */
    drawTriangles(triangles, imageData) {
      const {
        targetCtx
      } = this;
      triangles.forEach(t => {
        targetCtx.beginPath();
        const {
          a,
          b,
          c
        } = t;
        targetCtx.moveTo(a[0], a[1]);
        targetCtx.lineTo(b[0], b[1]);
        targetCtx.lineTo(c[0], c[1]);
        targetCtx.lineTo(a[0], a[1]);

        const color = this.getTriangleColor(t, imageData);
        targetCtx.fillStyle = color
        targetCtx.strokeStyle = color;
        targetCtx.fill();
        targetCtx.stroke();
      });
    }

    /**
     * Renders triangles individually with a short delay between each render.
     * @param {Array<Triangle>} triangles - List of triangles to be rendered.
     * @param {ImageData} imageData - underlying image data.
     */
    drawTrianglesAnimated(triangles, imageData) {
      const {
        targetCtx
      } = this;
      let i = 0;
      const intervalId = setInterval(() => {
        targetCtx.beginPath();
        const {
          a,
          b,
          c
        } = triangles[i];
        targetCtx.moveTo(a[0], a[1]);
        targetCtx.lineTo(b[0], b[1]);
        targetCtx.lineTo(c[0], c[1]);
        targetCtx.lineTo(a[0], a[1]);

        const color = this.getTriangleColor(triangles[i], imageData);
        targetCtx.fillStyle = color
        targetCtx.strokeStyle = color;
        targetCtx.fill();
        targetCtx.stroke();
        if (i === triangles.length - 1) {
          clearInterval(intervalId);
        }
        i += 1;
      }, 3);
    }
  }

  /**
   * @class
   * Represents a Delaunay triangle.
   */
  class Triangle {
    /**
     * Performs a flip operation on a series of triangles.
     * @param {Array<Array<number>>} tEdges - List of triangle edges.
     * @param {Array<number>} d - Point to be added to the current triangulation.
     */
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

    /**
     * Returns this triangle's edges.
     */
    getEdges() {
      return [
        [this.a, this.b],
        [this.b, this.c],
        [this.c, this.a],
      ];
    }

    /**
     * Returns true if input point is inside circumcircle of this triangle.
     * @param {Array<number>} d - Point to be checked.
     */
    inCircumCircle(d) {
      const {
        circle,
        rSq,
      } = this;
      const [dx, dy] = [d[0] - circle[0], d[1] - circle[1]];
      return dx * dx + dy * dy < rSq;
    }

    /**
     * Returns true if point is enclosed in this triangle.
     * @param {Array<number>} d - Input point.
     */
    containsPoint(d) {
      const {
        a,
        b,
        c
      } = this;
      return !ccw(a, b, d) && !ccw(b, c, d) && !ccw(c, a, d);
    }
  }
  return {
    Delaunay,
  }
})();