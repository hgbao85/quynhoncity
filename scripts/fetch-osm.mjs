// Tải dữ liệu OpenStreetMap toàn nội thành Quy Nhơn (BBOX trong src/world/config.js) và lưu
// .cache/osm.json (toạ độ mét, gốc tại tượng đài), dựng sẵn đa giác đất liền.
// Sau đó chạy npm run build-tiles để tạo dữ liệu game trong public/data.
// Chạy: npm run fetch-osm
import { writeFileSync, mkdirSync } from 'node:fs';
import { ORIGIN, BBOX, BOUNDS, toXZ } from '../src/world/config.js';
import { landPolygons } from './lib/coast.mjs';

const B = `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`;
const query = `[out:json][timeout:180][maxsize:536870912];
(
  way["building"](${B});
  way["highway"](${B});
  way["natural"~"coastline|beach|water|sand|wetland"](${B});
  rel["natural"="water"](${B});
  way["waterway"="riverbank"](${B});
  way["leisure"~"park|garden|pitch|stadium"](${B});
  way["landuse"~"grass|park|recreation_ground|cemetery"](${B});
  way["place"="square"](${B});
  way["area:highway"](${B});
  way["highway"="pedestrian"]["area"](${B});
);
out geom;`;

const r1 = (v) => Math.round(v * 10) / 10;
const xz = (g) => toXZ(g.lat, g.lon).map(r1);

function heightOf(t) {
  if (t.height) return parseFloat(t.height) || 9;
  if (t['building:levels']) return (parseFloat(t['building:levels']) || 3) * 3.3;
  const base = { apartments: 18, hotel: 30, commercial: 14, office: 16, house: 8, yes: 9 }[t.building] ?? 9;
  return base;
}

// nối các đoạn (way thành viên của relation) thành vòng kín
function joinRings(parts) {
  const segs = parts.map((p) => p.slice()), rings = [];
  const eq = (a, b) => Math.abs(a[0] - b[0]) < 0.05 && Math.abs(a[1] - b[1]) < 0.05;
  while (segs.length) {
    let ring = segs.shift(), grew = true;
    while (!eq(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], end = ring[ring.length - 1];
        if (eq(s[0], end)) { ring = ring.concat(s.slice(1)); }
        else if (eq(s[s.length - 1], end)) { ring = ring.concat(s.slice(0, -1).reverse()); }
        else continue;
        segs.splice(i, 1); grew = true; break;
      }
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

console.log('Đang tải dữ liệu OSM cho', B);
// thử lần lượt các máy chủ Overpass, chờ lâu dần nếu máy chủ bận
const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
let res;
for (let attempt = 0; attempt < 6; attempt++) {
  const url = SERVERS[attempt % SERVERS.length];
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'User-Agent': 'quynhon3d-prototype', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    });
    if (res.ok) break;
    console.log(`  ${url}: lỗi ${res.status}, thử lại...`);
  } catch (err) { console.log(`  ${url}: ${err.message}, thử lại...`); }
  await new Promise((r) => setTimeout(r, 5000 * 2 ** Math.min(attempt, 3)));
}
if (!res || !res.ok) throw new Error('Không tải được dữ liệu từ Overpass');
const raw = await res.json();

const out = { origin: ORIGIN, bbox: BBOX, bounds: BOUNDS, buildings: [], roads: [], areas: [], coastline: [], land: [] };
for (const e of raw.elements) {
  const t = e.tags || {};
  if (e.type === 'relation') {
    const outers = (e.members || []).filter((m) => m.type === 'way' && m.role !== 'inner' && m.geometry).map((m) => m.geometry.map(xz));
    for (const ring of joinRings(outers)) out.areas.push({ pts: ring, kind: 'water', name: t.name });
    continue;
  }
  if (!e.geometry) continue;
  const pts = e.geometry.map(xz);
  if (t.building) {
    out.buildings.push({ pts, h: +heightOf(t).toFixed(1), name: t.name });
  } else if (t.natural === 'coastline') {
    out.coastline.push(pts);
  } else if (t.highway && !t.area) {
    out.roads.push({ pts, type: t.highway, name: t.name });
  } else {
    const kind =
      t.natural === 'beach' || t.natural === 'sand' ? 'beach'
      : t.natural === 'water' || t.waterway === 'riverbank' ? 'water'
      : t.natural === 'wetland' ? 'park'
      : t.place === 'square' || t.highway === 'pedestrian' || t['area:highway'] ? 'plaza'
      : 'park';
    if (pts.length >= 4) out.areas.push({ pts, kind, name: t.name });
  }
}
out.land = landPolygons(out.coastline, BOUNDS).map((p) => p.map(([x, z]) => [r1(x), r1(z)]));

mkdirSync('.cache', { recursive: true });
writeFileSync('.cache/osm.json', JSON.stringify(out));
console.log(`Đã lưu: ${out.buildings.length} toà nhà, ${out.roads.length} đường, ${out.areas.length} vùng, ` +
  `${out.coastline.length} đoạn bờ biển → ${out.land.length} đa giác đất liền`);
