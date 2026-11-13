// Các công trình nổi bật dựng tay theo ảnh vệ tinh, Street View và số liệu báo chí:
//   - Tháp Đôi: hai tháp Chăm gạch đỏ (tháp Bắc ~25 m lớn hơn, tháp Nam ~23 m), cửa quay về nam,
//     thân vuông có trụ áp tường và cửa giả vòm nhọn, mái nhiều tầng thu nhỏ đã mất chóp, chân đá
//   - Nhà thờ Chính tòa (Nhà thờ Nhọn): kiểu Gothic sơn trắng, một tháp chuông giữa mặt tiền
//     cao 42,7 m với chóp nhọn màu cam đỏ, mặt tiền quay ra đường Trần Hưng Đạo (phía nam)
//   - Chợ Lớn: nhà lồng chợ hai tầng mái tôn, vòng quanh là sạp hàng mái bạt xanh, biển hiệu
//   - Ga Quy Nhơn: nhà ga hai tầng sơn vàng, khối giữa có đầu hồi và đồng hồ (ước lượng, chưa có ảnh)
//   - Mộ Hàn Mặc Tử: nền đá ba bậc, bia đá trắng có tượng, đèn trụ xanh, lối lát đá, bồn hoa
// Mỗi công trình đặt theo độ cao địa hình và chặn đường đi trên lưới va chạm.
import * as THREE from 'three';
import { BUILDING } from './geo.js';
import { heightAt } from './terrain.js';
import { LANDMARKS, siteToWorld } from './landmark-sites.js';

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; };
const cyl = (r0, r1, h, seg, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = true; return m; };

export function createLandmarks(scene, grid) {
  const glow = []; // vật liệu sáng ban đêm: [mat, cường độ]
  const all = new THREE.Group();
  const builders = { thapdoi: thapDoi, cathedral, market, station, hanmactu: tomb };
  for (const l of LANDMARKS) {
    const g = builders[l.id](glow, l);
    // đặt theo độ cao thấp nhất trong khuôn viên để chân công trình không lơ lửng
    let y = 1e9;
    for (let lx = -10; lx <= 10; lx += 5) for (let lz = -10; lz <= 10; lz += 5) y = Math.min(y, heightAt(...siteToWorld(l, lx, lz)));
    g.position.set(l.x, y, l.z);
    g.rotation.y = l.yaw;
    g.userData.landmark = l.id;
    all.add(g);
    // chặn đường đi: các khối có userData.solid
    g.updateMatrixWorld(true);
    g.traverse((o) => {
      if (!o.userData.solid) return;
      const bb = new THREE.Box3().setFromObject(o);
      const pts = [[bb.min.x, bb.min.z], [bb.max.x, bb.min.z], [bb.max.x, bb.max.z], [bb.min.x, bb.max.z]];
      grid.fillPoly(pts, BUILDING);
    });
  }
  scene.add(all);
  return {
    group: all,
    setNight(n) { for (const [m, k] of glow) m.emissiveIntensity = n * k; },
  };
}

