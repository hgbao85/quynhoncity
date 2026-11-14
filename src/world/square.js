// Quảng trường Nguyễn Tất Thành (phía đông đường An Dương Vương, hướng ra biển).
// Hình dạng đo từ ảnh vệ tinh (Esri World Imagery), toạ độ mét theo gốc tượng đài:
//   - Sân lát đá xám hình nửa tròn: tâm nằm ngay mép đường An Dương Vương (có bệ cột cờ),
//     vòng đá sẫm bán kính ~76 m, các tia đá sẫm toả ra phía biển tới mép sân (~115 m).
//   - Lưới ô cỏ vuông nằm trong vòng, sát phía đường.
//   - Phía đông bắc và phía nam là rừng cây; mép đông giáp đường ven biển.
import * as THREE from 'three';
import { pointInPoly } from './geo.js';

// Viền sân lát đá (toạ độ thế giới), đi theo mép đường An Dương Vương rồi vòng theo mép cây
const PAVED = [
  [112, -48], [26, 138], // mép đường An Dương Vương
  [40, 150], [80, 152], [120, 150], [150, 145], [166, 140], // mép cây phía nam
  [185, 118], [200, 75], // mép đường ven biển
  [190, 62], [178, 42], [167, 22], [160, 0], [158, -25], [150, -40], [130, -50], // mép rừng cây đông bắc
];
// Dải cỏ nhỏ gần đường ven biển
const LAWN_STRIP = [[176, 80], [181, 83], [170, 117], [165, 115]];

export function squareLayout() {
  const [ax, az] = PAVED[0], [bx, bz] = PAVED[1];
  const L = Math.hypot(bx - ax, bz - az);
  const d = [(bx - ax) / L, (bz - az) / L]; // dọc đường An Dương Vương (bắc → nam)
  const n = [-d[1], d[0]]; // vuông góc, hướng ra biển
  if (n[0] < 0) { n[0] = -n[0]; n[1] = -n[1]; }
  // tâm nửa tròn: điểm trên mép đường, đo được ở z ≈ 42
  const t = (42 - az) / d[1];
  const C = [ax + d[0] * t, az + d[1] * t];
  const isPaved = (x, z) => x > 20 && x < 205 && z > -55 && z < 155 && pointInPoly(x, z, PAVED);
  return { paved: PAVED, C, d, n, R1: 76, R2: 118, isPaved };
}

