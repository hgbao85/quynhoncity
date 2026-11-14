// Hình học xe dùng chung: xe tay ga (người chơi và xe trên phố), ô tô con, xe buýt.
// Mỗi loại tách thành vài phần (thân sơn màu, phần tối, đèn) để dùng InstancedMesh: mỗi phần một
// lệnh vẽ cho cả đoàn xe. Đơn vị mét; mũi xe hướng +z, đáy bánh ở y = 0.
import * as THREE from 'three';

function merge(list) {
  const pos = [], nrm = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    g.computeVertexNormals();
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.computeBoundingSphere();
  return out;
}
const B = (w, h, d, x, y, z, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); return g.translate(x, y, z); };
const wheel = (r, w, z) => new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2).translate(0, r, z);

// ---------- xe tay ga ----------
export function scooterParts() {
  return {
    // thân sơn màu: yếm trước, sàn để chân, thân sau ôm yên
    body: merge([
      B(0.42, 0.75, 0.18, 0, 0.62, 0.55, -0.2), // yếm trước
      B(0.36, 0.08, 0.55, 0, 0.36, 0.2), // sàn để chân
      B(0.4, 0.38, 0.72, 0, 0.58, -0.32), // thân sau
      B(0.3, 0.12, 0.3, 0, 1.0, 0.62), // mặt nạ đầu xe
    ]),
    // phần tối: bánh, yên, ghi đông, phuộc, chắn bùn
    dark: merge([
      wheel(0.26, 0.11, 0.62), wheel(0.26, 0.12, -0.55),
      B(0.32, 0.1, 0.62, 0, 0.82, -0.3), // yên
      B(0.62, 0.05, 0.05, 0, 1.12, 0.58), // ghi đông
      B(0.06, 0.5, 0.06, 0, 0.75, 0.68, -0.25), // phuộc
      B(0.08, 0.06, 0.2, 0.22, 1.05, 0.66), B(0.08, 0.06, 0.2, -0.22, 1.05, 0.66), // gương
    ]),
    lamp: merge([B(0.16, 0.08, 0.04, 0, 1.0, 0.78), B(0.14, 0.06, 0.04, 0, 0.72, -0.69)]),
  };
}

// Người ngồi trên xe (dùng cho xe trên phố): thân áo được tô màu theo từng xe, mũ bảo hiểm riêng
export function riderParts() {
  return {
    shirt: merge([
      B(0.38, 0.55, 0.24, 0, 1.25, -0.2, 0.15), // thân
      B(0.1, 0.42, 0.1, 0.2, 1.22, 0.1, -1.1), B(0.1, 0.42, 0.1, -0.2, 1.22, 0.1, -1.1), // tay vươn tới ghi đông
    ]),
    pants: merge([
      B(0.34, 0.16, 0.42, 0, 0.92, -0.12), // đùi
      B(0.12, 0.45, 0.12, 0.11, 0.62, 0.22), B(0.12, 0.45, 0.12, -0.11, 0.62, 0.22), // cẳng chân
    ]),
    helmet: merge([new THREE.SphereGeometry(0.15, 10, 8).scale(1, 0.95, 1.1).translate(0, 1.7, -0.14), B(0.22, 0.05, 0.12, 0, 1.66, 0.0)]),
    skin: merge([new THREE.SphereGeometry(0.12, 8, 6).translate(0, 1.64, -0.15)]),
  };
}

// ---------- ô tô con ----------
export function carParts() {
  return {
    body: merge([B(1.75, 0.6, 4.2, 0, 0.62, 0), B(1.6, 0.52, 2.1, 0, 1.18, -0.25)]),
    dark: merge([
      wheel(0.33, 0.22, 1.35).translate(0.82, 0, 0), wheel(0.33, 0.22, 1.35).translate(-0.82, 0, 0),
      wheel(0.33, 0.22, -1.35).translate(0.82, 0, 0), wheel(0.33, 0.22, -1.35).translate(-0.82, 0, 0),
      B(1.62, 0.42, 2.0, 0, 1.2, -0.25), // kính (hơi nhô khỏi thân)
      B(1.78, 0.14, 0.1, 0, 0.42, 2.08), B(1.78, 0.14, 0.1, 0, 0.42, -2.08), // cản
    ]),
    lamp: merge([B(0.32, 0.12, 0.05, 0.6, 0.78, 2.1), B(0.32, 0.12, 0.05, -0.6, 0.78, 2.1), B(0.3, 0.1, 0.05, 0.62, 0.8, -2.1), B(0.3, 0.1, 0.05, -0.62, 0.8, -2.1)]),
  };
}

// ---------- xe buýt ----------
export function busParts() {
  return {
    body: merge([B(2.45, 2.55, 10.5, 0, 1.75, 0)]),
    dark: merge([
      wheel(0.48, 0.3, 3.6).translate(1.1, 0, 0), wheel(0.48, 0.3, 3.6).translate(-1.1, 0, 0),
      wheel(0.48, 0.3, -3.2).translate(1.1, 0, 0), wheel(0.48, 0.3, -3.2).translate(-1.1, 0, 0),
      B(2.5, 0.95, 9.6, 0, 2.2, -0.2), // dải cửa kính hai bên
      B(2.3, 1.2, 0.08, 0, 2.05, 5.26), // kính trước
    ]),
    lamp: merge([B(0.4, 0.18, 0.05, 0.85, 0.9, 5.27), B(0.4, 0.18, 0.05, -0.85, 0.9, 5.27), B(0.35, 0.15, 0.05, 0.9, 1.0, -5.27), B(0.35, 0.15, 0.05, -0.9, 1.0, -5.27)]),
  };
}

export const BODY_COLORS = {
  scooter: ['#c0392b', '#ecf0f1', '#2c3e50', '#2980b9', '#e74c3c', '#f1c40f', '#7f8c8d', '#1abc9c', '#d35400', '#f5f5f0'],
  car: ['#f4f4f2', '#c9ccd1', '#1f2329', '#8b1e24', '#2b4c7e', '#bfc3c7', '#e3e1da'],
  bus: ['#2d8a4e', '#e8a33d', '#1f66b3'],
};
export const SHIRTS = ['#2f7f86', '#c0392b', '#f1c40f', '#ecf0f1', '#8e44ad', '#2980b9', '#e67e22', '#27ae60', '#f5b7b1', '#34495e', '#ffffff'];
export const HELMETS = ['#d93a3a', '#ffffff', '#1d1d1d', '#f1c40f', '#3b78d8', '#e67ea8', '#7fb3d5'];
