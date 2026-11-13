// Cây trang trí dựng bằng hình học: hoa sen (bông nở, nụ, lá), cau cảnh trồng chậu.
import * as THREE from 'three';

const pink = new THREE.Color('#f06a9b'), pale = new THREE.Color('#fff2f6');

// Một cánh sen: hình giọt nước, cong lòng chảo, gốc trắng, ngọn hồng đậm.
function petalGeometry(len, wid) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(wid * 0.9, len * 0.15, wid * 0.75, len * 0.75, 0, len);
  shape.bezierCurveTo(-wid * 0.75, len * 0.75, -wid * 0.9, len * 0.15, 0, 0);
  const g = new THREE.ShapeGeometry(shape, 10);
  const pos = g.attributes.position, col = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), t = y / len;
    // cong vào trong theo chiều dọc và lõm ở giữa theo chiều ngang
    pos.setZ(i, 0.35 * len * t * t + 0.6 * (x * x) / wid);
    c.copy(pale).lerp(pink, Math.min(1, t * 1.3));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const petalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
const stemMat = new THREE.MeshStandardMaterial({ color: '#5d8a3a', roughness: 0.8 });
const leafMat = new THREE.MeshStandardMaterial({ color: '#4f8f3a', roughness: 0.6, side: THREE.DoubleSide });
const podMat = new THREE.MeshStandardMaterial({ color: '#d8c64a', roughness: 0.7 });

// Bông sen nở: ba vòng cánh, đài sen vàng ở giữa. Đường kính ~ size.
export function lotusFlower(size = 0.45) {
  const g = new THREE.Group();
  const rings = [[6, 0.42, 0.25], [8, 0.5, 0.75], [10, 0.5, 1.15]]; // số cánh, độ dài (theo size), độ ngả ra
  rings.forEach(([n, l, tilt], k) => {
    const geo = petalGeometry(size * l, size * l * 0.42);
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(geo, petalMat);
      const a = (i / n) * Math.PI * 2 + k * 0.4;
      p.rotation.order = 'YXZ';
      p.rotation.set(-Math.PI / 2 + (Math.PI / 2 - tilt), a, 0);
      // xoay để mặt lõm hướng vào tâm
      p.rotateX(-0.1);
      g.add(p);
    }
  });
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.11, size * 0.07, size * 0.1, 14), podMat);
  pod.position.y = size * 0.08;
  g.add(pod);
  return g;
}

// Nụ sen: hình giọt nước nhọn, hồng đậm ở đầu
export function lotusBud(size = 0.3) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, 0.8)) * size * 0.32 * (1 - t * 0.3), t * size));
  }
  const geo = new THREE.LatheGeometry(pts, 16);
  const col = [], c = new THREE.Color(), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { c.copy(pale).lerp(pink, Math.min(1, (pos.getY(i) / size) * 1.4)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(geo, petalMat);
}

// Lá sen: đĩa tròn hơi khum, có rãnh gân toả ra từ tâm
export function lotusLeaf(r = 0.5) {
  const geo = new THREE.CircleGeometry(r, 28, 0.25, Math.PI * 2 - 0.25);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), d = Math.hypot(x, y) / r, a = Math.atan2(y, x);
    pos.setZ(i, -0.18 * r * d * d + 0.015 * r * Math.sin(a * 14) * d);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, leafMat);
}

// Một khóm sen: thân cong, bông nở, nụ và lá xếp ngẫu nhiên có kiểm soát
export function lotusCluster(rand, { flowers = 3, buds = 2, leaves = 5, h = 1.4, spread = 0.8 } = {}) {
  const g = new THREE.Group();
  const stem = (x, z, top) => {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x * 0.3, 0, z * 0.3), new THREE.Vector3(x * 0.6, top * 0.55, z * 0.6), new THREE.Vector3(x, top, z));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.018, 5), stemMat));
  };
  const spot = () => { const a = rand() * Math.PI * 2, r = (0.25 + rand() * 0.75) * spread; return [Math.cos(a) * r, Math.sin(a) * r]; };
  for (let i = 0; i < leaves; i++) {
    const [x, z] = spot(), y = h * (0.35 + rand() * 0.35);
    stem(x, z, y);
    const l = lotusLeaf(0.32 + rand() * 0.25);
    l.position.set(x, y, z);
    l.rotation.set((rand() - 0.5) * 0.7, rand() * 6.28, (rand() - 0.5) * 0.7);
    g.add(l);
  }
  for (let i = 0; i < flowers + buds; i++) {
    const [x, z] = spot(), y = h * (0.75 + rand() * 0.35);
    stem(x, z, y);
    const f = i < flowers ? lotusFlower(0.6 + rand() * 0.15) : lotusBud(0.32 + rand() * 0.08);
    f.position.set(x, y, z);
    f.rotation.set((rand() - 0.5) * 0.4, rand() * 6.28, (rand() - 0.5) * 0.4);
    g.add(f);
  }
  return g;
}

// Cau cảnh trong chậu (geometry gộp sẵn để dùng InstancedMesh): trả về { pot, trunk, fronds }
export function pottedPalmGeometries() {
  const pot = new THREE.CylinderGeometry(0.42, 0.3, 0.7, 16).translate(0, 0.35, 0);
  const rim = new THREE.TorusGeometry(0.42, 0.05, 6, 16).rotateX(Math.PI / 2).translate(0, 0.7, 0);
  const trunk = new THREE.CylinderGeometry(0.07, 0.1, 1.5, 7).translate(0, 1.4, 0);
  const fr = [];
  for (let i = 0; i < 9; i++) {
    const f = new THREE.PlaneGeometry(0.34, 1.3, 1, 6);
    const p = f.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k) + 0.65; // 0..1.3 dọc lá
      p.setXYZ(k, p.getX(k) * (1 - y / 1.5), 0.45 * y - 0.42 * y * y, y);
    }
    f.rotateY((i / 9) * Math.PI * 2);
    f.translate(0, 2.1, 0);
    fr.push(f);
  }
  return { pot: mergeGeos([pot, rim]), trunk, fronds: mergeGeos(fr) };
}

function mergeGeos(list) {
  const pos = [], nrm = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    g.computeVertexNormals();
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}
