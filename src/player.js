// Người chơi: điều khiển bằng bàn phím (WASD/mũi tên + Shift chạy) hoặc joystick ảo,
// camera góc nhìn thứ ba xoay bằng kéo chuột / vuốt màn hình.
// Xe máy: nút 🛵 hoặc phím F để lên/xuống xe. Trên xe đi ~40 km/h (Shift: ~55 km/h), không tốn MANA,
// rẽ có giới hạn và nghiêng xe theo cua, người ngồi có đội mũ bảo hiểm.
import * as THREE from 'three';
import { createPerson } from './character.js';
import { groundHeight, blocked, toWorld, YAW } from './world/site.js';
import { heightAt } from './world/terrain.js';
import { scooterParts } from './vehicles.js';

export { groundHeight };

export function createPlayer(scene, camera, grid, dom) {
  const person = createPerson({ shirt: '#2f7f86', pants: '#45556e', backpack: '#6b5a44' });
  scene.add(person.root);

  const s = {
    pos: new THREE.Vector3(toWorld(0, 26)[0], 0, toWorld(0, 26)[1]), facing: YAW + Math.PI, speed: 0, phase: 0,
    camYaw: YAW, camPitch: 0.32, camDist: 9, mana: 100, riding: false, lean: 0,
  };

  // ---- xe máy của người chơi ----
  const parts = scooterParts();
  const bike = new THREE.Group();
  const bikeBody = new THREE.Mesh(parts.body, new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.35, metalness: 0.2 }));
  const bikeDark = new THREE.Mesh(parts.dark, new THREE.MeshStandardMaterial({ color: '#1e1f22', roughness: 0.7 }));
  const bikeLamp = new THREE.Mesh(parts.lamp, new THREE.MeshStandardMaterial({ color: '#fff6dd', emissive: '#ffe9b0', emissiveIntensity: 0.3 }));
  bike.add(bikeBody, bikeDark, bikeLamp);
  bike.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  bike.visible = false;
  scene.add(bike);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: '#d93a3a', roughness: 0.35 }));
  helmet.scale.set(1.05, 1.05, 1.15); helmet.position.set(0, 0.82, -0.01); helmet.visible = false;
  person.parts.hips.add(helmet);
  const free = (x, z) => {
    const r = s.riding ? 0.55 : 0.35;
    if (blocked(x, z)) return false; // bệ tượng, phù điêu
    return grid.walkable(x + r, z) && grid.walkable(x - r, z) && grid.walkable(x, z + r) && grid.walkable(x, z - r);
  };
  function setRiding(on) {
    if (on === s.riding) return;
    // chỉ lên xe khi đủ chỗ (xe rộng hơn người)
    if (on) { s.riding = true; if (!free(s.pos.x, s.pos.z)) { s.riding = false; return false; } }
    s.riding = on; s.speed = 0;
    bike.visible = on; helmet.visible = on;
    const btn = document.getElementById('ride-btn');
    if (btn) btn.classList.toggle('on', on);
    return true;
  }
  addEventListener('keydown', (e) => { if (e.code === 'KeyF' && e.target.tagName !== 'INPUT') setRiding(!s.riding); });
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

  function update(dt) {
    let ix = 0, iz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (joy.active) { ix += joy.x; iz += joy.y; }
    let mag = Math.min(1, Math.hypot(ix, iz));
    const wantRun = keys.has('ShiftLeft') || keys.has('ShiftRight') || (joy.active && mag > 0.92);
    const running = !s.riding && wantRun && mag > 0.1 && s.mana > 2;
    s.mana = THREE.MathUtils.clamp(s.mana + (running ? -9 : 4) * dt, 0, 100);

    // tốc độ: đi bộ 2,4 m/s, chạy 6,2 m/s; xe máy ~11 m/s (40 km/h), Shift ~15 m/s (55 km/h)
    const vmax = s.riding ? (wantRun ? 15 : 11) : running ? 6.2 : 2.4;
    const target = mag < 0.1 ? 0 : vmax * mag;
    s.speed += (target - s.speed) * Math.min(1, dt * (s.riding ? (target > s.speed ? 1.6 : 3) : 8));
    let turn = 0;
    if (mag > 0.1) {
      const l = Math.hypot(ix, iz); ix /= l; iz /= l;
      // hướng theo camera
      const fx = -Math.sin(s.camYaw), fz = -Math.cos(s.camYaw);
      const rx = Math.cos(s.camYaw), rz = -Math.sin(s.camYaw);
      const dx = rx * ix - fx * iz, dz = rz * ix - fz * iz;
      const want = Math.atan2(dx, dz);
      let d = want - s.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      // xe máy rẽ chậm hơn người đi bộ (tối đa ~100°/giây)
      const step = s.riding ? THREE.MathUtils.clamp(d * dt * 4, -1.8 * dt, 1.8 * dt) : d * Math.min(1, dt * 12);
      s.facing += step; turn = step / Math.max(dt, 1e-3);
    }
    const vx = Math.sin(s.facing) * s.speed * dt, vz = Math.cos(s.facing) * s.speed * dt;
    const okX = free(s.pos.x + vx, s.pos.z), okZ = free(s.pos.x, s.pos.z + vz);
    if (okX) s.pos.x += vx;
    if (okZ) s.pos.z += vz;
    if (s.riding && !okX && !okZ) s.speed *= 0.3; // đâm vào tường: xe khựng lại
    const gy = groundHeight(s.pos.x, s.pos.z);
    s.pos.y += (gy - s.pos.y) * Math.min(1, dt * 14);

    if (s.riding) {
      // nghiêng xe theo cua, ngồi trên yên: chân co, tay vươn tới ghi đông
      s.lean += (THREE.MathUtils.clamp(-turn * s.speed * 0.035, -0.4, 0.4) - s.lean) * Math.min(1, dt * 6);
      bike.position.copy(s.pos); bike.rotation.set(0, s.facing, 0); bike.rotateZ(s.lean);
      person.animate(0, 0);
      const pr = person.parts;
      pr.legL.rotation.set(-1.45, 0, 0.12); pr.legR.rotation.set(-1.45, 0, -0.12);
      pr.armL.rotation.set(-1.15, 0, 0.2); pr.armR.rotation.set(-1.15, 0, -0.2);
      pr.hips.position.y = 0.86;
      person.root.position.copy(s.pos).add(new THREE.Vector3(Math.sin(s.facing) * -0.25, -0.02, Math.cos(s.facing) * -0.25));
      person.root.rotation.set(0, s.facing, 0); person.root.rotateZ(s.lean);
      bikeLamp.material.emissiveIntensity = 0.3 + (document.body.dataset.night ? 2.5 : 0);
    } else {
      s.phase += s.speed * dt * 2.6;
      person.animate(s.phase, Math.min(1, s.speed / 6.2) * (s.speed > 3.5 ? 1 : 0.75) + (s.speed > 0.2 ? 0.25 : 0));
      person.root.position.copy(s.pos);
      person.root.rotation.set(0, s.facing, 0);
    }

    // camera đi theo mềm
    const tgt = new THREE.Vector3(s.pos.x, s.pos.y + 1.5, s.pos.z);
    // trên xe: camera tự xoay dần ra sau lưng theo hướng xe chạy, lùi xa hơn một chút
    if (s.riding && s.speed > 2 && !drag) {
      let d = s.facing + Math.PI - s.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      s.camYaw += d * Math.min(1, dt * 1.5);
    }
    const cp = s.camPitch, cy = s.camYaw;
    const dist = s.camDist + (s.riding ? 3 : 0);
    const want = tgt.clone().add(new THREE.Vector3(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp)).multiplyScalar(dist));
    want.y = Math.max(want.y, s.pos.y + 0.6, heightAt(want.x, want.z) + 1.2);
    camera.position.lerp(want, Math.min(1, dt * 10));
    camera.lookAt(tgt);
  }

  return { state: s, update, root: person.root, running: () => s.speed > 4, setRiding, riding: () => s.riding };
}
