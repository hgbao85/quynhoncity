// Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành, dựng theo ảnh chụp và số liệu báo chí
// (xem site.js). Vẫn là mô hình giản lược bằng khối hình học, chưa phải bản quét 3D.
import * as THREE from 'three';
import { YAW, STATUE_H, PLINTH, BASE, PLAZA, ARC, FAN, arcPoint, fanPolygon } from './site.js';
import { lotusCluster, pottedPalmGeometries } from './plants.js';
import { loadStatueModel } from './statue-model.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createMonument(scene) {
  const g = new THREE.Group();
  g.rotation.y = YAW;

  const graniteDark = new THREE.MeshStandardMaterial({ color: '#6f6a66', roughness: 0.5 });
  const stone = new THREE.MeshStandardMaterial({ color: '#d4d2cc', roughness: 0.8 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#94603f', roughness: 0.38, metalness: 0.55 });

  // ---- sân lát granite đỏ hình rẻ quạt, hai bậc cấp ở mép trước ----
  const redGranite = new THREE.MeshStandardMaterial({ map: graniteTexture('#b5584b', '#94443a'), roughness: 0.22, metalness: 0.08 });
  const redStep = new THREE.MeshStandardMaterial({ map: graniteTexture('#8f3c33', '#7a322b'), roughness: 0.35 });
  redGranite.map.repeat.set(1 / 4.8, 1 / 4.8);
  redStep.map.repeat.set(1 / 4.8, 1 / 4.8);
  const slab = (grow, top, mat) => {
    const shape = new THREE.Shape(fanPolygon(grow).map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: top, bevelEnabled: false, curveSegments: 4 });
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  slab(FAN.step * 2, 0.1, redStep);
  slab(FAN.step, 0.2, redStep);
  const plaza = slab(0, PLAZA.y, redGranite);
  // đường viền đá sáng chạy song song mép trước sân
  const band = new THREE.Mesh(new THREE.RingGeometry(FAN.r - 1.6, FAN.r - 1.1, 96, 1, -Math.PI * 0.5 - 1.05, 2.1),
    new THREE.MeshStandardMaterial({ color: '#d9c3b0', roughness: 0.4 }));
  band.rotation.x = -Math.PI / 2; band.position.set(0, PLAZA.y + 0.01, FAN.cz); g.add(band);

  // ---- bậc đá và bệ tượng (bê tông cốt thép bọc đồng, cao 4,7 m) ----
  const y0 = PLAZA.y;
  const base = new THREE.Mesh(new THREE.BoxGeometry(BASE.w, BASE.h, BASE.d), graniteDark);
  base.position.y = y0 + BASE.h / 2; base.receiveShadow = base.castShadow = true; g.add(base);
  const plinthMat = new THREE.MeshStandardMaterial({ color: '#7d4c36', roughness: 0.45, metalness: 0.35 });
  const py = y0 + BASE.h;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(PLINTH.w, PLINTH.h - 0.6, PLINTH.d), plinthMat);
  plinth.position.y = py + 0.3 + (PLINTH.h - 0.6) / 2; g.add(plinth);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(PLINTH.w + 0.5, 0.3, PLINTH.d + 0.5), plinthMat);
  foot.position.y = py + 0.15; g.add(foot);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(PLINTH.w + 0.5, 0.3, PLINTH.d + 0.5), plinthMat);
  cornice.position.y = py + PLINTH.h - 0.15; g.add(cornice);
  // khung viền nổi và tấm chữ hai dòng ở mặt trước
  const label = new THREE.Mesh(new THREE.PlaneGeometry(PLINTH.w - 0.9, PLINTH.h - 1.6),
    new THREE.MeshStandardMaterial({ map: plinthLabel(), roughness: 0.4, metalness: 0.45 }));
  label.position.set(0, py + PLINTH.h / 2, PLINTH.d / 2 + 0.02); g.add(label);
  const top = py + PLINTH.h;

  // ---- hai pho tượng đồng ----
  const statue = new THREE.Group();
  buildSon(statue, bronze);
  buildFather(statue, bronze);
  statue.scale.setScalar(STATUE_H / 1.8);
  statue.position.y = top;
  g.add(statue);
  // mô hình 3D thật (nếu có public/models/statue.glb) sẽ thay cho tượng khối
  loadStatueModel(statue, bronze);

  // ---- phù điêu đá xanh hình cánh cung ----
  const relief = new THREE.Mesh(reliefGeometry(), new THREE.MeshStandardMaterial({
    map: reliefTexture(), roughness: 0.85, color: '#ffffff', side: THREE.DoubleSide,
  }));
  relief.position.y = y0;
  relief.material.bumpMap = relief.material.map;
  relief.material.bumpScale = 3;
  g.add(relief);

  // ---- hàng cau cảnh trồng chậu dọc chân phù điêu, khóm sen trước bệ ----
  addPlants(g, y0);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  plaza.castShadow = false;

  // ---- đèn chiếu ban đêm ----
  const spots = [-1, 1].map((side) => {
    const s = new THREE.SpotLight('#ffe2b0', 0, 60, 0.32, 0.5, 1.2);
    s.position.set(side * 8, y0 + 0.5, 15);
    s.target.position.set(0, top + 5.5, 0);
    g.add(s, s.target);
    return s;
  });
  const wash = new THREE.SpotLight('#dfe9ff', 0, 70, 0.95, 0.8, 1.1);
  wash.position.set(0, y0 + 0.8, 18);
  wash.target.position.set(0, 6, -20);
  g.add(wash, wash.target);
  g.userData.setNight = (n) => {
    for (const s of spots) s.intensity = n * 150;
    wash.intensity = n * 110;
  };

  scene.add(g);
  return g;
}