// ======================= Tháp Đôi =======================
function brickTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#8a4a34'; x.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 32; row++) for (let col = 0; col < 8; col++) {
    const v = 0.8 + Math.random() * 0.35;
    x.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(78 * v)},${Math.round(55 * v)})`;
    x.fillRect(col * 32 + (row % 2) * 16 + 1, row * 8 + 1, 30, 6);
  }
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(30,25,20,${Math.random() * 0.25})`; x.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 2 + Math.random() * 6); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Một tháp Chăm: chân đá, thân vuông có trụ áp tường + cửa giả, ba tầng mái thu nhỏ (đã mất chóp)
function chamTower(w, d, h, brick, stone, grass, doorFront = true) {
  const g = new THREE.Group();
  const base = 1.6, bodyH = h * 0.5;
  g.add(box(w + 2.2, base, d + 2.2, stone));
  // thân
  const body = box(w, bodyH, d, brick, 0, base);
  body.userData.solid = true;
  g.add(body);
  // trụ áp tường (pilaster) ở bốn mặt và gờ đỉnh thân
  for (const [sx, sz, len, axis] of [[0, d / 2, w, 'x'], [0, -d / 2, w, 'x'], [w / 2, 0, d, 'z'], [-w / 2, 0, d, 'z']]) {
    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue;
      const off = (k / 2.6) * (len / 2);
      const p = axis === 'x' ? box(0.55, bodyH - 0.6, 0.35, brick, sx + off, base, sz) : box(0.35, bodyH - 0.6, 0.55, brick, sx, base, sz + off);
      g.add(p);
    }
  }
  g.add(box(w + 0.9, 0.7, d + 0.9, stone, 0, base + bodyH - 0.2));
  // cửa giả (mặt bên, sau) và cửa thật có bậc thềm (mặt trước): khung vòm nhọn nổi
  const arch = (sx, sz, rotY, real) => {
    const a = new THREE.Group();
    a.add(box(2.6, bodyH * 0.72, 0.6, brick, 0, base, 0));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 4), brick);
    tip.scale.set(1, 1, 0.25); tip.rotation.y = Math.PI / 4; tip.position.set(0, base + bodyH * 0.72 + 1.5, 0); a.add(tip);
    const hole = box(1.3, bodyH * 0.55, 0.1, real ? new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 1 }) : brick, 0, base, 0.31);
    a.add(hole);
    a.position.set(sx, 0, sz); a.rotation.y = rotY;
    g.add(a);
  };
  arch(0, d / 2 + 0.2, 0, doorFront);
  arch(0, -d / 2 - 0.2, Math.PI, false);
  arch(w / 2 + 0.2, 0, Math.PI / 2, false);
  arch(-w / 2 - 0.2, 0, -Math.PI / 2, false);
  if (doorFront) for (let s = 0; s < 4; s++) g.add(box(2.4, base - s * 0.4, 1.2, stone, 0, 0, d / 2 + 1.4 + s * 0.9));
  // các tầng mái: thu nhỏ dần, mỗi tầng có gờ và tượng góc nhỏ; tầng trên cùng bị vỡ, cỏ mọc
  let y = base + bodyH + 0.5, sw = w * 0.92, sd = d * 0.92;
  const tierH = (h - y) / 3.2;
  for (let t = 0; t < 3; t++) {
    const lastTier = t === 2;
    g.add(box(sw, tierH * (lastTier ? 0.7 : 1), sd, brick, 0, y));
    g.add(box(sw + 0.5, 0.35, sd + 0.5, stone, 0, y + tierH * (lastTier ? 0.7 : 1) - 0.2));
    for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const orn = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 4), lastTier ? brick : stone);
      orn.position.set((cx * sw) / 2, y + tierH + 0.4, (cz * sd) / 2); orn.castShadow = true;
      if (!lastTier) g.add(orn);
    }
    y += tierH * (lastTier ? 0.7 : 1); sw *= 0.78; sd *= 0.78;
  }
  // mảng cỏ mọc trên đỉnh vỡ
  const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), grass);
  tuft.scale.set(sw * 0.6, 0.6, sd * 0.6); tuft.position.y = y + 0.2; g.add(tuft);
  return g;
}

function thapDoi() {
  const g = new THREE.Group();
  const brick = new THREE.MeshStandardMaterial({ map: brickTexture(), roughness: 0.92 });
  brick.map.repeat.set(1.5, 3);
  const stone = new THREE.MeshStandardMaterial({ color: '#8f8a7c', roughness: 0.85 });
  const grassTop = new THREE.MeshStandardMaterial({ color: '#4c7a36', roughness: 1, flatShading: true });
  const lawn = new THREE.MeshStandardMaterial({ color: '#6fa452', roughness: 1 });
  const path = new THREE.MeshStandardMaterial({ color: '#c9b79a', roughness: 0.95 });
  const hedge = new THREE.MeshStandardMaterial({ color: '#3f7a32', roughness: 1 });
  // thảm cỏ và sân đất nện trước tháp
  g.add(box(64, 0.08, 60, lawn, 0, 0, 0));
  g.add(box(30, 0.1, 18, path, 0, 0, 14));
  // tháp Bắc (lớn, phía sau theo trục bắc – nam), tháp Nam (nhỏ hơn)
  const north = chamTower(11.5, 9.8, 25, brick, stone, grassTop); north.position.set(0, 0, -6); g.add(north);
  const south = chamTower(8.8, 7.4, 23, brick, stone, grassTop); south.position.set(-1, 0, 6.2); g.add(south);
  // hàng rào cây cắt tỉa quanh chân tháp
  for (const [w, d, x, z] of [[26, 1, 0, -14], [1, 26, -13, -1], [1, 26, 13, -1]]) g.add(box(w, 0.7, d, hedge, x, 0, z));
  return g;
}

