// Quán Highlands Coffee, 162A Nguyễn Huệ (góc Nguyễn Huệ – Đô Đốc Bảo), tầng trệt khách sạn.
// Dựng theo ảnh Street View tháng 9-2026:
//   - tầng trệt: cột kem, kính sẫm, dải diềm đen hoa văn chữ V với chữ trắng HIGHLANDS COFFEE
//     chạy dọc cả mặt Đô Đốc Bảo (phía tây) lẫn mặt Nguyễn Huệ (phía nam), có đèn rọi dưới diềm
//   - tầng 2: khung gỗ nâu nhạt dạng lam đứng, góc có hoa văn ô vuông, lan can
//   - mái đua xám sẫm; phía trên là khối tháp bo tròn ở góc ngã ba, ban công cong lan can đen,
//     tường ốp gạch tím nhạt, nẹp trắng; huy hiệu tròn đỏ trên tháp
//   - vỉa hè: dù đỏ, ghế sắt đỏ, dừa cao trồng sát mép đường
// Tên và biểu tượng là thương hiệu của Highlands Coffee: ở đây chỉ vẽ chữ đơn giản để nhận diện địa điểm.
import * as THREE from 'three';
import { BUILDING } from './geo.js';

// Khối nhà (toạ độ thế giới, mét): mặt tây x = X0, mặt nam z = Z0, kéo về phía bắc tới Z1
const X0 = 207, X1 = 221, Z0 = -141, Z1 = -160, RC = 6; // RC: bán kính bo góc tây nam
export const HIGHLANDS_ZONE = [[195, -137], [227, -137], [227, -172], [195, -172]];
export const inHighlandsZone = (x, z) => x > 195 && x < 224 && z > -172 && z < -137;

// Viền mặt bằng có góc bo, theo chiều kim đồng hồ nhìn từ trên (tây nam → tây bắc → ...)
function outline(grow = 0, seg = 10) {
  const x0 = X0 - grow, x1 = X1 + grow, z0 = Z0 + grow, z1 = Z1 - grow, r = RC + grow;
  const pts = [];
  // cung bo góc tây nam: tâm (x0 + r, z0 - r)
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI / 2 + (i / seg) * (Math.PI / 2); // từ hướng nam (+z) sang hướng tây (-x)
    pts.push([X0 + RC + Math.cos(a) * r, Z0 - RC + Math.sin(a) * r]); // tâm cung cố định, bán kính nới theo grow
  }
  pts.push([x0, z1], [x1, z1], [x1, z0]);
  return pts;
}

