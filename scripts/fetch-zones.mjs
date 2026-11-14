// Tải dữ liệu cho các "khu riêng" ngoài bản đồ chính (Kỳ Co, Eo Gió ở Nhơn Lý, cách trung tâm 12–15 km).
// Mỗi khu là một ô vuông nhỏ, chỉ tải khi người chơi dịch chuyển tới, nên không làm nặng lúc mở game.
//   - Độ cao: AWS Terrain Tiles (SRTM ~30 m), lấy mẫu lưới 4 m
//   - Đường bờ biển, bãi cát, đá, nhà, đường đi: OpenStreetMap (Overpass)
//   - Đất / biển cắt theo đường bờ biển OSM (chính xác hơn nhiều so với độ cao SRTM ở dải đá hẹp)
// Kết quả: public/data/zones/<id>.json
// Chạy: npm run fetch-zones
import { writeFileSync, mkdirSync, existsSync, readFileSync, createReadStream, createWriteStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';
import { PNG } from 'pngjs';
import { ORIGIN } from '../src/world/config.js';
import { ZONES } from '../src/world/zones-config.js';
import { landPolygons } from './lib/coast.mjs';
import { pointInPoly } from '../src/world/geo.js';

const R = 6378137, K = Math.cos((ORIGIN.lat * Math.PI) / 180);
const toLatLon = (x, z) => [ORIGIN.lat - (z / R) * (180 / Math.PI), ORIGIN.lon + (x / (R * K)) * (180 / Math.PI)];
const toXZ = (lat, lon) => [+(((lon - ORIGIN.lon) * Math.PI) / 180 * R * K).toFixed(2), +(-((lat - ORIGIN.lat) * Math.PI) / 180 * R).toFixed(2)];

mkdirSync('.cache/terrarium', { recursive: true });
mkdirSync('public/data/zones', { recursive: true });
const cache = new Map();
async function tile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (cache.has(key)) return cache.get(key);
  const file = `.cache/terrarium/${z}_${x}_${y}.png`;
  let buf;
  if (existsSync(file)) buf = readFileSync(file);
  else {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`);
    if (!res.ok) throw new Error(`Tải ô ${key} lỗi ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(file, buf);
  }
  const png = PNG.sync.read(buf);
  const h = new Float32Array(256 * 256);
  for (let i = 0; i < h.length; i++) h[i] = png.data[i * 4] * 256 + png.data[i * 4 + 1] + png.data[i * 4 + 2] / 256 - 32768;
  cache.set(key, h);
  return h;
}
async function elevation(Z, x, z) {
  const [lat, lon] = toLatLon(x, z), n = 2 ** Z;
  const fx = ((lon + 180) / 360) * n, s = Math.sin((lat * Math.PI) / 180);
  const fy = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  const tx = Math.floor(fx), ty = Math.floor(fy), px = Math.min(254, Math.max(0, (fx - tx) * 256 - 0.5)), py = Math.min(254, Math.max(0, (fy - ty) * 256 - 0.5));
  const h = await tile(Z, tx, ty);
  const i = Math.floor(px), j = Math.floor(py), u = px - i, v = py - j;
  const a = h[j * 256 + i], b = h[j * 256 + i + 1], c = h[(j + 1) * 256 + i], d = h[(j + 1) * 256 + i + 1];
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

async function overpass(rect) {
  const [s, w] = toLatLon(rect.x0, rect.z1), [n, e] = toLatLon(rect.x1, rect.z0);
  const B = `${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)}`;
  const q = `[out:json][timeout:120];(way["natural"~"coastline|beach|sand|bare_rock|cliff|scrub|wood"](${B});way["building"](${B});way["highway"](${B});way["leisure"](${B});way["man_made"~"pier|breakwater"](${B}););out geom;`;
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': 'quynhon3d-prototype', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
      if (r.ok) return (await r.json()).elements;
      console.log('  Overpass', r.status, '- thử lại');
    } catch (e) { console.log('  Overpass lỗi', e.message); }
    await new Promise((res) => setTimeout(res, 5000 * (k + 1)));
  }
  throw new Error('Không tải được dữ liệu OSM');
}

