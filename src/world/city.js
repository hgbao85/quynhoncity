// Dựng thành phố từ dữ liệu OSM: đất liền, công viên, quảng trường, bãi cát,
// đường, toà nhà (OSM + nhà ống tự sinh), đèn đường và cây.
import * as THREE from 'three';
import {
  Grid, FREE, SEA, ROAD, BUILDING, OPEN, KEEP, pointInPoly, buildLandPolygon, roadWidth, rng,
} from './geo.js';

const MAJOR = new Set(['primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link']);
const FOOT = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian']);
const FRONTAGE = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street']);
const LIMIT = 820; // chỉ dựng chi tiết trong bán kính này (mét) quanh tượng đài

// ---------- bộ gom hình học vào một BufferGeometry ----------
class Builder {
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

const UP = [0, 1, 0];
function clean(pts) {
  const r = pts.slice();
  if (r.length > 1 && Math.hypot(r[0][0] - r.at(-1)[0], r[0][1] - r.at(-1)[1]) < 0.01) r.pop();
  return r;
}

// Đa giác phẳng nằm ngang ở độ cao y (mặt hướng lên)
function addFlat(b, ptsIn, y, col, uv = [0.01, 0.01]) {
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
function addBuilding(b, ptsIn, h, col) {
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
    const a = [p[0], 0, p[1]], bb = [q[0], 0, q[1]], c = [q[0], h, q[1]], d = [p[0], h, p[1]];
    b.tri(a, bb, c, n, col, [u0, 0], [u1, 0], [u1, v1]);
    b.tri(a, c, d, n, col, [u0, 0], [u1, v1], [u0, v1]);
  }
  addFlat(b, pts, h, roof);
}

// ---------- kết cấu cửa sổ vẽ bằng canvas ----------
function windowTextures() {
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
function palmGeometries() {
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
function mergeSimple(geos) {
  const p = [];
  for (const g of geos) {
    const gg = g.index ? g.toNonIndexed() : g;
    p.push(...gg.attributes.position.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return out;
}

export function buildCity(data) {
  const group = new THREE.Group();
  const grid = new Grid();
  const R = rng(20251113);
  const near = (pts) => pts.some(([x, z]) => Math.abs(x) < LIMIT + 150 && Math.abs(z) < LIMIT + 150);

  // 1) Đất liền & biển trên lưới
  const land = buildLandPolygon(data.coastline);
  grid.a.fill(SEA);
  grid.fillPoly(land, FREE);

  // 2) Mặt đất
  const ground = new Builder();
  addFlat(ground, land, 0, new THREE.Color('#9c9486'));
  const areaCol = { park: '#6fa45c', beach: '#d9be84', plaza: '#b8b0a3', water: '#4f8fb5' };
  const areaY = { beach: 0.02, park: 0.03, plaza: 0.035, water: 0.01 };
  for (const a of data.areas) {
    if (!near(a.pts)) continue;
    addFlat(ground, a.pts, areaY[a.kind], new THREE.Color(areaCol[a.kind]));
    grid.fillPoly(a.pts, OPEN, (v) => v !== SEA);
  }
  const groundMesh = new THREE.Mesh(ground.geometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 3) Đường
  const roads = new Builder();
  const marks = new Builder();
  const roadCol = (t) => new THREE.Color(FOOT.has(t) ? '#b9ae9d' : MAJOR.has(t) ? '#3a3c41' : t === 'service' ? '#5a5c60' : '#47494d');
  const roadY = (t) => (FOOT.has(t) ? 0.045 : MAJOR.has(t) ? 0.07 : 0.06);
  const white = new THREE.Color('#e8e8e2');
  for (const r of data.roads) {
    if (!near(r.pts)) continue;
    const w = roadWidth(r.type), hw = w / 2, y = roadY(r.type), col = roadCol(r.type);
    for (let i = 0; i < r.pts.length; i++) {
      const p = r.pts[i];
      // đĩa tròn ở mỗi đỉnh để nối các đoạn cho liền
      const seg = 10;
      for (let s = 0; s < seg; s++) {
        const a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
        roads.tri([p[0], y, p[1]], [p[0] + Math.cos(a1) * hw, y, p[1] + Math.sin(a1) * hw],
          [p[0] + Math.cos(a0) * hw, y, p[1] + Math.sin(a0) * hw], UP, col);
      }
      if (i === r.pts.length - 1) break;
      const q = r.pts[i + 1];
      const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
      if (L < 0.01) continue;
      const nx = (-dz / L) * hw, nz = (dx / L) * hw;
      const A = [p[0] + nx, y, p[1] + nz], B = [q[0] + nx, y, q[1] + nz];
      const C = [q[0] - nx, y, q[1] - nz], D = [p[0] - nx, y, p[1] - nz];
      addQuadUp(roads, A, B, C, D, col);
      grid.fillSegment(p, q, FOOT.has(r.type) ? hw : hw + 1.5, ROAD, (v) => v === FREE || (v === OPEN && !FOOT.has(r.type)));
      // vạch kẻ đường đứt khúc
      if (MAJOR.has(r.type)) {
        const ux = dx / L, uz = dz / L, px = -uz * 0.08, pz = ux * 0.08;
        for (let s = 2; s + 3 < L; s += 8) {
          const a = [p[0] + ux * s, y + 0.01, p[1] + uz * s], b2 = [p[0] + ux * (s + 3), y + 0.01, p[1] + uz * (s + 3)];
          addQuadUp(marks, [a[0] + px, a[1], a[2] + pz], [b2[0] + px, a[1], b2[2] + pz],
            [b2[0] - px, a[1], b2[2] - pz], [a[0] - px, a[1], a[2] - pz], white);
        }
      }
    }
  }
  const roadMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const roadMesh = new THREE.Mesh(roads.geometry(), roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh, new THREE.Mesh(marks.geometry(), roadMat));

  // vùng cấm xây quanh tượng đài
  for (let a = 0; a < 40; a += 2) for (let t = 0; t < Math.PI * 2; t += 0.2) grid.set(Math.cos(t) * a, Math.sin(t) * a, KEEP);

  // 4) Toà nhà OSM
  const bld = new Builder();
  const palette = ['#f2e6c9', '#f6f1e7', '#f3d9c4', '#dfe8ee', '#e6eed9', '#f5e3a1', '#efd2d2', '#d8e2f0', '#fafafa', '#eadfcf']
    .map((c) => new THREE.Color(c));
  const pick = () => palette[Math.floor(R() * palette.length)];
  for (const b of data.buildings) {
    if (!near(b.pts)) continue;
    addBuilding(bld, b.pts, b.h, pick());
    grid.fillPoly(b.pts, BUILDING);
  }

  // 5) Nhà ống tự sinh dọc mặt đường (OSM ở Quy Nhơn còn thiếu nhiều nhà)
  const coastPts = data.coastline.flat();
  const distCoast = (x, z) => coastPts.reduce((m, p) => Math.min(m, Math.hypot(p[0] - x, p[1] - z)), Infinity);
  const rectFree = (cx, cz, ux, uz, w, d) => {
    for (let a = -w / 2; a <= w / 2; a += 1) for (let bq = -d / 2; bq <= d / 2; bq += 1) {
      const x = cx + ux * a - uz * bq, z = cz + uz * a + ux * bq;
      if (Math.abs(x) > LIMIT || Math.abs(z) > LIMIT) return false;
      if (grid.get(x, z) !== FREE) return false;
    }
    return true;
  };
  const rectPts = (cx, cz, ux, uz, w, d) => [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    .map(([sa, sb]) => [cx + ux * sa * w / 2 - uz * sb * d / 2, cz + uz * sa * w / 2 + ux * sb * d / 2]);
  let generated = 0;
  const place = (cx, cz, ux, uz, w, d, floors) => {
    const pts = rectPts(cx, cz, ux, uz, w, d);
    addBuilding(bld, pts, floors * 3.3 + 0.6, pick());
    grid.fillPoly(pts, BUILDING);
    generated++;
  };
  for (const r of data.roads) {
    if (!FRONTAGE.has(r.type) || !near(r.pts)) continue;
    const hw = roadWidth(r.type) / 2, major = MAJOR.has(r.type);
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const p = r.pts[i], q = r.pts[i + 1];
      const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
      if (L < 6) continue;
      const ux = dx / L, uz = dz / L;
      for (const side of [1, -1]) {
        let s = 3;
        while (s < L - 3) {
          const w = 4 + R() * 2.5, d = 12 + R() * 8;
          const off = hw + 2.2 + d / 2;
          const cx = p[0] + ux * (s + w / 2) - uz * off * side, cz = p[1] + uz * (s + w / 2) + ux * off * side;
          if (rectFree(cx, cz, ux, uz, w, d)) {
            const tall = distCoast(cx, cz) < 160 && R() < 0.12;
            const floors = tall ? 10 + Math.floor(R() * 14) : (major ? 3 : 2) + Math.floor(R() * (major ? 5 : 3));
            place(cx, cz, ux, uz, tall ? Math.max(w, 14) : w, tall ? Math.max(d, 16) : d, floors);
          }
          s += w + 0.15;
        }
      }
    }
  }
  // lấp bớt khoảng trống trong lòng các khu phố
  for (let k = 0; k < 6000; k++) {
    const x = (R() * 2 - 1) * LIMIT, z = (R() * 2 - 1) * LIMIT;
    if (grid.get(x, z) !== FREE) continue;
    const t = R() * Math.PI, ux = Math.cos(t), uz = Math.sin(t);
    const w = 6 + R() * 6, d = 8 + R() * 8;
    if (rectFree(x, z, ux, uz, w + 2, d + 2)) place(x, z, ux, uz, w, d, 1 + Math.floor(R() * 3));
  }
  const tex = windowTextures();
  const buildingMat = new THREE.MeshStandardMaterial({
    vertexColors: true, map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 0,
    roughness: 0.82,
  });
  const bMesh = new THREE.Mesh(bld.geometry(), buildingMat);
  bMesh.castShadow = bMesh.receiveShadow = true;
  group.add(bMesh);

  // 6) Đèn đường
  const lampSpots = [];
  for (const r of data.roads) {
    if (!MAJOR.has(r.type) || !near(r.pts)) continue;
    const hw = roadWidth(r.type) / 2;
    let acc = 0;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const p = r.pts[i], q = r.pts[i + 1];
      const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
      if (L < 0.1) continue;
      const ux = dx / L, uz = dz / L;
      for (let s = (30 - acc) % 30; s < L; s += 30) {
        const x = p[0] + ux * s - uz * (hw + 0.8), z = p[1] + uz * s + ux * (hw + 0.8);
        if (Math.abs(x) < LIMIT && Math.abs(z) < LIMIT && grid.get(x, z) !== SEA) lampSpots.push([x, z, Math.atan2(ux, uz)]);
      }
      acc = (acc + L) % 30;
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 7.5, 6).translate(0, 3.75, 0);
  const headGeo = new THREE.BoxGeometry(0.35, 0.16, 1.1).translate(0, 7.45, 0.45);
  const poleMat = new THREE.MeshStandardMaterial({ color: '#5d6168', roughness: 0.5, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffcf80', emissiveIntensity: 0 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
  const heads = new THREE.InstancedMesh(headGeo, lampMat, lampSpots.length);
  const m = new THREE.Matrix4(), qn = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  lampSpots.forEach(([x, z, yaw], i) => {
    // cần đèn vươn ra phía lòng đường
    qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.PI / 2);
    m.compose(new THREE.Vector3(x, 0, z), qn, one);
    poles.setMatrixAt(i, m); heads.setMatrixAt(i, m);
  });
  poles.castShadow = true;
  group.add(poles, heads);

  // 7) Cây dừa (bãi biển, công viên) và cây tán tròn
  const palms = [], trees = [];
  for (let k = 0; k < 9000 && palms.length + trees.length < 900; k++) {
    const x = (R() * 2 - 1) * LIMIT, z = (R() * 2 - 1) * LIMIT;
    if (grid.get(x, z) !== OPEN || Math.hypot(x, z) < 55) continue; // để trống quanh tượng đài
    const isBeach = data.areas.some((a) => a.kind === 'beach' && pointInPoly(x, z, a.pts));
    if (isBeach && R() < 0.75) continue; // bãi cát thưa cây hơn
    (isBeach || R() < 0.45 ? palms : trees).push([x, z, R()]);
  }
  const { trunk, crown } = palmGeometries();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#8b7355', roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#4e8a3a', roughness: 0.9, side: THREE.DoubleSide });
  const iTrunk = new THREE.InstancedMesh(trunk, trunkMat, palms.length);
  const iCrown = new THREE.InstancedMesh(crown, leafMat, palms.length);
  palms.forEach(([x, z, r], i) => {
    const s = 0.8 + r * 0.5;
    qn.setFromEuler(new THREE.Euler((r - 0.5) * 0.15, r * 6.28, (r - 0.5) * 0.12));
    m.compose(new THREE.Vector3(x, 0, z), qn, new THREE.Vector3(s, s, s));
    iTrunk.setMatrixAt(i, m); iCrown.setMatrixAt(i, m);
  });
  iTrunk.castShadow = iCrown.castShadow = true;
  const blobGeo = new THREE.IcosahedronGeometry(2.4, 1).translate(0, 4.2, 0);
  const stemGeo = new THREE.CylinderGeometry(0.18, 0.25, 3, 5).translate(0, 1.5, 0);
  const iBlob = new THREE.InstancedMesh(blobGeo, new THREE.MeshStandardMaterial({ color: '#3f7a35', roughness: 1, flatShading: true }), trees.length);
  const iStem = new THREE.InstancedMesh(stemGeo, trunkMat, trees.length);
  trees.forEach(([x, z, r], i) => {
    const s = 0.7 + r * 0.7;
    m.compose(new THREE.Vector3(x, 0, z), qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 6), new THREE.Vector3(s, s * (0.9 + r * 0.3), s));
    iBlob.setMatrixAt(i, m); iStem.setMatrixAt(i, m);
  });
  iBlob.castShadow = iStem.castShadow = true;
  group.add(iTrunk, iCrown, iBlob, iStem);

  console.info(`[city] OSM ${data.buildings.length} nhà, tự sinh ${generated} nhà, ${lampSpots.length} đèn, ${palms.length} dừa, ${trees.length} cây`);
  return { group, grid, land, buildingMat, lampMat, lampSpots };
}

function addQuadUp(b, A, B, C, D, col) {
  // đảm bảo hai tam giác hướng lên
  const up = (P, Q, S) => (Q[2] - P[2]) * (S[0] - P[0]) - (Q[0] - P[0]) * (S[2] - P[2]) > 0;
  if (up(A, B, C)) { b.tri(A, B, C, UP, col); b.tri(A, C, D, UP, col); }
  else { b.tri(A, C, B, UP, col); b.tri(A, D, C, UP, col); }
}
