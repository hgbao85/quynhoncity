// Người đi dạo quanh người chơi: trên sân, công viên, vỉa hè, bãi biển. Ai bị bỏ lại quá xa
// (đi xa hoặc dịch chuyển nhanh) sẽ xuất hiện lại gần người chơi, ngoài tầm nhìn gần.
import * as THREE from 'three';
import { createPerson, PART_GEO, SHIRTS, PANTS, SKINS, HAIRS } from './character.js';
import { OPEN, KEEP, FREE } from './world/geo.js';
import { groundHeight, blocked } from './world/site.js';

const FAR = 260, RESPAWN = 320;

// Mỗi người có 11–12 bộ phận; vẽ riêng từng cái thì 45 người tốn hơn 500 lần vẽ mỗi khung hình.
// Ở đây mỗi loại bộ phận là một InstancedMesh (màu theo từng người), cả đám đông chỉ tốn 12 lần vẽ.
// Khung xương (Group) của từng người vẫn giữ để tính động tác, nhưng không gắn vào cảnh.
const PARTS = [['torso', 'torso'], ['head', 'head'], ['hair', 'hair'], ['armL', 'arm'], ['armR', 'arm'], ['sleeveL', 'sleeve'], ['sleeveR', 'sleeve'],
  ['legL', 'leg'], ['legR', 'leg'], ['shoeL', 'shoe'], ['shoeR', 'shoe'], ['pack', 'pack']];

export function createCrowd(scene, grid, count = 45) {
  const people = [];
  const partMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
  const inst = PARTS.map(([, g]) => {
    const m = new THREE.InstancedMesh(PART_GEO[g], partMat, count);
    m.frustumCulled = false; // vị trí thay đổi liên tục; số người hiện được giới hạn bằng count
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color('#ffffff')); // tạo sẵn bộ màu để không phải biên dịch lại shader về sau
    m.count = 0;
    scene.add(m);
    return m;
  });
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), col = new THREE.Color();
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const okCell = (x, z) => { const v = grid.get(x, z); return (v === OPEN || v === KEEP || v === FREE) && !blocked(x, z); };
  const randomSpot = (cx, cz, r, minR = 0) => {
    for (let k = 0; k < 80; k++) {
      const a = Math.random() * Math.PI * 2, d = minR + Math.random() * (r - minR);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      // ưu tiên sân, công viên; vẫn chấp nhận đất trống (vỉa hè) nếu thử nhiều lần không được
      const v = grid.get(x, z);
      if ((v === OPEN || v === KEEP || (k > 40 && v === FREE)) && !blocked(x, z)) return [x, z];
    }
    return null;
  };
  const place = (n, at) => { n.p.root.position.set(at[0], groundHeight(at[0], at[1]), at[1]); n.target = null; n.wait = Math.random() * 3; };

  for (let i = 0; i < count; i++) {
    const at = randomSpot(0, 0, 220);
    if (!at) continue;
    const p = createPerson({
      shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIRS),
      backpack: Math.random() < 0.2 ? pick(['#6b5a44', '#2c3e50', '#922b21']) : null,
      height: 1.5 + Math.random() * 0.3, shadow: false,
    });
    const n = { p, target: null, wait: 0, speed: 0.9 + Math.random() * 0.6, phase: Math.random() * 6, slot: -1 };
    place(n, at);
    people.push(n);
  }
  // màu từng bộ phận chỉ đặt lại khi người đó đổi vị trí trong danh sách đang hiện
  function writeColors(n, i) {
    PARTS.forEach(([name], k) => inst[k].setColorAt(i, col.set(n.p.colors[name] || '#000000')));
    n.slot = i;
  }

  // dời cả đám đông tới quanh một điểm (sau khi dịch chuyển nhanh)
  function relocate(focus) {
    for (const n of people) { const at = randomSpot(focus.x, focus.z, 200, 15); if (at) place(n, at); }
  }

  const v = new THREE.Vector3();
  let k = 0;
  function update(dt, focus) {
    // mỗi khung hình kiểm tra một người có bị bỏ lại quá xa không
    if (people.length) {
      const n = people[k++ % people.length];
      if (n.p.root.position.distanceTo(focus) > RESPAWN) { const at = randomSpot(focus.x, focus.z, 220, 60); if (at) place(n, at); }
    }
    let shown = 0, recolor = false;
    for (const n of people) {
      const pos = n.p.root.position;
      const far = pos.distanceToSquared(focus) > FAR * FAR;
      if (far) { n.slot = -1; continue; }
      const i = shown++;
      if (n.slot !== i) { writeColors(n, i); recolor = true; }
      step(n, pos, dt);
      // chép vị trí từng bộ phận sau khi tính động tác
      n.p.root.updateMatrixWorld(true);
      PARTS.forEach(([name], k) => { const m = n.p.meshes[name]; inst[k].setMatrixAt(i, m ? m.matrixWorld : ZERO); });
    }
    for (const m of inst) {
      m.count = shown;
      m.instanceMatrix.needsUpdate = true;
      if (recolor && m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
  function step(n, pos, dt) {
    if (n.wait > 0) { n.wait -= dt; n.p.animate(n.phase, 0); return; }
    if (!n.target) { n.target = randomSpot(pos.x, pos.z, 35); if (!n.target) { n.wait = 2; return; } }
    v.set(n.target[0] - pos.x, 0, n.target[1] - pos.z);
    const d = v.length();
    if (d < 0.5) { n.target = null; n.wait = 1 + Math.random() * 6; return; }
    v.multiplyScalar((n.speed * dt) / d);
    const nx = pos.x + v.x, nz = pos.z + v.z;
    if (!okCell(nx, nz) && !grid.walkable(nx, nz)) { n.target = null; return; }
    if (blocked(nx, nz)) { n.target = null; return; }
    pos.x = nx; pos.z = nz; pos.y = groundHeight(nx, nz);
    n.p.root.rotation.y = Math.atan2(v.x, v.z);
    n.phase += n.speed * dt * 2.6;
    n.p.animate(n.phase, 0.65);
  }
  return { update, relocate };
}