// nhà: Microsoft Global ML Building Footprints (ODbL), cùng nguồn với bản đồ chính (OSM ở đây chưa vẽ nhà)
function quadkey(lat, lon, z) {
  const n = 2 ** z, x = Math.floor(((lon + 180) / 360) * n);
  const s = Math.sin((lat * Math.PI) / 180), y = Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n);
  let q = '';
  for (let i = z; i > 0; i--) { const m = 1 << (i - 1); q += ((x & m) ? 1 : 0) + ((y & m) ? 2 : 0); }
  return q;
}
async function footprints(rect) {
  const [la, lo] = toLatLon((rect.x0 + rect.x1) / 2, (rect.z0 + rect.z1) / 2);
  const qk = quadkey(la, lo, 9), file = join(tmpdir(), `msbuildings-${qk}.csv.gz`);
  if (!existsSync(file)) {
    const csv = await (await fetch('https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv')).text();
    const row = csv.split(/\r?\n/).find((l) => l.startsWith(`Vietnam,${qk},`));
    if (!row) return [];
    const res = await fetch(row.split(',')[2]);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  }
  const out = [];
  const rl = readline.createInterface({ input: createReadStream(file).pipe(createGunzip()) });
  for await (const line of rl) {
    const m = line.match(/\[\[\[(-?[\d.]+), (-?[\d.]+)/);
    if (!m) continue;
    const [x, z] = toXZ(+m[2], +m[1]);
    if (x < rect.x0 || x > rect.x1 || z < rect.z0 || z > rect.z1) continue;
    const pts = JSON.parse(line).geometry.coordinates[0].map(([lon, lat]) => toXZ(lat, lon).map((v) => Math.round(v * 10) / 10));
    pts.pop();
    out.push({ pts });
  }
  return out;
}

for (const zone of ZONES) {
  const { rect, step } = zone;
  console.log(`Khu ${zone.name}: ${rect.x1 - rect.x0} × ${rect.z1 - rect.z0} m`);
  const els = await overpass(rect);
  const geom = (e) => e.geometry.map((g) => toXZ(g.lat, g.lon));
  const coast = [], beach = [], rock = [], buildings = [], roads = [], piers = [];
  for (const e of els) {
    if (!e.geometry) continue;
    const t = e.tags || {}, pts = geom(e);
    if (t.natural === 'coastline') coast.push(pts);
    else if (t.building) buildings.push({ pts, levels: +(t['building:levels'] || 0) || undefined });
    else if (t.natural === 'beach' || t.natural === 'sand') beach.push(pts);
    else if (t.natural === 'bare_rock' || t.natural === 'cliff') rock.push(pts);
    else if (t.man_made === 'pier' || t.man_made === 'breakwater') piers.push(pts);
    else if (t.highway) roads.push({ pts, type: t.highway });
  }
  if (!buildings.length) buildings.push(...(await footprints(rect)));
  const land = landPolygons(coast, rect);
  console.log(`  OSM: ${coast.length} đoạn bờ biển → ${land.length} vùng đất, ${beach.length} bãi cát, ${buildings.length} nhà, ${roads.length} đường, ${piers.length} cầu tàu`);
  // độ cao: đất theo SRTM nhưng không thấp hơn 0,7 m; bãi cát phẳng thấp; biển -4 m
  const nx = Math.round((rect.x1 - rect.x0) / step) + 1, nz = Math.round((rect.z1 - rect.z0) / step) + 1;
  const h = new Int16Array(nx * nz);
  const inAny = (polys, x, z) => polys.some((p) => pointInPoly(x, z, p));
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = rect.x0 + i * step, z = rect.z0 + j * step;
      let y;
      if (!inAny(land, x, z)) y = -4;
      else {
        const e = await elevation(15, x, z);
        y = Math.max(0.7, e);
        if (inAny(beach, x, z)) y = Math.min(y, 1.6);
      }
      h[j * nx + i] = Math.round(y * 10);
    }
  }
  // bãi thấp: SRTM 30 m làm bãi cát gò cao 5–9 m. Đất thấp (dưới 14 m) trong vòng 60 m tính từ mép nước được hạ
  // thành dốc thoai thoải 0,6 m + 0,15 m mỗi mét vào trong (khoảng cách tới biển tính bằng loang theo ô lưới).
  const dist = new Float32Array(nx * nz).fill(1e9), qx = [];
  for (let k = 0; k < nx * nz; k++) if (h[k] < 0) { dist[k] = 0; qx.push(k); }
  for (let qi = 0; qi < qx.length; qi++) {
    const k = qx[qi], i = k % nx, j = (k - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const k2 = b * nx + a; if (dist[k2] > dist[k] + step) { dist[k2] = dist[k] + step; qx.push(k2); }
    }
  }
  for (let k = 0; k < nx * nz; k++) if (h[k] > 0 && h[k] < 140 && dist[k] < 60) h[k] = Math.min(h[k], Math.round((0.6 + dist[k] * 0.15) * 10));
  // làm mềm mép biển: điểm đất sát biển hạ xuống thấp dần để bờ không dựng đứng như tường (trừ vách đá)
  const out = Int16Array.from(h);
  for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const k = j * nx + i;
    if (h[k] <= 0) continue;
    const seaNb = [h[k - 1], h[k + 1], h[k - nx], h[k + nx]].some((v) => v < 0);
    if (seaNb && h[k] > 40) out[k] = Math.round(h[k] * 0.6);
  }
  const data = {
    id: zone.id, rect, step, nx, nz,
    heights: Buffer.from(out.buffer).toString('base64'),
    land, beach, rock, buildings, roads, piers,
  };
  const file = `public/data/zones/${zone.id}.json`;
  writeFileSync(file, JSON.stringify(data));
  console.log(`  → ${file} (${(JSON.stringify(data).length / 1024).toFixed(0)} KB), lưới ${nx}×${nz}`);
}
