// Các công trình nổi bật dựng tay theo ảnh vệ tinh, Street View và số liệu báo chí:
//   - Tháp Đôi: hai tháp Chăm gạch đỏ (tháp Bắc ~25 m lớn hơn, tháp Nam ~23 m), cửa quay về nam,
//     thân vuông có trụ áp tường và cửa giả vòm nhọn, mái nhiều tầng thu nhỏ đã mất chóp, chân đá
//   - Nhà thờ Chính tòa (Nhà thờ Nhọn): tường trắng mái ngói đỏ, tháp chuông nhiều tầng mọc từ
//     mặt đất giữa mặt tiền, cao 42,7 m với chóp nhọn cam đỏ, quay ra đường Trần Hưng Đạo (phía nam)
//   - Chợ Lớn: nhà lồng chợ hai tầng mái tôn, vòng quanh là sạp hàng mái bạt xanh, biển hiệu
//   - Ga Quy Nhơn: nhà ga hai tầng sơn vàng, khối giữa có đầu hồi và đồng hồ (ước lượng, chưa có ảnh)
//   - Chùa Long Khánh: cụm nhà mái ngói đỏ đầu đao cong, cổng tam quan, lầu chuông (theo Street View)
//   - Tượng đài Quang Trung: tượng đồng cưỡi ngựa chồm giơ gươm trên bệ tròn giữa vòng xoay
//   - Mộ Hàn Mặc Tử: nền đá ba bậc, bia đá trắng có tượng, đèn trụ xanh, lối lát đá, bồn hoa
// Mỗi công trình đặt theo độ cao địa hình và chặn đường đi trên lưới va chạm.
import * as THREE from 'three';
import { BUILDING } from './geo.js';
import { heightAt } from './terrain.js';
import { LANDMARKS, siteToWorld } from './landmark-sites.js';

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; };
const cyl = (r0, r1, h, seg, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = true; return m; };

// độ cao đặt công trình: điểm thấp nhất trong vùng ±10 m quanh tâm
function baseHeight(l) {
  let y = 1e9;
  for (let lx = -10; lx <= 10; lx += 5) for (let lz = -10; lz <= 10; lz += 5) y = Math.min(y, heightAt(...siteToWorld(l, lx, lz)));
  return y;
}

