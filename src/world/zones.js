// Khu riêng ngoài bản đồ chính: Kỳ Co và Eo Gió (Nhơn Lý), cách trung tâm 12–15 km.
// Chỉ tải khi người chơi dịch chuyển tới (public/data/zones/<id>.json, tạo bằng scripts/fetch-zones.mjs):
//   - lưới độ cao 4 m (đất/biển cắt theo đường bờ biển OSM) → mặt đất chi tiết, đục lỗ lưới địa hình xa
//   - lưới va chạm riêng (biển, đất, đường, nhà), ghép vào lưới chính qua grid.get
//   - nhà dân (footprint Microsoft), cây trên đồi, đường mòn
//   - đạo cụ riêng: Kỳ Co có cầu cảng gỗ, dù lá, ghế nằm, ca nô; Eo Gió có đài ngắm cảnh, lan can, thuyền thúng
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ZONES } from './zones-config.js';
import { addZoneGrid, heightAt } from './terrain.js';
import { Grid, SEA, FREE, ROAD, BUILDING, roadWidth, pointInPoly } from './geo.js';

const SAND = new THREE.Color('#e9dcb8'), SAND_WET = new THREE.Color('#cdbb92');
const SCRUB = new THREE.Color('#6f7a45'), ROCK = new THREE.Color('#a88a6a');

export function createZones({ scene, terrain, grid }) {
  const loaded = new Map(), loading = new Map();
  // ghép lưới va chạm của khu riêng vào lưới chính (người chơi, đám đông, xe đều đọc grid.get)
  const baseGet = grid.get.bind(grid);
  grid.get = (x, z) => {
    for (const zn of loaded.values()) {
      const r = zn.rect;
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return zn.grid.get(x, z);
    }
    return baseGet(x, z);
  };

  async function load(id) {
    if (loaded.has(id)) return loaded.get(id);
    if (loading.has(id)) return loading.get(id);
    const p = (async () => {
      const cfg = ZONES.find((z) => z.id === id);
      const res = await fetch(`/data/zones/${id}.json`);
      if (!res.ok) throw new Error(`Không tải được khu ${cfg?.name || id}`);
      const data = await res.json();
      const bin = Uint8Array.from(atob(data.heights), (c) => c.charCodeAt(0));
      const gr = { x0: data.rect.x0, z0: data.rect.z0, step: data.step, nx: data.nx, nz: data.nz, h: new Int16Array(bin.buffer) };
      addZoneGrid(gr);
      const zn = build(id, data);
      loaded.set(id, zn);
      return zn;
    })();
    loading.set(id, p);
    try { return await p; } finally { loading.delete(id); }
  }

  function build(id, data) {
    const { rect } = data;
    const zg = new Grid(rect);
    zg.a.fill(SEA);
    for (const poly of data.land) zg.fillPoly(poly, FREE);
    for (const r of data.roads) for (let i = 0; i + 1 < r.pts.length; i++) zg.fillSegment(r.pts[i], r.pts[i + 1], roadWidth(r.type) / 2 + 0.5, ROAD, (v) => v === FREE);
    for (const b of data.buildings) zg.fillPoly(b.pts, BUILDING);
    const nearSea = (x, z, r) => zg.get(x + r, z) === SEA || zg.get(x - r, z) === SEA || zg.get(x, z + r) === SEA || zg.get(x, z - r) === SEA;
    // mặt đất: cát ở dải thấp sát biển, còn lại theo màu đồi mặc định (cỏ, rừng, đá ở chỗ dốc)
    // Eo Gió: sống đá và đồi phía nam là đá granite nâu xen cây bụi khô (ảnh vệ tinh), không xanh như Kỳ Co
    const rocky = id === 'eogio';
    terrain.addZone({ x0: rect.x0, z0: rect.z0, step: data.step, nx: data.nx, nz: data.nz, h: heightsOf(data) }, rect, (x, z, h) => {
      // bãi cát: Kỳ Co rộng 40–60 m (ảnh vệ tinh), nơi khác là dải hẹp sát nước
      const wide = id === 'kyco';
      if (h > 0 && h < (wide ? 6 : 2.4) && (nearSea(x, z, 10) || nearSea(x, z, 22) || (wide && (nearSea(x, z, 34) || nearSea(x, z, 46))))) return (nearSea(x, z, 5) ? SAND_WET : SAND).clone();
      if (rocky && h > 6) {
        const n = Math.sin(x * 0.11 + z * 0.07) * 0.5 + Math.sin(x * 0.031 - z * 0.05) * 0.5;
        return SCRUB.clone().lerp(ROCK, Math.min(1, Math.max(0, 0.35 + n * 0.5 + (h - 20) / 60)));
      }
      return null;
    });
    const g = new THREE.Group();
    g.add(houses(data.buildings));
    g.add(paths(data.roads));
    g.add(trees(zg, rect, id, rocky));
    if (id === 'kyco') g.add(kyCoProps(zg));
    if (id === 'eogio') g.add(eoGioProps(zg, rect));
    scene.add(g);
    return { id, rect, grid: zg, group: g };
  }

  const heightsOf = (data) => { const bin = Uint8Array.from(atob(data.heights), (c) => c.charCodeAt(0)); return new Int16Array(bin.buffer); };

  return { load, isLoaded: (id) => loaded.has(id) };
}

