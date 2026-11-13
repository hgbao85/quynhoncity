// Dựng thành phố từ dữ liệu OSM: đất liền, công viên, quảng trường, bãi cát,
// đường, toà nhà (OSM + nhà ống tự sinh), đèn đường và cây.
import * as THREE from 'three';
import {
  Grid, FREE, SEA, ROAD, BUILDING, OPEN, KEEP, pointInPoly, buildLandPolygon, roadWidth, rng,
} from './geo.js';
import { toWorld, PLINTH, arcPoint, PLAZA_LOCAL, offsetPolygon, nearPlaza, FRONT_WALK } from './site.js';
import { squareLayout } from './square.js';
import { inHighlandsZone } from './highlands.js';

const MAJOR = new Set(['primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link']);
const FOOT = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian']);
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
function addBuilding(b, ptsIn, h, col, base = 0) {
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

export function buildCity(data, footprints = []) {
  const group = new THREE.Group();
  const grid = new Grid();
  const R = rng(20251113);
  const near = (pts) => pts.some(([x, z]) => Math.abs(x) < LIMIT + 150 && Math.abs(z) < LIMIT + 150);

  // 1) Đất liền & biển trên lưới
  const land = buildLandPolygon(data.coastline);
  grid.a.fill(SEA);
  grid.fillPoly(land, FREE);

  const square = squareLayout(data);

  // 2) Mặt đất
  const ground = new Builder();
  addFlat(ground, land, 0, new THREE.Color('#9c9486'));
  // quảng trường: nền là thảm cỏ, sân tròn lát đá được dựng riêng trong square.js
  const areaCol = { park: '#6fa45c', beach: '#d6b274', plaza: '#76a861', water: '#4f8fb5' };
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
  const rectW = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => toWorld(a, b));
  grid.fillPoly(offsetPolygon(PLAZA_LOCAL, 3).map(([a, b]) => toWorld(a, b)), KEEP);
  grid.fillPoly(FRONT_WALK, OPEN, (v) => v !== ROAD);
  grid.fillPoly(rectW(-PLINTH.w / 2, -PLINTH.d / 2, PLINTH.w / 2, PLINTH.d / 2), BUILDING);
  for (let u = -1; u < 1; u += 0.02) grid.fillSegment(toWorld(...arcPoint(u)), toWorld(...arcPoint(u + 0.02)), 0.7, BUILDING);

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

  // 5) Nhà thật từ ảnh vệ tinh (Microsoft Building Footprints). Dữ liệu không có
  // độ cao, nên số tầng được ước lượng theo diện tích và khoảng cách tới biển.
  // Dãy nhà liền kề (thường bị gộp thành một khối) được cắt thành từng căn nhà ống.
  const coastPts = data.coastline.flat();
  const distCoast = (x, z) => coastPts.reduce((m, p) => Math.min(m, Math.hypot(p[0] - x, p[1] - z)), Infinity);
  let realCount = 0, lots = 0;
  // mái hiên bạt sọc và biển hiệu ở tầng trệt các nhà quay ra đường (theo Street View)
  const shop = new Builder();
  const shopWhite = new THREE.Color('#ffffff');
  const addShopfront = (pts) => {
    if (R() < 0.25) return; // không phải nhà nào cũng mở cửa hàng
    for (let i = 0; i < pts.length; i++) {
      let p = pts[i], q = pts[(i + 1) % pts.length];
      const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
      if (len < 2.5) continue;
      let nx = -dz / len, nz = dx / len;
      const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
      if (pointInPoly(mx + nx * 0.1, mz + nz * 0.1, pts)) { nx = -nx; nz = -nz; }
      if (grid.get(mx + nx * 4, mz + nz * 4) !== ROAD && grid.get(mx + nx * 7, mz + nz * 7) !== ROAD) continue;
      // co vào hai đầu cho các mái hiên liền kề không dính nhau
      const ux = dx / len, uz = dz / len, inset = 0.12;
      p = [p[0] + ux * inset, p[1] + uz * inset]; q = [q[0] - ux * inset, q[1] - uz * inset];
      const aw = Math.floor(R() * 4), sg = Math.floor(R() * 8);
      const [u0, v0, u1, v1] = [aw * 0.25, 0.75, aw * 0.25 + 0.25, 1]; // ô mái hiên trong atlas (hàng trên)
      const out = 1.5 + R() * 0.6, y0 = 3.1, y1 = 2.55;
      const A = [p[0] + nx * 0.02, y0, p[1] + nz * 0.02], B = [q[0] + nx * 0.02, y0, q[1] + nz * 0.02];
      const C = [q[0] + nx * out, y1, q[1] + nz * out], D = [p[0] + nx * out, y1, p[1] + nz * out];
      const nAw = [nx * 0.35, 0.94, nz * 0.35];
      shop.tri(A, B, C, nAw, shopWhite, [u0, v1], [u1, v1], [u1, v0]);
      shop.tri(A, C, D, nAw, shopWhite, [u0, v1], [u1, v0], [u0, v0]);
      // diềm rủ ở mép mái hiên
      const E = [C[0], y1 - 0.25, C[2]], F = [D[0], y1 - 0.25, D[2]];
      shop.tri(D, C, E, [nx, 0, nz], shopWhite, [u0, v0 + 0.02], [u1, v0 + 0.02], [u1, v0]);
      shop.tri(D, E, F, [nx, 0, nz], shopWhite, [u0, v0 + 0.02], [u1, v0], [u0, v0]);
      // biển hiệu phía trên mái hiên
      const col = sg % 4, row = 1 + Math.floor(sg / 4); // hàng 1–2 trong atlas
      const su0 = col * 0.25, su1 = su0 + 0.25, sv1 = 1 - row * 0.25, sv0 = sv1 - 0.25;
      const ys0 = 3.35, ys1 = 4.35;
      const P = [p[0] + nx * 0.06, ys0, p[1] + nz * 0.06], Q = [q[0] + nx * 0.06, ys0, q[1] + nz * 0.06];
      const Q2 = [Q[0], ys1, Q[2]], P2 = [P[0], ys1, P[2]];
      shop.tri(P, Q, Q2, [nx, 0, nz], shopWhite, [su0, sv0], [su1, sv0], [su1, sv1]);
      shop.tri(P, Q2, P2, [nx, 0, nz], shopWhite, [su0, sv0], [su1, sv1], [su0, sv1]);
      return; // mỗi căn một mặt tiền
    }
  };
  const putHouse = (pts, floors, col) => {
    const h = floors * 3.4 + 0.5;
    addBuilding(bld, pts, h, col);
    grid.fillPoly(pts, BUILDING);
    lots++;
    return h;
  };
  for (const flat of footprints) {
    const pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (Math.abs(cx) > LIMIT + 100 || Math.abs(cz) > LIMIT + 100) continue;
    const cell = grid.get(cx, cz);
    if (cell === SEA || cell === KEEP) continue;
    if (square && square.isPaved(cx, cz)) continue; // sân quảng trường (nhà bạt sự kiện bị nhận nhầm là nhà)
    if (nearPlaza(cx, cz)) continue;
    if (inHighlandsZone(cx, cz)) continue; // toà nhà quán Highlands được dựng riêng
    realCount++;
    const area = polyArea(pts);
    const obb = orientedBox(pts);
    const coast = distCoast(cx, cz);
    if (area < 45) { putHouse(pts, 1 + Math.floor(R() * 2), pick()); continue; }
    // khối nhà sâu 24–60 m thường là hai dãy nhà ống quay lưng vào nhau: tách đôi theo chiều sâu
    if (obb.short > 24 && obb.short < 60 && obb.long > 30) {
      const vx = -obb.uz, vz = obb.ux, mid = obb.t0 + obb.short / 2;
      for (const half of [clipStrip(pts, vx, vz, obb.t0 - 1, mid - 0.1), clipStrip(pts, vx, vz, mid + 0.1, obb.t0 + obb.short + 1)]) {
        if (half.length >= 3 && polyArea(half) > 20) rowHouses(half, orientedBox(half));
      }
      continue;
    }
    if (obb.short > 24 || obb.long < 9) {
      // khối lớn: khách sạn, chung cư, công trình công cộng
      const big = area > 900;
      // mặt phố ven biển chủ yếu 4–9 tầng, thỉnh thoảng có khách sạn cao 12–18 tầng
      const floors = big && coast < 220 ? (R() < 0.25 ? 12 + Math.floor(R() * 7) : 4 + Math.floor(R() * 6))
        : big ? 4 + Math.floor(R() * 4)
          : 2 + Math.floor(R() * 4);
      putHouse(pts, floors, pick());
      continue;
    }
    rowHouses(pts, obb);
  }
  // dãy nhà ống: cắt thành lô rộng 4–6 m vuông góc với cạnh dài
  function rowHouses(pts, obb) {
    const { ux, uz, s0, s1 } = obb;
    let s = s0;
    while (s < s1 - 0.5) {
      let w = 4 + R() * 2;
      if (s1 - (s + w) < 3) w = s1 - s; // phần thừa gộp vào lô cuối
      let piece = clipSlab(pts, ux, uz, s + 0.06, s + w - 0.06);
      if (piece.length >= 3 && polyArea(piece) > 6) {
        const floors = R() < 0.08 ? 6 + Math.floor(R() * 3) : 2 + Math.floor(R() * 4);
        const h = putHouse(piece, floors, pick());
        addShopfront(piece);
        // tum cầu thang trên mái (rất hay gặp ở nhà ống Việt Nam)
        if (R() < 0.55 && obb.short > 9) {
          const vx = -uz, vz = ux; // hướng theo chiều sâu lô
          const t0 = obb.t0 + obb.short * 0.55, t1 = obb.t0 + obb.short * 0.85;
          const tum = clipStrip(clipSlab(piece, ux, uz, s + 0.6, s + w - 0.6), vx, vz, t0, t1);
          if (tum.length >= 3) addBuilding(bld, tum, 2.8, pick(), h);
        }
      }
      s += w;
    }
  }
  const generated = lots;
  const tex = windowTextures();
  const buildingMat = new THREE.MeshStandardMaterial({
    vertexColors: true, map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 0,
    roughness: 0.82,
  });
  const atlas = shopAtlas();
  const shopMat = new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.7, side: THREE.DoubleSide });
  const shopMesh = new THREE.Mesh(shop.geometry(), shopMat);
  shopMesh.castShadow = true;
  group.add(shopMesh);
  const bMesh = new THREE.Mesh(bld.geometry(), buildingMat);
  bMesh.castShadow = bMesh.receiveShadow = true;
  group.add(bMesh);

  // 6) Đèn đường
  const lampSpots = [], streetTrees = [];
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
        // cây bóng mát trên vỉa hè hai bên, xen giữa các cột đèn
        for (const side of [1, -1]) {
          const tx = p[0] + ux * (s + 15) - uz * (hw + 2.4) * side, tz = p[1] + uz * (s + 15) + ux * (hw + 2.4) * side;
          if (Math.abs(tx) < LIMIT && Math.abs(tz) < LIMIT && R() < 0.7 && grid.get(tx, tz) === FREE && !nearPlaza(tx, tz) && !inHighlandsZone(tx, tz)) streetTrees.push([tx, tz, R()]);
        }
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
    if (grid.get(x, z) !== OPEN || nearPlaza(x, z)) continue; // để trống sân tượng đài
    if (square && square.isPaved(x, z)) continue; // sân lát đá quảng trường
    const isBeach = data.areas.some((a) => a.kind === 'beach' && pointInPoly(x, z, a.pts));
    if (isBeach) continue; // cây ven biển do beach.js trồng theo hàng
    (R() < 0.45 ? palms : trees).push([x, z, R()]);
  }
  // Trồng dày trong các công viên gần trung tâm (rừng cây quanh tượng đài, quảng trường).
  // Dải công viên sát biển trồng phi lao xen dừa như ngoài đời.
  const pines = [], bushes = [];
  trees.push(...streetTrees);
  for (const a of data.areas) {
    if (a.kind !== 'park' && a.kind !== 'plaza') continue;
    const xs = a.pts.map((p) => p[0]), zs = a.pts.map((p) => p[1]);
    const x0 = Math.max(-LIMIT, Math.min(...xs)), x1 = Math.min(LIMIT, Math.max(...xs));
    const z0 = Math.max(-LIMIT, Math.min(...zs)), z1 = Math.min(LIMIT, Math.max(...zs));
    for (let x = x0; x < x1; x += 8) for (let z = z0; z < z1; z += 8) {
      const px = x + (R() - 0.5) * 6, pz = z + (R() - 0.5) * 6;
      if (!pointInPoly(px, pz, a.pts) || grid.get(px, pz) !== OPEN) continue;
      if (nearPlaza(px, pz) || (square && square.isPaved(px, pz))) continue;
      if (data.areas.some((b) => b.kind === 'beach' && pointInPoly(px, pz, b.pts))) continue;
      const seaside = distCoast(px, pz) < 140;
      const r = R();
      if (seaside) {
        // ven biển Xuân Diệu chủ yếu là dừa trên cỏ, xen ít phi lao và bụi cây thấp
        if (r < 0.85) (r < 0.22 ? pines : palms).push([px, pz, R()]);
        if (R() < 0.45) bushes.push([px + (R() - 0.5) * 5, pz + (R() - 0.5) * 5, R()]);
      }
      else if (R() < 0.8) (r < 0.25 ? palms : trees).push([px, pz, R()]);
    }
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
  // phi lao: thân cao mảnh, tán thưa rủ xuống thành nhiều chùm lệch nhau, màu xanh xám
  const pineCrown = mergeSimple([
    new THREE.IcosahedronGeometry(1.6, 0).scale(1, 1.7, 1).translate(0.4, 13.2, 0.2),
    new THREE.IcosahedronGeometry(1.5, 0).scale(1, 1.8, 1).translate(-1.2, 11.2, 0.5),
    new THREE.IcosahedronGeometry(1.4, 0).scale(1, 1.9, 1).translate(1.1, 10.4, -0.8),
    new THREE.IcosahedronGeometry(1.2, 0).scale(1, 2.0, 1).translate(-0.3, 9.0, -1.0),
    new THREE.IcosahedronGeometry(1.1, 0).scale(1, 1.9, 1).translate(0.9, 8.4, 1.0),
  ]);
  pineCrown.computeVertexNormals();
  const pineStem = new THREE.CylinderGeometry(0.11, 0.22, 13, 6).translate(0, 6.5, 0);
  const iPine = new THREE.InstancedMesh(pineCrown, new THREE.MeshStandardMaterial({ color: '#647d5c', roughness: 1, flatShading: true }), pines.length);
  const iPineStem = new THREE.InstancedMesh(pineStem, trunkMat, pines.length);
  pines.forEach(([x, z, r], i) => {
    const s = 0.75 + r * 0.5;
    m.compose(new THREE.Vector3(x, 0, z), qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 6), new THREE.Vector3(s * 0.9, s, s * 0.9));
    iPine.setMatrixAt(i, m); iPineStem.setMatrixAt(i, m);
  });
  iPine.castShadow = iPineStem.castShadow = true;
  group.add(iPine, iPineStem);
  // bụi cây thấp
  const iBush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.9, 0).scale(1.3, 0.75, 1.1).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: '#3f7a32', roughness: 1, flatShading: true }), bushes.length);
  bushes.forEach(([x, z, r], i) => {
    const s = 0.7 + r * 0.9;
    m.compose(new THREE.Vector3(x, 0, z), qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 6), new THREE.Vector3(s, s, s));
    iBush.setMatrixAt(i, m);
  });
  group.add(iBush);

  console.info(`[city] OSM ${data.buildings.length} nhà, footprint thật ${realCount} → ${generated} căn, ${lampSpots.length} đèn, ${palms.length} dừa, ${trees.length} cây, ${pines.length} phi lao`);
  return { group, grid, land, buildingMat, lampMat, lampSpots, square, shopMat };
}

