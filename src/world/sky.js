// Bầu trời, mặt trời theo vị trí thật ở Quy Nhơn, ánh sáng ngày/đêm, sao, sương mù.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

const LAT = 13.7628 * Math.PI / 180;
const LON = 109.221;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Vị trí mặt trời (x đông, y lên, z nam) từ giờ địa phương VN (UTC+7)
export function sunDirection(dayOfYear, localHours) {
  const decl = (-23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10))) * Math.PI / 180;
  const solar = localHours + (LON - 105) / 15;
  const H = (solar - 12) * 15 * Math.PI / 180;
  const sinE = Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(H);
  const e = Math.asin(sinE);
  const A = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(decl) * Math.cos(LAT)); // từ hướng nam, dương về tây
  return new THREE.Vector3(-Math.sin(A) * Math.cos(e), sinE, Math.cos(A) * Math.cos(e)).normalize();
}

export function createSky(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(20000);
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
  scene.add(sky);

  // sao
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 1500; i++) {
    const t = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y);
    sp.push(Math.cos(t) * r * 9000, y * 9000, Math.sin(t) * r * 9000);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -1;
  scene.add(stars);

  // trăng
  const moon = new THREE.Mesh(new THREE.CircleGeometry(160, 32),
    new THREE.MeshBasicMaterial({ color: '#fdf6e3', fog: false, transparent: true, opacity: 0 }));
  scene.add(moon);

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(renderer.userData?.shadowMap || 2048, renderer.userData?.shadowMap || 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -70; sc.right = sc.top = 70; sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  const moonLight = new THREE.DirectionalLight(0x8fb2ff, 0);
  scene.add(moonLight);
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x8a7d66, 1.2);
  scene.add(hemi);
  scene.fog = new THREE.Fog(0xc9dbe8, 250, 1500);

  const dayFog = new THREE.Color('#c5d8e6'), duskFog = new THREE.Color('#e7b38f'), nightFog = new THREE.Color('#0d1729');
  const warm = new THREE.Color('#ffb36b'), white = new THREE.Color('#fff7ea');
  const tmp = new THREE.Color();

  function update(date, hours, focus) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const doy = Math.floor((date.getTime() - start) / 86400000);
    const dir = sunDirection(doy, hours);
    const night = smooth(0.02, -0.14, dir.y); // 0 = ngày, 1 = đêm
    const dusk = smooth(0.35, 0.02, dir.y) * (1 - night);

    u.sunPosition.value.copy(dir);
    u.rayleigh.value = 1.6 + dusk * 1.5;
    sky.material.visible = night < 0.999;

    sun.position.copy(focus).addScaledVector(dir, 200);
    sun.target.position.copy(focus);
    sun.intensity = 3.2 * smooth(-0.02, 0.25, dir.y);
    sun.color.copy(white).lerp(warm, dusk);
    sun.castShadow = renderer.shadowMap.enabled && sun.intensity > 0.05;

    const md = new THREE.Vector3(-dir.x, Math.max(0.35, -dir.y), -dir.z).normalize();
    moonLight.position.copy(focus).addScaledVector(md, 200);
    moonLight.target.position.copy(focus);
    moonLight.intensity = 0.55 * night;
    moon.position.copy(focus).addScaledVector(md, 8000);
    moon.lookAt(focus);
    moon.material.opacity = night;

    hemi.intensity = 1.25 * (1 - night) + 0.32 * night;
    hemi.color.set('#cfe3ff').lerp(new THREE.Color('#33466e'), night);
    hemi.groundColor.set('#8a7d66').lerp(new THREE.Color('#1c1a24'), night);

    tmp.copy(dayFog).lerp(duskFog, dusk * 0.7).lerp(nightFog, night);
    scene.fog.color.copy(tmp);
    scene.background = night > 0.999 ? tmp : null;
    starMat.opacity = night;
    stars.position.copy(focus);
    renderer.toneMappingExposure = 0.55 + night * 0.35;
    return { night, dusk, sunDir: dir, fogColor: tmp };
  }
  return { update, sun, hemi };
}
