// Phần nền chung của thành phố: lưới va chạm, mặt đất (đất liền, công viên, bãi cát, mặt nước),
// vật liệu dùng chung. Nhà, đường, cây, đèn được tải theo từng ô trong tiles.js.
import * as THREE from 'three';
import { Builder, addFlat, windowTextures, shopAtlas, MAJOR, FOOT } from './citykit.js';
import { buildWorldGrid } from './worldgrid.js';
import { squareLayout } from './square.js';
import { createTileManager } from './tiles.js';
import { heightAt } from './terrain.js';
import { UP } from './citykit.js';

export function buildCity(world, terrain = null) {
  const group = new THREE.Group();
  const t0 = performance.now();
  const grid = buildWorldGrid(world);
  const tGrid = performance.now() - t0;

  // ---- mặt đất ----
  const ground = new Builder();
  for (const poly of world.land) addFlat(ground, poly, 0, new THREE.Color('#9c9486'));
  // quảng trường: nền là thảm cỏ, sân lát đá được dựng riêng trong square.js
  const areaCol = { park: '#6fa45c', beach: '#d6b274', plaza: '#76a861', water: '#3f7f9e' };
  const areaY = { beach: 0.02, park: 0.03, plaza: 0.035, water: 0.012 };
  for (const a of world.areas) {
    const col = new THREE.Color(areaCol[a.kind]);
    if (a.kind !== 'water' && onHill(a.pts)) drapeArea(ground, a.pts, areaY[a.kind] + 0.05, col);
    else addFlat(ground, a.pts, areaY[a.kind], col);
  }
  const groundMesh = new THREE.Mesh(ground.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // ---- vật liệu dùng chung cho mọi ô ----
  const tex = windowTextures();
  const atlas = shopAtlas();
  const roadCols = new Map();
  const mats = {
    building: new THREE.MeshStandardMaterial({
      vertexColors: true, map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.82,
    }),
    shop: new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.7, side: THREE.DoubleSide }),
    road: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    roadColor: (t) => {
      if (!roadCols.has(t)) roadCols.set(t, new THREE.Color(FOOT.has(t) ? '#b9ae9d' : MAJOR.has(t) ? '#3a3c41' : t === 'service' ? '#5a5c60' : '#47494d'));
      return roadCols.get(t);
    },
    trunk: new THREE.MeshStandardMaterial({ color: '#8b7355', roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#4e8a3a', roughness: 0.9, side: THREE.DoubleSide }),
    treeBlob: new THREE.MeshStandardMaterial({ color: '#3f7a35', roughness: 1, flatShading: true }),
    pine: new THREE.MeshStandardMaterial({ color: '#647d5c', roughness: 1, flatShading: true }),
    bush: new THREE.MeshStandardMaterial({ color: '#3f7a32', roughness: 1, flatShading: true }),
    pole: new THREE.MeshStandardMaterial({ color: '#5d6168', roughness: 0.5, metalness: 0.6 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffcf80', emissiveIntensity: 0 }),
    forest: new THREE.MeshStandardMaterial({ color: '#3d5f35', roughness: 1, flatShading: true }),
  };
  const tiles = createTileManager(group, grid, world, mats, terrain);
  console.info(`[city] lưới va chạm ${grid.nx}×${grid.nz} ô dựng trong ${tGrid.toFixed(0)} ms, ${world.tiles.list.length} ô dữ liệu`);

  return {
    group, grid, land: world.land, tiles, square: squareLayout(),
    buildingMat: mats.building, lampMat: mats.lamp, shopMat: mats.shop,
  };
}

// Vùng có chỗ nằm trên đồi (lấy mẫu mỗi 15 m trong hộp bao)
function onHill(pts) {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
  for (let x = a; x <= c; x += 15) for (let z = b; z <= d; z += 15) if (heightAt(x, z) > 0.2) return true;
  return false;
}

// Phủ đa giác lên mặt địa hình: tam giác hoá rồi chia nhỏ tới cạnh ≤ 12 m, nâng theo độ cao
function drapeArea(builder, ptsIn, dy, col) {
  const pts = ptsIn.slice();
  if (pts.length > 3 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 0.01) pts.pop();
  if (pts.length < 3) return;
  const tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
  const emit = (A, B, C, depth) => {
    const ab = Math.hypot(A[0] - B[0], A[1] - B[1]), bc = Math.hypot(B[0] - C[0], B[1] - C[1]), ca = Math.hypot(C[0] - A[0], C[1] - A[1]);
    const m = Math.max(ab, bc, ca);
    if (m > 12 && depth < 12) {
      // chia đôi cạnh dài nhất
      if (m === ab) { const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; emit(A, M, C, depth + 1); emit(M, B, C, depth + 1); }
      else if (m === bc) { const M = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2]; emit(A, B, M, depth + 1); emit(A, M, C, depth + 1); }
      else { const M = [(C[0] + A[0]) / 2, (C[1] + A[1]) / 2]; emit(A, B, M, depth + 1); emit(M, B, C, depth + 1); }
      return;
    }
    const P = (p) => [p[0], heightAt(p[0], p[1]) + dy, p[1]];
    let a = P(A), b = P(B), cc = P(C);
    const up = (b[2] - a[2]) * (cc[0] - a[0]) - (b[0] - a[0]) * (cc[2] - a[2]);
    if (up < 0) [b, cc] = [cc, b];
    builder.tri(a, b, cc, UP, col);
  };
  for (const [i, j, k] of tris) emit(pts[i], pts[j], pts[k], 0);
}
