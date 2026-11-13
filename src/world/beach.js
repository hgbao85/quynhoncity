// Bãi biển Quy Nhơn và lối đi dạo ven biển (đường Xuân Diệu, An Dương Vương).
// Theo ảnh vệ tinh: từ phố ra biển là đường → dải công viên phi lao, dừa → lối đi bộ lát đá
// sát mép cát (có đèn, ghế đá) → bãi cát rộng 50–80 m có dù lá → mép sóng.
// Ở đây dựng: mép sóng vỗ và cát ướt (shader), lối đi dạo lát đá, đèn trang trí, ghế đá, dù lá.
import * as THREE from 'three';
import { SEA, pointInPoly, rng } from './geo.js';

const LIMIT = 820;

export function createBeach(scene, data, grid) {
  const g = new THREE.Group();
  const R = rng(9917);
  const coastPts = data.coastline.flat();
  const distCoast = (x, z) => coastPts.reduce((m, p) => Math.min(m, Math.hypot(p[0] - x, p[1] - z)), Infinity);
  const beachAreas = data.areas.filter((a) => a.kind === 'beach');
  const onBeach = (x, z) => beachAreas.some((a) => pointInPoly(x, z, a.pts));

  // ---------- mép sóng + cát ướt ----------
  const foamUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, light: { value: 1 } }]);
  const foamMat = new THREE.ShaderMaterial({
    uniforms: foamUniforms, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
    vertexShader: `
      attribute float across; attribute float along;
      varying float vA; varying float vL;
      #include <fog_pars_vertex>
      void main() {
        vA = across; vL = along;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float t; uniform float light;
      varying float vA; varying float vL;
      #include <fog_pars_fragment>
      void main() {
        // vA: 0 = phía đất liền, 1 = phía biển; đường bờ ở vA ≈ 0.375
        float edge = 0.33 + 0.07 * sin(t * 0.55 + vL * 0.021) + 0.03 * sin(t * 1.3 + vL * 0.07);
        float line = exp(-pow((vA - edge) / 0.04, 2.0));
        float sheet = smoothstep(edge, edge + 0.12, vA) * 0.28;
        float bands = smoothstep(0.86, 1.0, 0.5 + 0.5 * sin(vA * 32.0 - t * 2.2 + vL * 0.05)) * smoothstep(edge + 0.02, edge + 0.25, vA) * 0.55;
        float wet = smoothstep(0.0, edge - 0.02, vA) * (1.0 - smoothstep(edge - 0.01, edge + 0.02, vA));
        vec3 sand = vec3(0.50, 0.42, 0.29);
        vec3 col = mix(vec3(0.62, 0.80, 0.82), vec3(1.0), clamp(line + bands, 0.0, 1.0));
        col = mix(col, sand, wet * (1.0 - line));
        float alpha = clamp(line * 0.95 + bands + sheet + wet * 0.7, 0.0, 0.95);
        gl_FragColor = vec4(col * light, alpha);
        #include <fog_fragment>
      }`,
  });
  for (const seg of data.coastline) {
    const pts = densify(seg, 4);
    const pos = [], across = [], along = [], idx = [];
    let run = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      let tx = q[0] - o[0], tz = q[1] - o[1];
      const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      let nx = -tz, nz = tx; // pháp tuyến; chọn chiều hướng ra biển
      if (grid.get(p[0] + nx * 8, p[1] + nz * 8) !== SEA) { nx = -nx; nz = -nz; }
      if (i) run += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const LAND = 6, SEAW = 10;
      // ba hàng đỉnh: trên cát, ở mép bờ, ngoài biển (dốc xuống mặt nước)
      for (const [off, y, a] of [[-LAND, 0.04, 0], [0, 0.03, LAND / (LAND + SEAW)], [SEAW, -0.3, 1]]) {
        pos.push(p[0] + nx * off, y, p[1] + nz * off);
        across.push(a); along.push(run);
      }
      if (i) {
        const b = (i - 1) * 3, c = i * 3;
        for (let k = 0; k < 2; k++) idx.push(b + k, c + k, b + k + 1, b + k + 1, c + k, c + k + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('across', new THREE.Float32BufferAttribute(across, 1));
    geo.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, foamMat);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    g.add(mesh);
  }

  // ---------- lối đi dạo ven biển: lát đá, đèn trang trí, ghế đá ----------
  const promenade = data.roads.filter((r) => ['footway', 'path', 'pedestrian', 'cycleway'].includes(r.type)
    && r.pts.some(([x, z]) => Math.abs(x) < LIMIT && Math.abs(z) < LIMIT && distCoast(x, z) < 110));
  const walkPos = [];
  const lampSpots = [], benchSpots = [];
  for (const r of promenade) {
    let acc = 0;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const p = r.pts[i], q = r.pts[i + 1];
      const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
      if (L < 0.2) continue;
      const ux = dx / L, uz = dz / L, hw = 2.6;
      const A = [p[0] - uz * hw, p[1] + ux * hw], B = [q[0] - uz * hw, q[1] + ux * hw];
      const C = [q[0] + uz * hw, q[1] - ux * hw], D = [p[0] + uz * hw, p[1] - ux * hw];
      walkPos.push(A[0], 0.055, A[1], B[0], 0.055, B[1], C[0], 0.055, C[1], A[0], 0.055, A[1], C[0], 0.055, C[1], D[0], 0.055, D[1]);
      // đèn mỗi 24 m, ghế đá mỗi 36 m, đặt phía đất liền của lối đi
      for (let s = (24 - (acc % 24)) % 24; s < L; s += 24) {
        let nx = -uz, nz = ux;
        const x = p[0] + ux * s, z = p[1] + uz * s;
        if (distCoast(x + nx * 4, z + nz * 4) < distCoast(x, z)) { nx = -nx; nz = -nz; }
        if (Math.abs(x) > LIMIT || Math.abs(z) > LIMIT) continue;
        lampSpots.push([x + nx * 3.2, z + nz * 3.2]);
        if (R() < 0.66) benchSpots.push([x + ux * 8 + nx * 3.4, z + uz * 8 + nz * 3.4, Math.atan2(-nx, -nz)]);
      }
      acc += L;
    }
  }
  if (walkPos.length) {
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(walkPos, 3));
    // các tam giác có thể bị ngược chiều: dùng DoubleSide và pháp tuyến hướng lên
    const nrm = new Float32Array(walkPos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
    wg.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    const uv = [];
    for (let i = 0; i < walkPos.length; i += 3) uv.push(walkPos[i] / 3, walkPos[i + 2] / 3);
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const walk = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.75, side: THREE.DoubleSide }));
    walk.receiveShadow = true;
    g.add(walk);
  }

  // đèn trang trí: cột đen, hai bóng tròn
  const lampPole = new THREE.CylinderGeometry(0.06, 0.1, 4.2, 8).translate(0, 2.1, 0);
  const arm = new THREE.BoxGeometry(1.3, 0.06, 0.06).translate(0, 4.0, 0);
  const globes = mergeBufs([new THREE.SphereGeometry(0.2, 12, 8).translate(-0.6, 4.25, 0), new THREE.SphereGeometry(0.2, 12, 8).translate(0.6, 4.25, 0), new THREE.SphereGeometry(0.17, 12, 8).translate(0, 4.5, 0)]);
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#2b2e33', roughness: 0.4, metalness: 0.6 });
  const globeMat = new THREE.MeshStandardMaterial({ color: '#fff8e8', emissive: '#ffe2a8', emissiveIntensity: 0, roughness: 0.3 });
  const iPole = new THREE.InstancedMesh(mergeBufs([lampPole, arm]), darkMetal, lampSpots.length);
  const iGlobe = new THREE.InstancedMesh(globes, globeMat, lampSpots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
  lampSpots.forEach(([x, z], i) => { m.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(Y, R() * 3), one); iPole.setMatrixAt(i, m); iGlobe.setMatrixAt(i, m); });
  iPole.castShadow = true;
  g.add(iPole, iGlobe);

  // ghế đá
  const stone = new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 0.8 });
  const benchGeo = mergeBufs([
    new THREE.BoxGeometry(1.8, 0.1, 0.45).translate(0, 0.45, 0),
    new THREE.BoxGeometry(1.8, 0.45, 0.08).translate(0, 0.72, -0.2),
    new THREE.BoxGeometry(0.12, 0.42, 0.4).translate(-0.75, 0.21, 0),
    new THREE.BoxGeometry(0.12, 0.42, 0.4).translate(0.75, 0.21, 0),
  ]);
  const iBench = new THREE.InstancedMesh(benchGeo, stone, benchSpots.length);
  benchSpots.forEach(([x, z, yaw], i) => { m.compose(new THREE.Vector3(x, 0.05, z), q.setFromAxisAngle(Y, yaw), one); iBench.setMatrixAt(i, m); });
  iBench.castShadow = true;
  g.add(iBench);

  // ---------- dù lá và ghế nằm trên cát, thành từng cụm ----------
  const umbrellas = [], loungers = [];
  for (const seg of data.coastline) {
    const pts = densify(seg, 55);
    for (let i = 1; i < pts.length - 1; i++) {
      if (R() < 0.35) continue;
      const p = pts[i], q2 = pts[i + 1];
      const tl = Math.hypot(q2[0] - p[0], q2[1] - p[1]) || 1;
      const tx = (q2[0] - p[0]) / tl, tz = (q2[1] - p[1]) / tl;
      let nx = -tz, nz = tx;
      if (grid.get(p[0] + nx * 8, p[1] + nz * 8) === SEA) { nx = -nx; nz = -nz; } // hướng vào đất liền
      const n = 3 + Math.floor(R() * 4);
      for (let k = 0; k < n; k++) {
        const along = (k - n / 2) * 6 + (R() - 0.5) * 2, inland = 20 + (k % 2) * 7 + R() * 3;
        const x = p[0] + tx * along + nx * inland, z = p[1] + tz * along + nz * inland;
        if (Math.abs(x) > LIMIT || Math.abs(z) > LIMIT || !onBeach(x, z) || grid.get(x, z) === SEA) continue;
        umbrellas.push([x, z, R()]);
        const yaw = Math.atan2(-nx, -nz); // ghế quay mặt ra biển
        for (const side of [-1, 1]) loungers.push([x + tz * side * 0.9 - nx * 0.4, z - tx * side * 0.9 - nz * 0.4, yaw]);
      }
    }
  }
  const thatch = new THREE.MeshStandardMaterial({ color: '#b8925a', roughness: 1, flatShading: true });
  const wood = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.9 });
  const roof = new THREE.ConeGeometry(1.7, 1.0, 12, 1, true).translate(0, 2.75, 0);
  const roofTop = new THREE.ConeGeometry(0.35, 0.5, 8).translate(0, 3.35, 0);
  const iRoof = new THREE.InstancedMesh(mergeBufs([roof, roofTop]), thatch, umbrellas.length);
  const iStick = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.07, 2.8, 6).translate(0, 1.4, 0), wood, umbrellas.length);
  umbrellas.forEach(([x, z, r], i) => {
    m.compose(new THREE.Vector3(x, 0, z), q.setFromEuler(new THREE.Euler((r - 0.5) * 0.08, r * 6, (r - 0.5) * 0.08)), one);
    iRoof.setMatrixAt(i, m); iStick.setMatrixAt(i, m);
  });
  thatch.side = THREE.DoubleSide;
  iRoof.castShadow = iStick.castShadow = true;
  const loungerGeo = mergeBufs([
    new THREE.BoxGeometry(0.65, 0.08, 1.4).translate(0, 0.32, 0.2),
    new THREE.BoxGeometry(0.65, 0.08, 0.7).rotateX(-0.9).translate(0, 0.55, -0.62),
    new THREE.BoxGeometry(0.6, 0.3, 0.06).translate(0, 0.15, 0.85),
    new THREE.BoxGeometry(0.6, 0.3, 0.06).translate(0, 0.15, -0.4),
  ]);
  const loungerMat = new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.6 });
  const iLounger = new THREE.InstancedMesh(loungerGeo, loungerMat, loungers.length);
  loungers.forEach(([x, z, yaw], i) => { m.compose(new THREE.Vector3(x, 0.02, z), q.setFromAxisAngle(Y, yaw), one); iLounger.setMatrixAt(i, m); });
  iLounger.castShadow = true;
  g.add(iRoof, iStick, iLounger);

  scene.add(g);
  console.info(`[beach] ${promenade.length} lối đi ven biển, ${lampSpots.length} đèn, ${benchSpots.length} ghế, ${umbrellas.length} dù lá`);
  return {
    update(t, night) { foamUniforms.t.value = t; foamUniforms.light.value = 1 - night * 0.75; },
    setNight(n) { globeMat.emissiveIntensity = n * 3; },
  };
}

// Chia nhỏ đường gấp khúc để mỗi đoạn dài tối đa `step` mét
function densify(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

function mergeBufs(list) {
  const pos = [], nrm = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}

function tileTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#d9d0c1'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(120,100,80,0.12)' : 'rgba(255,255,255,0.2)'; x.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
  x.fillStyle = '#b06a4f'; x.fillRect(0, 0, S, 18); x.fillRect(0, S / 2, S, 18); // dải gạch đỏ xen kẽ
  x.strokeStyle = 'rgba(110,100,90,0.5)'; x.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { const p = (i * S) / 4; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, S); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(S, p); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