// ======================= Nhà thờ Chính tòa =======================
function cathedral(glow) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.7 });
  const trim = new THREE.MeshStandardMaterial({ color: '#d9d3c7', roughness: 0.7 });
  const roof = new THREE.MeshStandardMaterial({ color: '#9a5a42', roughness: 0.8 });
  const spireMat = new THREE.MeshStandardMaterial({ color: '#d0663e', roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: '#2b3a4f', roughness: 0.2, emissive: '#ffd59a', emissiveIntensity: 0 });
  const gate = new THREE.MeshStandardMaterial({ color: '#9b958a', roughness: 0.9 });
  glow.push([glass, 0.9]);
  // thân nhà thờ dài 60 m (mặt tiền ở lz = +29), cánh ngang ở phía sau
  const L = 58, W = 17, wallH = 11;
  const nave = box(W, wallH, L, white, 0, 0, 0); nave.userData.solid = true; g.add(nave);
  const tr = box(27, wallH, 14, white, 0, 0, -12); tr.userData.solid = true; g.add(tr);
  // mái dốc hai mái (lăng trụ tam giác)
  const gable = (w, len, h, z, rotY = 0) => {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.6, 0), new THREE.Vector2(w / 2 + 0.6, 0), new THREE.Vector2(0, h)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    const m = new THREE.Mesh(geo, roof); m.position.set(0, wallH, z); m.rotation.y = rotY; m.castShadow = true; return m;
  };
  g.add(gable(W, L, 7, 0));
  g.add(gable(14, 27, 6.2, -12, Math.PI / 2));
  // cửa sổ vòm nhọn dọc hai bên
  for (let k = -5; k <= 5; k++) for (const side of [-1, 1]) {
    const win = box(0.15, 5, 1.6, glass, side * (W / 2 + 0.05), 3.5, k * 4.6 + 2);
    g.add(win);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 4), white);
    tip.scale.set(0.12, 1, 1); tip.position.set(side * (W / 2 + 0.08), 9.2, k * 4.6 + 2); g.add(tip);
  }
  // trụ đỡ (bổ tường) giữa các cửa sổ
  for (let k = -6; k <= 6; k++) for (const side of [-1, 1]) g.add(box(0.8, wallH - 1, 1, trim, side * (W / 2 + 0.4), 0, k * 4.6 - 0.3));
  // mặt tiền: tháp chuông giữa cao 42,7 m tính cả chóp
  const fz = L / 2;
  g.add(box(W + 1, 15, 2, white, 0, 0, fz + 0.5));
  const front = gable(W, 1.6, 7.5, fz + 0.6); front.material = white; g.add(front);
  // cửa chính vòm nhọn và cửa sổ hoa hồng tròn
  g.add(box(3.4, 6, 0.3, new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.8 }), 0, 0, fz + 1.6));
  const rose = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), glass); rose.position.set(-5.2, 10, fz + 1.55); g.add(rose);
  const rose2 = rose.clone(); rose2.position.x = 5.2; g.add(rose2);
  // thân tháp: khối vuông 6 m tới 22 m, hai tầng thu nhỏ, mặt đồng hồ, rồi chóp nhọn
  const tw = 6.2;
  g.add(box(tw, 22, tw, white, 0, 0, fz + 0.2));
  g.add(box(tw + 0.6, 0.6, tw + 0.6, trim, 0, 15, fz + 0.2));
  g.add(box(tw + 0.6, 0.6, tw + 0.6, trim, 0, 22, fz + 0.2));
  const clock = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshStandardMaterial({ color: '#f8f6ee', emissive: '#fff3d0', emissiveIntensity: 0 }));
  glow.push([clock.material, 0.8]);
  clock.position.set(0, 19.5, fz + 0.2 + tw / 2 + 0.02); g.add(clock);
  g.add(box(4.8, 5.5, 4.8, white, 0, 22.6, fz + 0.2));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.18, 0.18, 6.2, 6, white, sx * 2.6, 22.6, fz + 0.2 + sz * 2.6));
  g.add(box(3.6, 3.2, 3.6, white, 0, 28.1, fz + 0.2));
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, 11.2, 8), spireMat);
  spire.position.set(0, 31.3 + 5.6, fz + 0.2); spire.castShadow = true; g.add(spire);
  const cross = new THREE.Group();
  cross.add(box(0.15, 1.4, 0.15, new THREE.MeshStandardMaterial({ color: '#c9a64a', metalness: 0.8, roughness: 0.3 })));
  cross.add(box(0.8, 0.15, 0.15, cross.children[0].material, 0, 0.85));
  cross.position.set(0, 42.5, fz + 0.2); g.add(cross);
  // sân trước và cổng, hàng rào trụ đá
  g.add(box(36, 0.08, 34, new THREE.MeshStandardMaterial({ color: '#bfb7aa', roughness: 0.9 }), 0, 0, fz + 18));
  for (const sx of [-1, 1]) { g.add(box(1.6, 3.4, 1.6, gate, sx * 4, 0, fz + 34)); for (let k = 1; k <= 4; k++) g.add(box(0.6, 1.8, 0.6, gate, sx * (4 + k * 3.5), 0, fz + 34)); g.add(box(14, 0.7, 0.4, gate, sx * 11, 0, fz + 34)); }
  return g;
}

