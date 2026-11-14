// Tạo dữ liệu game cho toàn thành phố từ .cache/osm.json và .cache/footprints.json:
//   public/data/world.json        đất liền, vùng, đường (cho lưới va chạm và bản đồ nhỏ), danh sách ô
//   public/data/tiles/I_J.json    mỗi ô 400 m: lô nhà (đã cắt nhà ống, có độ cao, mặt tiền cửa hàng),
//                                 tum mái, đoạn đường, cây, dừa, phi lao, bụi, đèn đường
// Chạy: npm run build-tiles   (sau fetch-osm và fetch-buildings)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { BOUNDS, TILE, TILES_X, TILES_Z, tileOf, roadTypeIndex, inBounds, PALETTE } from '../src/world/config.js';
import { FREE, SEA, ROAD, OPEN, KEEP, BUILDING, pointInPoly, roadWidth, rng } from '../src/world/geo.js';
import { nearPlaza } from '../src/world/site.js';
import { squareLayout } from '../src/world/square.js';
import { inHighlandsZone } from '../src/world/highlands.js';
import { inLandmarkZone } from '../src/world/landmark-sites.js';
import { polyArea, orientedBox, clipSlab, clipStrip } from '../src/world/lots.js';
import { buildWorldGrid } from '../src/world/worldgrid.js';
import { setTerrain, heightAt } from '../src/world/terrain.js';

const t0 = Date.now();
// địa hình (npm run fetch-terrain): dùng để trồng rừng trên đồi
const terrainMeta = JSON.parse(readFileSync('.cache/terrain-meta.json', 'utf8'));
const tb = readFileSync('public/data/terrain.bin');
setTerrain(terrainMeta, new Int16Array(tb.buffer, tb.byteOffset, tb.byteLength / 2));
const osm = JSON.parse(readFileSync('.cache/osm.json', 'utf8'));
const foot = JSON.parse(readFileSync('.cache/footprints.json', 'utf8')).b.map((flat) => {
  const pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { pts, cx, cz };
});

// ---- vùng nước lỗi thời: OSM còn vẽ mặt nước ở chỗ đã lấn đầm xây nhà → bỏ nếu có nhiều nhà bên trong ----
const bbox = (pts) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } return [a, b, c, d]; };
const areas = osm.areas.filter((a) => {
  if (a.kind !== 'water') return true;
  const [x0, z0, x1, z1] = bbox(a.pts);
  let n = 0;
  for (const f of foot) if (f.cx > x0 && f.cx < x1 && f.cz > z0 && f.cz < z1 && pointInPoly(f.cx, f.cz, a.pts)) n++;
  if (n > 15) console.log(`  bỏ vùng nước "${a.name || '?'}" vì có ${n} nhà bên trong`);
  return n <= 15;
});
const osmBuildings = osm.buildings.filter((b) => { const cx = b.pts.reduce((s, p) => s + p[0], 0) / b.pts.length, cz = b.pts.reduce((s, p) => s + p[1], 0) / b.pts.length; return !inLandmarkZone(cx, cz); });
const world = { origin: osm.origin, bounds: BOUNDS, land: osm.land, areas, roads: osm.roads, buildings: osmBuildings, coastline: osm.coastline };
const grid = buildWorldGrid(world);
const square = squareLayout();
const beachAreas = areas.filter((a) => a.kind === 'beach').map((a) => ({ pts: a.pts, box: bbox(a.pts) }));
const onBeach = (x, z) => beachAreas.some((a) => x > a.box[0] && x < a.box[2] && z > a.box[1] && z < a.box[3] && pointInPoly(x, z, a.pts));

// ---- khoảng cách tới bờ biển (lưới băm theo ô 100 m) ----
const coastPts = [];
for (const c of osm.coastline) for (let i = 1; i < c.length; i++) {
  const [ax, az] = c[i - 1], [bx, bz] = c[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 15));
  for (let k = 0; k < n; k++) coastPts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
}
const HC = 100, hash = new Map();
for (const p of coastPts) { const k = `${Math.floor(p[0] / HC)},${Math.floor(p[1] / HC)}`; if (!hash.has(k)) hash.set(k, []); hash.get(k).push(p); }
function distCoast(x, z) {
  const ci = Math.floor(x / HC), cj = Math.floor(z / HC);
  let best = 1e9;
  for (let r = 0; r <= 3; r++) {
    for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
      if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
      for (const p of hash.get(`${i},${j}`) || []) best = Math.min(best, Math.hypot(p[0] - x, p[1] - z));
    }
    if (best < r * HC) break;
  }
  return best;
}

