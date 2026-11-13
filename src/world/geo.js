// Tiện ích hình học + lưới chiếm chỗ (occupancy grid) dùng cho va chạm,
// sinh nhà tự động và kiểm tra chỗ đi được.

import { BOUNDS } from './config.js';

export const CELL = 2; // mét mỗi ô

export const FREE = 0, SEA = 1, ROAD = 2, BUILDING = 3, OPEN = 4, KEEP = 5;

export const ROAD_WIDTH = {
  primary: 14, primary_link: 8, secondary: 12, secondary_link: 8, tertiary: 9,
  tertiary_link: 7, residential: 6, unclassified: 6, living_street: 5, service: 4,
  pedestrian: 5, footway: 2.4, path: 2, cycleway: 2.4, steps: 2,
};
export const roadWidth = (t) => ROAD_WIDTH[t] ?? 4;

export function pointInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function bboxOf(pts) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
  return [a, b, c, d];
}

// Ghép các đoạn bờ biển thành một đường liền, rồi khép thành đa giác đất liền.
// Quy ước OSM: đi theo hướng đường bờ biển thì đất liền nằm bên TRÁI.
export function buildLandPolygon(segments) {
  const segs = segments.map((s) => s.slice());
  const chain = segs.shift();
  let grew = true;
  while (segs.length && grew) {
    grew = false;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const eq = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.5;
      if (eq(s[0], chain[chain.length - 1])) { chain.push(...s.slice(1)); segs.splice(i, 1); grew = true; break; }
      if (eq(s[s.length - 1], chain[0])) { chain.unshift(...s.slice(0, -1)); segs.splice(i, 1); grew = true; break; }
    }
  }
  const FAR = 4000;
  const ext = (p, q) => { // kéo dài từ q qua p ra xa
    const dx = p[0] - q[0], dz = p[1] - q[1], l = Math.hypot(dx, dz);
    return [p[0] + (dx / l) * FAR, p[1] + (dz / l) * FAR];
  };
  const start = ext(chain[0], chain[1]);
  const end = ext(chain[chain.length - 1], chain[chain.length - 2]);
  // Đất ở bên trái hướng đi (tây bắc ở Quy Nhơn): khép vòng qua phía tây bắc.
  const dir = [end[0] - start[0], end[1] - start[1]];
  const left = [dir[1], -dir[0]]; // pháp tuyến bên trái (x đông, z nam)
  const l = Math.hypot(...left);
  const off = [(left[0] / l) * FAR * 2, (left[1] / l) * FAR * 2];
  return [start, ...chain, end, [end[0] + off[0], end[1] + off[1]], [start[0] + off[0], start[1] + off[1]]];
}

export class Grid {
  // Lưới phủ toàn vùng bản đồ (BOUNDS), mỗi ô CELL mét
  constructor(bounds = BOUNDS) {
    this.x0 = bounds.x0; this.z0 = bounds.z0;
    this.nx = Math.ceil((bounds.x1 - bounds.x0) / CELL);
    this.nz = Math.ceil((bounds.z1 - bounds.z0) / CELL);
    this.a = new Uint8Array(this.nx * this.nz);
  }
  idx(x, z) {
    const i = Math.floor((x - this.x0) / CELL), j = Math.floor((z - this.z0) / CELL);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1;
    return j * this.nx + i;
  }
  get(x, z) { const k = this.idx(x, z); return k < 0 ? SEA : this.a[k]; }
  set(x, z, v) { const k = this.idx(x, z); if (k >= 0) this.a[k] = v; }
  cx(i) { return this.x0 + (i + 0.5) * CELL; }
  cz(j) { return this.z0 + (j + 0.5) * CELL; }

  // Tô đa giác theo từng hàng (scanline): mỗi hàng tìm giao điểm với các cạnh
  // rồi tô giữa từng cặp — nhanh hơn nhiều so với kiểm tra từng ô.
  fillPoly(pts, v, onlyIf = null) {
    const [, b, , d] = bboxOf(pts);
    const N = this.nx;
    const j0 = Math.max(0, Math.floor((b - this.z0) / CELL)), j1 = Math.min(this.nz - 1, Math.floor((d - this.z0) / CELL));
    const xs = [];
    for (let j = j0; j <= j1; j++) {
      const z = this.cz(j);
      xs.length = 0;
      for (let p = 0, q = pts.length - 1; p < pts.length; q = p++) {
        const [xi, zi] = pts[p], [xj, zj] = pts[q];
        if ((zi > z) !== (zj > z)) xs.push(xi + ((z - zi) * (xj - xi)) / (zj - zi));
      }
      xs.sort((m, n) => m - n);
      for (let s = 0; s + 1 < xs.length; s += 2) {
        // ô có tâm nằm trong [xs[s], xs[s+1]]
        const i0 = Math.max(0, Math.ceil((xs[s] - this.x0) / CELL - 0.5));
        const i1 = Math.min(N - 1, Math.floor((xs[s + 1] - this.x0) / CELL - 0.5));
        for (let i = i0; i <= i1; i++) {
          const k = j * N + i;
          if (!onlyIf || onlyIf(this.a[k])) this.a[k] = v;
        }
      }
    }
  }

  fillSegment(p, q, halfW, v, onlyIf = null) {
    const a = Math.min(p[0], q[0]) - halfW, c = Math.max(p[0], q[0]) + halfW;
    const b = Math.min(p[1], q[1]) - halfW, d = Math.max(p[1], q[1]) + halfW;
    const N = this.nx;
    const i0 = Math.max(0, Math.floor((a - this.x0) / CELL)), i1 = Math.min(N - 1, Math.floor((c - this.x0) / CELL));
    const j0 = Math.max(0, Math.floor((b - this.z0) / CELL)), j1 = Math.min(this.nz - 1, Math.floor((d - this.z0) / CELL));
    const dx = q[0] - p[0], dz = q[1] - p[1], L2 = dx * dx + dz * dz || 1;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = this.cx(i), z = this.cz(j);
      const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / L2));
      const ex = p[0] + dx * t - x, ez = p[1] + dz * t - z;
      if (ex * ex + ez * ez <= halfW * halfW) {
        const k = j * N + i;
        if (!onlyIf || onlyIf(this.a[k])) this.a[k] = v;
      }
    }
  }

  // Đi được: không phải biển, không phải nhà
  walkable(x, z) { const v = this.get(x, z); return v !== SEA && v !== BUILDING; }
}

// Bộ sinh số ngẫu nhiên có hạt giống — để thành phố lần nào tải cũng giống nhau
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
