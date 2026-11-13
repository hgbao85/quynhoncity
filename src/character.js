// Người dựng từ khối cơ bản, có khớp vai/hông để làm động tác đi, chạy.
import * as THREE from 'three';

const geo = {
  torso: new THREE.CapsuleGeometry(0.2, 0.42, 4, 8),
  head: new THREE.SphereGeometry(0.135, 12, 10),
  hair: new THREE.SphereGeometry(0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  arm: new THREE.CapsuleGeometry(0.06, 0.52, 3, 6).translate(0, -0.3, 0),
  leg: new THREE.CapsuleGeometry(0.085, 0.72, 3, 6).translate(0, -0.42, 0),
  shoe: new THREE.BoxGeometry(0.13, 0.08, 0.26).translate(0, -0.86, 0.04),
  pack: new THREE.BoxGeometry(0.34, 0.42, 0.18),
};

const matCache = new Map();
const mat = (c, opts = {}) => {
  const key = c + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...opts }));
  return matCache.get(key);
};

export function createPerson({
  shirt = '#2f7f86', pants = '#3a4a64', skin = '#d9a77f', hair = '#1d1a18', shoes = '#2b2b2b',
  backpack = null, height = 1.7, material = null, shadow = true,
} = {}) {
  const M = (c) => material || mat(c);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(height / 1.7);
  root.add(body);

  const hips = new THREE.Group(); hips.position.y = 0.92; body.add(hips);
  const torso = new THREE.Mesh(geo.torso, M(shirt)); torso.position.y = 0.34; hips.add(torso);
  const head = new THREE.Mesh(geo.head, M(skin)); head.position.y = 0.78; hips.add(head);
  const hr = new THREE.Mesh(geo.hair, M(hair)); hr.position.y = 0.8; hr.rotation.x = -0.25; hips.add(hr);

  const mk = (g, c, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(g, M(c)); p.add(m); hips.add(p); return p; };
  const armL = mk(geo.arm, skin, -0.27, 0.6), armR = mk(geo.arm, skin, 0.27, 0.6);
  // tay áo
  for (const a of [armL, armR]) { const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.16, 3, 6).translate(0, -0.1, 0), M(shirt)); a.add(s); }
  const legL = mk(geo.leg, pants, -0.1, 0.02), legR = mk(geo.leg, pants, 0.1, 0.02);
  legL.add(new THREE.Mesh(geo.shoe, M(shoes))); legR.add(new THREE.Mesh(geo.shoe, M(shoes)));
  if (backpack) { const b = new THREE.Mesh(geo.pack, M(backpack)); b.position.set(0, 0.4, -0.25); hips.add(b); }

  if (shadow) root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // phase: góc chu kỳ bước; amp: 0 đứng yên, ~0.6 đi, ~1 chạy
  function animate(phase, amp, dt = 0.016) {
    const s = Math.sin(phase) * amp;
    legL.rotation.x = s * 0.75; legR.rotation.x = -s * 0.75;
    armL.rotation.x = -s * 0.8; armR.rotation.x = s * 0.8;
    armL.rotation.z = 0.08; armR.rotation.z = -0.08;
    hips.position.y = 0.92 + Math.abs(Math.cos(phase)) * 0.05 * amp;
    torso.rotation.x = hips.rotation.x = 0;
    body.rotation.x = amp > 0.8 ? 0.12 : amp * 0.05;
    void dt;
  }
  animate(0, 0);
  return { root, animate, parts: { hips, armL, armR, legL, legR, head } };
}

export const SHIRTS = ['#2f7f86', '#c0392b', '#f1c40f', '#ecf0f1', '#8e44ad', '#2980b9', '#e67e22', '#27ae60', '#f5b7b1', '#34495e', '#d35400', '#ffffff'];
export const PANTS = ['#2c3e50', '#34495e', '#7f8c8d', '#1b2631', '#c8b99a', '#5d6d7e', '#283747'];
export const SKINS = ['#e0b18f', '#d9a77f', '#c68f66', '#efc6a4', '#b97c55'];
export const HAIRS = ['#1d1a18', '#2b1e16', '#3b2a20', '#111111', '#5a3d2b'];
