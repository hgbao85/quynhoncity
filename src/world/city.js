// Phần nền chung của thành phố: lưới va chạm, mặt đất (đất liền, công viên, bãi cát, mặt nước),
// vật liệu dùng chung. Nhà, đường, cây, đèn được tải theo từng ô trong tiles.js.
import * as THREE from 'three';
import { Builder, addFlat, windowTextures, shopAtlas, MAJOR, FOOT } from './citykit.js';
import { buildWorldGrid } from './worldgrid.js';
import { squareLayout } from './square.js';
import { createTileManager } from './tiles.js';

export function buildCity(world) {
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
  for (const a of world.areas) addFlat(ground, a.pts, areaY[a.kind], new THREE.Color(areaCol[a.kind]));
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
  };
  const tiles = createTileManager(group, grid, world, mats);
  console.info(`[city] lưới va chạm ${grid.nx}×${grid.nz} ô dựng trong ${tGrid.toFixed(0)} ms, ${world.tiles.list.length} ô dữ liệu`);

  return {
    group, grid, land: world.land, tiles, square: squareLayout(),
    buildingMat: mats.building, lampMat: mats.lamp, shopMat: mats.shop,
  };
}