function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a / 2);
}

// Hộp bao định hướng theo cạnh dài nhất của đa giác:
// u = trục dọc (cạnh dài), v = trục ngang; s0..s1 trên u, t0..t0+short trên v.
function orientedBox(pts) {
  let best = 0, ux = 1, uz = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L > best) { best = L; ux = (q[0] - p[0]) / L; uz = (q[1] - p[1]) / L; }
  }
  let s0 = Infinity, s1 = -Infinity, t0 = Infinity, t1 = -Infinity;
  for (const [x, z] of pts) {
    const s = x * ux + z * uz, t = -x * uz + z * ux;
    s0 = Math.min(s0, s); s1 = Math.max(s1, s); t0 = Math.min(t0, t); t1 = Math.max(t1, t);
  }
  // luôn để u là chiều dài hơn
  if (t1 - t0 > s1 - s0) {
    return { ux: -uz, uz: ux, s0: t0, s1: t1, t0: -s1, long: t1 - t0, short: s1 - s0 };
  }
  return { ux, uz, s0, s1, t0, long: s1 - s0, short: t1 - t0 };
}

// Cắt đa giác bởi nửa mặt phẳng dot(p, n) >= c (Sutherland–Hodgman)
function clipHalf(pts, nx, nz, c) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const dp = p[0] * nx + p[1] * nz - c, dq = q[0] * nx + q[1] * nz - c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
const clipSlab = (pts, ux, uz, a, b) => clipHalf(clipHalf(pts, ux, uz, a), -ux, -uz, -b);
const clipStrip = clipSlab;

function addQuadUp(b, A, B, C, D, col) {
  // đảm bảo hai tam giác hướng lên
  const up = (P, Q, S) => (Q[2] - P[2]) * (S[0] - P[0]) - (Q[0] - P[0]) * (S[2] - P[2]) > 0;
  if (up(A, B, C)) { b.tri(A, B, C, UP, col); b.tri(A, C, D, UP, col); }
  else { b.tri(A, C, B, UP, col); b.tri(A, D, C, UP, col); }
}

// Atlas 4×4 ô: hàng trên là 4 kiểu bạt sọc, hai hàng giữa là 8 biển hiệu cửa hàng
function shopAtlas() {
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
