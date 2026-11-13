// Người đi dạo quanh quảng trường, công viên và bãi biển.
import * as THREE from 'three';
import { createPerson, SHIRTS, PANTS, SKINS, HAIRS } from './character.js';
import { OPEN, KEEP } from './world/geo.js';
import { groundHeight, blocked } from './world/site.js';

export function createCrowd(scene, grid, count = 45) {
  const people = [];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const randomSpot = (cx, cz, r) => {
    for (let k = 0; k < 60; k++) {
      const x = cx + (Math.random() * 2 - 1) * r, z = cz + (Math.random() * 2 - 1) * r;
      const v = grid.get(x, z);
      if ((v === OPEN || v === KEEP) && !blocked(x, z)) return [x, z];
    }
    return null;
  };
  for (let i = 0; i < count; i++) {
    const at = randomSpot(0, 0, 220);
    if (!at) continue;
    const p = createPerson({
      shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIRS),
      backpack: Math.random() < 0.2 ? pick(['#6b5a44', '#2c3e50', '#922b21']) : null,
      height: 1.5 + Math.random() * 0.3, shadow: false,
    });
    p.root.position.set(at[0], groundHeight(at[0], at[1]), at[1]);
    scene.add(p.root);
    people.push({ p, target: null, wait: Math.random() * 3, speed: 0.9 + Math.random() * 0.6, phase: Math.random() * 6 });
  }

  const v = new THREE.Vector3();
  function update(dt, focus) {
    for (const n of people) {
      const pos = n.p.root.position;
      const far = pos.distanceToSquared(focus) > 260 * 260;
      n.p.root.visible = !far;
      if (n.wait > 0) { n.wait -= dt; if (!far) n.p.animate(n.phase, 0); continue; }
      if (!n.target) { n.target = randomSpot(pos.x, pos.z, 35); if (!n.target) { n.wait = 2; continue; } }
      v.set(n.target[0] - pos.x, 0, n.target[1] - pos.z);
      const d = v.length();
      if (d < 0.5) { n.target = null; n.wait = 1 + Math.random() * 6; continue; }
      v.multiplyScalar((n.speed * dt) / d);
      const nx = pos.x + v.x, nz = pos.z + v.z;
      if (!grid.walkable(nx, nz) || (Math.abs(nx) < 4.2 && Math.abs(nz) < 3.2)) { n.target = null; continue; }
      pos.x = nx; pos.z = nz; pos.y = groundHeight(nx, nz);
      n.p.root.rotation.y = Math.atan2(v.x, v.z);
      n.phase += n.speed * dt * 2.6;
      if (!far) n.p.animate(n.phase, 0.65);
    }
  }
  return { update };
}
