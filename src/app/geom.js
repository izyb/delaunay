class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  eq(p, tolerance = 0) {
    return p.x - this.x <= tolerance && p.y - this.y <= tolerance;
  }
}


class Triangle {
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

  getEdges() {
    return [
      [this.a, this.b],
      [this.b, this.c],
      [this.c, this.a],
    ];
  }

  inCircumCircle(d) {
    const {
      circle,
      rSq,
    } = this;
    const [dx, dy] = [d[0] - circle[0], d[1] - circle[1]];
    return dx * dx + dy * dy < rSq;
  }
}


const det = (A) => {
  return A[0] * (A[4] * A[8] - A[7] * A[5]) - A[1] * (A[3] * A[8] - A[6] * A[5]) + A[2] * (A[3] * A[7] - A[6] * A[4]);
}

const getAngle = (s1, s2) => {
  const v1 = [s1[1][0] - s1[0][0], s1[1][1] - s1[0][1]];
  const v2 = [s2[1][0] - s2[0][0], s2[1][1] - s2[0][1]];
  const m1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
  const m2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
  return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2));
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

const convexHull = (points) => {
  let
}