// ---- ô dữ liệu ----
const tiles = new Map();
const T = (x, z) => {
  const [i, j] = tileOf(x, z);
  const k = `${i}_${j}`;
  if (!tiles.has(k)) tiles.set(k, { b: [], t: [], r: [], palm: [], tree: [], pine: [], bush: [], lamp: [], forest: [] });
  return tiles.get(k);
};
const dm = (v) => Math.round(v * 10);
const R = rng(20251113);
const pickColor = () => Math.floor(R() * PALETTE.length);

// mặt tiền cửa hàng: tìm cạnh quay ra đường; mã = cạnh*1000 + mái hiên*100 + biển hiệu*10 + độ vươn
function shopCode(pts) {
  if (R() < 0.25) return -1;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
    if (len < 2.5) continue;
    let nx = -dz / len, nz = dx / len;
    const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
    if (pointInPoly(mx + nx * 0.1, mz + nz * 0.1, pts)) { nx = -nx; nz = -nz; }
    if (grid.get(mx + nx * 4, mz + nz * 4) !== ROAD && grid.get(mx + nx * 7, mz + nz * 7) !== ROAD) continue;
    return i * 1000 + Math.floor(R() * 4) * 100 + Math.floor(R() * 8) * 10 + Math.floor(R() * 6);
  }
  return -1;
}
let lots = 0;
function putLot(pts, h, color, shop = -1) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  T(cx, cz).b.push([dm(h), color, shop, ...pts.flatMap(([x, z]) => [dm(x), dm(z)])]);
  grid.fillPoly(pts, BUILDING);
  lots++;
}
function putTum(pts, base, h) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  T(cx, cz).t.push([dm(base), dm(h), pickColor(), ...pts.flatMap(([x, z]) => [dm(x), dm(z)])]);
}
const floorsH = (f) => f * 3.4 + 0.5;

// ---- loại đường mặt tiền của một lô (để ước lượng số tầng như phố thật) ----
// 3: đường chính (primary/secondary/trunk), 2: đường cấp 3 (tertiary), 1: đường nội khu, 0: trong hẻm
const ROAD_CLASS = { trunk: 3, primary: 3, primary_link: 3, secondary: 3, secondary_link: 3, tertiary: 2, tertiary_link: 2, residential: 1, unclassified: 1, living_street: 1 };
const SEG_CELL = 60, segHash = new Map();
for (const r of osm.roads) {
  const c = ROAD_CLASS[r.type];
  if (!c) continue;
  const hw = roadWidth(r.type) / 2;
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1], b = r.pts[i];
    const seg = { a, b, c, hw };
    const i0 = Math.floor(Math.min(a[0], b[0]) / SEG_CELL), i1 = Math.floor(Math.max(a[0], b[0]) / SEG_CELL);
    const j0 = Math.floor(Math.min(a[1], b[1]) / SEG_CELL), j1 = Math.floor(Math.max(a[1], b[1]) / SEG_CELL);
    for (let ci = i0; ci <= i1; ci++) for (let cj = j0; cj <= j1; cj++) { const k = `${ci},${cj}`; if (!segHash.has(k)) segHash.set(k, []); segHash.get(k).push(seg); }
  }
}
function frontage(pts) {
  let best = 0;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const ci = Math.floor(cx / SEG_CELL), cj = Math.floor(cz / SEG_CELL);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const g of segHash.get(`${i},${j}`) || []) {
    if (g.c <= best) continue;
    const dx = g.b[0] - g.a[0], dz = g.b[1] - g.a[1], L2 = dx * dx + dz * dz || 1;
    for (const [x, z] of pts) {
      const t = Math.max(0, Math.min(1, ((x - g.a[0]) * dx + (z - g.a[1]) * dz) / L2));
      if (Math.hypot(g.a[0] + dx * t - x, g.a[1] + dz * t - z) < g.hw + 4.5) { best = g.c; break; }
    }
  }
  return best;
}
// số tầng nhà ống theo loại đường mặt tiền (quan sát Street View Quy Nhơn: phố chính 3–5 tầng,
// đường nhỏ 2–4, trong hẻm 1–3), cộng lệch ±1 giữa các căn liền kề
const BASE_FLOORS = [1.6, 2.6, 3.4, 3.9];
const rowFloors = (cls) => Math.max(1, Math.round(BASE_FLOORS[cls] + (R() - 0.5) * 2.2 + (cls >= 2 && R() < 0.1 ? 3 : 0)));

// nhà OSM: giữ nguyên hình và độ cao
for (const b of osmBuildings) {
  const pts = b.pts.slice();
  if (pts.length > 3 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 0.01) pts.pop();
  const bx = pts.reduce((s, p) => s + p[0], 0) / pts.length, bz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  if (pts.length >= 3 && !inLandmarkZone(bx, bz)) putLot(pts, b.h, pickColor());
}

