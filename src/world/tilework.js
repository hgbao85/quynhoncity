// Dựng hình học của một ô thành phố thành các mảng số (Float32Array), không đụng tới cảnh 3D.
// Chạy trong Web Worker (tileworker.js) để không làm khựng luồng chính; luồng chính chỉ việc
// tạo BufferGeometry / InstancedMesh từ các mảng này.
import * as THREE from 'three';
import { ROAD_TYPES, PALETTE, BOUNDS } from './config.js';
import { roadWidth, pointInPoly, CELL } from './geo.js';
import { Builder, UP, addBuilding, addQuadUp, MAJOR, FOOT } from './citykit.js';
import { heightAt } from './terrain.js';

const palette = PALETTE.map((c) => new THREE.Color(c));
const roadCols = new Map();
const roadColor = (t) => {
  if (!roadCols.has(t)) roadCols.set(t, new THREE.Color(FOOT.has(t) ? '#b9ae9d' : MAJOR.has(t) ? '#3a3c41' : t === 'service' ? '#5a5c60' : '#47494d'));
  return roadCols.get(t);
};

const pack = (b) => (b.p.length ? {
  p: new Float32Array(b.p), n: new Float32Array(b.n), c: new Float32Array(b.c), uv: new Float32Array(b.uv),
} : null);

