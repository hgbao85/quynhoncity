// Núi quanh và giữa Quy Nhơn (dựng thô từ hàm nhiễu, vị trí đo trên ảnh vệ tinh, độ cao ước lượng):
//   - khối Bà Hỏa nằm giữa thành phố, phía tây bắc tượng đài (cao ~250–300 m)
//   - dãy Vũng Chua phía tây nam (cao ~450 m)
//   - Ghềnh Ráng phía nam nhô ra biển (cao ~150–230 m)
//   - bán đảo Phương Mai phía bắc bên kia đầm Thị Nại (cao 200–300 m, ~6–7 km)
// Bước tiếp theo sẽ thay bằng dữ liệu độ cao thật (DEM).
// Dùng shader riêng để tự phủ sương theo khoảng cách (sương của scene chỉ tới 1,5 km).
import * as THREE from 'three';

const RANGES = [
  { pts: [[-1850, -2300], [-1150, -2150], [-550, -1900]], h: [220, 300, 230], w: 320 }, // Bà Hỏa, sống bắc
  { pts: [[-1350, -1950], [-1150, -1250], [-1050, -700]], h: [260, 280, 170], w: 360 }, // Bà Hỏa, sống nam
  { pts: [[-3400, 300], [-2550, 900], [-2000, 1800], [-1650, 2700], [-1350, 3400]], h: [260, 450, 480, 380, 250], w: 600 }, // Vũng Chua
  { pts: [[-650, 2150], [-420, 2800], [100, 3300], [900, 3750]], h: [110, 200, 230, 150], w: 340 }, // Ghềnh Ráng
  { pts: [[-2500, -6600], [500, -7200], [3500, -7000], [6500, -6000]], h: [220, 300, 260, 180], w: 1600 },
  { pts: [[3300, 2300], [3600, 2450]], h: [55, 40], w: 260 }, // hòn đảo nhỏ ngoài khơi
];

function noise(x, z) {
  return Math.sin(x * 0.0021 + Math.sin(z * 0.0013) * 2) * 0.5 + Math.sin(z * 0.0031 + x * 0.0007) * 0.3 + Math.sin((x + z) * 0.0077) * 0.2;
}

export function createMountains(scene) {
  const g = new THREE.Group();
  const uniforms = { fogColor: { value: new THREE.Color() }, light: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexColors: true, fog: false,
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
        vec3 c = vCol * light;
        float haze = clamp(0.3 + smoothstep(1500.0, 9000.0, vDist) * 0.55, 0.0, 0.88);
        gl_FragColor = vec4(mix(c, fogColor, haze), 1.0);
      }`,
  });
  const sun = new THREE.Vector3(0.5, 0.8, 0.3).normalize();
  for (const R of RANGES) {
    // nội suy đường sống núi và độ cao đỉnh theo tham số s
    const segs = R.pts.length - 1, NS = 60 * segs, NT = 24;
    const pos = [], col = [], idx = [];
    const ridge = (s) => {
      const f = Math.min(segs - 1e-6, s * segs), i = Math.floor(f), t = f - i;
      const [ax, az] = R.pts[i], [bx, bz] = R.pts[i + 1];
      const h = R.h[i] + (R.h[i + 1] - R.h[i]) * (0.5 - 0.5 * Math.cos(t * Math.PI));
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, h, tx: bx - ax, tz: bz - az };
    };
    for (let i = 0; i <= NS; i++) {
      const s = i / NS, r = ridge(s);
      const l = Math.hypot(r.tx, r.tz), nx = -r.tz / l, nz = r.tx / l;
      const ends = Math.min(1, Math.min(s, 1 - s) * 6); // hai đầu dãy thấp dần
      for (let j = 0; j <= NT; j++) {
        const t = (j / NT) * 2 - 1;
        const x = r.x + nx * t * R.w, z = r.z + nz * t * R.w;
        const prof = Math.pow(Math.max(0, 1 - t * t), 1.4);
        const y = r.h * ends * prof * (0.75 + 0.35 * noise(x, z)) - 2;
        pos.push(x, Math.max(-2, y), z);
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
      const a = i * (NT + 1) + j, b = a + NT + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // màu: rừng xanh đậm, sườn đón nắng sáng hơn, chân núi ngả vàng
    const nrm = geo.attributes.normal, p = geo.attributes.position, c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const shade = 0.55 + 0.45 * Math.max(0, nrm.getX(i) * sun.x + nrm.getY(i) * sun.y + nrm.getZ(i) * sun.z);
      const y = p.getY(i);
      c.set(y < 25 ? '#8c8a62' : '#3f5f3a').multiplyScalar(shade);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.add(new THREE.Mesh(geo, mat));
  }
  // nền đất liền phía tây ngoài vùng bản đồ chi tiết (để chân núi không đứng trên biển)
  const landMat = new THREE.MeshBasicMaterial({ color: '#6f7a5c', fog: true });
  for (const [x0, z0, x1, z1] of [[-9000, -9000, -3400, 9000]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), landMat);
    m.position.set((x0 + x1) / 2, -0.1, (z0 + z1) / 2);
    g.add(m);
  }
  scene.add(g);
  return {
    update(fogColor, night) {
      uniforms.fogColor.value.copy(fogColor);
      uniforms.light.value = 1 - night * 0.85;
      landMat.color.set('#6f7a5c').multiplyScalar(1 - night * 0.85);
    },
  };
}