// nhà từ footprint vệ tinh
let used = 0;
for (const { pts, cx, cz } of foot) {
  const cell = grid.get(cx, cz);
  if (cell === SEA || cell === KEEP) continue;
  if (square.isPaved(cx, cz) || nearPlaza(cx, cz) || inHighlandsZone(cx, cz) || inLandmarkZone(cx, cz)) continue;
  used++;
  const area = polyArea(pts), obb = orientedBox(pts), coast = distCoast(cx, cz);
  if (area < 45) { putLot(pts, floorsH(1 + Math.floor(R() * 2)), pickColor()); continue; }
  if (obb.short > 24 && obb.short < 60 && obb.long > 30) {
    const vx = -obb.uz, vz = obb.ux, mid = obb.t0 + obb.short / 2;
    for (const half of [clipStrip(pts, vx, vz, obb.t0 - 1, mid - 0.1), clipStrip(pts, vx, vz, mid + 0.1, obb.t0 + obb.short + 1)]) {
      if (half.length >= 3 && polyArea(half) > 20) rowHouses(half, orientedBox(half));
    }
    continue;
  }
  if (obb.short > 24 || obb.long < 9) {
    // khối lớn: khách sạn ven biển cao 8–22 tầng; cao ốc, chung cư mặt đường chính 5–9 tầng;
    // còn lại (trường, chợ, kho, nhà máy) 2–4 tầng
    const big = area > 900, cls = frontage(pts);
    const floors = big && coast < 220 && cls >= 2 ? (R() < 0.45 ? 10 + Math.floor(R() * 13) : 6 + Math.floor(R() * 4))
      : big && cls === 3 ? 5 + Math.floor(R() * 5)
        : big ? 2 + Math.floor(R() * 3) : 2 + Math.floor(R() * 3);
    putLot(pts, floorsH(floors), pickColor());
    continue;
  }
  rowHouses(pts, obb);
}
function rowHouses(pts, obb) {
  const { ux, uz, s0, s1 } = obb;
  const cls = frontage(pts);
  let s = s0;
  while (s < s1 - 0.5) {
    let w = 4 + R() * 2;
    if (s1 - (s + w) < 3) w = s1 - s;
    const piece = clipSlab(pts, ux, uz, s + 0.06, s + w - 0.06);
    if (piece.length >= 3 && polyArea(piece) > 6) {
      const floors = rowFloors(cls);
      const h = floorsH(floors);
      putLot(piece, h, pickColor(), shopCode(piece));
      if (R() < 0.55 && obb.short > 9) {
        const vx = -uz, vz = ux;
        const t0 = obb.t0 + obb.short * 0.55, t1 = obb.t0 + obb.short * 0.85;
        const tum = clipStrip(clipSlab(piece, ux, uz, s + 0.6, s + w - 0.6), vx, vz, t0, t1);
        if (tum.length >= 3) putTum(tum, h, 2.8);
      }
    }
    s += w;
  }
}

// ---- đường: chia đoạn dài ≤ 50 m, gán theo trung điểm ----
for (const r of osm.roads) {
  const ti = roadTypeIndex(r.type);
  for (let i = 0; i + 1 < r.pts.length; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 50));
    for (let k = 0; k < n; k++) {
      const x1 = ax + ((bx - ax) * k) / n, z1 = az + ((bz - az) * k) / n, x2 = ax + ((bx - ax) * (k + 1)) / n, z2 = az + ((bz - az) * (k + 1)) / n;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      if (!inBounds(mx, mz)) continue;
      T(mx, mz).r.push(ti, dm(x1), dm(z1), dm(x2), dm(z2));
    }
  }
}

// ---- đèn đường + cây bóng mát dọc đường lớn ----
const MAJOR = new Set(['primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link']);
const put = (list, x, z, r) => { if (inBounds(x, z)) T(x, z)[list].push(dm(x), dm(z), Math.round(r * 1000)); };
for (const r of osm.roads) {
  if (!MAJOR.has(r.type)) continue;
  const hw = roadWidth(r.type) / 2;
  let acc = 0;
  for (let i = 0; i + 1 < r.pts.length; i++) {
    const p = r.pts[i], q = r.pts[i + 1];
    const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
    if (L < 0.1) continue;
    const ux = dx / L, uz = dz / L;
    for (let s = (30 - acc) % 30; s < L; s += 30) {
      const x = p[0] + ux * s - uz * (hw + 0.8), z = p[1] + uz * s + ux * (hw + 0.8);
      if (grid.get(x, z) !== SEA) put('lamp', x, z, Math.atan2(ux, uz) + Math.PI / 2);
      for (const side of [1, -1]) {
        const tx = p[0] + ux * (s + 15) - uz * (hw + 2.4) * side, tz = p[1] + uz * (s + 15) + ux * (hw + 2.4) * side;
        if (R() < 0.7 && grid.get(tx, tz) === FREE && !nearPlaza(tx, tz) && !inHighlandsZone(tx, tz) && !inLandmarkZone(tx, tz)) put('tree', tx, tz, R());
      }
    }
    acc = (acc + L) % 30;
  }
}