// ======================= Chợ Lớn =======================
function market(glow) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: '#d8cfba', roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#8a9196', roughness: 0.55, metalness: 0.4 });
  const awnings = ['#2e8b57', '#2c6fb5', '#c0392b', '#3a9d4a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, side: THREE.DoubleSide }));
  const shade = new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 1 });
  const signMat = new THREE.MeshStandardMaterial({ map: marketSign(), emissiveMap: marketSign(), emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.6 });
  glow.push([signMat, 0.9]);
  // nhà lồng chợ: hai tầng, 46 × 34 m, tầng trên lùi vào, mái tôn hai lớp
  const W = 46, D = 34;
  const hall = box(W, 4.2, D, wall); hall.userData.solid = true; g.add(hall);
  g.add(box(W - 6, 3.6, D - 6, wall, 0, 4.2));
  // dải cửa sổ thông gió tầng hai
  for (const sz of [-1, 1]) g.add(box(W - 8, 1.2, 0.2, shade, 0, 5.4, sz * ((D - 6) / 2 + 0.05)));
  for (const sx of [-1, 1]) g.add(box(0.2, 1.2, D - 8, shade, sx * ((W - 6) / 2 + 0.05), 5.4, 0));
  const roof = (w, d, y, h) => {
    const geo = new THREE.ConeGeometry(Math.hypot(w, d) / 2, h, 4, 1);
    geo.rotateY(Math.PI / 4);
    const m = new THREE.Mesh(geo, roofMat);
    m.scale.set(w / Math.hypot(w, d) * Math.SQRT2, 1, d / Math.hypot(w, d) * Math.SQRT2);
    m.position.y = y + h / 2; m.castShadow = true; return m;
  };
  g.add(roof(W + 2, D + 2, 4.2, 1.4));
  g.add(roof(W - 4, D - 4, 7.8, 2.8));
  // biển tên trên mặt trước
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), signMat);
  sign.position.set(0, 6.2, (D - 6) / 2 + 0.12); g.add(sign);
  // sạp hàng mái bạt quanh chân nhà lồng
  let k = 0;
  for (const [ax, az, len, rot] of [[0, D / 2, W, 0], [0, -D / 2, W, Math.PI], [W / 2, 0, D, Math.PI / 2], [-W / 2, 0, D, -Math.PI / 2]]) {
    for (let s = -len / 2 + 2.5; s < len / 2 - 2; s += 3.2) {
      const mat = awnings[k++ % awnings.length];
      const a = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.4), mat);
      a.rotation.set(-Math.PI / 2 + 0.35, 0, 0);
      const st = new THREE.Group(); st.add(a); a.position.set(0, 2.9, 1.1);
      const goods = box(2.6, 1, 1, new THREE.MeshStandardMaterial({ color: ['#c9a36a', '#e0d4b8', '#9c7c5a', '#d46a4a'][k % 4], roughness: 1 }), 0, 0, 0.8);
      st.add(goods);
      st.position.set(ax + (rot === 0 || rot === Math.PI ? s : 0), 0, az + (rot === 0 || rot === Math.PI ? 0 : s));
      st.rotation.y = rot;
      g.add(st);
    }
  }
  return g;
}
function marketSign() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 120;
  const x = c.getContext('2d');
  x.fillStyle = '#1f4e79'; x.fillRect(0, 0, 768, 120);
  x.strokeStyle = '#ffd23f'; x.lineWidth = 6; x.strokeRect(8, 8, 752, 104);
  x.fillStyle = '#ffd23f'; x.font = 'bold 66px "Be Vietnam Pro", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('CHỢ LỚN QUY NHƠN', 384, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ======================= Ga Quy Nhơn =======================
