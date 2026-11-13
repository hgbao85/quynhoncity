// Các công trình nổi bật dựng tay theo ảnh vệ tinh, Street View và số liệu báo chí:
//   - Tháp Đôi: hai tháp Chăm gạch đỏ (tháp Bắc ~25 m lớn hơn, tháp Nam ~23 m), cửa quay về nam,
//     thân vuông có trụ áp tường và cửa giả vòm nhọn, mái nhiều tầng thu nhỏ đã mất chóp, chân đá
//   - Nhà thờ Chính tòa (Nhà thờ Nhọn): tường trắng mái ngói đỏ, tháp chuông nhiều tầng mọc từ
//     mặt đất giữa mặt tiền, cao 42,7 m với chóp nhọn cam đỏ, quay ra đường Trần Hưng Đạo (phía nam)
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
// tiers: số tầng mái; shrink: mỗi tầng hẹp lại bao nhiêu (ảnh thật: tầng mái gần bằng thân, bè và nặng)
function chamTower(w, d, h, brick, stone, grass, doorFront = true, tiers = 3, shrink = 0.88) {
  const g = new THREE.Group();
  const base = 1.2, bodyH = h * 0.52;
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
  let y = base + bodyH + 0.5, sw = w * 0.96, sd = d * 0.96;
  const tierH = (h - y) / (tiers - 0.3);
  // mỗi tầng là một khối vát (đáy rộng, đỉnh hẹp lại) để mái bè và thu nhỏ đều như ảnh,
  // gờ đá mảnh và tượng góc nhỏ ở chân tầng
  const frustum = (w0, d0, k, hh, yy, mat) => {
    const geo = new THREE.CylinderGeometry(k * Math.SQRT1_2, Math.SQRT1_2, hh, 4, 1);
    geo.rotateY(Math.PI / 4);
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(w0, 1, d0); m.position.y = yy + hh / 2; m.castShadow = m.receiveShadow = true;
    return m;
  };
  for (let t = 0; t < tiers; t++) {
    const lastTier = t === tiers - 1, th = tierH * (lastTier ? 0.75 : 1);
    g.add(frustum(sw, sd, shrink, th, y, brick));
    g.add(box(sw + 0.4, 0.3, sd + 0.4, stone, 0, y));
    if (!lastTier) {
      for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const orn = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 4), stone);
        orn.position.set((cx * sw) / 2, y + 0.85, (cz * sd) / 2); orn.castShadow = true;
        g.add(orn);
      }
    }
    y += th; sw *= shrink; sd *= shrink;
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
  // Tỉ lệ theo ảnh chụp (Wikimedia): tháp Bắc rộng ≈ 0,5 chiều cao, tháp Nam là khối thấp bè
  // còn một tầng mái lớn bị cụt. Kích thước chân lấy từ footprint ảnh vệ tinh.
  // Hệ local ở đây: +z = đông (mặt có cửa), +x = bắc. Theo footprint ảnh vệ tinh, tâm hai tháp
  // cách nhau ~12 m theo hướng bắc – nam; tháp Bắc chân ~10 × 11 m, tháp Nam ~7,5 × 8,5 m.
  const north = chamTower(10, 10.5, 21, brick, stone, grassTop, true, 3, 0.88); north.position.set(6, 0, 0); g.add(north);
  // tháp Nam: thân thấp hơn, phần mái còn lại là một khối lớn bè, đỉnh cụt bằng
  const south = chamTower(7.5, 8.5, 16, brick, stone, grassTop, false, 2, 0.92); south.position.set(-6.2, 0, 0.6); g.add(south);
  // hàng rào cây cắt tỉa thấp quanh chân tháp (mở ra phía đông)
  for (const [w, d, x, z] of [[1, 24, -14, 0], [28, 1, 0, -12], [28, 1, 0, 12]]) g.add(box(w, 0.6, d, hedge, x, 0, z));
  return g;
}