export function createLandmarks(scene, grid) {
  const glow = []; // vật liệu sáng ban đêm: [mat, cường độ]
  const all = new THREE.Group();
  const builders = { thapdoi: thapDoi, cathedral, market, station, hanmactu: tomb, longkhanh: pagoda, quangtrung: quangTrung, hoanghau: queenBeach };
  for (const l of LANDMARKS) {
    const g = builders[l.id](glow, l);
    // đặt theo độ cao thấp nhất trong khuôn viên để chân công trình không lơ lửng
    g.position.set(l.x, baseHeight(l), l.z);
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

// ======================= Chùa Long Khánh =======================
// Theo ảnh Street View (2017) và ảnh vệ tinh: cụm nhà mái ngói đỏ hai tầng mái, đầu đao cong vút;
// cổng tam quan ba lối biển "LONG KHÁNH" chữ vàng trên nền đỏ; lầu chuông vuông hai tầng mái tường
// đá chân, cửa vòm; sư tử đá vàng; sân lát đá có cây cổ thụ. Hệ local: +z = phía cổng (đông nam).
function vnRoof(w, d, h, mat, ridgeMat) {
  // mái hai dốc có bờ nóc và bốn đầu đao cong lên ở góc
  const g = new THREE.Group();
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2); geo.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(geo, mat); roof.castShadow = true; g.add(roof);
  g.add(box(0.5, 0.45, w * 0.98, ridgeMat, 0, h - 0.1, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.6, 6), ridgeMat);
    tip.position.set(sz * (d / 2 + 0.2), 0.6, sx * (w / 2 + 0.2));
    tip.rotation.set(sx * 0.9, 0, -sz * 0.9);
    g.add(tip);
  }
  // hình rồng/lưỡng long chầu nguyệt giản lược trên bờ nóc
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshStandardMaterial({ color: '#d9a43a', metalness: 0.5, roughness: 0.4 }));
  pearl.position.set(0, h + 0.55, 0); g.add(pearl);
  return g;
}
function pagodaHall(w, d, wallH, wall, roofMat, ridge, wood, twoTier = true) {
  const g = new THREE.Group();
  const body = box(w, wallH, d, wall); body.userData.solid = true; g.add(body);
  // hiên trước với hàng cột đỏ
  for (let k = -2; k <= 2; k++) g.add(cyl(0.22, 0.22, wallH, 10, wood, (k * w) / 5.2, 0, d / 2 + 1.6));
  g.add(box(w + 0.4, 0.3, 3.6, new THREE.MeshStandardMaterial({ color: '#b9ad9a', roughness: 0.9 }), 0, 0, d / 2 + 0.8));
  // mái dưới bao cả hiên, mái trên nhỏ hơn
  const r1 = vnRoof(d + 4, w + 1.6, 2.4, roofMat, ridge); r1.position.set(0, wallH, 0.8); g.add(r1);
  if (twoTier) {
    g.add(box(w * 0.7, 1.4, d * 0.6, wall, 0, wallH + 1.4, 0));
    const r2 = vnRoof(d * 0.6 + 2.4, w * 0.7 + 1.2, 2.2, roofMat, ridge); r2.position.set(0, wallH + 2.8, 0); g.add(r2);
  }
  return g;
}
function pagoda(glow) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: '#efd88c', roughness: 0.85 });
  const tile = new THREE.MeshStandardMaterial({ color: '#b5502f', roughness: 0.8 });
  const ridge = new THREE.MeshStandardMaterial({ color: '#7d3a22', roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: '#b3282d', roughness: 0.6 });
  const stone = new THREE.MeshStandardMaterial({ color: '#8c8576', roughness: 0.9 });
  const paving = new THREE.MeshStandardMaterial({ color: '#c8c1b4', roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b648', metalness: 0.4, roughness: 0.4 });
  const signMat = new THREE.MeshStandardMaterial({ map: pagodaSign(), emissiveMap: pagodaSign(), emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.6 });
  const lantern = new THREE.MeshStandardMaterial({ color: '#d33', emissive: '#ff6a3a', emissiveIntensity: 0 });
  glow.push([signMat, 0.8], [lantern, 2.2]);
  // sân lát đá
  g.add(box(64, 0.08, 96, paving, 0, 0, 4));
  // chánh điện (sau cùng) và hai dãy nhà hai bên tạo thành hình chữ khẩu
  const main = pagodaHall(24, 16, 6.5, wall, tile, ridge, red, true); main.position.set(0, 0, -30); g.add(main);
  const back = pagodaHall(22, 12, 5.5, wall, tile, ridge, red, false); back.position.set(0, 0, -48); g.add(back);
  for (const sx of [-1, 1]) { const side = pagodaHall(10, 26, 4.8, wall, tile, ridge, red, false); side.rotation.y = sx * Math.PI / 2; side.position.set(sx * 19, 0, -38); g.add(side); }
  // lầu chuông: chân đá, tầng trên tường vàng, hai tầng mái
  const bell = new THREE.Group();
  const bb = box(6, 3.4, 6, stone); bb.userData.solid = true; bell.add(bb);
  bell.add(box(5, 3.2, 5, wall, 0, 3.4));
  const br1 = vnRoof(7.4, 7.4, 1.4, tile, ridge); br1.position.y = 3.4; bell.add(br1);
  const br2 = vnRoof(6, 6, 2, tile, ridge); br2.position.y = 6.6; bell.add(br2);
  bell.position.set(-12, 0, 8); g.add(bell);
  // cổng tam quan: ba lối, biển tên chữ vàng nền đỏ, mái ngói
  const gate = new THREE.Group();
  for (const x of [-6.5, -2.4, 2.4, 6.5]) { const p = box(1.2, 5.2, 1.2, red, x, 0, 0); p.userData.solid = Math.abs(x) > 3; gate.add(p); }
  gate.add(box(14.5, 1.3, 1.6, red, 0, 5.2, 0));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.1), signMat); sign.position.set(0, 5.85, 0.82); gate.add(sign);
  const gr = vnRoof(3.2, 15.5, 1.6, tile, ridge); gr.position.y = 6.5; gate.add(gr);
  gate.position.set(0, 0, 46); g.add(gate);
  // sư tử đá vàng hai bên bậc chánh điện
  for (const sx of [-1, 1]) {
    const lion = new THREE.Group();
    lion.add(box(1, 0.6, 1, stone)); lion.add(box(0.7, 0.9, 0.9, gold, 0, 0.6)); const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), gold); head.position.set(0, 1.85, 0.2); lion.add(head);
    lion.position.set(sx * 6, 0, -19); g.add(lion);
  }
  // cây cổ thụ trong sân và đèn lồng đỏ dọc lối vào
  const trunk = new THREE.MeshStandardMaterial({ color: '#6e5a45', roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: '#3b6f30', roughness: 1, flatShading: true });
  for (const [x, z, s] of [[14, 6, 1.4], [-18, 26, 1.2], [16, 28, 1.3], [-20, -6, 1]]) {
    g.add(cyl(0.45 * s, 0.6 * s, 5 * s, 7, trunk, x, 0, z));
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2 * s, 1), leaf); c.position.set(x, 6.5 * s, z); c.castShadow = true; g.add(c);
  }
  for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), lantern); l.scale.y = 1.3; l.position.set(sx * 4, 2.6, 40 - k * 9); g.add(l); g.add(cyl(0.05, 0.05, 2.4, 5, ridge, sx * 4, 0, 40 - k * 9)); }
  return g;
}
function pagodaSign() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 88;
  const x = c.getContext('2d');
  x.fillStyle = '#b3282d'; x.fillRect(0, 0, 512, 88);
  x.strokeStyle = '#e8c45a'; x.lineWidth = 5; x.strokeRect(6, 6, 500, 76);
  x.fillStyle = '#f2cf5c'; x.font = 'bold 50px "Be Vietnam Pro", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('LONG KHÁNH', 256, 47);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ======================= Tượng đài Quang Trung =======================