export function createHighlands(scene, grid) {
  const g = new THREE.Group();
  const tex = textures();

  const cream = new THREE.MeshStandardMaterial({ color: '#e9dcc4', roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1d2228', roughness: 0.12, metalness: 0.6, emissive: '#ffcf8a', emissiveIntensity: 0 });
  const darkGrey = new THREE.MeshStandardMaterial({ color: '#3b3d41', roughness: 0.6 });
  const mauve = new THREE.MeshStandardMaterial({ color: '#a58fa6', roughness: 0.8 });
  const facade = new THREE.MeshStandardMaterial({ map: tex.facade, emissiveMap: tex.facadeGlow, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.75 });
  facade.userData.night = true;
  tex.facade.repeat.set(1 / 3, 1 / 3.2); tex.facadeGlow.repeat.set(1 / 3, 1 / 3.2);
  const white = new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.6 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#25272a', roughness: 0.5, metalness: 0.5 });
  const wood = new THREE.MeshStandardMaterial({ color: '#b9946a', roughness: 0.75 });
  const fasciaMat = new THREE.MeshStandardMaterial({ map: tex.fascia, emissiveMap: tex.fasciaGlow, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.6 });

  // khối đặc theo viền ở độ cao [y0, y1]
  const prism = (pts, y0, y1, mat) => {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y0;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  // các đoạn của mặt tiền (chỉ hai mặt quay ra đường: cung góc + mặt tây + mặt nam)
  const frontage = (grow) => {
    const p = outline(grow, 10);
    const westEnd = p.findIndex(([, z]) => z === Z1 - grow);
    const segs = [];
    // mặt nam (từ góc đông nam về cung), cung, mặt tây
    segs.push([[X1 + grow, Z0 + grow], p[0]]);
    for (let i = 0; i < westEnd; i++) segs.push([p[i], p[i + 1]]);
    // đảo chiều: đi từ đầu bắc mặt tây → vòng góc → mặt nam về phía đông, để chữ đọc xuôi
    // và pháp tuyến các tấm quay ra ngoài
    return segs.reverse().map(([a, b]) => [b, a]);
  };
  // tấm phẳng đứng nối hai điểm, quay ra ngoài
  const panel = (a, b, y0, y1, mat, uScale = 0, uOff = 0) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const geo = new THREE.PlaneGeometry(len, y1 - y0);
    if (uScale) {
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uOff + uv.getX(i) * len * uScale);
    }
    const m = new THREE.Mesh(geo, mat);
    m.position.set((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
    m.rotation.y = Math.atan2(-dz, dx) ; // pháp tuyến +z của plane quay ra ngoài khối
    g.add(m);
    return { m, len };
  };

  // ---- lõi nhà và tầng trệt ----
  prism(outline(-1.2), 0, 4.6, glass); // kính lùi vào
  prism(outline(0), 4.6, 9.4, glass); // tầng 2 (kính sau khung gỗ)
  // cột kem tầng trệt dọc mặt tiền, cách nhau ~3,8 m
  // đặt cột theo quãng đường cộng dồn dọc mặt tiền (cung bo góc có nhiều đoạn ngắn)
  let acc = 0, next = 0;
  for (const [a, b] of frontage(-0.6)) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (next <= acc + len) {
      const t = (next - acc) / len, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.6, 0.7), cream);
      col.position.set(x, 2.3, z); col.castShadow = true; g.add(col);
      next += 3.8;
    }
    acc += len;
  }
  // tường kem đặc ở mặt sau và đầu hồi phía bắc
  prism([[X0, Z1 + 3], [X0, Z1], [X1, Z1], [X1, Z1 + 3]], 0, 4.6, cream);
  // ---- diềm biển hiệu: chạy liền theo mặt nam → cung → mặt tây ----
  let run = 0;
  for (const [a, b] of frontage(0.35)) {
    const { m, len } = panel(a, b, 4.6, 5.9, fasciaMat, 1 / 26, run / 26);
    run += len;
    m.castShadow = true;
  }
  // đèn rọi nhỏ dưới diềm
  const spotMat = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd9a0', emissiveIntensity: 0 });
  for (const [a, b] of frontage(0.2)) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(len / 1.6);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, s = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8), spotMat);
      s.position.set(a[0] + (b[0] - a[0]) * t, 4.55, a[1] + (b[1] - a[1]) * t); g.add(s);
    }
  }
  // ---- tầng 2: lam gỗ đứng + lan can ----
  const latMat = new THREE.MeshStandardMaterial({ map: tex.lattice, alphaMap: tex.latticeAlpha, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7, color: '#c9a57a' });
  run = 0;
  for (const [a, b] of frontage(0.5)) {
    const { len } = panel(a, b, 5.9, 9.2, latMat, 1 / 6.4, run / 6.4);
    run += len;
  }
  for (const [a, b] of frontage(0.55)) {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), wood);
    rail.position.set((a[0] + b[0]) / 2, 6.95, (a[1] + b[1]) / 2); rail.rotation.y = Math.atan2(-dz, dx); g.add(rail);
  }
  // mái đua xám sẫm
  prism(outline(1.3), 9.2, 9.9, darkGrey);

  // ---- các tầng trên: khối chính lùi vào, tháp bo tròn ở góc ----
  prism([[X0 + 4, Z0 - 2], [X0 + 4, Z1], [X1, Z1], [X1, Z0 - 2]], 9.9, 22.7, facade);
  // tháp tròn: tâm ở góc bo
  const TC = [X0 + RC, Z0 - RC], TR = RC + 0.2;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(TR, TR, 12.6, 40, 1, false), mauve);
  tower.position.set(TC[0], 9.9 + 6.3, TC[1]); tower.castShadow = true; g.add(tower);
  for (let f = 0; f < 4; f++) {
    const y = 9.9 + f * 3.2;
    // sàn ban công cong nẹp trắng, lan can đen (nửa vòng phía tây nam)
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(TR + 1.1, TR + 1.1, 0.22, 40, 1, false, Math.PI * 1.35, Math.PI * 0.8), white);
    slab.position.set(TC[0], y + 0.11, TC[1]); g.add(slab);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(TR + 1.05, TR + 1.05, 1.0, 40, 1, true, Math.PI * 1.35, Math.PI * 0.8), railMat);
    rail.material = new THREE.MeshStandardMaterial({ map: tex.rail, alphaMap: tex.railAlpha, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, color: '#2a2b2e' });
    rail.material.map.repeat.set(18, 1); rail.material.alphaMap.repeat.set(18, 1);
    rail.position.set(TC[0], y + 0.72, TC[1]); g.add(rail);
    // cửa sổ khung nâu đỏ
    const win = new THREE.Mesh(new THREE.CylinderGeometry(TR + 0.03, TR + 0.03, 1.9, 40, 1, true, Math.PI * 1.42, Math.PI * 0.66),
      new THREE.MeshStandardMaterial({ map: tex.window, roughness: 0.3, emissiveMap: tex.windowGlow, emissive: '#ffffff', emissiveIntensity: 0 }));
    win.material.map.repeat.set(6, 1); win.material.emissiveMap.repeat.set(6, 1);
    win.position.set(TC[0], y + 1.5, TC[1]); g.add(win);
    win.userData.night = true;
  }
  // mái tháp: chóp tối thấp + khung biển quảng cáo trống
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(TR * 0.6, TR + 0.4, 1.6, 40), darkGrey);
  cap.position.set(TC[0], 22.9, TC[1]); g.add(cap);
  const board = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 0.25), new THREE.MeshStandardMaterial({ color: '#d8dde2', roughness: 0.5 }));
  board.position.set(X0 + 9, 24.6, Z1 + 6); board.rotation.y = Math.PI / 4; g.add(board);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 0.15), railMat);
    leg.position.set(X0 + 9 + s * 2.2 * Math.cos(Math.PI / 4), 21.9, Z1 + 6 - s * 2.2 * Math.sin(Math.PI / 4)); g.add(leg);
  }
  // huy hiệu tròn đỏ trên tháp, quay về ngã ba (hướng tây nam)
  const badge = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), new THREE.MeshStandardMaterial({ map: tex.badge, emissiveMap: tex.badge, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.4 }));
  const ang = (225 * Math.PI) / 180; // hướng tây nam trong mặt phẳng x/z: (-cos45, +sin45)
  badge.position.set(TC[0] - Math.SQRT1_2 * (TR + 1.3), 12.0, TC[1] + Math.SQRT1_2 * (TR + 1.3));
  badge.rotation.y = -Math.PI / 4; // pháp tuyến quay ra (-x, +z)
  void ang;
  g.add(badge);

  // ---- vỉa hè: dù đỏ, bàn ghế sắt, dừa cao ----
  const umbrellaSpots = [];
  for (let z = Z0 - 3; z > Z1 + 1; z -= 4.2) umbrellaSpots.push([X0 - 2.4, z]); // dọc Đô Đốc Bảo
  for (let x = X0 + 6; x < X1 - 3; x += 4.4) umbrellaSpots.push([x, Z0 + 2.4]); // dọc Nguyễn Huệ
  const red = new THREE.MeshStandardMaterial({ color: '#c8262b', roughness: 0.65, side: THREE.DoubleSide });
  const canopy = new THREE.ConeGeometry(1.7, 0.7, 8, 1, true).translate(0, 2.55, 0);
  const pole = new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6).translate(0, 1.3, 0);
  const iCan = new THREE.InstancedMesh(canopy, red, umbrellaSpots.length);
  const iPole = new THREE.InstancedMesh(pole, railMat, umbrellaSpots.length);
  const chairGeo = mergeBoxes([[0.42, 0.04, 0.42, 0, 0.45, 0], [0.42, 0.42, 0.03, 0, 0.67, -0.2], [0.03, 0.45, 0.03, -0.19, 0.22, -0.19], [0.03, 0.45, 0.03, 0.19, 0.22, -0.19], [0.03, 0.45, 0.03, -0.19, 0.22, 0.19], [0.03, 0.45, 0.03, 0.19, 0.22, 0.19]]);
  const tableGeo = mergeBoxes([[0.7, 0.03, 0.7, 0, 0.72, 0], [0.05, 0.72, 0.05, 0, 0.36, 0]]);
  const chairs = [], tables = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
  umbrellaSpots.forEach(([x, z], i) => {
    m4.compose(new THREE.Vector3(x, 0.05, z), q.identity(), one);
    iCan.setMatrixAt(i, m4); iPole.setMatrixAt(i, m4);
    tables.push([x, z]);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; chairs.push([x + Math.cos(a) * 0.75, z + Math.sin(a) * 0.75, -a - Math.PI / 2]); }
  });
  const iChair = new THREE.InstancedMesh(chairGeo, red, chairs.length);
  chairs.forEach(([x, z, r], i) => iChair.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.05, z), q.setFromAxisAngle(Y, r), one)));
  const iTable = new THREE.InstancedMesh(tableGeo, railMat, tables.length);
  tables.forEach(([x, z], i) => iTable.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.05, z), q.identity(), one)));
  iCan.castShadow = iChair.castShadow = true;
  g.add(iCan, iPole, iChair, iTable);
  // nền vỉa hè lát gạch trước quán
  const pave = new THREE.MeshStandardMaterial({ color: '#b8b1a6', roughness: 0.85 });
  prism([[X0 - 5.5, Z0 + 4.5], [X0 - 5.5, Z1], [X0, Z1], [X0, Z0], [X1, Z0], [X1, Z0 + 2.5], [X0 + 9, Z0 + 4.5]], 0, 0.1, pave);
  // dừa cao sát mép đường Đô Đốc Bảo + bồn cây
  const palm = makePalm();
  for (const z of [Z0 - 1, Z0 - 7, Z0 - 13, Z0 - 18.5]) {
    const p = palm.clone(); p.position.set(X0 - 4.9, 0, z); p.rotation.y = z; g.add(p);
  }
  for (const x of [X0 + 8]) { const p = palm.clone(); p.position.set(x, 0, Z0 + 3.8); p.rotation.y = x; g.add(p); }

  // ---- va chạm ----
  grid.fillPoly(outline(0.2), BUILDING);

  scene.add(g);
  return {
    setNight(n) {
      fasciaMat.emissiveIntensity = n * 1.2;
      spotMat.emissiveIntensity = n * 3;
      glass.emissiveIntensity = n * 0.55;
      badge.material.emissiveIntensity = 0.15 + n * 0.8;
      g.traverse((o) => { if (o.userData.night) o.material.emissiveIntensity = n * 0.9; });
      facade.emissiveIntensity = n * 0.8;
    },
  };
}

function makePalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 11, 8).translate(0, 5.5, 0), new THREE.MeshStandardMaterial({ color: '#9a8b78', roughness: 1 }));
  trunk.castShadow = true; g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ color: '#4c8a3c', roughness: 0.85, side: THREE.DoubleSide });
  for (let i = 0; i < 10; i++) {
    const f = new THREE.PlaneGeometry(0.8, 3.6, 1, 5);
    const p = f.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k) + 1.8; p.setXYZ(k, p.getX(k) * (1 - y / 4.2), -0.16 * y * y + 0.35 * y, y); }
    f.computeVertexNormals();
    const m = new THREE.Mesh(f, leaf); m.rotation.y = (i / 10) * Math.PI * 2; m.position.y = 11; m.castShadow = true; g.add(m);
  }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6), new THREE.MeshStandardMaterial({ color: '#8a857c' }));
  bed.position.y = 0.15; g.add(bed);
  return g;
}

function mergeBoxes(list) {
  const pos = [], nrm = [];
  for (const [w, h, d, x, y, z] of list) {
    const b = new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed();
    pos.push(...b.attributes.position.array); nrm.push(...b.attributes.normal.array);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (!opts.linear) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function textures() {
  // diềm dài 26 m (u) × 1,3 m: nền đen hoa văn chữ V, chữ trắng lặp lại hai lần
  const fasciaDraw = (glow) => (x, W, H) => {
    x.fillStyle = glow ? '#000' : '#1e1f22'; x.fillRect(0, 0, W, H);
    if (!glow) {
      x.strokeStyle = '#3a3c40'; x.lineWidth = 6;
      for (let i = -H; i < W + H; i += 40) {
        x.beginPath(); x.moveTo(i, H * 0.12); x.lineTo(i + 20, H * 0.32); x.lineTo(i + 40, H * 0.12); x.stroke();
        x.beginPath(); x.moveTo(i, H * 0.88); x.lineTo(i + 20, H * 0.68); x.lineTo(i + 40, H * 0.88); x.stroke();
      }
    }
    x.fillStyle = glow ? '#fff6e6' : '#f4f1ea';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 ${Math.round(H * 0.5)}px "Be Vietnam Pro", Arial, sans-serif`;
    x.fillText('HIGHLANDS COFFEE', W * 0.27, H * 0.53);
    x.fillText('HIGHLANDS COFFEE', W * 0.77, H * 0.53);
  };
  const fascia = canvasTex(4096, 205, fasciaDraw(false));
  const fasciaGlow = canvasTex(4096, 205, fasciaDraw(true));
  // lam gỗ: ô 6,4 m × 3,3 m, khung ô vuông lồng nhau ở góc trên (kiểu hoa văn trong ảnh)
  const latDraw = (alpha) => (x, W, H) => {
    x.fillStyle = alpha ? '#000' : '#00000000'; x.fillRect(0, 0, W, H);
    x.fillStyle = alpha ? '#fff' : '#c9a57a';
    const bar = (a, b, w, h) => x.fillRect(a, b, w, h);
    // 1 m ≈ 160 px: cột gỗ dày ~15 cm mỗi 1,6 m, thanh lam mảnh xen giữa, dầm ngang trên/dưới
    for (let i = 0; i < 4; i++) bar((i * W) / 4, 0, 26, H);
    for (let i = 0; i < 16; i++) if (i % 4) bar((i * W) / 16, H * 0.3, 10, H * 0.7);
    bar(0, 0, W, 26); bar(0, H * 0.3, W, 18); bar(0, H - 22, W, 22);
    // hoa văn ô vuông lồng nhau ở hai góc trên mỗi khoang
    for (let i = 0; i < 4; i++) {
      const cx = (i * W) / 4;
      for (const s of [0, 1]) {
        const ox = s ? cx + W / 4 - 120 : cx + 26;
        bar(ox, 26, 94, 12); bar(s ? ox + 82 : ox, 26, 12, 110);
        bar(ox + 22, 58, 50, 10); bar(s ? ox + 50 : ox + 22, 58, 10, 56);
      }
    }
  };
  const lattice = canvasTex(1024, 528, latDraw(false));
  const latticeAlpha = canvasTex(1024, 528, latDraw(true), { linear: true });
  // lan can sắt thanh đứng
  const railDraw = (alpha) => (x, W, H) => {
    x.fillStyle = alpha ? '#000' : '#2a2b2e'; x.fillRect(0, 0, W, H);
    x.fillStyle = alpha ? '#fff' : '#2a2b2e';
    x.fillRect(0, 0, W, 8); x.fillRect(0, H - 6, W, 6);
    for (let i = 0; i < W; i += 16) x.fillRect(i, 0, 4, H);
  };
  const rail = canvasTex(64, 64, railDraw(false));
  const railAlpha = canvasTex(64, 64, railDraw(true), { linear: true });
  // cửa sổ khung nâu đỏ
  const winDraw = (glow) => (x, W, H) => {
    x.fillStyle = glow ? '#000' : '#7b3b2c'; x.fillRect(0, 0, W, H);
    x.fillStyle = glow ? '#ffd9a0' : '#2b3138'; x.fillRect(10, 10, W - 20, H - 20);
    x.fillStyle = glow ? '#000' : '#7b3b2c'; x.fillRect(W / 2 - 4, 10, 8, H - 20);
  };
  const window = canvasTex(128, 128, winDraw(false));
  const windowGlow = canvasTex(128, 128, winDraw(true));
  // huy hiệu tròn đỏ (chỉ chữ, không chép logo gốc)
  const badge = canvasTex(256, 256, (x, W) => {
    x.fillStyle = '#b3242a'; x.beginPath(); x.arc(W / 2, W / 2, W / 2, 0, 7); x.fill();
    x.strokeStyle = '#f4efe6'; x.lineWidth = 8; x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 18, 0, 7); x.stroke();
    x.fillStyle = '#f4efe6'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 34px Arial, sans-serif'; x.fillText('HIGHLANDS', W / 2, W / 2 - 18);
    x.font = 'bold 26px Arial, sans-serif'; x.fillText('COFFEE', W / 2, W / 2 + 22);
  });
  badge.wrapS = badge.wrapT = THREE.ClampToEdgeWrapping;
  // mặt ngoài các tầng trên: ô 3 m × 3,2 m, gạch tím nhạt, cửa sổ khung nâu đỏ, nẹp sàn trắng
  const facDraw = (glow) => (x, W, H) => {
    x.fillStyle = glow ? '#000' : '#a58fa6'; x.fillRect(0, 0, W, H);
    if (!glow) { x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1; for (let i = 0; i < W; i += 12) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } }
    x.fillStyle = glow ? '#000' : '#f1eee8'; x.fillRect(0, H - 20, W, 20); // nẹp sàn
    x.fillStyle = glow ? '#000' : '#7b3b2c'; x.fillRect(60, 60, W - 120, 130);
    x.fillStyle = glow ? (Math.random() < 0.6 ? '#ffd9a0' : '#000') : '#2b3138'; x.fillRect(70, 70, W - 140, 110);
    x.fillStyle = glow ? '#000' : '#7b3b2c'; x.fillRect(W / 2 - 4, 70, 8, 110);
  };
  const facade = canvasTex(256, 256, facDraw(false));
  const facadeGlow = canvasTex(256, 256, facDraw(true));
  return { fascia, fasciaGlow, lattice, latticeAlpha, rail, railAlpha, window, windowGlow, badge, facade, facadeGlow };
}
