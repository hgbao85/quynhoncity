// Thời tiết trong game theo dữ liệu thật (Open-Meteo, mã WMO): mây che, trời u ám, mưa rơi, sương mù.
//   mã 0–1 nắng · 2 ít mây · 3 nhiều mây · 45–48 sương mù · 51–67 mưa phùn/mưa · 80–82 mưa rào
//   95–99 dông (mưa to, chớp)
// Mưa là các vệt mảnh rơi quanh camera (InstancedMesh), trời u ám làm tối ánh sáng và dày sương mù.
// Tham số ?wx=rain|storm|cloud|fog|clear để thử nhanh, không cần chờ trời mưa thật.
import * as THREE from 'three';

export function weatherState(code) {
  if (code >= 95) return { cloud: 1, rain: 1, fog: 0.55, storm: true, label: 'Dông' };
  if (code >= 80) return { cloud: 0.9, rain: code >= 82 ? 0.9 : 0.6, fog: 0.4, label: 'Mưa rào' };
  if (code >= 61) return { cloud: 0.9, rain: code >= 65 ? 0.85 : code >= 63 ? 0.6 : 0.4, fog: 0.4, label: 'Mưa' };
  if (code >= 51) return { cloud: 0.8, rain: 0.2, fog: 0.35, label: 'Mưa phùn' };
  if (code >= 45) return { cloud: 0.7, rain: 0, fog: 0.85, label: 'Sương mù' };
  if (code === 3) return { cloud: 0.75, rain: 0, fog: 0.15, label: 'Nhiều mây' };
  if (code === 2) return { cloud: 0.4, rain: 0, fog: 0.05, label: 'Ít mây' };
  return { cloud: 0.1, rain: 0, fog: 0, label: 'Nắng' };
}

const TEST = { rain: 63, storm: 95, cloud: 3, fog: 45, clear: 0 };
export const testWeatherCode = () => {
  const w = new URLSearchParams(location.search).get('wx');
  return w in TEST ? TEST[w] : null;
};