// ---- nhà dân: khối đùn từ footprint, tường nhiều màu nhạt, mái phẳng màu ngói ----
function houses(list) {
  const walls = ['#efe6d2', '#f3d9c4', '#dfe8ef', '#f1e3a8', '#e7d3e3', '#d9ecd7', '#f6f1ea'];
  const geos = [];
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const b of list) {
    if (b.pts.length < 3) continue;
    const shape = new THREE.Shape(b.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const floors = b.levels || (rnd() < 0.55 ? 1 : rnd() < 0.8 ? 2 : 3);
    const hgt = floors * 3.2 + 0.4;
    let base = 1e9; for (const [x, z] of b.pts) base = Math.min(base, heightAt(x, z));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: hgt, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, Math.max(base, 0.5) - 0.3, 0);
    // mái (nắp trên của khối đùn) màu ngói, thân màu tường: tô màu theo nhóm đỉnh để chỉ cần một vật liệu
    const c = new THREE.Color(walls[Math.floor(rnd() * walls.length)]), r = new THREE.Color(rnd() < 0.7 ? '#b5603f' : '#8f8f8a');
    const col = new Float32Array(geo.attributes.position.count * 3);
    const capEnd = geo.groups[0] ? geo.groups[0].start + geo.groups[0].count : 0;
    for (let i = 0; i < geo.attributes.position.count; i++) { const k = i < capEnd ? r : c; col[i * 3] = k.r; col[i * 3 + 1] = k.g; col[i * 3 + 2] = k.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.clearGroups();
    geos.push(geo);
  }
  if (!geos.length) return new THREE.Group();
  const m = new THREE.Mesh(mergeGeometries(geos, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---- đường mòn, đường làng: dải phẳng bám mặt đất ----
function paths(roads) {
  const pos = [], col = [], idx = [];
  const colFor = (t) => new THREE.Color(/track|path|footway|steps/.test(t) ? '#c9b48c' : '#8d8a84');
  for (const r of roads) {
    const hw = Math.max(1, roadWidth(r.type) / 2), c = colFor(r.type);
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az); if (L < 0.5) continue;
      const n = Math.max(1, Math.ceil(L / 4)), ux = (bx - ax) / L, uz = (bz - az) / L;
      const base = pos.length / 3;
      for (let k = 0; k <= n; k++) {
        const x = ax + (bx - ax) * (k / n), z = az + (bz - az) * (k / n);
        for (const s of [-1, 1]) {
          const px = x - uz * hw * s, pz = z + ux * hw * s;
          pos.push(px, Math.max(heightAt(px, pz), 0.4) + 0.12, pz);
          col.push(c.r, c.g, c.b);
        }
      }
      for (let k = 0; k < n; k++) { const a = base + k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.receiveShadow = true;
  return m;
}

// ---- cây bụi, cây rừng thưa trên đồi (tránh nhà, đường, cát, vách dốc) ----
function trees(zg, rect, id, sparse = false) {
  let seed = id === 'kyco' ? 21 : 37; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const N = sparse ? 500 : 1400; // sống đá Eo Gió: cây bụi thưa
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#4d7a3a', roughness: 1, flatShading: true }), N);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#6e5a45', roughness: 1 }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  for (let k = 0; k < N * 6 && n < N; k++) {
    const x = rect.x0 + rnd() * (rect.x1 - rect.x0), z = rect.z0 + rnd() * (rect.z1 - rect.z0);
    if (zg.get(x, z) !== FREE) continue;
    const h = heightAt(x, z);
    if (h < 4) continue;
    const slope = Math.abs(heightAt(x + 3, z) - heightAt(x - 3, z)) + Math.abs(heightAt(x, z + 3) - heightAt(x, z - 3));
    if (slope > 7) continue; // vách đá: để trống
    const r = 1.2 + rnd() * 1.6, th = 1.2 + rnd() * 1.8;
    trunk.setMatrixAt(n, m4.compose(v.set(x, h - 0.2, z), q, s.set(1, th, 1)));
    q.setFromAxisAngle(up, rnd() * 6);
    crown.setMatrixAt(n, m4.compose(v.set(x, h + th + r * 0.5, z), q, s.set(r, r * 0.8, r)));
    crown.setColorAt(n, col.setHSL(0.27 + rnd() * 0.06, 0.38, 0.26 + rnd() * 0.1));
    q.identity();
    n++;
  }
  crown.count = trunk.count = n;
  crown.castShadow = true;
  const g = new THREE.Group(); g.add(crown, trunk);
  return g;
}

// đường bờ: điểm đất cuối cùng khi đi từ trong đất ra biển theo hướng (dx, dz)
function shoreAlong(zg, x, z, dx, dz, maxD = 200) {
  let last = null;
  for (let d = -80; d < maxD; d += 2) { const px = x + dx * d, pz = z + dz * d; if (zg.get(px, pz) !== SEA) last = [px, pz]; else if (last) return last; }
  return last;
}

// ---- Kỳ Co: cầu cảng gỗ giữa bãi, dù lá và ghế nằm dọc bãi cát, ca nô neo cạnh cầu, biển tên ----
function kyCoProps(zg) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#8a6038', roughness: 0.85 });
  const thatch = new THREE.MeshStandardMaterial({ color: '#c9a466', roughness: 1, flatShading: true });
  const white = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.5 });
  const blue = new THREE.MeshStandardMaterial({ color: '#2f78b7', roughness: 0.5 });
  // cầu cảng: theo ảnh vệ tinh, từ giữa bãi chạy ra phía đông ~130 m
  const P0 = shoreAlong(zg, 7700, -9723, 1, -0.12) || [7717, -9723], P1 = [P0[0] + 128, P0[1] - 16];
  const L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), yaw = Math.atan2(P1[0] - P0[0], P1[1] - P0[1]);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, L), wood);
  deck.position.set((P0[0] + P1[0]) / 2, 1.6, (P0[1] + P1[1]) / 2); deck.rotation.y = yaw; deck.castShadow = deck.receiveShadow = true; g.add(deck);
  for (let s = 4; s < L; s += 6) for (const o of [-1.3, 1.3]) {
    const t = s / L, x = P0[0] + (P1[0] - P0[0]) * t + Math.cos(yaw) * o, z = P0[1] + (P1[1] - P0[1]) * t - Math.sin(yaw) * o;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), wood); post.position.set(x, -1.2, z); g.add(post);
  }
  // ca nô neo hai bên đầu cầu
  for (const [o, k] of [[5, 0.9], [-5, 0.8], [6, 0.6]]) {
    const t = k, x = P0[0] + (P1[0] - P0[0]) * t + Math.cos(yaw) * o, z = P0[1] + (P1[1] - P0[1]) * t - Math.sin(yaw) * o;
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 7), white); hull.position.y = 0.2; boat.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 4), white); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.45); bow.position.set(0, 0.2, 4.6); boat.add(bow);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.18, 7.05), blue); stripe.position.y = 0.45; boat.add(stripe);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 3), blue); roof.position.set(0, 1.9, -0.8); boat.add(roof);
    boat.position.set(x, 0, z); boat.rotation.y = yaw + 0.15 * o; g.add(boat);
  }
  // dù lá và ghế nằm dọc bãi (bãi chạy gần bắc – nam, nam lệch đông)
  const A = [7667, -10043], B = [7841, -9498];
  for (let k = 0; k <= 22; k++) {
    const t = k / 22, x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t;
    const s = shoreAlong(zg, x - 60, z, 1, 0);
    if (!s || Math.abs(k - 11) < 1) continue; // chừa chỗ đầu cầu cảng
    const ux = s[0] - 14, uz = s[1];
    const y = Math.max(heightAt(ux, uz), 0.5);
    if (y > 3) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5), wood); pole.position.set(ux, y + 1.3, uz); g.add(pole);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.9, 10), thatch); umb.position.set(ux, y + 2.8, uz); umb.castShadow = true; g.add(umb);
    for (const o of [-1.1, 1.1]) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.25, 1.9), white); bed.position.set(ux + o, y + 0.35, uz + 1.6); bed.rotation.x = -0.15; g.add(bed);
    }
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.2), new THREE.MeshStandardMaterial({ map: textSign('KỲ CO', 'Nhơn Lý · Quy Nhơn', '#1f6e8c'), roughness: 0.6 }));
  const sp = [P0[0] - 14, P0[1] + 6];
  sign.position.set(sp[0], Math.max(heightAt(...sp), 0.5) + 2.2, sp[1]); sign.rotation.y = Math.PI / 2; g.add(sign);
  for (const o of [-2, 2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), wood); p.position.set(sp[0] - 0.05, Math.max(heightAt(...sp), 0.5) + 1.4, sp[1] + o); g.add(p); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---- Eo Gió: đài ngắm cảnh có lan can trên sống đá, biển tên, thuyền thúng và thuyền gỗ trong vịnh phía tây ----
