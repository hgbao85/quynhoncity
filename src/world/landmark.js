// Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành (phỏng dựng giản lược, không đúng mẫu thật).
// Đặt ở gốc toạ độ (0, 0) theo vị trí trên OpenStreetMap.
import * as THREE from 'three';
import { createPerson } from '../character.js';

export function createMonument(scene) {
  const g = new THREE.Group();
  const granite = new THREE.MeshStandardMaterial({ color: '#8d8a86', roughness: 0.55 });
  const lightStone = new THREE.MeshStandardMaterial({ color: '#c9c3b8', roughness: 0.7 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 0.42, metalness: 0.75 });
  const flowerMats = ['#e74c3c', '#f1c40f', '#ff7eb6', '#ffffff'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  const grass = new THREE.MeshStandardMaterial({ color: '#4f8f3b', roughness: 1 });

  // sân tròn lát đá + bậc cấp
  const tiers = [[22, 0.25, lightStone], [16, 0.5, granite], [12.5, 0.75, granite], [9.5, 1.0, lightStone]];
  for (const [r, h, m] of tiers) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.2, h, 48), m);
    t.position.y = h / 2; t.receiveShadow = true; g.add(t);
  }
  // bồn hoa vòng ngoài
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 2.2), granite);
    bed.position.set(Math.cos(a) * 19, 0.5, Math.sin(a) * 19);
    bed.rotation.y = -a + Math.PI / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 1.8), grass);
    top.position.y = 0.3; bed.add(top);
    for (let k = 0; k < 10; k++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), flowerMats[(i + k) % 4]);
      f.position.set((k / 9 - 0.5) * 4.2, 0.48, (k % 2 ? 0.45 : -0.45));
      top.add(f);
    }
    g.add(bed);
  }
  // bệ tượng
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 5), granite);
  plinth.position.y = 1 + 2.25; plinth.castShadow = plinth.receiveShadow = true; g.add(plinth);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.5, 5.6), lightStone);
  cap.position.y = 5.75; cap.castShadow = true; g.add(cap);
  // tấm biển chữ ở mặt trước bệ (hướng nam, phía quảng trường)
  const label = makeLabel('NGUYỄN SINH SẮC · NGUYỄN TẤT THÀNH');
  label.position.set(0, 3.6, 2.52); g.add(label);

  // hai pho tượng đồng: người cha và người con
  const father = createPerson({ material: bronze, height: 6.2 });
  father.root.position.set(-1.3, 6, 0);
  father.parts.armR.rotation.set(-0.5, 0, -0.35); // tay đặt hướng về phía con
  father.parts.armL.rotation.set(0.1, 0, 0.1);
  const son = createPerson({ material: bronze, height: 5.4 });
  son.root.position.set(1.4, 6, 0.3);
  son.parts.armL.rotation.set(-0.3, 0, 0.3);
  son.parts.legR.rotation.x = -0.25; son.parts.legL.rotation.x = 0.15; // dáng bước đi
  son.root.rotation.y = -0.15;
  g.add(father.root, son.root);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // đèn chiếu tượng ban đêm (hai bên phía trước)
  const spots = [-1, 1].map((side) => {
    const s = new THREE.SpotLight('#ffe2b0', 0, 40, 0.42, 0.5, 1.2);
    s.position.set(side * 7, 1.2, 9);
    s.target.position.set(0, 8.5, 0);
    g.add(s, s.target);
    return s;
  });
  g.userData.setNight = (n) => { for (const s of spots) s.intensity = n * 220; };

  scene.add(g);
  return g;
}

function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#5b5955'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#e9d18a'; x.font = 'bold 50px "Be Vietnam Pro", system-ui, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(6, 0.56), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.3 }));
}