// Theo ảnh Street View (2024) và ảnh vệ tinh: giữa vòng xoay là bệ đá xám hình trụ có biển đồng,
// trên là tượng đồng vua Quang Trung cưỡi ngựa chồm hai chân trước, tay phải giơ cao thanh gươm;
// quanh bệ là vòng vòi phun nước, sân đá sẫm, bồn hoa đỏ và viền vàng.
// Hệ local: +z = hướng ngựa nhìn.
function quangTrung(glow) {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: '#5b4a36', roughness: 0.45, metalness: 0.7 });
  const granite = new THREE.MeshStandardMaterial({ color: '#8f8e8a', roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: '#4c4d50', roughness: 0.8 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#d8c38a', roughness: 0.9 });
  const flowers = new THREE.MeshStandardMaterial({ color: '#c8323a', roughness: 1, flatShading: true });
  const water = new THREE.MeshStandardMaterial({ color: '#d9ecf5', transparent: true, opacity: 0.55, emissive: '#bfe3ff', emissiveIntensity: 0, roughness: 0.1 });
  const plaque = new THREE.MeshStandardMaterial({ color: '#8d6a3a', metalness: 0.7, roughness: 0.4 });
  glow.push([water, 1.2]);
  const disc = (r0, r1, h, mat, y = 0, seg = 64) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), mat); m.position.y = y + h / 2; m.receiveShadow = true; g.add(m); return m; };
  disc(33, 33, 0.18, yellow); // viền vàng
  disc(27, 27, 0.22, dark); // sân đá sẫm
  // bồn hoa đỏ vòng ngoài (cung đứt đoạn)
  for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; if (k % 7 === 0) continue; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), flowers); b.scale.set(1.6, 0.5, 1.6); b.position.set(Math.cos(a) * 22, 0.4, Math.sin(a) * 22); g.add(b); }
  // bậc cấp và bể phun nước
  disc(12, 11.6, 0.6, granite, 0.2);
  const pool = disc(10, 10, 0.5, new THREE.MeshStandardMaterial({ color: '#2f5c6e', roughness: 0.2, metalness: 0.3 }), 0.8);
  void pool;
  for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.6, 6), water); j.position.set(Math.cos(a) * 8.6, 2.1, Math.sin(a) * 8.6); g.add(j); }
  // bệ trụ tròn hai tầng, biển đồng phía trước
  const ped = disc(4.6, 4.2, 6.5, granite, 1.3); ped.userData.solid = true;
  disc(4.9, 4.9, 0.5, granite, 1.3);
  disc(4.5, 4.5, 0.4, granite, 7.8);
  const pl = box(2.4, 1.6, 0.1, plaque, 0, 4, 4.32); g.add(pl);
  // tượng ngựa chồm và người cưỡi (khối giản lược)
  const st = new THREE.Group(); st.position.y = 8.2; g.add(st);
  const horse = new THREE.Group(); horse.rotation.x = -0.55; horse.position.set(0, 1.4, -0.6); st.add(horse);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 2.2, 6, 12), bronze); body.rotation.x = Math.PI / 2; horse.add(body);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.3, 4, 10), bronze); neck.position.set(0, 1, 1.6); neck.rotation.x = 0.55; horse.add(neck);
  const hd = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 4, 10), bronze); hd.position.set(0, 1.75, 2.25); hd.rotation.x = 1.6; horse.add(hd);
  const leg = (x, z, rx, len) => { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, len, 4, 8), bronze); l.position.set(x, -0.9, z); l.rotation.x = rx; horse.add(l); };
  leg(0.45, 1.1, -1.2, 1.3); leg(-0.45, 1.3, -0.7, 1.3); // hai chân trước co lên
  leg(0.45, -1.2, 0.5, 2.1); leg(-0.45, -1.3, 0.62, 2.1); // hai chân sau trụ xuống bệ
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 8), bronze); tail.position.set(0, -0.4, -1.9); tail.rotation.x = -2.4; horse.add(tail);
  // người cưỡi: thân, đầu đội mũ, áo choàng, tay phải giơ gươm
  const rider = new THREE.Group(); rider.position.set(0, 2.5, -0.4); st.add(rider);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.1, 4, 10), bronze); torso.position.y = 0.6; rider.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), bronze); head.position.y = 1.6; rider.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.35, 10), bronze); hat.position.y = 1.9; rider.add(hat);
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.9, 10, 1, true), bronze); cape.position.set(0, 0.35, -0.35); cape.rotation.x = -0.35; rider.add(cape);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1, 4, 8), bronze); arm.position.set(0.55, 1.45, 0.2); arm.rotation.z = -0.35; rider.add(arm);
  const sword = box(0.08, 2.6, 0.04, new THREE.MeshStandardMaterial({ color: '#6b6250', metalness: 0.8, roughness: 0.3 }), 0.78, 1.95, 0.3); sword.rotation.z = -0.5; sword.rotation.x = 0.3; rider.add(sword);
  for (const sx of [-1, 1]) { const lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.9, 4, 8), bronze); lg.position.set(sx * 0.55, -0.1, 0.3); lg.rotation.x = 1.2; rider.add(lg); }
  st.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ======================= Bãi tắm Hoàng Hậu (Ghềnh Ráng) =======================