// ===================== người cha & người con =====================
// Đơn vị: một người cao ~1,8; nhóm tượng được phóng lên 10,8 m.
// Mặt trước là +z. Nhìn từ trước: con bên trái (phía nam), cha bên phải (phía bắc).

function part(group, geo, mat, pos, rot, scale) {
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(pos);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  group.add(m);
  return m;
}

// Khúc tay/chân nối hai điểm a → b, có khớp tròn ở hai đầu
function limb(group, mat, a, b, r0, r1 = r0) {
  const d = b.clone().sub(a), L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 14), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  group.add(m);
  part(group, new THREE.SphereGeometry(r0, 14, 10), mat, a);
  part(group, new THREE.SphereGeometry(r1, 14, 10), mat, b);
  return m;
}

function lathe(profile, zScale, seg = 28) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.scale(1, 1, zScale);
  return g;
}

function head(group, mat, c, r) {
  part(group, new THREE.SphereGeometry(r, 24, 18), mat, c, null, [0.92, 1.12, 1]);
  part(group, new THREE.BoxGeometry(r * 0.22, r * 0.4, r * 0.3), mat, V(c.x, c.y - r * 0.05, c.z + r * 0.98), [-0.2, 0, 0]); // mũi
  for (const s of [-1, 1]) part(group, new THREE.SphereGeometry(r * 0.22, 8, 6), mat, V(c.x + s * r * 0.9, c.y, c.z), null, [0.5, 1, 0.8]); // tai
  part(group, new THREE.BoxGeometry(r * 1.2, r * 0.12, r * 0.2), mat, V(c.x, c.y + r * 0.3, c.z + r * 0.88)); // gờ mày
}