function station(glow) {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: '#e8c25a', roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: '#f3efe4', roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#a4553c', roughness: 0.85 });
  const glass = new THREE.MeshStandardMaterial({ color: '#33414f', roughness: 0.25, emissive: '#ffe1a8', emissiveIntensity: 0 });
  const rail = new THREE.MeshStandardMaterial({ color: '#6d6a66', roughness: 0.5, metalness: 0.6 });
  const platform = new THREE.MeshStandardMaterial({ color: '#b6b0a5', roughness: 0.9 });
  const signMat = new THREE.MeshStandardMaterial({ map: stationSign(), emissiveMap: stationSign(), emissive: '#ffffff', emissiveIntensity: 0 });
  glow.push([glass, 0.7], [signMat, 0.9]);
  // nhà ga dài 34 m, sâu 11 m, hai tầng; khối giữa cao hơn có đầu hồi và đồng hồ
  const main = box(34, 7, 11, yellow); main.userData.solid = true; g.add(main);
  g.add(box(10, 10.5, 12, yellow, 0, 0, 0.5));
  g.add(box(34.6, 0.4, 11.6, white, 0, 3.4));
  g.add(box(34.6, 0.4, 11.6, white, 0, 7));
  const pitched = (w, d, y, h) => {
    const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2); geo.rotateY(Math.PI / 2);
    const m = new THREE.Mesh(geo, roofMat); m.position.y = y; m.castShadow = true; return m;
  };
  g.add(pitched(35, 12, 7.2, 2.6));
  const front = new THREE.Shape([new THREE.Vector2(-5.5, 0), new THREE.Vector2(5.5, 0), new THREE.Vector2(0, 3.6)]);
  const fg = new THREE.Mesh(new THREE.ExtrudeGeometry(front, { depth: 0.6, bevelEnabled: false }), yellow);
  fg.position.set(0, 10.5, 6.2); g.add(fg);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshStandardMaterial({ color: '#fbf8ef', emissive: '#fff3d0', emissiveIntensity: 0 }));
  glow.push([clock.material, 0.8]);
  clock.position.set(0, 11.8, 6.85); g.add(clock);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.3), signMat); sign.position.set(0, 8.2, 6.55); g.add(sign);
  // cửa sổ, cửa vòm hai tầng
  for (let k = -7; k <= 7; k++) {
    if (Math.abs(k) <= 1) continue;
    g.add(box(1.4, 2.2, 0.1, glass, k * 2.2, 0.6, 5.55));
    g.add(box(1.2, 1.8, 0.1, glass, k * 2.2, 4.4, 5.55));
  }
  for (const dx of [-2.6, 0, 2.6]) g.add(box(2, 3.4, 0.1, glass, dx, 0, 6.55));
  // mái hiên trước cửa chính
  g.add(box(12, 0.25, 3.4, white, 0, 3.6, 7.8));
  // sân ga phía sau và đường ray (ga cuối tuyến nhánh)
  g.add(box(80, 0.6, 6, platform, -20, 0, -9));
  for (const tz of [-15, -20]) for (const off of [-0.72, 0.72]) g.add(box(90, 0.18, 0.12, rail, -22, 0.15, tz + off));
  g.add(box(70, 0.25, 0.1, white, -25, 3.8, -9)); // mái che sân ga (giản lược)
  for (let k = -10; k <= 5; k++) g.add(cyl(0.12, 0.12, 3.8, 6, rail, k * 4.5, 0, -11.5));
  g.add(box(70, 0.15, 5, roofMat, -25, 3.9, -9));
  return g;
}
function stationSign() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 100;
  const x = c.getContext('2d');
  x.fillStyle = '#f7f3e8'; x.fillRect(0, 0, 640, 100);
  x.fillStyle = '#b3242a'; x.font = 'bold 64px "Be Vietnam Pro", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('GA QUY NHƠN', 320, 54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ======================= Mộ Hàn Mặc Tử =======================
