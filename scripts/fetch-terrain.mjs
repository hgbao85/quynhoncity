// Tải độ cao địa hình (AWS Terrain Tiles, định dạng Terrarium, dữ liệu gốc SRTM ~30 m; công khai,
// không cần khoá) và lưu:
//   public/data/terrain.bin     Int16 (đơn vị dm): lưới gần (đã làm phẳng phố) rồi tới lưới xa (độ cao gốc)
//   .cache/terrain-meta.json    kích thước, vị trí hai lưới (build-tiles chép vào world.json)
// Chạy: npm run fetch-terrain
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { ORIGIN, BOUNDS } from '../src/world/config.js';
import { flatten } from '../src/world/terrain.js';

const R = 6378137, K = Math.cos((ORIGIN.lat * Math.PI) / 180);
const toLatLon = (x, z) => [ORIGIN.lat - (z / R) * (180 / Math.PI), ORIGIN.lon + (x / (R * K)) * (180 / Math.PI)];

const cache = new Map();
mkdirSync('.cache/terrarium', { recursive: true });
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
  // nội suy song tuyến trong ảnh ô (bỏ qua biên giữa các ô: sai số rất nhỏ ở mức này)
  const tx = Math.floor(fx), ty = Math.floor(fy), px = (fx - tx) * 256 - 0.5, py = (fy - ty) * 256 - 0.5;
  const t = await tile(Z, tx, ty);
  const i = Math.max(0, Math.min(254, Math.floor(px))), j = Math.max(0, Math.min(254, Math.floor(py)));
  const u = Math.max(0, Math.min(1, px - i)), v = Math.max(0, Math.min(1, py - j));
  const a = t[j * 256 + i], b = t[j * 256 + i + 1], c = t[(j + 1) * 256 + i], d = t[(j + 1) * 256 + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

async function grid(Z, x0, z0, x1, z1, step, raw = false) {
  const nx = Math.ceil((x1 - x0) / step) + 1, nz = Math.ceil((z1 - z0) / step) + 1;
  const out = new Int16Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const h = await elevation(Z, x0 + i * step, z0 + j * step);
    // lưới gần: đã làm phẳng phố; lưới xa: giữ độ cao gốc để còn phân biệt đồng bằng với biển
    out[j * nx + i] = Math.round((raw ? Math.max(-5, h) : flatten(h)) * 10);
  }
  return { meta: { x0, z0, step, nx, nz }, data: out };
}

// làm mượt nhẹ (lọc 3×3) để bớt răng cưa của dữ liệu 30 m
function smooth({ meta, data }) {
  const { nx, nz } = meta, out = new Int16Array(data.length);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    let s = 0, w = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const k = di === 0 && dj === 0 ? 4 : di === 0 || dj === 0 ? 2 : 1;
      s += data[b * nx + a] * k; w += k;
    }
    out[j * nx + i] = data[j * nx + i] === 0 ? 0 : Math.round(s / w); // giữ phố phẳng tuyệt đối
  }
  return { meta, data: out };
}

console.log('Đang tải địa hình gần (zoom 14, lưới 15 m)...');
const near = smooth(await grid(14, BOUNDS.x0 - 30, BOUNDS.z0 - 30, BOUNDS.x1 + 30, BOUNDS.z1 + 30, 15));
console.log('Đang tải địa hình xa (zoom 11, lưới 75 m, ~30 km)...');
const far = smooth(await grid(11, -15000, -15000, 15000, 15000, 75, true));

const all = new Int16Array(near.data.length + far.data.length);
all.set(near.data, 0); all.set(far.data, near.data.length);
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/terrain.bin', Buffer.from(all.buffer));
writeFileSync('.cache/terrain-meta.json', JSON.stringify({ near: near.meta, far: far.meta }));
let maxH = 0; for (const v of all) maxH = Math.max(maxH, v);
console.log(`Đã lưu terrain.bin (${(all.byteLength / 1e6).toFixed(2)} MB): gần ${near.meta.nx}×${near.meta.nz}, xa ${far.meta.nx}×${far.meta.nz}, cao nhất ${(maxH / 10).toFixed(0)} m (sau làm phẳng)`);
