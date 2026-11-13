// Tải footprint nhà thật (Microsoft Global ML Building Footprints, giấy phép ODbL) cho toàn vùng
// bản đồ (BOUNDS trong src/world/config.js), đổi sang mét, lưu .cache/footprints.json.
// Chạy sau npm run fetch-osm:  npm run fetch-buildings   (tải ~24 MB)
// Có thể truyền file .csv.gz đã tải sẵn: node scripts/fetch-buildings.mjs path/to/file.csv.gz
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';
import { ORIGIN, BBOX, toXZ, inBounds } from '../src/world/config.js';
import { pointInPoly } from '../src/world/geo.js';

const LINKS = 'https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv';

function quadkey(lat, lon, z) {
  const x = Math.floor(((lon + 180) / 360) * 2 ** z);
  const s = Math.sin((lat * Math.PI) / 180);
  const y = Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z);
  let q = '';
  for (let i = z; i > 0; i--) { const m = 1 << (i - 1); q += ((x & m) ? 1 : 0) + ((y & m) ? 2 : 0); }
  return q;
}

// các ô quadkey cấp 9 phủ vùng bản đồ
const keys = new Set([[BBOX.s, BBOX.w], [BBOX.s, BBOX.e], [BBOX.n, BBOX.w], [BBOX.n, BBOX.e], [ORIGIN.lat, ORIGIN.lon]]
  .map(([la, lo]) => quadkey(la, lo, 9)));

let files = process.argv.slice(2);
if (!files.length) {
  const csv = await (await fetch(LINKS)).text();
  for (const qk of keys) {
    const row = csv.split('\n').find((l) => l.startsWith(`Vietnam,${qk},`));
    if (!row) { console.log('Không có dữ liệu cho ô', qk); continue; }
    const url = row.split(',')[2];
    const file = join(tmpdir(), `msbuildings-${qk}.csv.gz`);
    if (!existsSync(file)) {
      console.log('Đang tải', url);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Tải lỗi ' + res.status);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
    }
    files.push(file);
  }
}

// bỏ những nhà đã có trong OSM (OSM có tên, độ cao chính xác hơn)
const osm = existsSync('.cache/osm.json') ? JSON.parse(readFileSync('.cache/osm.json', 'utf8')).buildings : [];
const osmBox = osm.map((b) => {
  const xs = b.pts.map((p) => p[0]), zs = b.pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
});

const out = [];
let skipped = 0;
for (const file of files) {
  const rl = readline.createInterface({ input: createReadStream(file).pipe(createGunzip()) });
  for await (const line of rl) {
    const m = line.match(/\[\[\[(-?[\d.]+), (-?[\d.]+)/);
    if (!m) continue;
    const [x0, z0] = toXZ(+m[2], +m[1]);
    if (!inBounds(x0, z0)) continue;
    const f = JSON.parse(line);
    const pts = f.geometry.coordinates[0].map(([lon, lat]) => toXZ(lat, lon).map((v) => Math.round(v * 10) / 10));
    pts.pop(); // điểm cuối trùng điểm đầu
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (osm.some((b, i) => cx >= osmBox[i][0] && cx <= osmBox[i][2] && cz >= osmBox[i][1] && cz <= osmBox[i][3] && pointInPoly(cx, cz, b.pts))) { skipped++; continue; }
    out.push(pts.flat());
  }
}
mkdirSync('.cache', { recursive: true });
writeFileSync('.cache/footprints.json', JSON.stringify({ source: 'Microsoft Global ML Building Footprints (ODbL)', b: out }));
console.log(`Đã lưu ${out.length} footprint (bỏ ${skipped} nhà trùng OSM)`);
