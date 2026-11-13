// Người chơi: điều khiển bằng bàn phím (WASD/mũi tên + Shift chạy) hoặc joystick ảo,
// camera góc nhìn thứ ba xoay bằng kéo chuột / vuốt màn hình.
import * as THREE from 'three';
import { createPerson } from './character.js';
import { groundHeight, blocked, toWorld, YAW } from './world/site.js';

export { groundHeight };

export function createPlayer(scene, camera, grid, dom) {
  const person = createPerson({ shirt: '#2f7f86', pants: '#45556e', backpack: '#6b5a44' });
  scene.add(person.root);

  const s = {
    pos: new THREE.Vector3(toWorld(0, 26)[0], 0, toWorld(0, 26)[1]), facing: YAW + Math.PI, speed: 0, phase: 0,
    camYaw: YAW, camPitch: 0.32, camDist: 9, mana: 100,
  };
  const keys = new Set();
  const joy = { x: 0, y: 0, active: false };

  addEventListener('keydown', (e) => { if (e.target.tagName !== 'INPUT') keys.add(e.code); });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // kéo để xoay camera
  let drag = null;
  dom.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    s.camYaw -= (e.clientX - drag.x) * 0.006;
    s.camPitch = THREE.MathUtils.clamp(s.camPitch + (e.clientY - drag.y) * 0.004, 0.05, 1.25);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const end = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
  dom.addEventListener('pointerup', end); dom.addEventListener('pointercancel', end);
  dom.addEventListener('wheel', (e) => { s.camDist = THREE.MathUtils.clamp(s.camDist * (1 + e.deltaY * 0.001), 3, 40); }, { passive: true });

  // joystick ảo
  const base = document.getElementById('joystick'), knob = base.querySelector('.knob');
  let jid = null;
  const setKnob = (e) => {
    const r = base.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / R; joy.y = dy / R;
  };
  base.addEventListener('pointerdown', (e) => { jid = e.pointerId; base.setPointerCapture(jid); joy.active = true; setKnob(e); e.stopPropagation(); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === jid) setKnob(e); });
  const jend = (e) => { if (e.pointerId !== jid) return; jid = null; joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; };
  base.addEventListener('pointerup', jend); base.addEventListener('pointercancel', jend);

  const free = (x, z) => {
    const r = 0.35;
    if (blocked(x, z)) return false; // bệ tượng, phù điêu
    return grid.walkable(x + r, z) && grid.walkable(x - r, z) && grid.walkable(x, z + r) && grid.walkable(x, z - r);
  };

  function update(dt) {
    let ix = 0, iz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (joy.active) { ix += joy.x; iz += joy.y; }
    let mag = Math.min(1, Math.hypot(ix, iz));
    const wantRun = keys.has('ShiftLeft') || keys.has('ShiftRight') || (joy.active && mag > 0.92);
    const running = wantRun && mag > 0.1 && s.mana > 2;
    s.mana = THREE.MathUtils.clamp(s.mana + (running ? -9 : 4) * dt, 0, 100);

    const target = mag < 0.1 ? 0 : (running ? 6.2 : 2.4) * mag;
    s.speed += (target - s.speed) * Math.min(1, dt * 8);
    if (mag > 0.1) {
      const l = Math.hypot(ix, iz); ix /= l; iz /= l;
      // hướng theo camera
      const fx = -Math.sin(s.camYaw), fz = -Math.cos(s.camYaw);
      const rx = Math.cos(s.camYaw), rz = -Math.sin(s.camYaw);
      const dx = rx * ix - fx * iz, dz = rz * ix - fz * iz;
      const want = Math.atan2(dx, dz);
      let d = want - s.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      s.facing += d * Math.min(1, dt * 12);
    }
    const vx = Math.sin(s.facing) * s.speed * dt, vz = Math.cos(s.facing) * s.speed * dt;
    if (free(s.pos.x + vx, s.pos.z)) s.pos.x += vx;
    if (free(s.pos.x, s.pos.z + vz)) s.pos.z += vz;
    const gy = groundHeight(s.pos.x, s.pos.z);
    s.pos.y += (gy - s.pos.y) * Math.min(1, dt * 14);

    s.phase += s.speed * dt * 2.6;
    person.animate(s.phase, Math.min(1, s.speed / 6.2) * (s.speed > 3.5 ? 1 : 0.75) + (s.speed > 0.2 ? 0.25 : 0));
    person.root.position.copy(s.pos);
    person.root.rotation.y = s.facing;

    // camera đi theo mềm
    const tgt = new THREE.Vector3(s.pos.x, s.pos.y + 1.5, s.pos.z);
    const cp = s.camPitch, cy = s.camYaw;
    const want = tgt.clone().add(new THREE.Vector3(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp)).multiplyScalar(s.camDist));
    want.y = Math.max(want.y, s.pos.y + 0.6);
    camera.position.lerp(want, Math.min(1, dt * 10));
    camera.lookAt(tgt);
  }

  return { state: s, update, root: person.root, running: () => s.speed > 4 };
}