function buildSon(G, m) {
  const cx = -0.26, cz = 0;
  // giày và ống quần âu
  for (const s of [-1, 1]) {
    const x = cx + s * 0.1;
    part(G, new THREE.BoxGeometry(0.11, 0.07, 0.27), m, V(x + s * 0.01, 0.035, cz + 0.05));
    limb(G, m, V(x + s * 0.01, 0.1, cz), V(x, 0.92, cz), 0.07, 0.1);
  }
  // hông, thắt lưng, thân áo sơ mi bỏ trong quần
  part(G, new THREE.SphereGeometry(1, 20, 12), m, V(cx, 0.94, cz), null, [0.2, 0.12, 0.13]);
  part(G, new THREE.TorusGeometry(0.168, 0.016, 6, 28), m, V(cx, 1.02, cz), [Math.PI / 2, 0, 0], [1, 0.72, 1]);
  const torso = lathe([[0, 0.98], [0.165, 0.99], [0.162, 1.1], [0.18, 1.25], [0.205, 1.37], [0.205, 1.44], [0.15, 1.5], [0.06, 1.53], [0, 1.53]], 0.62);
  part(G, torso, m, V(cx, 0, cz));
  // nẹp áo, hai túi ngực, cổ áo
  part(G, new THREE.BoxGeometry(0.03, 0.45, 0.01), m, V(cx, 1.26, cz + 0.122));
  for (const s of [-1, 1]) {
    part(G, new THREE.BoxGeometry(0.085, 0.09, 0.012), m, V(cx + s * 0.09, 1.34, cz + 0.124));
    part(G, new THREE.BoxGeometry(0.08, 0.05, 0.02), m, V(cx + s * 0.045, 1.5, cz + 0.07), [0.5, 0, s * 0.6]);
  }
  // vai và tay (tay phải buông dọc thân, tay trái khuất sau tay cha)
  const sh = 1.44;
  limb(G, m, V(cx - 0.2, sh, cz), V(cx - 0.235, 1.16, cz - 0.01), 0.062, 0.052);
  limb(G, m, V(cx - 0.235, 1.16, cz - 0.01), V(cx - 0.225, 0.92, cz + 0.03), 0.052, 0.045);
  part(G, new THREE.SphereGeometry(0.045, 10, 8), m, V(cx - 0.225, 0.88, cz + 0.035), null, [0.8, 1.3, 1]);
  limb(G, m, V(cx + 0.2, sh, cz), V(cx + 0.23, 1.16, cz - 0.04), 0.062, 0.052);
  limb(G, m, V(cx + 0.23, 1.16, cz - 0.04), V(cx + 0.22, 0.93, cz - 0.02), 0.052, 0.045);
  // cổ, đầu, tóc ngắn rẽ ngôi
  limb(G, m, V(cx, 1.5, cz), V(cx, 1.58, cz + 0.005), 0.055, 0.052);
  const hc = V(cx, 1.67, cz + 0.01);
  head(G, m, hc, 0.105);
  part(G, new THREE.SphereGeometry(0.112, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), m, V(hc.x, hc.y + 0.02, hc.z - 0.008), [-0.2, 0, 0], [0.95, 1.1, 1.02]);
}