export function buildTileArrays(data) {
  // ---- nhà ----
  const bld = new Builder(), shop = new Builder(), white = new THREE.Color('#fff');
  const lots = []; // đa giác lô nhà (cho lưới va chạm và bản đồ nhỏ): [n, x0, z0, x1, z1, ...]
  for (const L of data.b) {
    const pts = [];
    for (let k = 3; k < L.length; k += 2) pts.push([L[k] / 10, L[k + 1] / 10]);
    // nhà trên dốc: chân tường từ điểm thấp nhất, mái ngang tầm điểm cao nhất + chiều cao nhà
    let lo = 1e9, hi = -1e9;
    for (const [x, z] of pts) { const y = heightAt(x, z); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    addBuilding(bld, pts, L[0] / 10 + (hi - lo), palette[L[1]], lo);
    lots.push(pts.length, ...pts.flat());
    if (L[2] >= 0) addShopfront(shop, pts, L[2], white, lo);
  }
  for (const L of data.t) {
    const pts = [];
    let hi = 0;
    for (let k = 3; k < L.length; k += 2) { pts.push([L[k] / 10, L[k + 1] / 10]); hi = Math.max(hi, heightAt(L[k] / 10, L[k + 1] / 10)); }
    addBuilding(bld, pts, L[1] / 10, palette[L[2]], L[0] / 10 + hi);
  }

  // ---- đường ----
  const roads = new Builder(), marks = new Builder();
  const lineCol = new THREE.Color('#e8e8e2');
  for (let k = 0; k < data.r.length; k += 5) {
    const type = ROAD_TYPES[data.r[k]];
    const p = [data.r[k + 1] / 10, data.r[k + 2] / 10], q = [data.r[k + 3] / 10, data.r[k + 4] / 10];
    const hw = roadWidth(type) / 2, y = FOOT.has(type) ? 0.045 : MAJOR.has(type) ? 0.07 : 0.06;
    const col = roadColor(type);
    // đường lên dốc: chia nhỏ đoạn 6 m, nâng theo độ cao lớn hơn của hai mép để mặt đường không chìm
    const ht = (x, z) => y + heightAt(x, z);
    // đĩa tròn ở hai đầu để các đoạn nối liền nhau
    for (const c of [p, q]) {
      const yc = ht(c[0], c[1]);
      for (let s = 0; s < 8; s++) {
        const a0 = (s / 8) * Math.PI * 2, a1 = ((s + 1) / 8) * Math.PI * 2;
        roads.tri([c[0], yc, c[1]], [c[0] + Math.cos(a1) * hw, yc, c[1] + Math.sin(a1) * hw], [c[0] + Math.cos(a0) * hw, yc, c[1] + Math.sin(a0) * hw], UP, col);
      }
    }
    const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
    if (L < 0.01) continue;
    const nx = (-dz / L) * hw, nz = (dx / L) * hw;
    const hilly = heightAt(p[0], p[1]) > 0 || heightAt(q[0], q[1]) > 0 || heightAt((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) > 0;
    const n = hilly ? Math.max(1, Math.ceil(L / 6)) : 1;
    const edgeY = (x, z) => Math.max(ht(x + nx, z + nz), ht(x - nx, z - nz));
    for (let s = 0; s < n; s++) {
      const a = [p[0] + (dx * s) / n, p[1] + (dz * s) / n], b = [p[0] + (dx * (s + 1)) / n, p[1] + (dz * (s + 1)) / n];
      const ya = edgeY(a[0], a[1]), yb = edgeY(b[0], b[1]);
      addQuadUp(roads, [a[0] + nx, ya, a[1] + nz], [b[0] + nx, yb, b[1] + nz], [b[0] - nx, yb, b[1] - nz], [a[0] - nx, ya, a[1] - nz], col);
    }
    if (MAJOR.has(type)) {
      const ux = dx / L, uz = dz / L, px = -uz * 0.08, pz = ux * 0.08;
      for (let s = 2; s + 3 < L; s += 8) {
        const a = [p[0] + ux * s, 0, p[1] + uz * s], b2 = [p[0] + ux * (s + 3), 0, p[1] + uz * (s + 3)];
        a[1] = edgeY(a[0], a[2]) + 0.01; b2[1] = edgeY(b2[0], b2[2]) + 0.01;
        addQuadUp(marks, [a[0] + px, a[1], a[2] + pz], [b2[0] + px, b2[1], b2[2] + pz], [b2[0] - px, b2[1], b2[2] - pz], [a[0] - px, a[1], a[2] - pz], lineCol);
      }
    }
  }

  // ---- ma trận đặt cây, đèn ----
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler(), Y = new THREE.Vector3(0, 1, 0);
  const mats = (arr, place) => {
    const n = arr.length / 3, out = new Float32Array(n * 16);
    for (let k = 0; k < n; k++) { place(arr[k * 3] / 10, arr[k * 3 + 1] / 10, arr[k * 3 + 2] / 1000); M.toArray(out, k * 16); }
    return out;
  };
  const inst = {
    palm: mats(data.palm, (x, z, r) => { const s = 0.8 + r * 0.5; M.compose(V.set(x, heightAt(x, z), z), Q.setFromEuler(E.set((r - 0.5) * 0.15, r * 6.28, (r - 0.5) * 0.12)), S.set(s, s, s)); }),
    tree: mats(data.tree, (x, z, r) => { const s = 0.7 + r * 0.7; M.compose(V.set(x, heightAt(x, z), z), Q.setFromAxisAngle(Y, r * 6), S.set(s, s * (0.9 + r * 0.3), s)); }),
    pine: mats(data.pine, (x, z, r) => { const s = 0.75 + r * 0.5; M.compose(V.set(x, heightAt(x, z), z), Q.setFromAxisAngle(Y, r * 6), S.set(s * 0.9, s, s * 0.9)); }),
    bush: mats(data.bush, (x, z, r) => { const s = 0.7 + r * 0.9; M.compose(V.set(x, heightAt(x, z), z), Q.setFromAxisAngle(Y, r * 6), S.set(s, s, s)); }),
    lamp: mats(data.lamp, (x, z, yaw) => { M.compose(V.set(x, heightAt(x, z), z), Q.setFromAxisAngle(Y, yaw), S.set(1, 1, 1)); }),
    // tán rừng trên đồi: hơi chìm xuống dốc để không hở chân
    forest: mats(data.forest || [], (x, z, r) => { const s = 1 + r * 0.7; M.compose(V.set(x, heightAt(x, z) - 0.6, z), Q.setFromAxisAngle(Y, r * 6), S.set(s, s * (0.8 + r * 0.5), s)); }),
  };

  return {
    building: pack(bld), shop: pack(shop), road: pack(roads), marks: pack(marks),
    inst, lots: new Float32Array(lots), cells: rasterLots(lots),
  };
}

// Danh sách bộ nhớ để chuyển giao (transfer) từ worker về luồng chính mà không phải sao chép
export function transferables(res) {
  const out = [res.lots.buffer, res.cells.buffer];
  for (const k of ['building', 'shop', 'road', 'marks']) if (res[k]) out.push(res[k].p.buffer, res[k].n.buffer, res[k].c.buffer, res[k].uv.buffer);
  for (const v of Object.values(res.inst)) out.push(v.buffer);
  return out;
}

// Mái hiên bạt sọc + biển hiệu cho một lô (mã do build-tiles tạo: cạnh*1000 + mái*100 + biển*10 + độ vươn)
function addShopfront(shop, pts, code, white, base = 0) {
  const edge = Math.floor(code / 1000), aw = Math.floor(code / 100) % 10, sg = Math.floor(code / 10) % 10, outI = code % 10;
  let p = pts[edge], q = pts[(edge + 1) % pts.length];
  if (!p || !q) return;
  const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
  if (len < 0.5) return;
  let nx = -dz / len, nz = dx / len;
  const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
  if (pointInPoly(mx + nx * 0.1, mz + nz * 0.1, pts)) { nx = -nx; nz = -nz; }
  const ux = dx / len, uz = dz / len, inset = 0.12;
  p = [p[0] + ux * inset, p[1] + uz * inset]; q = [q[0] - ux * inset, q[1] - uz * inset];
  const [u0, v0, u1, v1] = [aw * 0.25, 0.75, aw * 0.25 + 0.25, 1];
  const out = 1.5 + outI * 0.12, y0 = 3.1 + base, y1 = 2.55 + base;
  const A = [p[0] + nx * 0.02, y0, p[1] + nz * 0.02], B = [q[0] + nx * 0.02, y0, q[1] + nz * 0.02];
  const C = [q[0] + nx * out, y1, q[1] + nz * out], D = [p[0] + nx * out, y1, p[1] + nz * out];
  const nAw = [nx * 0.35, 0.94, nz * 0.35];
  shop.tri(A, B, C, nAw, white, [u0, v1], [u1, v1], [u1, v0]);
  shop.tri(A, C, D, nAw, white, [u0, v1], [u1, v0], [u0, v0]);
  const E = [C[0], y1 - 0.25, C[2]], F = [D[0], y1 - 0.25, D[2]];
  shop.tri(D, C, E, [nx, 0, nz], white, [u0, v0 + 0.02], [u1, v0 + 0.02], [u1, v0]);
  shop.tri(D, E, F, [nx, 0, nz], white, [u0, v0 + 0.02], [u1, v0], [u0, v0]);
  const col = sg % 4, row = 1 + Math.floor(sg / 4);
  const su0 = col * 0.25, su1 = su0 + 0.25, sv1 = 1 - row * 0.25, sv0 = sv1 - 0.25;
  const P = [p[0] + nx * 0.06, 3.35 + base, p[1] + nz * 0.06], Qp = [q[0] + nx * 0.06, 3.35 + base, q[1] + nz * 0.06];
  const Q2 = [Qp[0], 4.35 + base, Qp[2]], P2 = [P[0], 4.35 + base, P[2]];
  shop.tri(P, Qp, Q2, [nx, 0, nz], white, [su0, sv0], [su1, sv0], [su1, sv1]);
  shop.tri(P, Q2, P2, [nx, 0, nz], white, [su0, sv0], [su1, sv1], [su0, sv1]);
}

// Chỉ số các ô lưới va chạm (2 m) bị lô nhà chiếm — tính ở luồng nền, luồng chính chỉ việc đánh dấu.
// Cùng quy tắc với Grid.fillPoly: ô có tâm nằm trong đa giác.
function rasterLots(flat) {
  const nx = Math.ceil((BOUNDS.x1 - BOUNDS.x0) / CELL), nz = Math.ceil((BOUNDS.z1 - BOUNDS.z0) / CELL);
  const out = [], xs = [];
  for (let k = 0; k < flat.length;) {
    const n = flat[k++], pts = [];
    for (let m = 0; m < n; m++, k += 2) pts.push([flat[k], flat[k + 1]]);
    let zmin = 1e9, zmax = -1e9;
    for (const p of pts) { zmin = Math.min(zmin, p[1]); zmax = Math.max(zmax, p[1]); }
    const j0 = Math.max(0, Math.floor((zmin - BOUNDS.z0) / CELL)), j1 = Math.min(nz - 1, Math.floor((zmax - BOUNDS.z0) / CELL));
    for (let j = j0; j <= j1; j++) {
      const z = BOUNDS.z0 + (j + 0.5) * CELL;
      xs.length = 0;
      for (let p = 0, q = pts.length - 1; p < pts.length; q = p++) {
        const [xi, zi] = pts[p], [xj, zj] = pts[q];
        if ((zi > z) !== (zj > z)) xs.push(xi + ((z - zi) * (xj - xi)) / (zj - zi));
      }
      xs.sort((a, b) => a - b);
      for (let s = 0; s + 1 < xs.length; s += 2) {
        const i0 = Math.max(0, Math.ceil((xs[s] - BOUNDS.x0) / CELL - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[s + 1] - BOUNDS.x0) / CELL - 0.5));
        for (let i = i0; i <= i1; i++) out.push(j * nx + i);
      }
    }
  }
  return new Int32Array(out);
}
