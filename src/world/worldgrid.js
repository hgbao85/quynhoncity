// Dựng lưới chiếm chỗ cho cả vùng bản đồ: biển/đất, vùng nước, công viên, đường, khu tượng đài,
// toà nhà OSM. Thuần JS: script tạo dữ liệu (Node) và game dùng chung để hai bên luôn khớp nhau.
// (Nhà từ footprint được tô thêm khi từng ô dữ liệu được tải.)
import { Grid, FREE, SEA, ROAD, BUILDING, OPEN, KEEP, roadWidth } from './geo.js';
import { toWorld, PLINTH, arcPoint, PLAZA_LOCAL, offsetPolygon, FRONT_WALK } from './site.js';

export const FOOT_TYPES = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian']);

export function buildWorldGrid(world) {
  const grid = new Grid(world.bounds);
  grid.a.fill(SEA);
  for (const poly of world.land) grid.fillPoly(poly, FREE);
  for (const a of world.areas) {
    if (a.kind === 'water') grid.fillPoly(a.pts, SEA);
    else grid.fillPoly(a.pts, OPEN, (v) => v !== SEA);
  }
  for (const r of world.roads) {
    const foot = FOOT_TYPES.has(r.type), hw = roadWidth(r.type) / 2;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      grid.fillSegment(r.pts[i], r.pts[i + 1], foot ? hw : hw + 1.5, ROAD, (v) => v === FREE || (v === OPEN && !foot));
    }
  }
  // khu tượng đài: không xây nhà, không trồng cây; bệ tượng và phù điêu chắn đường
  const rectW = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => toWorld(a, b));
  grid.fillPoly(offsetPolygon(PLAZA_LOCAL, 3).map(([a, b]) => toWorld(a, b)), KEEP);
  grid.fillPoly(FRONT_WALK, OPEN, (v) => v !== ROAD);
  grid.fillPoly(rectW(-PLINTH.w / 2, -PLINTH.d / 2, PLINTH.w / 2, PLINTH.d / 2), BUILDING);
  for (let u = -1; u < 1; u += 0.02) grid.fillSegment(toWorld(...arcPoint(u)), toWorld(...arcPoint(u + 0.02)), 0.7, BUILDING);
  for (const b of world.buildings) grid.fillPoly(b.pts, BUILDING);
  return grid;
}