function buildFather(G, m) {
  const cx = 0.28, cz = -0.04;
  // guốc mộc và ống quần lộ dưới vạt áo
  for (const s of [-1, 1]) {
    const x = cx + s * 0.09;
    part(G, new THREE.BoxGeometry(0.1, 0.06, 0.25), m, V(x, 0.03, cz + 0.05));
    limb(G, m, V(x, 0.07, cz), V(x, 0.3, cz), 0.06, 0.07);
  }
  // áo dài dài gần chấm gót, vạt hơi xoè
  const robe = lathe([[0, 0.16], [0.27, 0.17], [0.245, 0.4], [0.21, 0.75], [0.185, 1.0], [0.185, 1.15], [0.195, 1.3], [0.19, 1.39], [0.14, 1.45], [0.065, 1.48], [0, 1.48]], 0.68, 32);
  part(G, robe, m, V(cx, 0, cz));
  // đường nẹp chéo của áo dài (cài khuy bên nách phải)
  part(G, new THREE.BoxGeometry(0.02, 0.2, 0.012), m, V(cx - 0.05, 1.36, cz + 0.13), [0, 0, 0.7]);
  part(G, new THREE.BoxGeometry(0.018, 1.1, 0.01), m, V(cx - 0.02, 0.82, cz + 0.15), [0.05, 0, 0]);
  // tay phải đưa sang đặt lên ngực con, tay trái đưa ra phía trước
  const sh = 1.39;
  limb(G, m, V(cx - 0.18, sh, cz), V(cx - 0.24, 1.14, cz + 0.14), 0.066, 0.06);
  limb(G, m, V(cx - 0.24, 1.14, cz + 0.14), V(cx - 0.4, 1.31, cz + 0.17), 0.06, 0.05);
  part(G, new THREE.SphereGeometry(0.048, 10, 8), m, V(cx - 0.43, 1.33, cz + 0.17), null, [1.2, 0.8, 0.7]);
  limb(G, m, V(cx + 0.18, sh, cz), V(cx + 0.235, 1.12, cz + 0.02), 0.066, 0.06);
  limb(G, m, V(cx + 0.235, 1.12, cz + 0.02), V(cx + 0.2, 0.98, cz + 0.2), 0.06, 0.052);
  part(G, new THREE.SphereGeometry(0.046, 10, 8), m, V(cx + 0.195, 0.96, cz + 0.24), null, [0.8, 0.8, 1.2]);
  // cổ, đầu hơi nghiêng về phía con, râu, khăn xếp
  limb(G, m, V(cx, 1.46, cz), V(cx - 0.01, 1.53, cz + 0.01), 0.052, 0.05);
  const hc = V(cx - 0.012, 1.61, cz + 0.015);
  head(G, m, hc, 0.1);
  part(G, new THREE.ConeGeometry(0.035, 0.08, 8), m, V(hc.x, hc.y - 0.12, hc.z + 0.07), [Math.PI + 0.3, 0, 0]);
  const khan = new THREE.Group();
  khan.position.set(hc.x, hc.y + 0.06, hc.z - 0.005);
  khan.rotation.set(-0.08, 0, 0.05);
  part(khan, new THREE.CylinderGeometry(0.108, 0.112, 0.085, 24), m, V(0, 0, 0));
  for (let i = 0; i < 4; i++) {
    part(khan, new THREE.TorusGeometry(0.11, 0.013, 6, 24), m, V(0, -0.035 + i * 0.024, 0), [Math.PI / 2 + (i % 2 ? 0.08 : -0.08), 0, 0]);
  }
  G.add(khan);
}

// ===================== phù điêu =====================
// Độ cao mép trên theo vị trí dọc bức tường (u ∈ [-1, 1]): giữa có vòm cao 14,5 m
// ngay sau tượng, hai bên thấp dần thành từng mảng, đầu tường cuộn sóng.
function reliefTop(u) {
  const a = Math.abs(u);
  if (a < 0.13) return 9.8 + 4.7 * Math.sqrt(1 - (a / 0.13) ** 2);
  if (a < 0.42) return 9.8 - (a - 0.13) * 5 - (a > 0.3 ? 0.9 : 0);
  if (a < 0.72) return 7.4 - (a - 0.42) * 5 + 0.35 * Math.sin((a - 0.42) * 30);
  return Math.max(1.8, 5.6 - (a - 0.72) * 12 + 0.5 * Math.sin((a - 0.72) * 22));
}

