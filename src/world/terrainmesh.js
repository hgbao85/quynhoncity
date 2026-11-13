// Mặt địa hình từ dữ liệu độ cao thật (thay cho núi ước lượng trước đây):
//   - lưới gần (15 m): đồi núi trong thành phố — Bà Hỏa, Vũng Chua, Ghềnh Ráng; phố phẳng giữ mặt đất cũ
//   - lưới xa (75 m): phông nền ~30 km — bán đảo Phương Mai, đảo, đồng bằng và núi phía tây
// Dùng shader riêng: ánh sáng tính sẵn theo hướng nắng, mù xa nhẹ hơn sương của cảnh để núi xa vẫn
// hiện (sương cảnh tắt hẳn ở 1,5 km).
import * as THREE from 'three';
import { BOUNDS } from './config.js';
import { nearGrid, farGrid, flatten } from './terrain.js';

const SUN = new THREE.Vector3(0.55, 0.75, 0.35).normalize();
const C = {
  grass: new THREE.Color('#7f9a58'), forest: new THREE.Color('#41613a'), forestDark: new THREE.Color('#2f4a2c'),
  rock: new THREE.Color('#8a8070'), farm: new THREE.Color('#8b9563'), shore: new THREE.Color('#b9a77c'),
};

function noise(x, z) {
  return Math.sin(x * 0.013 + Math.sin(z * 0.009) * 2) * 0.5 + Math.sin(z * 0.017 + x * 0.004) * 0.3 + Math.sin((x - z) * 0.041) * 0.2;
}

export function createTerrain(scene) {
  const uniforms = { fogColor: { value: new THREE.Color() }, light: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexColors: true,
    vertexShader: `
      varying vec3 vCol; varying float vDist;
      void main() {
        vCol = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDist = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 fogColor; uniform float light;
      varying vec3 vCol; varying float vDist;
      void main() {
        float haze = smoothstep(250.0, 9000.0, vDist) * 0.85;
        gl_FragColor = vec4(mix(vCol * light, fogColor, haze), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const g = new THREE.Group();
  const near = nearGrid(), far = farGrid();
  if (near) g.add(buildMesh(near, mat, { skipInside: null, y: (h) => (h > 0 ? h : -0.3), land: () => true, value: (h) => h }));
  if (far) {
    // bỏ các ô nằm trong vùng bản đồ (lưới gần và mặt đất thành phố đã phủ)
    const pad = far.step;
    const inside = (x, z) => x > BOUNDS.x0 + pad && x < BOUNDS.x1 - pad && z > BOUNDS.z0 + pad && z < BOUNDS.z1 - pad;
    g.add(buildMesh(far, mat, { skipInside: inside, y: (h) => (h > 0.5 ? flatten(h) - 0.05 : -3), land: (h) => h > 0.5, value: (h) => flatten(h) }));
  }
  scene.add(g);
  return {
    update(fogColor, night) {
      uniforms.fogColor.value.copy(fogColor);
      uniforms.light.value = 1 - night * 0.85;
    },
  };
}

// Dựng lưới tam giác từ một lưới độ cao; chỉ giữ các ô có đất cao hơn 0 (gần) hoặc có đất liền (xa)
function buildMesh(gr, mat, opt) {
  const { nx, nz, step, x0, z0, h } = gr;
  const H = (i, j) => h[j * nx + i] / 10;
  const keep = new Uint8Array((nx - 1) * (nz - 1));
  const used = new Int32Array(nx * nz).fill(-1);
  const pos = [], col = [], idx = [];
  const isFar = !!opt.skipInside;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = H(i, j), b = H(i + 1, j), c = H(i, j + 1), d = H(i + 1, j + 1);
    const x = x0 + (i + 0.5) * step, z = z0 + (j + 0.5) * step;
    if (isFar) {
      if (opt.skipInside(x, z)) continue;
      if (!(opt.land(a) || opt.land(b) || opt.land(c) || opt.land(d))) continue;
    } else if (!(a > 0 || b > 0 || c > 0 || d > 0)) continue;
    keep[j * (nx - 1) + i] = 1;
  }
  const vtx = (i, j) => {
    const k = j * nx + i;
    if (used[k] >= 0) return used[k];
    const raw = H(i, j), x = x0 + i * step, z = z0 + j * step;
    const y = opt.y(raw);
    // pháp tuyến từ chênh lệch độ cao hai bên → đổ bóng tính sẵn và độ dốc
    const hx = opt.value(H(Math.min(nx - 1, i + 1), j)) - opt.value(H(Math.max(0, i - 1), j));
    const hz = opt.value(H(i, Math.min(nz - 1, j + 1))) - opt.value(H(i, Math.max(0, j - 1)));
    const n = new THREE.Vector3(-hx, 2 * step, -hz).normalize();
    const slope = 1 - n.y, v = opt.value(raw), r = noise(x, z);
    let c;
    if (isFar && !opt.land(raw)) c = C.shore;
    else if (v < 3) c = (isFar ? C.farm : C.grass).clone().lerp(C.forest, Math.max(0, v / 3) * 0.6);
    else c = C.forest.clone().lerp(C.forestDark, 0.5 + 0.5 * r);
    if (slope > 0.35) c = c.clone().lerp(C.rock, Math.min(1, (slope - 0.35) * 2.5));
    const shade = 0.55 + 0.5 * Math.max(0, n.dot(SUN));
    pos.push(x, y, z);
    col.push(c.r * shade, c.g * shade, c.b * shade);
    used[k] = pos.length / 3 - 1;
    return used[k];
  };
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (!keep[j * (nx - 1) + i]) continue;
    const a = vtx(i, j), b = vtx(i + 1, j), c = vtx(i, j + 1), d = vtx(i + 1, j + 1);
    // cùng đường chéo với hàm heightAt (góc (i,j) → (i+1,j+1)); thứ tự đỉnh để mặt quay lên
    idx.push(a, d, b, a, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return new THREE.Mesh(geo, mat);
}
