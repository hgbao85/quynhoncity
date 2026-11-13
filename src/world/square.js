// Quảng trường Nguyễn Tất Thành (phía đông đường An Dương Vương, hướng ra biển).
// Theo ảnh chụp từ trên cao: một sân tròn lớn lát đá xám, viền đá sẫm, một vòng tròn
// trong và các đường hướng tâm; giữa sân là lưới ô cỏ bàn cờ; cột cờ gần lưới cỏ phía
// tượng đài; cột đèn pha cao. Phần còn lại của khu đất là thảm cỏ và cây xanh.
import * as THREE from 'three';
import { pointInPoly } from './geo.js';
import { YAW } from './site.js';

// Tìm tâm và bán kính sân tròn lớn nhất nằm gọn trong đa giác quảng trường (OSM)
export function squareLayout(data) {
  const areas = data.areas.filter((a) => a.kind === 'plaza');
  if (!areas.length) return null;
  const pts = areas.sort((a, b) => b.pts.length - a.pts.length)[0].pts;
  const edgeDist = (x, z) => {
    let m = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return m;
  };
  let best = { d: 0, x: 0, z: 0 };
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) {
    for (let z = Math.min(...zs); z <= Math.max(...zs); z += 2) {
      if (!pointInPoly(x, z, pts)) continue;
      const d = edgeDist(x, z);
      if (d > best.d) best = { d, x, z };
    }
  }
  const R = best.d - 4;
  // hoa văn sân xoay theo trục tượng đài (hướng ngược với mặt tượng)
  return { pts, cx: best.x, cz: best.z, R, toMon: [-Math.sin(YAW), -Math.cos(YAW)] };
}

