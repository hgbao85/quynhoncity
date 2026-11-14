// Hình khối các cây cầu (dữ liệu và độ cao mặt cầu ở bridges.js): mặt cầu trải nhựa, thành dầm bê tông,
// lan can hai bên, vạch giữa đường, trụ cầu xuống nước, cột đèn (cầu dài). Mọi cầu gộp chung vào vài
// lưới (một lưới mỗi vật liệu) để chỉ tốn vài lần vẽ.
import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { getBridges, deckAt, LONG_BRIDGE } from './bridges.js';

const STEP = 4; // mét giữa hai mặt cắt dọc cầu

// lấy mẫu đường tim cầu mỗi STEP mét: vị trí, hướng, độ cao mặt cầu
function samples(b) {
  const out = [];
  const n = Math.max(2, Math.ceil(b.L / STEP) + 1);
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const s = (b.L * k) / (n - 1);
    while (seg < b.pts.length - 2 && b.cum[seg + 1] < s) seg++;
    const [ax, az] = b.pts[seg], [bx, bz] = b.pts[seg + 1];
    const sl = b.cum[seg + 1] - b.cum[seg] || 1, t = (s - b.cum[seg]) / sl;
    const dx = (bx - ax) / sl, dz = (bz - az) / sl;
    out.push({ s, x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx, dz, y: deckAt(b, s) });
  }
  return out;
}

class Strip {
  constructor() { this.pos = []; this.idx = []; }
  // thêm một dải nối các mặt cắt: mỗi mặt cắt là danh sách điểm [x, y, z] cùng số lượng
  add(sections, closed = false) {
    const m = sections[0].length, base = this.pos.length / 3;
    for (const sec of sections) for (const p of sec) this.pos.push(p[0], p[1], p[2]);
    for (let i = 0; i + 1 < sections.length; i++) {
      for (let j = 0; j < (closed ? m : m - 1); j++) {
        const j2 = (j + 1) % m;
        const a = base + i * m + j, b = base + i * m + j2, c = base + (i + 1) * m + j, d = base + (i + 1) * m + j2;
        this.idx.push(a, c, b, b, c, d);
      }
    }
  }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}

export function createBridges(scene) {
  const group = new THREE.Group();
  const asphalt = new THREE.MeshStandardMaterial({ color: '#4a4d52', roughness: 0.95 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#c9c4ba', roughness: 0.85, side: THREE.DoubleSide });
  const rail = new THREE.MeshStandardMaterial({ color: '#e8e4dc', roughness: 0.6, side: THREE.DoubleSide });
  const paint = new THREE.MeshStandardMaterial({ color: '#f3f0e6', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#ffd9a0', emissiveIntensity: 0 });

  const road = new Strip(), body = new Strip(), rails = new Strip(), lines = new Strip();
  const piers = [], lamps = [];
  for (const b of getBridges()) {
    const S = samples(b), hw = b.hw, long = b.L >= LONG_BRIDGE, thick = long ? 1.8 : 0.8;
    const side = (p, o, dy) => [p.x - p.dz * o, p.y + dy, p.z + p.dx * o];
    // mặt đường (hơi thấp hơn vai cầu một chút)
    road.add(S.map((p) => [side(p, -hw + 0.5, 0), side(p, hw - 0.5, 0)]));
    // vai cầu, thành dầm và đáy dầm: một mặt cắt kín
    body.add(S.map((p) => [side(p, -hw + 0.5, 0), side(p, -hw, 0.2), side(p, -hw, -thick), side(p, hw, -thick), side(p, hw, 0.2), side(p, hw - 0.5, 0)]));
    // lan can hai bên (tấm đặc thấp + tay vịn)
    for (const o of [-hw + 0.15, hw - 0.15]) rails.add(S.map((p) => [side(p, o, 0.2), side(p, o, 1.05)]));
    // vạch giữa đường nét đứt
    for (let i = 0; i + 1 < S.length; i += 2) {
      const a = S[i], c = S[i + 1];
      lines.add([[side(a, -0.12, 0.03), side(a, 0.12, 0.03)], [side(c, -0.12, 0.03), side(c, 0.12, 0.03)]]);
    }
    // trụ cầu: cách đều, chỉ ở chỗ thấp (nước, bãi bồi); cầu dài có hai trụ mỗi hàng
    const span = long ? 44 : 22;
    for (let s = span; s < b.L - span / 2; s += span) {
      const p = S[Math.round(s / (b.L / (S.length - 1)))];
      const ground = heightAt(p.x, p.z);
      const bottom = Math.min(ground, 0) - 2, top = p.y - thick;
      if (top - bottom < 1.5) continue;
      for (const o of long ? [-hw * 0.55, hw * 0.55] : [0]) piers.push([...side(p, o, 0).slice(0, 1), bottom, side(p, o, 0)[2], top - bottom, Math.atan2(p.dx, p.dz)]);
    }
    // cột đèn hai bên so le (cầu dài và cầu vừa)
    if (b.L > 120) for (let s = 20, k = 0; s < b.L - 10; s += 36, k++) {
      const p = S[Math.round(s / (b.L / (S.length - 1)))];
      const o = (k % 2 ? 1 : -1) * (hw - 0.4);
      const q = side(p, o, 0);
      lamps.push([q[0], q[1], q[2], Math.atan2(p.dx, p.dz) + (o > 0 ? Math.PI : 0)]);
    }
  }
  const setNight = (n) => { lampMat.emissiveIntensity = n * 2.2; };
  if (!road.pos.length) return { group, count: 0, setNight };
  group.add(road.mesh(asphalt), body.mesh(concrete), rails.mesh(rail), lines.mesh(paint));
  group.children[3].castShadow = false;

  // trụ: hộp bê tông dẹt, một InstancedMesh
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  if (piers.length) {
    const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 1, 3.2).translate(0, 0.5, 0), concrete, piers.length);
    piers.forEach(([x, y, z, h, yaw], i) => pm.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, yaw), new THREE.Vector3(1, h, 1))));
    pm.castShadow = true;
    group.add(pm);
  }
  // cột đèn: thân + cần vươn ra giữa đường + bóng đèn
  if (lamps.length) {
    const pole = new THREE.CylinderGeometry(0.09, 0.13, 9, 6).translate(0, 4.5, 0);
    const arm = new THREE.BoxGeometry(0.1, 0.1, 2.2).translate(0, 8.9, 1.05);
    const head = new THREE.BoxGeometry(0.35, 0.18, 0.7).translate(0, 8.8, 2.1);
    const poles = new THREE.InstancedMesh(mergeTwo(pole, arm), rail, lamps.length);
    const heads = new THREE.InstancedMesh(head, lampMat, lamps.length);
    lamps.forEach(([x, y, z, yaw], i) => {
      m4.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, yaw), new THREE.Vector3(1, 1, 1));
      poles.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
    });
    group.add(poles, heads);
  }
  scene.add(group);
  return { group, count: getBridges().length, setNight };
}

// gộp hai hình (cùng thuộc tính position/normal/uv) thành một
function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const A = a.attributes[name], B = b.attributes[name];
    const arr = new Float32Array(A.array.length + B.array.length);
    arr.set(A.array); arr.set(B.array, A.array.length);
    g.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const ia = a.index.array, ib = b.index.array, off = a.attributes.position.count;
  const idx = new Uint32Array(ia.length + ib.length);
  idx.set(ia); for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + off;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