function tomb(glow) {
  const g = new THREE.Group();
  const granite = new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.75 });
  const white = new THREE.MeshStandardMaterial({ color: '#efede6', roughness: 0.6 });
  const paving = new THREE.MeshStandardMaterial({ color: '#a9a69c', roughness: 0.95 });
  const blue = new THREE.MeshStandardMaterial({ color: '#4f86b8', roughness: 0.5, metalness: 0.3 });
  const globe = new THREE.MeshStandardMaterial({ color: '#f6f3ea', emissive: '#ffe7b8', emissiveIntensity: 0 });
  const plaque = new THREE.MeshStandardMaterial({ color: '#4a4e52', roughness: 0.4 });
  const flowers = ['#e8c02a', '#c7354e', '#b13c6a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  glow.push([globe, 2.5]);
  // sân lát đá trên đỉnh đồi
  g.add(box(30, 0.6, 26, paving, 0, -0.4, 0));
  // nền ba bậc
  for (let s = 0; s < 3; s++) g.add(box(9 - s * 1.6, 0.45, 7 - s * 1.4, granite, 0, 0.2 + s * 0.45, 0));
  // mộ và bia đá trắng: khối bia cao, mái nhọn, tượng thánh giá trên đỉnh
  const stele = box(1.8, 3.6, 1.2, white, 0, 1.55, -0.6); stele.userData.solid = true; g.add(stele);
  g.add(box(2.4, 0.5, 1.8, white, 0, 1.55, -0.6));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 4), white); cap.rotation.y = Math.PI / 4; cap.position.set(0, 5.55, -0.6); g.add(cap);
  g.add(box(0.18, 1.3, 0.18, white, 0, 5.8, -0.6));
  g.add(box(0.75, 0.18, 0.18, white, 0, 6.6, -0.6));
  g.add(box(1.2, 1.4, 0.06, plaque, 0, 2.6, 0.03));
  g.add(box(3.2, 0.5, 2.2, white, 0, 1.55, 1.2)); // nắp mộ
  // đèn trụ xanh hai bóng tròn
  for (const sx of [-1, 1]) {
    const lamp = new THREE.Group();
    lamp.add(cyl(0.08, 0.12, 3.8, 8, blue));
    lamp.add(box(1.1, 0.06, 0.06, blue, 0, 3.6));
    for (const dx of [-0.5, 0.5]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), globe); b.position.set(dx, 3.95, 0); lamp.add(b); }
    lamp.position.set(sx * 6, 0, 4); g.add(lamp);
  }
  // bồn hoa vàng, đỏ quanh sân
  const bush = new THREE.IcosahedronGeometry(0.7, 0);
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2, r = 11 + (k % 3);
    const m = new THREE.Mesh(bush, flowers[k % 3]);
    m.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r * 0.85); m.scale.set(1.3, 0.7, 1.1); g.add(m);
  }
  // bậc thang đá đi xuống về phía biển
  for (let s = 0; s < 12; s++) g.add(box(3, 0.3, 1, granite, 0, -0.4 - s * 0.3, 13.5 + s));
  return g;
}