function eoGioProps(zg, rect) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#a39a8a', roughness: 0.9 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.8 });
  // đài ngắm cảnh: chỗ đất cao nhất trên sống đá hẹp chạy lên phía bắc (ảnh vệ tinh), không tính đồi đá phía nam
  let best = [7660, -13900], bh = -1;
  for (let x = 7590; x <= 7730; x += 4) for (let z = -14150; z <= -13800; z += 4) { const h = heightAt(x, z); if (zg.get(x, z) !== SEA && h > bh) { bh = h; best = [x, z]; } }
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.8, 0.8, 16), stone); plat.position.set(best[0], bh + 0.1, best[1]); plat.receiveShadow = true; g.add(plat);
  for (let k = 0; k < 24; k++) {
    if (k > 20) continue; // lối vào
    const a = (k / 24) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), railMat); p.position.set(best[0] + Math.cos(a) * 4.3, bh + 1, best[1] + Math.sin(a) * 4.3); g.add(p);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.06, 4, 48, Math.PI * 2 * (21 / 24)), railMat); ring.rotation.x = Math.PI / 2; ring.position.set(best[0], bh + 1.5, best[1]); g.add(ring);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.1), new THREE.MeshStandardMaterial({ map: textSign('EO GIÓ', 'Nhơn Lý · Quy Nhơn', '#7a3b2e'), roughness: 0.6, side: THREE.DoubleSide }));
  sign.position.set(best[0], bh + 2.4, best[1] + 5.4); g.add(sign);
  for (const o of [-1.8, 1.8]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), railMat); p.position.set(best[0] + o, bh + 1.3, best[1] + 5.45); g.add(p); }
  // thuyền thúng tròn và thuyền gỗ neo trong vịnh phía tây sống đá
  const basket = new THREE.MeshStandardMaterial({ color: '#3d5a6b', roughness: 0.9 }), boatMat = new THREE.MeshStandardMaterial({ color: '#2e6aa6', roughness: 0.7 }), red = new THREE.MeshStandardMaterial({ color: '#b8352b', roughness: 0.7 });
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let placed = 0;
  for (let k = 0; k < 400 && placed < 26; k++) {
    const x = rect.x0 + 60 + rnd() * 500, z = -13900 + rnd() * 500;
    if (zg.get(x, z) !== SEA || zg.get(x + 20, z) !== SEA || zg.get(x - 20, z) !== SEA || zg.get(x, z + 20) !== SEA) continue;
    if (x > best[0] - 30) continue; // chỉ phía tây sống đá (vịnh kín gió)
    if (rnd() < 0.55) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), basket); b.position.set(x, 0.35, z); b.rotation.x = Math.PI; g.add(b);
    } else {
      const b = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 9), boatMat); hull.position.y = 0.3; b.add(hull);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 2.4), red); cab.position.set(0, 1.4, -1.5); b.add(cab);
      b.position.set(x, 0, z); b.rotation.y = rnd() * Math.PI; g.add(b);
    }
    placed++;
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.viewpoint = best;
  return g;
}

function textSign(title, sub, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 140;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 140);
  x.strokeStyle = '#f2e6c8'; x.lineWidth = 5; x.strokeRect(7, 7, 498, 126);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 60px "Be Vietnam Pro", Arial, sans-serif'; x.fillText(title, 256, 58);
  x.font = '600 24px "Be Vietnam Pro", Arial, sans-serif'; x.fillStyle = '#f2e6c8'; x.fillText(sub, 256, 108);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