export function createSquare(scene, L) {
  const g = new THREE.Group();
  if (!L) return { group: g, update() {}, setNight() {} };
  const { C, d, n, R1, R2 } = L;
  const nAng = Math.atan2(n[1], n[0]);

  // ---- mặt sân: một đa giác, hoa văn vẽ trên canvas phủ theo hộp bao ----
  const xs = PAVED.map((p) => p[0]), zs = PAVED.map((p) => p[1]);
  const X0 = Math.min(...xs) - 2, Z0 = Math.min(...zs) - 2, X1 = Math.max(...xs) + 2, Z1 = Math.max(...zs) + 2;
  const S = 2048, px = S / Math.max(X1 - X0, Z1 - Z0);
  const W = (x, z) => [(x - X0) * px, (z - Z0) * px];
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#c9c0b9'; x.fillRect(0, 0, S, S); // đá lát xám ánh hồng (theo Street View)
  for (let i = 0; i < 70000; i++) {
    x.fillStyle = Math.random() < 0.5 ? 'rgba(90,90,90,0.12)' : 'rgba(255,255,255,0.18)';
    x.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  // ron lát 1,5 m theo hướng đường
  x.save();
  const [cx0, cy0] = W(C[0], C[1]);
  x.translate(cx0, cy0); x.rotate(Math.atan2(d[1], d[0]));
  x.strokeStyle = 'rgba(120,116,110,0.35)'; x.lineWidth = 1;
  for (let m = -260; m <= 260; m += 1.5) {
    x.beginPath(); x.moveTo(m * px, -260 * px); x.lineTo(m * px, 260 * px); x.stroke();
    x.beginPath(); x.moveTo(-260 * px, m * px); x.lineTo(260 * px, m * px); x.stroke();
  }
  x.restore();
  const dark = '#5f5c58';
  // vòng đá sẫm (nửa vòng phía biển) — viền răng cưa hai bên như ảnh vệ tinh
  x.strokeStyle = dark; x.lineWidth = 3 * px;
  x.beginPath(); x.arc(cx0, cy0, R1 * px, nAng - Math.PI / 2, nAng + Math.PI / 2); x.stroke();
  x.fillStyle = dark;
  for (let a = nAng - Math.PI / 2; a <= nAng + Math.PI / 2; a += 1.6 / R1) {
    for (const r of [R1 - 2.2, R1 + 2.2]) {
      x.beginPath(); x.arc(cx0 + Math.cos(a) * r * px, cy0 + Math.sin(a) * r * px, 0.55 * px, 0, 7); x.fill();
    }
  }
  // các tia toả ra từ vòng tới mép sân, mỗi tia cách nhau 20°
  x.lineWidth = 1.2 * px;
  for (let k = -4; k <= 4; k++) {
    const a = nAng + (k * 20 * Math.PI) / 180;
    const r0 = Math.abs(k) >= 4 ? 18 : R1 + 1.5;
    x.beginPath(); x.moveTo(cx0 + Math.cos(a) * r0 * px, cy0 + Math.sin(a) * r0 * px);
    x.lineTo(cx0 + Math.cos(a) * (R2 + 30) * px, cy0 + Math.sin(a) * (R2 + 30) * px); x.stroke();
  }
  // dải cỏ nhỏ
  x.fillStyle = '#5f9a45'; x.beginPath(); LAWN_STRIP.forEach(([a, b], i) => { const [u, v] = W(a, b); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;

  const shape = new THREE.Shape(PAVED.map(([a, b]) => new THREE.Vector2(a, -b)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2); // (a, -b) → (a, 0, b)
  const pos = geo.attributes.position, uv = [];
  for (let i = 0; i < pos.count; i++) {
    const [u, v] = W(pos.getX(i), pos.getZ(i));
    uv.push(u / S, 1 - v / S);
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const pavedMat = new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: '#dfe6ff', emissiveIntensity: 0, roughness: 0.6,
    polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -4,
  });
  const paved = new THREE.Mesh(geo, pavedMat);
  paved.position.y = 0.1;
  paved.receiveShadow = true;
  g.add(paved);

  // ---- lưới ô cỏ: ô 4 m, bước 7,5 m, thẳng hàng với đường; nằm trong vòng đá ----
  const spots = [];
  for (let s = -60; s <= 75; s += 7.5) {
    for (let v = 10; v <= R1; v += 7.5) {
      const r = Math.hypot(s, v);
      if (r > R1 - 7 || s < -42) continue;
      spots.push([C[0] + d[0] * s + n[0] * v, C[1] + d[1] * s + n[1] * v]);
    }
  }
  const grass = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 0.05, 4), // ô cỏ gần như bằng mặt sân
    new THREE.MeshStandardMaterial({ color: '#5f9a45', roughness: 1 }), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(d[1], d[0]));
  spots.forEach(([a, b], i) => grass.setMatrixAt(i, m4.compose(new THREE.Vector3(a, 0.12, b), q, new THREE.Vector3(1, 1, 1))));
  grass.receiveShadow = true;
  g.add(grass);

  // ---- cột cờ trên bệ lát gạch đỏ ở tâm nửa tròn ----
  const fx = C[0] + n[0] * 6, fz = C[1] + n[1] * 6;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(8, 0.35, 8), new THREE.MeshStandardMaterial({ color: '#b5583f', roughness: 0.6 }));
  pad.position.set(fx, 0.17, fz); pad.quaternion.copy(q); g.add(pad);
  const metal = new THREE.MeshStandardMaterial({ color: '#d7d9dc', roughness: 0.3, metalness: 0.8 });
  const poleH = 26;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, poleH, 12), metal);
  pole.position.set(fx, poleH / 2, fz); pole.castShadow = true; g.add(pole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.8, roughness: 0.3 }));
  knob.position.set(fx, poleH + 0.2, fz); g.add(knob);
  const flagGeo = new THREE.PlaneGeometry(6, 4, 24, 8).translate(3, 0, 0);
  const flagRest = flagGeo.attributes.position.array.slice();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(fx, poleH - 2.4, fz);
  flag.castShadow = true;
  g.add(flag);

  // ---- cột đèn pha cao đặt trên vòng đá ----
  const headMat = new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#fff1c8', emissiveIntensity: 0 });
  const mastMat = new THREE.MeshStandardMaterial({ color: '#8b9096', roughness: 0.4, metalness: 0.7 });
  // bốn cột trên vòng đá và một cột cao giữa sân
  for (const [deg, rr] of [[-60, R1 + 6], [-20, R1 + 6], [20, R1 + 6], [60, R1 + 6], [8, 46]]) {
    const a = nAng + (deg * Math.PI) / 180;
    const mx = C[0] + Math.cos(a) * rr, mz = C[1] + Math.sin(a) * rr;
    if (!L.isPaved(mx, mz)) continue;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 22, 10), mastMat);
    mast.position.set(mx, 11, mz); mast.castShadow = true; g.add(mast);
    const head = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.25), headMat);
      lamp.position.set((k % 3 - 1) * 0.8, Math.floor(k / 3) * 0.6, 0);
      head.add(lamp);
    }
    head.position.set(mx, 22.2, mz);
    head.lookAt(C[0], 0, C[1]);
    g.add(head);
  }

  scene.add(g);

  const update = (t, pos) => {
    if (pos && Math.hypot(pos.x - fx, pos.z - fz) > 400) return; // xa thì không cần cờ bay
    // cờ bay: sóng chạy từ cán cờ ra mép ngoài, hướng gió từ biển thổi vào
    const p = flagGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const ux = flagRest[i * 3], uy = flagRest[i * 3 + 1];
      p.setZ(i, Math.sin(ux * 1.1 - t * 4 + uy * 0.3) * (ux / 6) * 0.5);
    }
    p.needsUpdate = true;
    flagGeo.computeVertexNormals();
    flag.rotation.y = -Math.atan2(-n[1], -n[0]) + Math.sin(t * 0.3) * 0.25;
  };
  // ban đêm: giả lập ánh đèn pha phủ trắng mặt sân (rẻ hơn nhiều so với đèn thật)
  const setNight = (nt) => { headMat.emissiveIntensity = nt * 4; pavedMat.emissiveIntensity = nt * 0.32; };
  return { group: g, update, setNight };
}

function flagTexture() {
  const c = document.createElement('canvas'); c.width = 300; c.height = 200;
  const x = c.getContext('2d');
  x.fillStyle = '#da251d'; x.fillRect(0, 0, 300, 200);
  x.fillStyle = '#ffff00'; x.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 24 : 60, a = -Math.PI / 2 + (i * Math.PI) / 5;
    x.lineTo(150 + Math.cos(a) * r, 100 + Math.sin(a) * r);
  }
  x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
