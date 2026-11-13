// Tải footprint nhà thật (Microsoft Global ML Building Footprints, giấy phép ODbL),
// lọc quanh tượng đài, đổi sang mét và lưu public/data/buildings.json.
// Chạy: npm run fetch-buildings   (tải ~24 MB, chỉ cần chạy lại khi muốn cập nhật)
// Có thể truyền đường dẫn file .csv.gz đã tải sẵn: node scripts/fetch-buildings.mjs path/to/file.csv.gz
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';

const ORIGIN = { lat: 13.7627775, lon: 109.2209658 };
const RADIUS = 980; // mét, khớp với vùng dựng chi tiết trong city.js
const LINKS = 'https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv';

const R = 6378137;
const k = Math.cos((ORIGIN.lat * Math.PI) / 180);
const toXZ = (lon, lat) => [
  +(((lon - ORIGIN.lon) * Math.PI) / 180 * R * k).toFixed(1),
  +(-((lat - ORIGIN.lat) * Math.PI) / 180 * R).toFixed(1),
];

function quadkey(lat, lon, z) {
  const x = Math.floor(((lon + 180) / 360) * 2 ** z);
  const s = Math.sin((lat * Math.PI) / 180);
  const y = Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z);
  let q = '';
  for (let i = z; i > 0; i--) {
    const m = 1 << (i - 1);
    q += ((x & m) ? 1 : 0) + ((y & m) ? 2 : 0);
  }
  return q;
}

let file = process.argv[2];
if (!file) {
  const qk = quadkey(ORIGIN.lat, ORIGIN.lon, 9);
  const csv = await (await fetch(LINKS)).text();
  const row = csv.split('\n').find((l) => l.startsWith(`Vietnam,${qk},`));
  if (!row) throw new Error('Không tìm thấy ô dữ liệu ' + qk);
  const url = row.split(',')[2];
  file = join(tmpdir(), `msbuildings-${qk}.csv.gz`);
  if (!existsSync(file)) {
    console.log('Đang tải', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Tải lỗi ' + res.status);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  }
}

// Bỏ những nhà đã có trong OSM (OSM có tên, độ cao chính xác hơn)
const osm = existsSync('public/data/quynhon.json') ? JSON.parse(readFileSync('public/data/quynhon.json', 'utf8')).buildings : [];
const inPoly = (x, z, pts) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};

const out = [];
let skipped = 0;
const rl = readline.createInterface({ input: createReadStream(file).pipe(createGunzip()) });
for await (const line of rl) {
  const m = line.match(/\[\[\[(-?[\d.]+), (-?[\d.]+)/);
  if (!m) continue;
  const [x0, z0] = toXZ(+m[1], +m[2]);
  if (Math.abs(x0) > RADIUS || Math.abs(z0) > RADIUS) continue;
  const f = JSON.parse(line);
  const pts = f.geometry.coordinates[0].map(([lon, lat]) => toXZ(lon, lat));
  pts.pop(); // điểm cuối trùng điểm đầu
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  if (osm.some((b) => inPoly(cx, cz, b.pts))) { skipped++; continue; }
  out.push(pts.flat());
}
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/buildings.json', JSON.stringify({ source: 'Microsoft Global ML Building Footprints (ODbL)', origin: ORIGIN, b: out }));
console.log(`Đã lưu ${out.length} footprint (bỏ ${skipped} nhà trùng OSM)`);
