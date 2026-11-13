import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCity } from './world/city.js';
import { createSky } from './world/sky.js';
import { createSea } from './world/sea.js';
import { createMonument } from './world/landmark.js';
import { createSquare } from './world/square.js';
import { createBeach } from './world/beach.js';
import { createMountains } from './world/mountains.js';
import { createHighlands } from './world/highlands.js';
import { createPlayer } from './player.js';
import { createCrowd } from './npc.js';
import { createQuest } from './quest.js';
import { createMinimap } from './minimap.js';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

// ---------- renderer ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { THREE, scene }); // ?debug: soi scene từ console
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 12000);
// ánh sáng môi trường cho vật liệu kim loại (tượng đồng, cột đèn)
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.3, 0.6, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ---------- UI nhỏ ----------
let toastTimer;
const ui = {
  toast(msg, ms = 3500) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  },
  openModal() { $('modal').hidden = false; },
};
$('modal-close').onclick = () => { $('modal').hidden = true; };
$('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') $('modal').hidden = true; });

// ---------- thời gian & thời tiết ----------
// Tham số URL để thử nhanh: ?h=21 (đặt giờ), ?at=120,150 (vị trí xuất phát x,z theo mét)
const params = new URLSearchParams(location.search);
let hourOffset = 0;
if (params.has('h')) {
  const now = new Date(Date.now() + 7 * 3600e3);
  hourOffset = (+params.get('h') - now.getUTCHours() + 24) % 24;
}
const WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function vnTime() {
  const d = new Date(Date.now() + hourOffset * 3600e3 + 7 * 3600e3); // đọc bằng getUTC* = giờ VN
  return { d, h: d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 };
}
$('time-btn').onclick = () => { hourOffset = (hourOffset + 3) % 24; ui.toast(hourOffset ? `⏩ Đã tua nhanh ${hourOffset} giờ` : '🕒 Trở về giờ thật'); };

const weather = { temp: 27, code: 1, assumed: true };
fetch('https://api.open-meteo.com/v1/forecast?latitude=13.7628&longitude=109.221&current=temperature_2m,weather_code&timezone=Asia%2FHo_Chi_Minh')
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((j) => { weather.temp = Math.round(j.current.temperature_2m); weather.code = j.current.weather_code; weather.assumed = false; })
  .catch(() => { /* giữ số giả định */ });
const weatherIcon = (code, night) =>
  code >= 95 ? '⛈️' : (code >= 51 && code <= 82) ? '🌧️' : code >= 45 && code <= 48 ? '🌫️' : code >= 2 ? (night ? '☁️' : '⛅') : night ? '🌙' : '☀️';

