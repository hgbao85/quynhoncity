// Tải dữ liệu OpenStreetMap khu Quảng trường Trung tâm Quy Nhơn và lưu thành
// public/data/quynhon.json (đã đổi sang toạ độ mét, gốc tại tượng đài).
// Chạy: npm run fetch-osm
import { writeFileSync, mkdirSync } from 'node:fs';

// Gốc toạ độ: Tượng đài Nguyễn Sinh Sắc - Nguyễn Tất Thành
export const ORIGIN = { lat: 13.7627775, lon: 109.2209658 };
const BBOX = [13.7555, 109.2135, 13.7700, 109.2305]; // S, W, N, E

const query = `[out:json][timeout:90];
(
  way["building"](${BBOX});
  way["highway"](${BBOX});
  way["natural"~"coastline|beach|water|sand"](${BBOX});
  way["leisure"~"park|garden|pitch"](${BBOX});
  way["landuse"~"grass|park"](${BBOX});
  way["place"="square"](${BBOX});
  way["area:highway"](${BBOX});
  way["highway"="pedestrian"]["area"](${BBOX});
);
out geom;`;

const R = 6378137;
const k = Math.cos((ORIGIN.lat * Math.PI) / 180);
// x = đông, z = nam (Three.js: -z là bắc)
const toXZ = (lat, lon) => [
  +(((lon - ORIGIN.lon) * Math.PI) / 180 * R * k).toFixed(2),
  +(-((lat - ORIGIN.lat) * Math.PI) / 180 * R).toFixed(2),
];

function heightOf(t) {
  if (t.height) return parseFloat(t.height) || 9;
  if (t['building:levels']) return (parseFloat(t['building:levels']) || 3) * 3.3;
  // Không có số liệu: đoán theo loại, thêm ngẫu nhiên nhẹ cho đỡ đều
  const base = { apartments: 18, hotel: 30, commercial: 14, office: 16, house: 8, yes: 9 }[t.building] ?? 9;
  return base;
}

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'User-Agent': 'quynhon3d-prototype', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(query),
});
if (!res.ok) throw new Error('Overpass lỗi ' + res.status);
const raw = await res.json();

const out = { origin: ORIGIN, bbox: BBOX, buildings: [], roads: [], areas: [], coastline: [] };
for (const e of raw.elements) {
  if (!e.geometry) continue;
  const pts = e.geometry.map((g) => toXZ(g.lat, g.lon));
  const t = e.tags || {};
  if (t.building) {
    out.buildings.push({ pts, h: +heightOf(t).toFixed(1), name: t.name });
  } else if (t.natural === 'coastline') {
    out.coastline.push(pts);
  } else if (t.highway && !t.area) {
    out.roads.push({ pts, type: t.highway, name: t.name, lanes: +t.lanes || 0 });
  } else {
    const kind =
      t.natural === 'beach' || t.natural === 'sand' ? 'beach'
      : t.natural === 'water' ? 'water'
      : t.place === 'square' || t.highway === 'pedestrian' || t['area:highway'] ? 'plaza'
      : 'park';
    out.areas.push({ pts, kind, name: t.name });
  }
}

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/quynhon.json', JSON.stringify(out));
console.log(
  `Đã lưu: ${out.buildings.length} toà nhà, ${out.roads.length} đường, ${out.areas.length} vùng, ${out.coastline.length} đoạn bờ biển`
);