export function createWeather(scene, maxDrops = 3000) {
  // ---- mưa: vệt mảnh nghiêng theo gió, rơi trong khối 70×36×70 m quanh camera ----
  const geo = new THREE.BoxGeometry(0.03, 1.1, 0.03);
  const mat = new THREE.MeshBasicMaterial({ color: '#cfdae6', transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  const drops = new THREE.InstancedMesh(geo, mat, maxDrops);
  drops.frustumCulled = false; drops.count = 0;
  scene.add(drops);
  const SX = 44, SY = 30;
  const P = new Float32Array(maxDrops * 3), SPD = new Float32Array(maxDrops);
  for (let i = 0; i < maxDrops; i++) { P[i * 3] = (Math.random() - 0.5) * SX; P[i * 3 + 1] = Math.random() * SY; P[i * 3 + 2] = (Math.random() - 0.5) * SX; SPD[i] = 13 + Math.random() * 6; }
  const wind = new THREE.Vector3(1.8, 0, 0.9);
  const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(wind.x / 15, -1, wind.z / 15).normalize());
  const M = new THREE.Matrix4(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);

  // ---- mây: các đám mây dẹt trôi chậm trên cao ----
  // mây không nhận ánh sáng (MeshBasic) để không bị đen ở mặt dưới; màu tự chỉnh theo độ u ám
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false });
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const clouds = new THREE.InstancedMesh(puff, cloudMat, 90);
  clouds.frustumCulled = false;
  const cl = [];
  for (let i = 0; i < 90; i++) {
    const cx = (Math.random() - 0.5) * 5000, cz = (Math.random() - 0.5) * 5000;
    for (let k = 0; k < 1; k++) cl.push({ x: cx, y: 520 + Math.random() * 180, z: cz, sx: 180 + Math.random() * 220, sy: 35 + Math.random() * 30, sz: 120 + Math.random() * 160 });
  }
  scene.add(clouds);

  // ---- lớp mây che bầu trời khi u ám: vòm xám quanh camera, đậm dần theo độ u ám ----
  const domeMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color('#8d969e') }, opacity: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 color; uniform float opacity; varying float vY; void main(){ float a = opacity * smoothstep(-0.05, 0.25, vY); gl_FragColor = vec4(color, a); }',
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9000, 24, 12), domeMat);
  dome.renderOrder = -1; dome.frustumCulled = false;
  scene.add(dome);

  let state = weatherState(0), mix = { cloud: 0, rain: 0, fog: 0 }, first = true;
  let flash = 0, flashTimer = 8;
  const darkSky = new THREE.Color('#8a949e');

  function setCode(code) {
    state = weatherState(code);
    // lần đầu (lúc vào game): đạt ngay mức đích, không cần chờ chuyển dần
    if (first) { first = false; mix = { cloud: state.cloud, rain: state.rain, fog: state.fog }; }
  }

  // gọi mỗi khung hình sau sky.update: chỉnh sương mù, ánh sáng theo độ u ám; trả về cường độ chớp
  function update(dt, camera, env, lights) {
    const k = Math.min(1, dt * 0.5);
    for (const key of ['cloud', 'rain', 'fog']) mix[key] += (state[key] - mix[key]) * k;
    const gloom = mix.cloud * 0.55 + mix.rain * 0.25;
    // sương mù gần hơn khi mưa/sương; trời u ám xám lại
    scene.fog.near = 250 * (1 - mix.fog * 0.85);
    scene.fog.far = 1500 * (1 - mix.fog * 0.75) * (1 - mix.rain * 0.3);
    scene.fog.color.lerp(darkSky.clone().multiplyScalar(1 - env.night * 0.85), Math.min(0.85, gloom + mix.fog * 0.5));
    if (lights) {
      lights.sun.intensity *= 1 - Math.min(0.85, gloom * 1.2);
      if (gloom > 0.5) lights.sun.castShadow = false;
      if (lights.hemi) lights.hemi.intensity *= 1 - gloom * 0.35;
      if (lights.renderer) lights.renderer.toneMappingExposure *= 1 - gloom * 0.3;
    }
    // vòm mây xám che trời xanh
    dome.position.copy(camera.position);
    domeMat.uniforms.opacity.value = Math.min(0.92, gloom * 1.35 + mix.fog * 0.4);
    domeMat.uniforms.color.value.copy(darkSky).multiplyScalar(1 - env.night * 0.85).lerp(new THREE.Color('#dfe6f2'), flash * 0.8);
    // mây
    cloudMat.opacity = Math.min(0.85, mix.cloud) * (1 - env.night * 0.6);
    cloudMat.color.set('#f4f6f8').lerp(new THREE.Color('#a7b0b8'), Math.min(1, gloom * 1.3)).multiplyScalar(1 - env.night * 0.8);
    clouds.visible = cloudMat.opacity > 0.02;
    if (clouds.visible) {
      for (let i = 0; i < cl.length; i++) {
        const c = cl[i];
        c.x += 2.5 * dt; if (c.x - camera.position.x > 2500) c.x -= 5000;
        M.compose(V.set(c.x, c.y, c.z), new THREE.Quaternion(), S.set(c.sx, c.sy, c.sz));
        clouds.setMatrixAt(i, M);
      }
      clouds.instanceMatrix.needsUpdate = true;
    }
    // mưa
    const n = Math.floor(maxDrops * mix.rain);
    drops.count = n;
    if (n) {
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      mat.opacity = 0.35 + mix.rain * 0.3;
      for (let i = 0; i < n; i++) {
        P[i * 3 + 1] -= SPD[i] * dt; P[i * 3] += wind.x * dt; P[i * 3 + 2] += wind.z * dt;
        if (P[i * 3 + 1] < -6) { P[i * 3 + 1] += SY; P[i * 3] = (Math.random() - 0.5) * SX; P[i * 3 + 2] = (Math.random() - 0.5) * SX; }
        // giữ khối mưa quanh camera khi camera di chuyển
        const wx = ((P[i * 3] + SX / 2 - (cx % SX) + SX * 10) % SX) - SX / 2 + cx;
        const wz = ((P[i * 3 + 2] + SX / 2 - (cz % SX) + SX * 10) % SX) - SX / 2 + cz;
        M.compose(V.set(wx, cy - 8 + P[i * 3 + 1], wz), tilt, S.set(1, 1, 1));
        drops.setMatrixAt(i, M);
      }
      drops.instanceMatrix.needsUpdate = true;
    }
    // dông: thỉnh thoảng chớp sáng cả bầu trời
    if (state.storm) {
      flashTimer -= dt;
      if (flashTimer < 0) { flash = 1; flashTimer = 6 + Math.random() * 14; }
    }
    flash = Math.max(0, flash - dt * 3.5);
    return { gloom, rain: mix.rain, flash };
  }
  return { update, setCode, get label() { return state.label; }, get rain() { return mix.rain; } };
}
