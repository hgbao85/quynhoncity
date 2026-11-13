// Bộ công cụ dựng hình cho thành phố (dùng trong city.js và tiles.js):
// gom tam giác vào BufferGeometry, mặt phẳng, toà nhà có cửa sổ, cây, mái hiên, kết cấu canvas.
import * as THREE from 'three';
import { pointInPoly, rng } from './geo.js';

export const MAJOR = new Set(['primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link']);
export const FOOT = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian']);

// ---------- bộ gom hình học vào một BufferGeometry ----------
export class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; }
  tri(a, b, c, nrm, col, uva = [0, 0], uvb = [0, 0], uvc = [0, 0]) {
    this.p.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) { this.n.push(...nrm); this.c.push(col.r, col.g, col.b); }
    this.uv.push(...uva, ...uvb, ...uvc);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

export const UP = [0, 1, 0];
export function clean(pts) {
  const r = pts.slice();
  if (r.length > 1 && Math.hypot(r[0][0] - r.at(-1)[0], r[0][1] - r.at(-1)[1]) < 0.01) r.pop();
  return r;
}

// Đa giác phẳng nằm ngang ở độ cao y (mặt hướng lên)
export function addFlat(b, ptsIn, y, col, uv = [0.01, 0.01]) {
  const pts = clean(ptsIn);
  if (pts.length < 3) return;
  const tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
  for (const [i, j, k] of tris) {
    let A = pts[i], B = pts[j], C = pts[k];
    // pháp tuyến hướng lên khi (B-A)x(C-A) có thành phần y > 0
    const cy = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]);
    if (cy < 0) [B, C] = [C, B];
    b.tri([A[0], y, A[1]], [B[0], y, B[1]], [C[0], y, C[1]], UP, col, uv, uv, uv);
  }
}

// Toà nhà: tường đứng (có UV để dán cửa sổ) + mái bằng
export function addBuilding(b, ptsIn, h, col, base = 0) {
  const pts = clean(ptsIn);
  if (pts.length < 3) return;
  const roof = col.clone().multiplyScalar(0.72);
  let run = 0;
  for (let i = 0; i < pts.length; i++) {
    let p = pts[i], q = pts[(i + 1) % pts.length];
    const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    let nx = -dz / len, nz = dx / len; // ứng viên pháp tuyến
    const mx = (p[0] + q[0]) / 2 + nx * 0.05, mz = (p[1] + q[1]) / 2 + nz * 0.05;
    if (pointInPoly(mx, mz, pts)) { nx = -nx; nz = -nz; [p, q] = [q, p]; }
    const u0 = run / 16, u1 = (run + len) / 16, v1 = h / 13.2;
    run += len;
    const n = [nx, 0, nz];
    const top = base + h;
    const a = [p[0], base, p[1]], bb = [q[0], base, q[1]], c = [q[0], top, q[1]], d = [p[0], top, p[1]];
    b.tri(a, bb, c, n, col, [u0, 0], [u1, 0], [u1, v1]);
    b.tri(a, c, d, n, col, [u0, 0], [u1, v1], [u0, v1]);
  }
  addFlat(b, pts, base + h, roof);
}

// ---------- kết cấu cửa sổ vẽ bằng canvas ----------
export function windowTextures() {
  const S = 512, bay = 128;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const day = mk(), night = mk();
  const g = day.getContext('2d'), e = night.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  const r = rng(7);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    const x = col * bay, y = row * bay;
    // ban công + cửa kính
    g.fillStyle = '#d9d4cc'; g.fillRect(x + 18, y + 96, 92, 10);
    g.fillStyle = '#8a8f96'; g.fillRect(x + 26, y + 26, 76, 70);
    g.fillStyle = '#4d6275'; g.fillRect(x + 30, y + 30, 68, 62);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 30, y + 30, 30, 62);
    g.fillStyle = '#8a8f96'; g.fillRect(x + 62, y + 30, 4, 62);
    if (r() < 0.45) {
      const warm = ['#ffd58a', '#ffe7b0', '#fff2d6', '#cfe6ff'][Math.floor(r() * 4)];
      e.fillStyle = warm; e.fillRect(x + 30, y + 30, 68, 62);
    }
  }
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(day, true), emissive: tex(night, true) };
}

// ---------- cây dừa & cây tán tròn ----------
export function palmGeometries() {
  const trunk = new THREE.CylinderGeometry(0.14, 0.22, 7, 6);
  trunk.translate(0, 3.5, 0);
  const fronds = [];
  for (let i = 0; i < 8; i++) {
    const f = new THREE.PlaneGeometry(0.7, 3.2, 1, 4);
    const pos = f.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k) + 1.6; // 0..3.2 dọc lá
      pos.setXYZ(k, pos.getX(k) * (1 - y / 4), -0.12 * y * y, y);
    }
    f.rotateY((i / 8) * Math.PI * 2);
    f.translate(0, 7, 0);
    fronds.push(f);
  }
  const crown = mergeSimple(fronds);
  crown.computeVertexNormals();
  return { trunk, crown };
}
export function mergeSimple(geos) {
  const p = [];
  for (const g of geos) {
    const gg = g.index ? g.toNonIndexed() : g;
    p.push(...gg.attributes.position.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return out;
}


export function addQuadUp(b, A, B, C, D, col) {
  // đảm bảo hai tam giác hướng lên
  const up = (P, Q, S) => (Q[2] - P[2]) * (S[0] - P[0]) - (Q[0] - P[0]) * (S[2] - P[2]) > 0;
  if (up(A, B, C)) { b.tri(A, B, C, UP, col); b.tri(A, C, D, UP, col); }
  else { b.tri(A, C, B, UP, col); b.tri(A, D, C, UP, col); }
}

// Atlas 4×4 ô: hàng trên là 4 kiểu bạt sọc, hai hàng giữa là 8 biển hiệu cửa hàng
export function shopAtlas() {
  const W = 1024, H = 512, cw = W / 4, ch = H / 4;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const stripes = [['#2e8b57', '#f4f4ee'], ['#c0392b', '#f4f4ee'], ['#2c6fb5', '#f4f4ee'], ['#e67e22', '#f7dc6f']];
  stripes.forEach(([a, b], i) => {
    for (let k = 0; k < 12; k++) { x.fillStyle = k % 2 ? b : a; x.fillRect(i * cw + (k * cw) / 12, 0, cw / 12 + 1, ch); }
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(i * cw, ch - 10, cw, 10);
  });
  const signs = [
    ['CÀ PHÊ', '#1e5631', '#fff'], ['TẠP HÓA', '#b03a2e', '#ffe066'], ['PHỞ BÒ', '#f1c40f', '#c0392b'], ['NHÀ NGHỈ', '#1f4e79', '#fff'],
    ['SỬA XE', '#555', '#ffd23f'], ['BÁNH MÌ', '#d35400', '#fff'], ['NHÀ THUỐC', '#0b8457', '#fff'], ['HẢI SẢN', '#0e6ba8', '#fff'],
  ];
  signs.forEach(([t, bg, fg], i) => {
    const sx = (i % 4) * cw, sy = (1 + Math.floor(i / 4)) * ch;
    x.fillStyle = bg; x.fillRect(sx + 2, sy + 2, cw - 4, ch - 4);
    x.strokeStyle = fg; x.lineWidth = 3; x.strokeRect(sx + 8, sy + 8, cw - 16, ch - 16);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 40px "Be Vietnam Pro", system-ui, sans-serif';
    x.fillText(t, sx + cw / 2, sy + ch / 2 + 2);
  });
  x.fillStyle = '#ddd'; x.fillRect(0, 3 * ch, W, ch);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