// ---- cây: rải ngẫu nhiên trên đất trống có cỏ + trồng dày trong công viên ----
const { x0, z0, x1, z1 } = BOUNDS;
const okTree = (x, z) => grid.get(x, z) === OPEN && !nearPlaza(x, z) && !square.isPaved(x, z) && !inHighlandsZone(x, z) && !inLandmarkZone(x, z) && !onBeach(x, z);
const tries = Math.round(9000 * ((x1 - x0) * (z1 - z0)) / (1640 * 1640));
for (let k = 0; k < tries; k++) {
  const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
  if (!okTree(x, z)) continue;
  put(R() < 0.45 ? 'palm' : 'tree', x, z, R());
}
for (const a of areas) {
  if (a.kind !== 'park' && a.kind !== 'plaza') continue;
  const [ax0, az0, ax1, az1] = bbox(a.pts);
  for (let x = Math.max(x0, ax0); x < Math.min(x1, ax1); x += 8) for (let z = Math.max(z0, az0); z < Math.min(z1, az1); z += 8) {
    const px = x + (R() - 0.5) * 6, pz = z + (R() - 0.5) * 6;
    if (!pointInPoly(px, pz, a.pts) || !okTree(px, pz)) continue;
    const r = R();
    if (distCoast(px, pz) < 140) {
      if (r < 0.85) put(r < 0.22 ? 'pine' : 'palm', px, pz, R());
      if (R() < 0.45) put('bush', px + (R() - 0.5) * 5, pz + (R() - 0.5) * 5, R());
    } else if (R() < 0.8) put(r < 0.25 ? 'palm' : 'tree', px, pz, R());
  }
}

// ---- rừng trên đồi núi: tán cây dày theo lưới 18 m, thưa dần ở chân đồi ----
let forest = 0;
for (let x = x0; x < x1; x += 18) for (let z = z0; z < z1; z += 18) {
  const px = x + (R() - 0.5) * 14, pz = z + (R() - 0.5) * 14;
  const h = heightAt(px, pz);
  if (h < 2) continue;
  const v = grid.get(px, pz);
  if (v === SEA || v === ROAD || v === BUILDING || v === KEEP || inLandmarkZone(px, pz)) continue;
  if (R() > Math.min(0.85, h / 12)) continue;
  put('forest', px, pz, R()); forest++;
}
console.log(`  rừng trên đồi: ${forest} tán cây`);

// ---- ghi file ----
rmSync('public/data/tiles', { recursive: true, force: true });
mkdirSync('public/data/tiles', { recursive: true });
let bytes = 0;
const index = [];
// xáo trộn danh sách cây (bộ ba x, z, r) để game ở mức đồ hoạ thấp chỉ cần vẽ phần đầu mà cây vẫn thưa đều
const shuffle3 = (arr) => {
  for (let i = arr.length / 3 - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    for (let k = 0; k < 3; k++) { const tmp = arr[i * 3 + k]; arr[i * 3 + k] = arr[j * 3 + k]; arr[j * 3 + k] = tmp; }
  }
};
for (const [k, t] of tiles) {
  for (const key of ['tree', 'forest', 'palm', 'pine', 'bush']) shuffle3(t[key]);
  const s = JSON.stringify(t);
  bytes += s.length;
  writeFileSync(`public/data/tiles/${k}.json`, s);
  index.push(k);
}
const out = { ...world, terrain: terrainMeta, buildings: world.buildings.map((b) => ({ pts: b.pts, h: b.h, name: b.name })), tiles: { size: TILE, nx: TILES_X, nz: TILES_Z, list: index } };
writeFileSync('public/data/world.json', JSON.stringify(out));
const fl = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };
for (const t of tiles.values()) for (const b of t.b) { const f = Math.round((b[0] / 10 - 0.5) / 3.4); fl[f >= 7 ? '7+' : Math.max(1, f)]++; }
console.log('  số căn theo số tầng:', JSON.stringify(fl));
console.log(`Footprint dùng ${used}/${foot.length} → ${lots} lô nhà, ${tiles.size} ô, ${(bytes / 1e6).toFixed(1)} MB dữ liệu ô; ` +
  `world.json ${(JSON.stringify(out).length / 1e6).toFixed(2)} MB; mất ${((Date.now() - t0) / 1000).toFixed(1)} s`);