// Vịnh nhỏ dưới chân đồi Ghềnh Ráng: bãi đá cuội tròn nhẵn như trứng, những tảng đá granite lớn
// trên bờ và dưới nước, bậc đá từ lưng đồi xuống, chòi nghỉ mái ngói và biển tên.
// Địa hình dốc nên từng vật được đặt theo độ cao thật tại chỗ (heightAt), không theo một mặt phẳng.
// Hệ local: +z ra biển (đông), +x dọc bờ về phía bắc.
function queenBeach(glow, l) {
  const g = new THREE.Group();
  const base = baseHeight(l);
  const hy = (lx, lz) => Math.max(heightAt(...siteToWorld(l, lx, lz)), -1.6) - base;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const granite = new THREE.MeshStandardMaterial({ color: '#b08a6e', roughness: 0.85, flatShading: true });
  const stone = new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.9 });
  const tile = new THREE.MeshStandardMaterial({ color: '#b5502f', roughness: 0.8 });
  const ridge = new THREE.MeshStandardMaterial({ color: '#7d3a22', roughness: 0.7 });
  const wood = new THREE.MeshStandardMaterial({ color: '#7a4b2a', roughness: 0.8 });

  // đá cuội tròn nhẵn ("trứng") phủ dải bờ dài ~50 m: một InstancedMesh, màu từng viên khác nhau
  const MAXP = 520;
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45 }), MAXP);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  const tones = ['#9a948a', '#7d7a74', '#b3aa9b', '#6f7378', '#a39079', '#c2b8a8', '#5f6266'];
  let n = 0;
  for (let k = 0; k < 3000 && n < MAXP; k++) {
    const lx = -26 + rnd() * 52, lz = -6 + rnd() * 20;
    const h = hy(lx, lz);
    if (h + base < -0.7 || h + base > 2.2) continue; // chỉ ở dải bờ sát mép nước
    const r = 0.18 + rnd() ** 2 * 0.5;
    e.set(rnd() * 0.6, rnd() * Math.PI * 2, rnd() * 0.6); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(lx, h + r * 0.35, lz), q, new THREE.Vector3(r * 1.35, r * 0.8, r));
    pebbles.setMatrixAt(n, m4);
    pebbles.setColorAt(n, col.set(tones[Math.floor(rnd() * tones.length)]));
    n++;
  }
  pebbles.count = n; pebbles.castShadow = pebbles.receiveShadow = true;
  g.add(pebbles);

  // tảng đá granite lớn: khối nhiều mặt được bóp méo ngẫu nhiên
  const boulder = (lx, lz, size, solid = true) => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const pos = geo.attributes.position, fac = new Map();
    // cùng một đỉnh (các mặt dùng chung) phải co giãn như nhau, nếu không các mặt sẽ tách rời
    for (let i = 0; i < pos.count; i++) {
      const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
      if (!fac.has(key)) fac.set(key, 0.8 + rnd() * 0.35);
      const f = fac.get(key);
      pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, granite);
    m.scale.set(size * (0.9 + rnd() * 0.5), size * (0.6 + rnd() * 0.35), size * (0.8 + rnd() * 0.4));
    m.rotation.set(rnd() * 0.4, rnd() * Math.PI, rnd() * 0.3);
    m.position.set(lx, hy(lx, lz) + size * 0.25, lz);
    m.castShadow = m.receiveShadow = true;
    m.userData.solid = solid;
    g.add(m);
    return m;
  };
  // trên bờ hai đầu vịnh và dưới nước
  for (const [lx, lz, s] of [[-24, 2, 4.5], [-29, 7, 3.2], [-20, 9, 2.6], [22, 1, 4], [27, 6, 5.5], [19, 10, 2.4],
    [-9, 11, 2.2], [6, 14, 3], [13, 18, 1.8], [-16, 16, 2.8], [2, 22, 1.6]]) boulder(lx, lz, s, lz < 8);
  // "hòn trứng": tảng đá tròn đứng chênh vênh trên một tảng bẹt ở đầu vịnh phía nam
  const flat = boulder(-12, 4, 3);
  flat.scale.y *= 0.55;
  const egg = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 16), granite);
  egg.scale.set(1, 1.25, 0.95);
  egg.position.set(-12, flat.position.y + 2.4, 4);
  egg.castShadow = true; g.add(egg);

  // bậc đá từ lưng đồi xuống bãi, có lan can gỗ
  for (let k = 0; k < 16; k++) {
    const lz = -30 + k * 1.6, lx = 9 - k * 0.15;
    g.add(box(2.6, 0.5, 1.7, stone, lx, hy(lx, lz) - 0.3, lz));
    if (k % 3 === 0) g.add(cyl(0.06, 0.06, 1.1, 6, wood, lx + 1.5, hy(lx, lz), lz));
  }

  // chòi nghỉ mái ngói trên lưng đồi, nhìn ra biển
  const hut = new THREE.Group();
  for (const [x, z] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) hut.add(cyl(0.18, 0.18, 3, 8, wood, x, 0, z));
  const floor = box(6.4, 1.6, 6.4, stone, 0, -1.6, 0); floor.userData.solid = true; hut.add(floor);
  const roof = vnRoof(7.4, 7.4, 2.2, tile, ridge); roof.position.y = 3; hut.add(roof);
  hut.add(box(4, 0.12, 0.9, wood, 0, 0.75, 1.6)); // ghế
  hut.position.set(-14, hy(-14, -20) + 0.3, -20);
  g.add(hut);

  // biển tên ở đầu bậc đá
  const sx0 = 12, sz0 = -28, sy = hy(sx0, sz0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), new THREE.MeshStandardMaterial({ map: queenSign(), roughness: 0.6 }));
  sign.position.set(sx0, sy + 2.3, sz0); g.add(sign);
  g.add(box(5.8, 1.3, 0.12, wood, sx0, sy + 1.65, sz0 - 0.08));
  for (const sx of [-2.6, 2.6]) g.add(cyl(0.1, 0.1, 2.9, 8, wood, sx0 + sx, sy, sz0 - 0.08));

  // cây dừa nghiêng ra biển dọc bờ
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#3f7f3a', roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
  for (const [lx, lz] of [[-4, -11], [4, -12], [15, -10], [-19, -9]]) {
    const tall = 7 + rnd() * 3;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, tall, 7), trunkMat);
    trunk.position.y = tall / 2; palm.add(trunk);
    for (let k = 0; k < 7; k++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.6), leafMat);
      leaf.geometry.translate(0, 1.8, 0);
      leaf.position.y = tall; leaf.rotation.set(1.1, (k / 7) * Math.PI * 2, 0, 'YXZ');
      palm.add(leaf);
    }
    palm.rotation.set(0.25, 0, 0); // nghiêng về phía biển (+z)
    palm.position.set(lx, hy(lx, lz), lz);
    palm.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.add(palm);
  }
  void glow;
  return g;
}

function queenSign() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 126;
  const x = c.getContext('2d');
  x.fillStyle = '#1f4e6e'; x.fillRect(0, 0, 640, 126);
  x.strokeStyle = '#f2e6c8'; x.lineWidth = 5; x.strokeRect(7, 7, 626, 112);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 50px "Be Vietnam Pro", Arial, sans-serif'; x.fillText('BÃI TẮM HOÀNG HẬU', 320, 52);
  x.font = '600 24px "Be Vietnam Pro", Arial, sans-serif'; x.fillStyle = '#f2e6c8'; x.fillText('Ghềnh Ráng Tiên Sa · Quy Nhơn', 320, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