export function createSquare(scene, L) {
  const g = new THREE.Group();
  if (!L) return { group: g, update() {}, setNight() {} };
  const { cx, cz, R } = L;
  const theta = Math.atan2(L.toMon[1], L.toMon[0]); // hướng về tượng đài
  g.position.set(cx, 0, cz);

  // ---- mặt sân tròn (vẽ hoa văn lên canvas) ----
  const S = 2048, px = S / (2 * R); // pixel trên mét
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  const W = (wx, wz) => [S / 2 + wx * px, S / 2 + wz * px]; // mét (tương đối tâm) → pixel
  x.fillStyle = '#cbc8c2'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 60000; i++) {
    x.fillStyle = Math.random() < 0.5 ? 'rgba(90,90,90,0.12)' : 'rgba(255,255,255,0.18)';
    x.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  // ron lát 1,5 m
  x.strokeStyle = 'rgba(120,116,110,0.35)'; x.lineWidth = 1;
  for (let m = -R; m <= R; m += 1.5) {
    const [a] = W(m, 0); x.beginPath(); x.moveTo(a, 0); x.lineTo(a, S); x.stroke();
    x.beginPath(); x.moveTo(0, a); x.lineTo(S, a); x.stroke();
  }
  const dark = '#5f5c58';
  const ring = (r, w, col = dark) => { x.strokeStyle = col; x.lineWidth = w * px; x.beginPath(); x.arc(S / 2, S / 2, r * px, 0, Math.PI * 2); x.stroke(); };
  ring(R - 1.4, 2.8);
  const rIn = R * 0.56;
  ring(rIn, 2.2);
  ring(rIn - 3, 0.6, '#8d8983');
  // các đường hướng tâm từ vòng trong ra viền ngoài
  x.strokeStyle = dark; x.lineWidth = 0.9 * px;
  for (let i = 0; i < 16; i++) {
    const a = theta + Math.PI / 16 + (i / 16) * Math.PI * 2;
    const [ax, ay] = W(Math.cos(a) * rIn, Math.sin(a) * rIn), [bx, by] = W(Math.cos(a) * (R - 1.4), Math.sin(a) * (R - 1.4));
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
  }
  // nền lưới cỏ (đá sáng hơn) xoay theo trục tượng đài
  const side = rIn * 1.25;
  x.save(); x.translate(S / 2, S / 2); x.rotate(theta);
  x.fillStyle = '#d9d6d0'; x.fillRect((-side / 2 - 1.5) * px, (-side / 2 - 1.5) * px, (side + 3) * px, (side + 3) * px);
  x.strokeStyle = dark; x.lineWidth = 0.8 * px; x.strokeRect((-side / 2 - 1.5) * px, (-side / 2 - 1.5) * px, (side + 3) * px, (side + 3) * px);
  x.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const discGeo = new THREE.CircleGeometry(R, 160);
  // uv.v = (y/R+1)/2 và sau khi xoay nằm ngang y → -z, nên v = 1 ở phía z = -R,
  // khớp với hàng trên cùng của canvas (texture flipY): canvas x → +x, canvas y → +z.
  discGeo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: '#dfe6ff', emissiveIntensity: 0, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -4,
  }));
  disc.position.y = 0.1;
  disc.receiveShadow = true;
  g.add(disc);
  // gờ viền đá quanh sân
  const curb = new THREE.Mesh(new THREE.TorusGeometry(R, 0.18, 6, 160), new THREE.MeshStandardMaterial({ color: '#8a8680', roughness: 0.6 }));
  curb.rotation.x = Math.PI / 2; curb.position.y = 0.06; curb.scale.z = 0.5; g.add(curb);

  // ---- lưới ô cỏ bàn cờ ----
  const n = 7, cell = side / n, tile = cell * 0.74;
  const grass = new THREE.InstancedMesh(new THREE.BoxGeometry(tile, 0.14, tile),
    new THREE.MeshStandardMaterial({ color: '#5f9a45', roughness: 1 }), n * n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -theta);
  let k = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const lx = (i - (n - 1) / 2) * cell, lz = (j - (n - 1) / 2) * cell;
    const wx = lx * Math.cos(theta) - lz * Math.sin(theta), wz = lx * Math.sin(theta) + lz * Math.cos(theta);
    grass.setMatrixAt(k++, m4.compose(new THREE.Vector3(wx, 0.16, wz), q, new THREE.Vector3(1, 1, 1)));
  }
  grass.receiveShadow = true;
  g.add(grass);

  // ---- cột cờ (giữa lưới cỏ và đường An Dương Vương, phía tượng đài) ----
  const fd = side / 2 + 9;
  const fx = Math.cos(theta) * fd, fz = Math.sin(theta) * fd;
  const metal = new THREE.MeshStandardMaterial({ color: '#d7d9dc', roughness: 0.3, metalness: 0.8 });
  const poleH = 26;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, poleH, 12), metal);
  pole.position.set(fx, poleH / 2, fz); pole.castShadow = true; g.add(pole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.8, roughness: 0.3 }));
  knob.position.set(fx, poleH + 0.2, fz); g.add(knob);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.6, 24), new THREE.MeshStandardMaterial({ color: '#7d7974', roughness: 0.5 }));
  base.position.set(fx, 0.3, fz); g.add(base);
  const flagGeo = new THREE.PlaneGeometry(6, 4, 24, 8).translate(3, 0, 0);
  const flagRest = flagGeo.attributes.position.array.slice();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(fx, poleH - 2.4, fz);
  flag.castShadow = true;
  g.add(flag);

  // ---- cột đèn pha cao ----
  const headMat = new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#fff1c8', emissiveIntensity: 0 });
  const mastMat = new THREE.MeshStandardMaterial({ color: '#8b9096', roughness: 0.4, metalness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const a = theta + Math.PI / 4 + (i * Math.PI) / 2;
    const r = rIn + 6, mx = Math.cos(a) * r, mz = Math.sin(a) * r;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 22, 10), mastMat);
    mast.position.set(mx, 11, mz); mast.castShadow = true; g.add(mast);
    const head = new THREE.Group();
    for (let a2 = 0; a2 < 6; a2++) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.25), headMat);
      lamp.position.set((a2 % 3 - 1) * 0.8, Math.floor(a2 / 3) * 0.6, 0);
      head.add(lamp);
    }
    head.position.set(mx, 22.2, mz);
    head.lookAt(0, 0, 0); // hướng vào giữa sân (nhóm chưa gắn vào scene nên toạ độ là toạ độ local)
    g.add(head);
  }

  scene.add(g);

  const update = (t) => {
    // cờ bay phấp phới: sóng chạy từ cán cờ ra mép ngoài
    const p = flagGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const ux = flagRest[i * 3], uy = flagRest[i * 3 + 1];
      const amp = (ux / 6) * 0.5;
      p.setZ(i, Math.sin(ux * 1.1 - t * 4 + uy * 0.3) * amp);
    }
    p.needsUpdate = true;
    flagGeo.computeVertexNormals();
    flag.rotation.y = -theta + Math.PI / 2 + Math.sin(t * 0.3) * 0.25;
  };
  // ban đêm: giả lập ánh đèn pha phủ trắng mặt sân (rẻ hơn nhiều so với đèn thật)
  const setNight = (nt) => { headMat.emissiveIntensity = nt * 4; disc.material.emissiveIntensity = nt * 0.32; };
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
