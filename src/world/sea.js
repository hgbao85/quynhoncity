// Mặt biển: shader tự viết, sóng tổng hợp từ nhiều hàm sin, phản chiếu trời + nắng.
import * as THREE from 'three';

const vert = /* glsl */`
uniform float uTime;
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  // sóng nhẹ ở hình học để mép bờ có chuyển động
  w.y += sin(w.x * 0.05 + uTime * 0.9) * 0.12 + sin(w.z * 0.07 - uTime * 1.1) * 0.1;
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const frag = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSky;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFog;
uniform float uFogNear;
uniform float uFogFar;
uniform float uNight;
uniform float uSun;
varying vec3 vWorld;

vec2 wave(vec2 p, vec2 d, float f, float a, float s) {
  float ph = dot(p, d) * f + uTime * s;
  return d * cos(ph) * a * f; // đạo hàm theo x,z
}
void main() {
  vec2 p = vWorld.xz;
  vec2 g = vec2(0.0);
  g += wave(p, normalize(vec2(0.3, 1.0)), 0.18, 0.35, 1.3);
  g += wave(p, normalize(vec2(-0.7, 0.6)), 0.31, 0.18, 1.9);
  g += wave(p, normalize(vec2(0.9, 0.2)), 0.67, 0.07, 2.7);
  g += wave(p, normalize(vec2(-0.2, -1.0)), 1.37, 0.03, 3.9);
  g += wave(p, normalize(vec2(0.5, -0.8)), 2.9, 0.012, 5.1);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 water = mix(uDeep, uShallow, 0.35 + 0.25 * n.x);
  vec3 col = mix(water, uSky, fres);
  vec3 r = reflect(-v, n);
  float spec = pow(max(dot(r, normalize(uSunDir)), 0.0), 220.0) * uSun * 6.0;
  col += vec3(1.0, 0.92, 0.75) * spec;
  // ánh trăng / đèn thành phố mờ ban đêm
  col += vec3(0.25, 0.32, 0.5) * pow(max(dot(r, normalize(vec3(-uSunDir.x, 0.5, -uSunDir.z))), 0.0), 60.0) * uNight;
  float d = length(cameraPosition - vWorld);
  float f = smoothstep(uFogNear, uFogFar, d);
  gl_FragColor = vec4(mix(col, uFog, f), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSea(scene) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSky: { value: new THREE.Color('#9cc3e0') }, uDeep: { value: new THREE.Color('#0d4a6b') },
      uShallow: { value: new THREE.Color('#2a8fa6') }, uFog: { value: new THREE.Color() },
      uFogNear: { value: 250 }, uFogFar: { value: 1500 }, uNight: { value: 0 }, uSun: { value: 1 },
    },
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 180, 180).rotateX(-Math.PI / 2), mat);
  sea.position.y = -0.35;
  scene.add(sea);

  const daySky = new THREE.Color('#9cc3e0'), nightSky = new THREE.Color('#0c1630'), duskSky = new THREE.Color('#e8a27a');
  const dayDeep = new THREE.Color('#0d4a6b'), nightDeep = new THREE.Color('#03101c');
  const dayShallow = new THREE.Color('#2a9aa8'), nightShallow = new THREE.Color('#0a2433');
  function update(t, env, focus) {
    const U = mat.uniforms;
    U.uTime.value = t;
    U.uSunDir.value.copy(env.sunDir);
    U.uSky.value.copy(daySky).lerp(duskSky, env.dusk * 0.6).lerp(nightSky, env.night);
    U.uDeep.value.copy(dayDeep).lerp(nightDeep, env.night);
    U.uShallow.value.copy(dayShallow).lerp(nightShallow, env.night);
    U.uFog.value.copy(env.fogColor);
    U.uNight.value = env.night;
    U.uSun.value = Math.max(0, Math.min(1, env.sunDir.y * 4));
    // mặt biển đi theo người chơi theo bước 50 m để sóng không bị "trượt"
    sea.position.x = Math.round(focus.x / 50) * 50;
    sea.position.z = Math.round(focus.z / 50) * 50;
  }
  return { update };
}