function reliefGeometry() {
  const N = 220, T = ARC.thick / 2;
  const p = [], n = [], uv = [];
  const quad = (A, B, C, D, nrm, uvs) => {
    for (const [P, t] of [[A, uvs[0]], [B, uvs[1]], [C, uvs[2]], [A, uvs[0]], [C, uvs[2]], [D, uvs[3]]]) {
      p.push(...P); n.push(...nrm); uv.push(...t);
    }
  };
  for (let i = 0; i < N; i++) {
    const u0 = -1 + (2 * i) / N, u1 = -1 + (2 * (i + 1)) / N;
    const h0 = reliefTop(u0), h1 = reliefTop(u1);
    const [fx0, fz0] = arcPoint(u0, -T), [fx1, fz1] = arcPoint(u1, -T);
    const [bx0, bz0] = arcPoint(u0, T), [bx1, bz1] = arcPoint(u1, T);
    const um = (u0 + u1) / 2, [mx, mz] = arcPoint(um, 0);
    const nl = Math.hypot(mx, mz - ARC.cz);
    const nf = [-mx / nl, 0, -(mz - ARC.cz) / nl]; // pháp tuyến mặt trước, hướng về tâm cung
    const t0 = (u0 + 1) / 2, t1 = (u1 + 1) / 2;
    // mặt trước (có chạm khắc)
    quad([fx0, 0, fz0], [fx1, 0, fz1], [fx1, h1, fz1], [fx0, h0, fz0], nf,
      [[t0, 0], [t1, 0], [t1, h1 / 14.5], [t0, h0 / 14.5]]);
    // mặt sau
    quad([bx1, 0, bz1], [bx0, 0, bz0], [bx0, h0, bz0], [bx1, h1, bz1], nf.map((v, k) => (k === 1 ? 0 : -v)),
      [[0.02, 0.02], [0.02, 0.02], [0.02, 0.03], [0.02, 0.03]]);
    // mép trên
    quad([fx0, h0, fz0], [fx1, h1, fz1], [bx1, h1, bz1], [bx0, h0, bz0], [0, 1, 0],
      [[0.02, 0.02], [0.02, 0.02], [0.02, 0.02], [0.02, 0.02]]);
  }
  // hai đầu tường
  for (const u of [-1, 1]) {
    const h = reliefTop(u), [fx, fz] = arcPoint(u, -T), [bx, bz] = arcPoint(u, T);
    const [tx, tz] = arcPoint(u * 1.01, 0), [ox, oz] = arcPoint(u, 0);
    const d = [tx - ox, 0, tz - oz], l = Math.hypot(d[0], d[2]);
    const A = [fx, 0, fz], B = [bx, 0, bz], C = [bx, h, bz], D = [fx, h, fz];
    if (u > 0) quad(A, B, C, D, [d[0] / l, 0, d[2] / l], [[0.02, 0.02], [0.02, 0.02], [0.02, 0.02], [0.02, 0.02]]);
    else quad(B, A, D, C, [d[0] / l, 0, d[2] / l], [[0.02, 0.02], [0.02, 0.02], [0.02, 0.02], [0.02, 0.02]]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

// Ảnh chạm khắc vẽ bằng canvas. Từ trái (nam) sang phải (bắc) theo mô tả báo Nhân Dân:
// Sài Gòn (bến Nhà Rồng, con tàu) → tháp Chăm, trường Dục Thanh → Bình Định (Bình Khê,
// đền Tây Sơn) → Huế (cầu Trường Tiền, sông Hương) → Nam Đàn (nhà tranh, ao sen).
function reliefTexture() {
  const W = 4096, H = 782; // tỉ lệ 76 m × 14,5 m
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const mY = (m) => H - (m / 14.5) * H; // mét → pixel theo chiều cao
  const mX = (u) => ((u + 1) / 2) * W; // u ∈ [-1, 1] → pixel
  // nền đá xanh xám có vân
  x.fillStyle = '#c8ccc8'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const v = 180 + Math.random() * 40;
    x.fillStyle = `rgba(${v},${v + 4},${v},0.25)`;
    x.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 6, 1 + Math.random() * 3);
  }
  const carve = (draw, lw = 5) => {
    // vẽ hai lần: bóng tối lệch xuống dưới và nét sáng → cảm giác chạm nổi
    x.save(); x.translate(3, 4); x.strokeStyle = 'rgba(70,76,74,0.75)'; x.fillStyle = 'rgba(70,76,74,0.55)'; x.lineWidth = lw; draw(); x.restore();
    x.save(); x.strokeStyle = 'rgba(238,240,236,0.9)'; x.fillStyle = 'rgba(226,229,224,0.9)'; x.lineWidth = lw * 0.7; draw(); x.restore();
  };
  // dải sóng nước dưới chân tường
  carve(() => {
    for (let px = 0; px < W; px += 70) {
      x.beginPath(); x.arc(px, mY(0.9), 30, Math.PI, 0); x.stroke();
      x.beginPath(); x.arc(px + 35, mY(0.6), 18, Math.PI, Math.PI * 1.9); x.stroke();
    }
  }, 6);
  // mây cuộn dải trên
  const scroll = (cx, cy, r) => {
    x.beginPath();
    for (let t = 0; t < 12; t += 0.2) { const rr = r * (1 - t / 13); x.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr); }
    x.stroke();
  };
  carve(() => { for (let u = -0.95; u < 0.95; u += 0.09) scroll(mX(u), mY(Math.min(reliefTop(u) - 1.6, 9)), 34); }, 5);

  // Sài Gòn: tàu biển có ống khói, cầu cảng
  carve(() => {
    const bx = mX(-0.86), by = mY(1.9);
    x.beginPath(); x.moveTo(bx - 160, by); x.lineTo(bx + 170, by); x.lineTo(bx + 130, by + 60); x.lineTo(bx - 130, by + 60); x.closePath(); x.stroke();
    x.strokeRect(bx - 80, by - 60, 150, 60); x.strokeRect(bx - 20, by - 130, 34, 70); x.strokeRect(bx + 40, by - 120, 30, 60);
    for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(bx - 120 + i * 50, by + 30, 9, 0, 7); x.stroke(); }
    const nx = mX(-0.66), ny = mY(2);
    x.strokeRect(nx - 110, ny - 110, 220, 110);
    x.beginPath(); x.moveTo(nx - 130, ny - 110); x.lineTo(nx, ny - 170); x.lineTo(nx + 130, ny - 110); x.stroke();
    for (let i = -2; i <= 2; i++) x.strokeRect(nx + i * 40 - 12, ny - 85, 24, 50);
  });
  // tháp Chăm
  const tower = (cx, base, h) => {
    x.beginPath();
    x.moveTo(cx - h * 0.28, base); x.lineTo(cx - h * 0.26, base - h * 0.55);
    x.lineTo(cx - h * 0.2, base - h * 0.6); x.lineTo(cx - h * 0.18, base - h * 0.78);
    x.lineTo(cx - h * 0.1, base - h * 0.82); x.lineTo(cx, base - h);
    x.lineTo(cx + h * 0.1, base - h * 0.82); x.lineTo(cx + h * 0.18, base - h * 0.78);
    x.lineTo(cx + h * 0.2, base - h * 0.6); x.lineTo(cx + h * 0.26, base - h * 0.55); x.lineTo(cx + h * 0.28, base);
    x.stroke();
    x.strokeRect(cx - h * 0.08, base - h * 0.4, h * 0.16, h * 0.4);
  };
  carve(() => { tower(mX(-0.47), mY(1.5), 330); tower(mX(-0.38), mY(1.5), 260); tower(mX(-0.55), mY(1.5), 210); });
  // Bình Định: nhà mái cong (đền Tây Sơn), hàng dừa, núi
  carve(() => {
    for (const [u, s] of [[-0.24, 1], [0.2, 0.9]]) {
      const cx = mX(u), by = mY(1.6);
      x.strokeRect(cx - 150 * s, by - 90 * s, 300 * s, 90 * s);
      x.beginPath(); x.moveTo(cx - 200 * s, by - 80 * s); x.quadraticCurveTo(cx - 140 * s, by - 100 * s, cx - 90 * s, by - 160 * s);
      x.lineTo(cx + 90 * s, by - 160 * s); x.quadraticCurveTo(cx + 140 * s, by - 100 * s, cx + 200 * s, by - 80 * s); x.stroke();
      for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(cx + i * 60 * s, by); x.lineTo(cx + i * 60 * s, by - 90 * s); x.stroke(); }
    }
    for (const u of [-0.32, -0.14, 0.13, 0.29]) {
      const cx = mX(u), by = mY(1.5);
      x.beginPath(); x.moveTo(cx, by); x.quadraticCurveTo(cx + 15, by - 120, cx + 5, by - 220); x.stroke();
      for (let k = 0; k < 7; k++) { const a = -Math.PI + (k / 6) * Math.PI; x.beginPath(); x.moveTo(cx + 5, by - 220); x.quadraticCurveTo(cx + 5 + Math.cos(a) * 50, by - 250, cx + 5 + Math.cos(a) * 90, by - 220 + Math.abs(Math.sin(a)) * -10 + 40); x.stroke(); }
    }
    x.beginPath(); x.moveTo(mX(-0.12), mY(5)); x.quadraticCurveTo(mX(-0.06), mY(8.2), mX(0), mY(6)); x.quadraticCurveTo(mX(0.06), mY(8.6), mX(0.12), mY(5)); x.stroke();
  });
  // Huế: cầu Trường Tiền sáu vòm
  carve(() => {
    const x0 = mX(0.42), x1 = mX(0.66), by = mY(2.4), span = (x1 - x0) / 6;
    x.beginPath(); x.moveTo(x0, by); x.lineTo(x1, by); x.stroke();
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(x0 + i * span, by); x.quadraticCurveTo(x0 + (i + 0.5) * span, by - 110, x0 + (i + 1) * span, by); x.stroke(); }
    x.strokeRect(mX(0.47), mY(5.6), 220, 120); x.beginPath(); x.moveTo(mX(0.47) - 20, mY(5.6)); x.lineTo(mX(0.47) + 110, mY(6.5)); x.lineTo(mX(0.47) + 240, mY(5.6)); x.stroke();
  });
  // Nam Đàn: nhà tranh, ao sen
  carve(() => {
    const cx = mX(0.84), by = mY(1.7);
    x.strokeRect(cx - 120, by - 80, 240, 80);
    x.beginPath(); x.moveTo(cx - 170, by - 70); x.lineTo(cx - 60, by - 190); x.lineTo(cx + 60, by - 190); x.lineTo(cx + 170, by - 70); x.closePath(); x.stroke();
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(cx - 140 + i * 35, by - 85); x.lineTo(cx - 70 + i * 18, by - 180); x.stroke(); }
    for (let i = 0; i < 6; i++) {
      const lx = mX(0.72) + i * 40, ly = mY(1.4) - (i % 2) * 30;
      x.beginPath(); x.ellipse(lx, ly, 26, 9, 0, 0, 7); x.stroke();
      x.beginPath(); x.moveTo(lx, ly - 8); x.quadraticCurveTo(lx - 14, ly - 40, lx, ly - 55); x.quadraticCurveTo(lx + 14, ly - 40, lx, ly - 8); x.stroke();
    }
  });
  // khung vòm giữa: viền tròn đồng tâm sau lưng tượng
  carve(() => {
    for (const r of [0.95, 0.8]) { x.beginPath(); x.ellipse(mX(0), mY(9.8), (0.13 * W) / 2 * r, (4.7 / 14.5) * H * r, 0, Math.PI, 0); x.stroke(); }
    x.beginPath(); x.moveTo(mX(-0.42), mY(1.2)); x.lineTo(mX(0.42), mY(1.2)); x.stroke();
  }, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ===================== phụ trợ =====================
// Đá granite: nền màu + vân lốm đốm + ron lát 4×4 viên (mỗi viên 1,2 m)
function graniteTexture(base, joint) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 14000; i++) {
    const v = Math.random();
    x.fillStyle = v < 0.5 ? 'rgba(40,10,8,0.18)' : v < 0.85 ? 'rgba(255,220,200,0.14)' : 'rgba(10,10,10,0.35)';
    x.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  x.strokeStyle = joint; x.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { const p = (i * S) / 4; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, S); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(S, p); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function plinthLabel() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#7a4a35'; x.fillRect(0, 0, 1024, 512);
  x.strokeStyle = '#5a3424'; x.lineWidth = 22; x.strokeRect(20, 20, 984, 472);
  x.strokeStyle = '#a06c4c'; x.lineWidth = 6; x.strokeRect(48, 48, 928, 416);
  // hoa văn góc
  for (const [cx, cy] of [[48, 48], [976, 48], [48, 464], [976, 464]]) { x.beginPath(); x.arc(cx, cy, 22, 0, 7); x.stroke(); }
  x.fillStyle = '#e8c870'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 84px "Be Vietnam Pro", system-ui, sans-serif';
  x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowOffsetY = 4; x.shadowBlur = 4;
  x.fillText('NGUYỄN SINH SẮC', 512, 205);
  x.fillText('NGUYỄN TẤT THÀNH', 512, 320);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function addPlants(g, y0) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // dải cỏ viền và hàng cau chậu cách đều nhau dọc chân phù điêu
  const hedgeMat = new THREE.MeshStandardMaterial({ color: '#3f7f34', roughness: 1 });
  const N = 60;
  for (let i = 0; i < N; i++) {
    const u0 = -0.97 + (1.94 * i) / N, u1 = -0.97 + (1.94 * (i + 1)) / N;
    const [x0, z0] = arcPoint(u0, -1.6), [x1, z1] = arcPoint(u1, -1.6);
    const len = Math.hypot(x1 - x0, z1 - z0);
    const h = new THREE.Mesh(new THREE.BoxGeometry(len + 0.05, 0.3, 1.2), hedgeMat);
    h.position.set((x0 + x1) / 2, y0 + 0.15, (z0 + z1) / 2);
    h.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    g.add(h);
  }
  const { pot, trunk, fronds } = pottedPalmGeometries();
  const spots = [];
  for (let u = -0.92; u <= 0.921; u += 0.092) spots.push(arcPoint(u, -3.4));
  const potMat = new THREE.MeshStandardMaterial({ color: '#5b4a3c', roughness: 0.6 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7d6a4f', roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: '#3d7a31', roughness: 0.8, side: THREE.DoubleSide });
  const meshes = [pot, trunk, fronds].map((geo, k) => new THREE.InstancedMesh(geo, [potMat, trunkMat, frondMat][k], spots.length));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  spots.forEach(([x, z], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
    m.compose(new THREE.Vector3(x, y0, z), q, new THREE.Vector3(1, 1, 1));
    meshes.forEach((mm) => mm.setMatrixAt(i, m));
  });
  meshes.forEach((mm) => { mm.castShadow = true; g.add(mm); });

  // hai bồn sen hai bên mặt trước bệ tượng (như ngày khánh thành)
  const planterMat = new THREE.MeshStandardMaterial({ color: '#6d6762', roughness: 0.45 });
  const waterMat = new THREE.MeshStandardMaterial({ color: '#2f5560', roughness: 0.1, metalness: 0.3 });
  for (const side of [-1, 1]) {
    const px = side * 4.6, pz = BASE.d / 2 + 1.5;
    const planter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.55, 2), planterMat);
    planter.position.set(px, y0 + 0.275, pz); g.add(planter);
    const water = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.02, 1.7), waterMat);
    water.position.set(px, y0 + 0.5, pz); g.add(water);
    const cl = lotusCluster(rand, { flowers: 3, buds: 2, leaves: 6, h: 1.3, spread: 1.0 });
    cl.position.set(px, y0 + 0.5, pz); cl.scale.set(1.9, 1.7, 1.2); g.add(cl);
  }
  // lẵng hoa đỏ dâng trước bệ
  const wreath = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.6 });
  const yel = new THREE.MeshStandardMaterial({ color: '#f4c430', roughness: 0.6 });
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.45;
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), i % 5 ? red : yel);
    f.position.set(Math.cos(a) * r, 0.55 + (0.45 - r) * 0.5, Math.sin(a) * r * 0.5);
    wreath.add(f);
  }
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.5, 10), planterMat);
  stand.position.y = 0.25; wreath.add(stand);
  wreath.position.set(0, y0 + BASE.h, PLINTH.d / 2 + 0.8);
  g.add(wreath);
}