// ---------- dựng thế giới ----------
async function start() {
  const data = await fetch('/data/world.json').then((r) => r.json());
  await new Promise((r) => setTimeout(r, 30)); // cho màn hình chờ kịp hiện
  const city = buildCity(data);
  scene.add(city.group);
  const monument = createMonument(scene);
  const plazaSq = createSquare(scene, city.square);
  const beach = createBeach(scene, data, city.grid);
  const mountains = createMountains(scene);
  const highlands = createHighlands(scene, city.grid);
  const sky = createSky(scene, renderer);
  const sea = createSea(scene);
  const player = createPlayer(scene, camera, city.grid, canvas);
  // nếu điểm xuất phát bị chặn, tìm ô trống gần nhất
  const s = player.state.pos;
  if (params.has('yaw')) { const y = (+params.get('yaw') * Math.PI) / 180; player.state.camYaw = y; player.state.facing = y + Math.PI; }
  // ?zoom=300&pitch=0.9: đưa camera lên cao để xem toàn cảnh (thử nghiệm)
  if (params.has('zoom')) player.state.camDist = +params.get('zoom');
  if (params.has('pitch')) player.state.camPitch = +params.get('pitch');
  if (params.has('at')) { const [x, z] = params.get('at').split(',').map(Number); if (isFinite(x) && isFinite(z)) s.set(x, 0, z); }
  const sx = s.x, sz = s.z;
  for (let r = 1; r < 120 && !city.grid.walkable(s.x, s.z); r += 1) {
    const a = r * 2.4; s.set(sx + Math.cos(a) * r, 0, sz + Math.sin(a) * r);
  }
  camera.position.set(s.x, 6, s.z + 12);
  // dựng sẵn các ô quanh điểm xuất phát, phần còn lại tải dần khi di chuyển
  const tLoad = performance.now();
  await city.tiles.loadAround(s, 700);
  console.info(`[tiles] dựng ${city.tiles.stats().built} ô quanh điểm xuất phát trong ${(performance.now() - tLoad).toFixed(0)} ms`);
  // ô vừa dựng có thể chặn điểm xuất phát: tìm lại ô trống
  for (let r = 1; r < 120 && !city.grid.walkable(s.x, s.z); r += 1) {
    const a = r * 2.4; s.set(sx + Math.cos(a) * r, 0, sz + Math.sin(a) * r);
  }
  if (params.has('debug')) window.game = { player, city };
  const crowd = createCrowd(scene, city.grid, isTouch ? 30 : 50);
  const quest = createQuest(scene, data, ui);
  const minimap = createMinimap($('minimap'), data, city.tiles);

  $('photo').onclick = () => {
    composer.render();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `quynhon3d-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
    quest.photoTaken(player.state.pos);
  };

  $('loading').style.opacity = 0;
  setTimeout(() => $('loading').remove(), 700);
  ui.toast('Chào mừng đến Quy Nhơn! Đi tới cột sáng vàng trước tượng đài để bắt đầu.', 6000);

  const clock = new THREE.Clock();
  let hudTimer = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const { d, h } = vnTime();
    if ($('modal').hidden) player.update(dt);
    const pos = player.state.pos;
    const env = sky.update(d, h, pos);
    sea.update(t, env, pos);
    city.tiles.update(pos, dt);
    crowd.update(dt, pos);
    quest.update(t, pos, env.night);
    city.buildingMat.emissiveIntensity = env.night * 1.4;
    city.lampMat.emissiveIntensity = env.night * 3;
    city.shopMat.emissiveIntensity = env.night * 0.35;
    monument.userData.setNight(env.night);
    plazaSq.setNight(env.night);
    plazaSq.update(t);
    beach.update(t, env.night);
    beach.setNight(env.night);
    mountains.update(scene.fog.color, env.night);
    highlands.setNight(env.night);
    scene.environmentIntensity = 0.6 * (1 - env.night) + 0.08;
    bloom.enabled = env.night > 0.05; // ban ngày tắt bloom để ảnh không bị mờ đục
    bloom.strength = env.night * 0.55;
    bloom.threshold = 0.82;
    composer.render();

    hudTimer -= dt;
    if (hudTimer <= 0) {
      hudTimer = 0.25;
      const hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
      $('time').textContent = `${hh}:${mm}`;
      const month = d.getUTCMonth() + 1;
      $('date').textContent = `${WEEK[d.getUTCDay()]} ${d.getUTCDate()}/${month} · ${month >= 9 ? 'Mùa mưa' : 'Mùa khô'}`;
      $('temp').textContent = `${weather.temp}°C`;
      $('assumed').hidden = !weather.assumed;
      $('sky-icon').textContent = weatherIcon(weather.code, env.night > 0.5);
      $('mana').textContent = Math.round(player.state.mana);
      $('mana-bar').style.width = `${player.state.mana}%`;
    }
    minimap.draw(pos.x, pos.z, player.state.camYaw, player.state.facing, quest.markers());
  });
}

start().catch((e) => {
  console.error(e);
  $('loading').querySelector('.sub').textContent = 'Lỗi khi tải bản đồ: ' + e.message;
});
