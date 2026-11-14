// Người đi dạo quanh người chơi: trên sân, công viên, vỉa hè, bãi biển. Ai bị bỏ lại quá xa
// (đi xa hoặc dịch chuyển nhanh) sẽ xuất hiện lại gần người chơi, ngoài tầm nhìn gần.
import * as THREE from 'three';
import { createPerson, SHIRTS, PANTS, SKINS, HAIRS } from './character.js';
import { OPEN, KEEP, FREE } from './world/geo.js';
import { groundHeight, blocked } from './world/site.js';

const FAR = 260, RESPAWN = 320;

export function createCrowd(scene, grid, count = 45) {
  const people = [];
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
    const n = { p, target: null, wait: 0, speed: 0.9 + Math.random() * 0.6, phase: Math.random() * 6 };
    place(n, at);
    scene.add(p.root);
    people.push(n);
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
    for (const n of people) {
      const pos = n.p.root.position;
      const far = pos.distanceToSquared(focus) > FAR * FAR;
      n.p.root.visible = !far;
      if (far) continue;
      if (n.wait > 0) { n.wait -= dt; n.p.animate(n.phase, 0); continue; }
      if (!n.target) { n.target = randomSpot(pos.x, pos.z, 35); if (!n.target) { n.wait = 2; continue; } }
      v.set(n.target[0] - pos.x, 0, n.target[1] - pos.z);
      const d = v.length();
      if (d < 0.5) { n.target = null; n.wait = 1 + Math.random() * 6; continue; }
      v.multiplyScalar((n.speed * dt) / d);
      const nx = pos.x + v.x, nz = pos.z + v.z;
      if (!okCell(nx, nz) && !grid.walkable(nx, nz)) { n.target = null; continue; }
      if (blocked(nx, nz)) { n.target = null; continue; }
      pos.x = nx; pos.z = nz; pos.y = groundHeight(nx, nz);
      n.p.root.rotation.y = Math.atan2(v.x, v.z);
      n.phase += n.speed * dt * 2.6;
      n.p.animate(n.phase, 0.65);
    }
  }
  return { update, relocate };
}