// ======================= Nhà thờ Chính tòa =======================
// Theo ảnh Street View chụp thẳng mặt tiền (2017, 2026):
//   - tháp chuông mọc thẳng từ mặt đất ở giữa mặt tiền, các góc có trụ bổ tường, thu nhỏ dần:
//     tầng cổng (cửa vòm có khung nhô ra) → tầng tranh ghép lớn → huy hiệu tròn → cửa sổ đôi
//     → tầng chuông có cửa chớp → tầng đồng hồ (4 mặt) → tầng đèn lồng → chóp nhọn cam đỏ, thánh giá
//   - hai cánh thấp hai bên mặt tiền: đầu hồi nhỏ, cửa sổ tròn, ba cửa sổ vòm ở dưới
//   - tường trắng, gờ xám nhạt, mái ngói đỏ; thân nhà thờ dài ~58 m, có cánh ngang ở phía sau
//   - tổng chiều cao 42,7 m (VnExpress)
function cathedral(glow) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#eeede8', roughness: 0.7 });
  const trim = new THREE.MeshStandardMaterial({ color: '#c8ccd0', roughness: 0.7 });
  const tile = new THREE.MeshStandardMaterial({ color: '#b4513a', roughness: 0.8 });
  const spireMat = new THREE.MeshStandardMaterial({ color: '#c75c37', roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: '#2b3a4f', roughness: 0.2, emissive: '#ffd59a', emissiveIntensity: 0 });
  const wood = new THREE.MeshStandardMaterial({ color: '#5e3a26', roughness: 0.8 });
  const louver = new THREE.MeshStandardMaterial({ map: louverTexture(), roughness: 0.8 });
  const mosaic = new THREE.MeshStandardMaterial({ map: mosaicTexture(), roughness: 0.6, emissiveMap: null });
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a64a', metalness: 0.8, roughness: 0.3 });
  const gate = new THREE.MeshStandardMaterial({ color: '#9b958a', roughness: 0.9 });
  const step = new THREE.MeshStandardMaterial({ color: '#9c5a4a', roughness: 0.8 });
  glow.push([glass, 0.9]);

  const L = 58, W = 17, wallH = 9.5, fz = L / 2; // mặt tiền ở lz = fz
  // ---- thân nhà thờ, cánh ngang, mái ngói ----
  const nave = box(W, wallH, L, white, 0, 0, 0); nave.userData.solid = true; g.add(nave);
  const tr = box(27, wallH, 14, white, 0, 0, -14); tr.userData.solid = true; g.add(tr);
  const gableRoof = (w, len, h, y, z, rotY, mat, over = 0.7) => {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2 - over, 0), new THREE.Vector2(w / 2 + over, 0), new THREE.Vector2(0, h)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    const m = new THREE.Mesh(geo, mat); m.position.set(0, y, z); m.rotation.y = rotY; m.castShadow = m.receiveShadow = true; return m;
  };
  g.add(gableRoof(W, L - 1, 6.5, wallH, -0.5, 0, tile));
  g.add(gableRoof(14, 27, 6, wallH, -14, Math.PI / 2, tile));
  // cửa sổ vòm dọc hai bên và trụ bổ tường
  const archWin = (x, y, z, w, h, rotY, depthAxis = 'x') => {
    const gw = new THREE.Group();
    gw.add(box(w, h, 0.12, glass));
    const tip = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 12, 0, Math.PI), glass);
    tip.position.y = h; gw.add(tip);
    gw.position.set(x, y, z); gw.rotation.y = rotY;
    g.add(gw);
    void depthAxis;
  };
  for (let k = -5; k <= 4; k++) for (const side of [-1, 1]) {
    archWin(side * (W / 2 + 0.07), 2.8, k * 5 + 1.5, 1.5, 3.8, side * Math.PI / 2);
    g.add(box(0.7, wallH - 0.6, 0.9, trim, side * (W / 2 + 0.35), 0, k * 5 - 1));
  }
  g.add(box(W + 0.6, 0.45, L, trim, 0, wallH - 0.45, 0)); // gờ mái

  // ---- mặt tiền: hai cánh thấp hai bên tháp ----
  const towerW = 7.6, sideW = (W - towerW) / 2;
  for (const s of [-1, 1]) {
    const cx = s * (towerW / 2 + sideW / 2);
    g.add(box(sideW, 9, 1.4, white, cx, 0, fz + 0.3));
    // đầu hồi nhỏ ở mép trên, mái ngói nhô sau đầu hồi
    const gab = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-sideW / 2, 0), new THREE.Vector2(sideW / 2, 0), new THREE.Vector2(0, 1.6)]), { depth: 1.4, bevelEnabled: false }), white);
    gab.position.set(cx, 9, fz - 0.4); g.add(gab);
    g.add(box(sideW + 0.3, 0.3, 1.6, trim, cx, 8.9, fz + 0.3));
    // cửa sổ tròn và ba cửa sổ vòm
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 20), trim); ring.position.set(cx, 7.3, fz + 1.02); g.add(ring);
    const oc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), glass); oc.position.set(cx, 7.3, fz + 1.01); g.add(oc);
    for (const dx of [-0.95, 0, 0.95]) archWin(cx + dx, 1.4, fz + 1.02, 0.75, 2.6, 0);
    g.add(box(sideW - 0.6, 0.25, 0.3, trim, cx, 1.2, fz + 1.1));
    // trụ góc ngoài
    g.add(box(0.6, 9.4, 1.8, trim, s * (W / 2 - 0.1), 0, fz + 0.3));
  }

  // ---- tháp chuông ----
  const tz = fz + 0.9; // mặt trước tháp nhô ra trước hai cánh
  const stage = (w, d, y0, h, mat = white) => { const m = box(w, h, d, mat, 0, y0, tz - d / 2 + 1.2); m.userData.solid = true; g.add(m); return m; };
  const band = (w, d, y) => g.add(box(w + 0.5, 0.35, d + 0.5, trim, 0, y, tz - d / 2 + 1.2));
  const pilasters = (w, d, y0, h) => { for (const s of [-1, 1]) g.add(box(0.7, h, 0.7, trim, s * (w / 2 - 0.1), y0, tz + 1.15)); void d; };
  // tầng 1–2: thân rộng 7,6 m từ đất lên 17 m, chứa cổng, tranh ghép, huy hiệu
  stage(towerW, 7, 0, 17); pilasters(towerW, 7, 0, 17); band(towerW, 7, 8.6); band(towerW, 7, 17);
  // khung cổng nhô ra: cửa gỗ vòm, mái hiên nhỏ
  g.add(box(4.6, 6.8, 1.1, white, 0, 0, tz + 1.6));
  g.add(box(2.4, 4.4, 0.1, wood, 0, 0.3, tz + 2.17));
  const doorArch = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16, 0, Math.PI), wood); doorArch.position.set(0, 4.7, tz + 2.17); g.add(doorArch);
  const portalArch = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.65, 20, 1, 0, Math.PI), trim); portalArch.position.set(0, 4.7, tz + 2.18); g.add(portalArch);
  g.add(box(5.2, 0.35, 1.4, trim, 0, 6.8, tz + 1.6));
  // tranh ghép lớn trên cổng, băng rôn xanh bên dưới
  const mo = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 5.4), mosaic); mo.position.set(0, 12.1, tz + 1.21); g.add(mo);
  g.add(box(5.4, 0.7, 0.08, new THREE.MeshStandardMaterial({ color: '#2a78c8', roughness: 0.6 }), 0, 8.95, tz + 1.24));
  // huy hiệu tròn phía trên tranh
  const med = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 24), trim); med.rotation.x = Math.PI / 2; med.position.set(0, 15.8, tz + 1.3); g.add(med);
  // các tầng trên thu nhỏ dần; tâm các tầng thẳng hàng với nhau (cz)
  const four = [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]];
  const centerZ = (d) => tz - d / 2 + 1.2;
  // tầng 3: thu vào 5,4 m, thánh giá nổi (17 → 21,2)
  stage(5.4, 5.4, 17, 4.2); pilasters(5.4, 5.4, 17, 4.2); band(5.4, 5.4, 21.2);
  g.add(box(0.35, 2.4, 0.15, trim, 0, 18, centerZ(5.4) + 2.75));
  g.add(box(1.6, 0.35, 0.15, trim, 0, 19.6, centerZ(5.4) + 2.75));
  // tầng 4: tầng chuông có cửa chớp (21,2 → 26,2)
  const w4 = 4.4;
  stage(w4, w4, 21.2, 5); pilasters(w4, w4, 21.2, 5); band(w4, w4, 26.2);
  for (const [rx, rz, ry] of four) {
    const lv = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.4), louver);
    lv.position.set(rx * (w4 / 2 + 0.02), 23.4, centerZ(w4) + rz * (w4 / 2 + 0.02)); lv.rotation.y = ry; g.add(lv);
  }
  // tầng 5: đồng hồ bốn mặt (26,2 → 29,2)
  const w5 = 4;
  stage(w5, w5, 26.5, 2.8); band(w5, w5, 29.3);
  const clockMat = new THREE.MeshStandardMaterial({ map: clockTexture(), emissive: '#fff3d0', emissiveIntensity: 0, roughness: 0.4 });
  glow.push([clockMat, 0.8]);
  for (const [rx, rz, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(1.1, 28), clockMat);
    c.position.set(rx * (w5 / 2 + 0.02), 27.9, centerZ(w5) + rz * (w5 / 2 + 0.02)); c.rotation.y = ry; g.add(c);
  }
  // tầng 6: đèn lồng nhỏ có cửa vòm (29,6 → 31,4)
  const w6 = 3.1;
  stage(w6, w6, 29.65, 1.8);
  for (const [rx, rz, ry] of four) {
    for (const d of [-0.55, 0.55]) {
      const w = new THREE.Group(); w.add(box(0.4, 1, 0.06, glass));
      w.position.set(rx * (w6 / 2 + 0.03) + (rz ? d : 0), 29.95, centerZ(w6) + rz * (w6 / 2 + 0.03) + (rx ? d : 0)); w.rotation.y = ry; g.add(w);
    }
  }
  band(w6, w6, 31.45);
  // chóp nhọn bốn mặt cao, thanh mảnh, màu cam đỏ; thánh giá vàng ở đỉnh (tổng cao 42,7 m)
  const spire = new THREE.Mesh(new THREE.ConeGeometry(w6 * 0.58, 10.3, 4), spireMat);
  spire.rotation.y = Math.PI / 4; spire.position.set(0, 31.8 + 5.15, centerZ(w6)); spire.castShadow = true; g.add(spire);
  const cross = new THREE.Group();
  cross.add(box(0.12, 1, 0.12, gold)); cross.add(box(0.55, 0.12, 0.12, gold, 0, 0.6));
  cross.position.set(0, 42, centerZ(w6)); g.add(cross);

  // ---- bậc thềm, sân trước lát đá, cổng và hàng rào ----
  for (let s = 0; s < 3; s++) g.add(box(W + 2 - s * 0.6, 0.18 * (3 - s), 1.2, step, 0, 0, fz + 2.8 + (2 - s) * 1.1));
  g.add(box(44, 0.06, 36, new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 0.9 }), 0, 0, fz + 20));
  for (const sx of [-1, 1]) {
    g.add(box(1.6, 3.4, 1.6, gate, sx * 4, 0, fz + 36));
    for (let k = 1; k <= 5; k++) g.add(box(0.6, 2, 0.6, gate, sx * (4 + k * 3.4), 0, fz + 36));
    g.add(box(17, 0.9, 0.5, gate, sx * 12.5, 0, fz + 36));
  }
  // bụi cây cắt tỉa tròn hai bên sân
  const topiary = new THREE.MeshStandardMaterial({ color: '#3f7a32', roughness: 1, flatShading: true });
  for (const sx of [-1, 1]) for (const zz of [6, 14, 22]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), topiary); b.scale.set(1.3, 0.8, 1.3); b.position.set(sx * 13, 1.6, fz + zz); g.add(b); g.add(cyl(0.15, 0.2, 1, 6, new THREE.MeshStandardMaterial({ color: '#6b5640' }), sx * 13, 0, fz + zz)); }
  return g;
}
function louverTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#e8e6e0'; x.fillRect(0, 0, 64, 128);
  x.fillStyle = '#3a3f46'; x.fillRect(8, 20, 48, 104);
  x.beginPath(); x.arc(32, 22, 24, Math.PI, 0); x.fill();
  x.fillStyle = '#c9ccd0'; for (let y = 24; y < 124; y += 8) x.fillRect(8, y, 48, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function clockTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#f7f5ee'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  x.strokeStyle = '#3b3b3b'; x.lineWidth = 5; x.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.fillStyle = '#3b3b3b'; x.fillRect(64 + Math.sin(a) * 48 - 2, 64 - Math.cos(a) * 48 - 5, 4, 10); }
  x.lineWidth = 5; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 28); x.stroke();
  x.lineWidth = 6; x.beginPath(); x.moveTo(64, 64); x.lineTo(92, 74); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Tranh ghép trên mặt tiền: vẽ giản lược (nền trời xanh, người đứng giữa áo trắng choàng đỏ,
// hai bên là các nhân vật), không sao chép chi tiết tác phẩm gốc
function mosaicTexture() {
  const c = document.createElement('canvas'); c.width = 240; c.height = 270;
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 270); sky.addColorStop(0, '#8fc3e8'); sky.addColorStop(1, '#d9ecf5');
  x.fillStyle = sky; x.fillRect(0, 0, 240, 270);
  x.strokeStyle = '#c9a64a'; x.lineWidth = 8; x.strokeRect(4, 4, 232, 262);
  const fig = (cx, top, h, robe, cape) => {
    x.fillStyle = robe; x.beginPath(); x.moveTo(cx - h * 0.18, top + h); x.lineTo(cx - h * 0.1, top + h * 0.25); x.lineTo(cx + h * 0.1, top + h * 0.25); x.lineTo(cx + h * 0.18, top + h); x.fill();
    if (cape) { x.fillStyle = cape; x.beginPath(); x.moveTo(cx - h * 0.12, top + h * 0.27); x.lineTo(cx - h * 0.24, top + h * 0.95); x.lineTo(cx - h * 0.05, top + h * 0.6); x.fill(); }
    x.fillStyle = '#e7c3a0'; x.beginPath(); x.arc(cx, top + h * 0.15, h * 0.09, 0, 7); x.fill();
  };
  fig(120, 20, 170, '#f3f0e8', '#c0392b');
  fig(55, 120, 130, '#2c3e70', null); fig(90, 140, 120, '#a83232', null);
  fig(155, 140, 120, '#e3b23c', null); fig(190, 125, 130, '#3d6b45', null);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
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
