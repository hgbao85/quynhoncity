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
import { createTerrain } from './world/terrainmesh.js';
import { setTerrain } from './world/terrain.js';
import { createHighlands } from './world/highlands.js';
import { createLandmarks, mergeStatic } from './world/landmarks.js';
import { setBridges } from './world/bridges.js';
import { createBridges } from './world/bridgemesh.js';
import { createPlayer } from './player.js';
import { createCrowd } from './npc.js';
import { groundHeight } from './world/site.js';
import { createQuest } from './quest.js';
import { createMinimap } from './minimap.js';
import { pickQuality, saveQuality, createFpsMeter } from './quality.js';
import { createBigMap } from './bigmap.js';
import { createTraffic } from './traffic.js';
import { createAudio } from './audio.js';
import { createAlbum } from './album.js';
import { setupPwa } from './pwa.js';
import { createTutorial } from './tutorial.js';
import { createSideQuests } from './sidequests.js';
import { createZones } from './world/zones.js';
import { zoneAt } from './world/zones-config.js';
import { track } from './stats.js';
import { QUESTS } from './quests-data.js';
import { createWeather, testWeatherCode } from './world/weather.js';

const $ = (id) => document.getElementById(id);
// điện thoại/máy tính bảng: con trỏ thô, hoặc có cảm ứng mà màn hình nhỏ (một số trình duyệt Android
// báo sai pointer khi bật chế độ máy tính)
const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 900);
if (isTouch) document.body.classList.add('touch');

// ---------- renderer ----------
const canvas = $('scene');
const Q = pickQuality(isTouch);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.antialias, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = Q.shadows;
renderer.userData = { shadowMap: Q.shadowMap };
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { THREE, scene }); // ?debug: soi scene từ console
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 12000);
// ánh sáng môi trường cho vật liệu kim loại (tượng đồng, cột đèn)
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
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
// Bảng nhiệm vụ: bấm để thu gọn (chỉ còn tên và 3 ô đánh dấu) hoặc mở rộng. Điện thoại mặc định thu gọn.
{
  const card = $('quest-card');
  let saved = null;
  try { saved = localStorage.getItem('qn3d-quest-collapsed'); } catch { /* không có bộ nhớ */ }
  card.classList.toggle('collapsed', saved === null ? isTouch : saved === '1');
  const toggle = () => {
    const c = card.classList.toggle('collapsed');
    try { localStorage.setItem('qn3d-quest-collapsed', c ? '1' : '0'); } catch { /* bỏ qua */ }
  };
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
}
// Esc đóng bảng và bản đồ lớn
addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('modal').hidden = true; $('bigmap').hidden = true; } });
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
// Thời tiết thật: hỏi máy chủ của game trước (/api/weather, chuyển tiếp Open-Meteo), không được thì gọi thẳng
// Open-Meteo. Có máy không gọi thẳng được Open-Meteo (mạng hoặc trình chặn quảng cáo chặn), nhưng gọi
// được máy chủ của game. Thử lại khi lỗi (sau 3 s, 10 s, 30 s), rồi cập nhật mỗi 15 phút.
// Nếu vẫn không lấy được thì giữ số giả định và hiện nhãn "giả định".
const getJson = async (url) => {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
};
async function loadWeather(attempt = 0) {
  try {
    let temp, code;
    try {
      ({ temp, code } = await getJson('/api/weather'));
      if (typeof temp !== 'number') throw new Error('no data');
    } catch {
      const j = await getJson('https://api.open-meteo.com/v1/forecast?latitude=13.7628&longitude=109.221&current=temperature_2m,weather_code&timezone=Asia%2FHo_Chi_Minh');
      temp = j.current.temperature_2m; code = j.current.weather_code;
    }
    weather.temp = Math.round(temp); weather.code = code; weather.assumed = false;
    setTimeout(() => loadWeather(0), 15 * 60e3);
  } catch {
    const wait = [3e3, 10e3, 30e3][attempt];
    setTimeout(() => loadWeather(wait ? attempt + 1 : 0), wait || 15 * 60e3);
  }
}
loadWeather();
const weatherIcon = (code, night) =>
  code >= 95 ? '⛈️' : (code >= 51 && code <= 82) ? '🌧️' : code >= 45 && code <= 48 ? '🌫️' : code >= 2 ? (night ? '☁️' : '⛅') : night ? '🌙' : '☀️';

// ---------- dựng thế giới ----------
async function start() {
  const [data, tbin] = await Promise.all([
    fetch('/data/world.json').then((r) => r.json()),
    fetch('/data/terrain.bin').then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null),
  ]);
  let terrain = null;
  if (tbin && data.terrain) { terrain = { meta: data.terrain, data: new Int16Array(tbin) }; setTerrain(terrain.meta, terrain.data); }
  setBridges(data.roads); // cần độ cao địa hình để tính hai đầu cầu
  await new Promise((r) => setTimeout(r, 30)); // cho màn hình chờ kịp hiện
  const city = buildCity(data, terrain, Q);
  scene.add(city.group);
  const monument = createMonument(scene);
  const plazaSq = createSquare(scene, city.square);
  // tượng đài, phù điêu, cây cảnh, quảng trường: hàng trăm khối nhỏ → gộp theo vật liệu (bớt lần vẽ, nhất là bóng đổ)
  mergeStatic(monument);
  mergeStatic(plazaSq.group);
  const beach = createBeach(scene, data, city.grid);
  const terrainMesh = createTerrain(scene);
  const zones = createZones({ scene, terrain: terrainMesh, grid: city.grid });
  const highlands = createHighlands(scene, city.grid);
  const landmarks = createLandmarks(scene, city.grid);
  const bridges = createBridges(scene);
  const sky = createSky(scene, renderer);
  const wx = createWeather(scene, Q.id === 'low' ? 1400 : 3000);
  const wxTest = testWeatherCode();
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
  if (params.has('debug')) window.game = { player, city, camera, renderer, scene };
  const crowd = createCrowd(scene, city.grid, Q.crowd);
  // ---- âm thanh, album ----
  setupPwa(ui);
  const audio = createAudio();
  ui.sfx = audio.sfx;
  const SOUND_ICON = { all: '🔊', nomusic: '🔉', mute: '🔇' }, SOUND_LBL = { all: 'Âm thanh', nomusic: 'Tắt nhạc', mute: 'Tắt tiếng' };
  const showSound = () => { $('sound-btn').querySelector('span').textContent = SOUND_ICON[audio.mode]; $('sound-btn').querySelector('small').textContent = SOUND_LBL[audio.mode]; };
  showSound();
  $('sound-btn').onclick = () => { audio.cycle(); showSound(); ui.toast({ all: '🔊 Bật âm thanh và nhạc nền', nomusic: '🔉 Tắt nhạc nền, giữ tiếng sóng và phố', mute: '🔇 Đã tắt tiếng' }[audio.mode], 2500); };
  let album;
  ui.onPhoto = (id, thumb) => album?.savePhoto(id, thumb);
  ui.onComplete = () => album?.open();
  const quest = createQuest(scene, data, ui);
  album = createAlbum({ getProgress: () => quest.progress(), ui });
  const side = createSideQuests({ scene, grid: city.grid, player, ui, audio });
  ui.sideSummary = () => side.summaryHTML();
  if (window.game) Object.assign(window.game, { side, zones, quest, groundHeight });
  let lastEnv = null, lastH = 12;
  // khoảng cách tới bờ biển (lấy mẫu đường bờ biển thưa) cho tiếng sóng
  const coastPts = [];
  for (const c of data.coastline) for (let i = 0; i < c.length; i += 2) coastPts.push(c[i]);
  const seaDist = (x, z) => { let m = 1e9; for (const p of coastPts) { const d = Math.abs(p[0] - x) + Math.abs(p[1] - z); if (d < m) m = d; } return m * 0.8; };
  let seaD = 1e9, seaTimer = 0;
  const traffic = createTraffic(scene, data, Q.traffic);
  if (params.has('debug')) window.game.traffic = traffic;
  $('ride-btn').onclick = () => {
    const was = player.riding();
    if (player.setRiding(!was) === false) ui.toast('Chỗ này hẹp quá, ra chỗ rộng hơn để lên xe nhé.');
    else ui.toast(was ? '🚶 Đã xuống xe' : '🛵 Lên xe! Đi chậm, đội mũ bảo hiểm, nhường người đi bộ nhé.', 3500);
  };
  const minimap = createMinimap($('minimap'), data, city.tiles, city.grid);

  // ---- bản đồ lớn và dịch chuyển nhanh ----
  const tutorial = createTutorial({ isTouch, total: QUESTS.length });
  let travelling = false;
  createBigMap(data, {
    getPlayer: () => ({ x: player.state.pos.x, z: player.state.pos.z, facing: player.state.facing }),
    getProgress: () => quest.progress(),
    onTravel: async (pl) => {
      if (travelling) return;
      travelling = true;
      $('travel').hidden = false;
      $('travel').querySelector('.sub').textContent = `Đang tới ${pl.name}…`;
      try {
        // khu riêng (Kỳ Co, Eo Gió): tải địa hình và cảnh của khu trước khi đặt người chơi xuống
        if (pl.zone) { await zones.load(pl.zone); quest.refreshHeights(); }
        const p = player.state.pos;
        p.set(pl.pos[0], 0, pl.pos[1]);
        await city.tiles.loadAround(p, 500);
        for (let r = 1; r < 150 && !city.grid.walkable(p.x, p.z); r += 1) {
          const a = r * 2.4; p.set(pl.pos[0] + Math.cos(a) * r * 0.5, 0, pl.pos[1] + Math.sin(a) * r * 0.5);
        }
        camera.position.set(p.x, p.y + 6, p.z + 12);
        crowd.relocate?.(p);
        ui.toast(`📍 ${pl.name}`, 3000);
        track('travel', { to: pl.id });
      } finally {
        $('travel').hidden = true;
        travelling = false;
      }
    },
  });

  // Ảnh lưu niệm cho album/bưu thiếp: 16:9, 640×360, cắt giữa khung hình. Khi đứng gần một địa điểm,
  // ảnh được chụp từ góc máy đẹp đặt sẵn của địa điểm đó (quests-data.js: shot), không phải góc camera
  // đang theo người chơi (hay bị sát tường hoặc bị người chơi che).
  const shotCam = new THREE.PerspectiveCamera(50, 1, 0.5, 6000);
  function souvenir(shot) {
    const tw = 640, th = 360;
    const sr = Math.min(canvas.width / tw, canvas.height / th), sw = tw * sr, sh = th * sr;
    if (shot) {
      // góc nhìn dọc của vùng cắt 16:9 là 50°; mở rộng cho cả khung hình rồi cắt lấy phần giữa
      shotCam.aspect = canvas.width / canvas.height;
      shotCam.fov = (2 * Math.atan(Math.tan((25 * Math.PI) / 180) * (canvas.height / sh)) * 180) / Math.PI;
      shotCam.updateProjectionMatrix();
      const [cx, cz, ch] = shot.cam, [lx, lz, lh] = shot.look;
      shotCam.position.set(cx, groundHeight(cx, cz) + ch, cz);
      shotCam.lookAt(lx, groundHeight(lx, lz) + lh, lz);
      shotCam.updateMatrixWorld();
      renderPass.camera = shotCam;
    }
    composer.render();
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    c.getContext('2d').drawImage(canvas, (canvas.width - sw) / 2, (canvas.height - sh) / 2, sw, sh, 0, 0, tw, th);
    if (shot) renderPass.camera = camera;
    return c;
  }
  if (window.game) window.game.souvenir = (shot) => { quest.setMarkersVisible(false); const c = souvenir(shot); quest.setMarkersVisible(true); return c.toDataURL('image/jpeg', 0.85); };

  $('photo').onclick = () => {
    // ảnh sạch: ẩn cột sáng, điểm sáng nhiệm vụ trong khoảnh khắc chụp (bảng thông tin là HTML nên không lọt vào ảnh)
    quest.setMarkersVisible(false);
    const thumbCanvas = souvenir(quest.shotNear(player.state.pos));
    composer.render(); // ảnh người chơi tự chụp: đúng góc đang nhìn
    // máy tính: tải ảnh PNG về; điện thoại: chỉ lưu vào album (tránh hiện hộp tải xuống mỗi lần chụp)
    if (!isTouch) canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `quynhon3d-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    quest.setMarkersVisible(true);
    const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
    audio.sfx('shutter');
    quest.photoTaken(player.state.pos, thumbCanvas.toDataURL('image/jpeg', 0.78));
    if (lastEnv) side.onPhoto(player.state.pos, { ...lastEnv, hours: lastH });
  };

  $('loading').style.opacity = 0;
  setTimeout(() => $('loading').remove(), 700);
  // lần đầu chơi (hoặc ?tutorial): hướng dẫn từng bước; các lần sau chỉ một dòng chào
  const welcome = () => ui.toast(`Chào mừng đến Quy Nhơn! Tìm các cột sáng vàng để khám phá ${QUESTS.length} địa điểm. Bấm 🗺️ để xem bản đồ.`, 7000);
  if (!tutorial.done() || params.has('tutorial')) setTimeout(() => tutorial.start(() => { audio.sfx?.('piece'); }), 700);
  else welcome();

  // ---- nút đồ hoạ: hiện FPS, bấm để đổi mức Cao/Thấp (tải lại trang) ----
  const fpsMeter = createFpsMeter();
  $('quality-btn').onclick = () => {
    const next = Q.id === 'high' ? 'low' : 'high';
    saveQuality(next);
    const u = new URL(location.href); u.searchParams.delete('q'); location.href = u.href;
  };
  $('quality-lbl').textContent = Q.label;
  let lowWarned = false, slowTime = 0;

  const FLASH_COLOR = new THREE.Color('#e6ecff');
  const clock = new THREE.Clock();
  let hudTimer = 0;
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    fpsMeter.tick(raw);
    const dt = Math.min(raw, 0.05), t = clock.elapsedTime;
    const { d, h } = vnTime();
    // dừng điều khiển khi đang mở bảng, bản đồ lớn hoặc đang dịch chuyển
    if ($('modal').hidden && $('bigmap').hidden && !travelling && !tutorial.open) player.update(dt);
    const pos = player.state.pos;
    const env = sky.update(d, h, pos);
    lastEnv = env; lastH = h;
    wx.setCode(wxTest ?? weather.code);
    const wxs = wx.update(dt, camera, env, { sun: sky.sun, hemi: sky.hemi, renderer });
    if (wxs.flash > 0) { scene.fog.color.lerp(FLASH_COLOR, wxs.flash * 0.6); renderer.toneMappingExposure += wxs.flash * 0.8; }
    // biển dùng đúng màu sương cuối cùng (đã tính mưa, u ám, chớp)
    sea.update(t, { ...env, fogColor: scene.fog.color }, pos);
    if (scene.background && scene.background.isColor) scene.background.copy(scene.fog.color);
    city.tiles.update(pos, dt);
    crowd.update(dt, pos);
    traffic.update(dt, pos);
    seaTimer -= dt; if (seaTimer <= 0) { seaTimer = 0.5; seaD = seaDist(pos.x, pos.z); }
    audio.update(dt, { seaDist: seaD, cars: traffic.countNear(pos, 80), riding: player.riding(), speed: player.state.speed, night: env.night, rain: wxs.rain, thunder: wxs.strike });
    quest.update(t, pos, env.night, dt);
    side.update(dt, pos);
    city.buildingMat.emissiveIntensity = env.night * 1.4;
    city.lampMat.emissiveIntensity = env.night * 3;
    city.shopMat.emissiveIntensity = env.night * 0.35;
    monument.userData.setNight(env.night);
    plazaSq.setNight(env.night);
    plazaSq.update(t, pos);
    beach.update(t, env.night);
    beach.setNight(env.night);
    terrainMesh.update(scene.fog.color, env.night);
    highlands.setNight(env.night);
    landmarks.setNight(env.night);
    landmarks.update(camera.position);
    bridges.setNight(env.night);
    traffic.setNight(env.night);
    const nightFlag = env.night > 0.5 ? '1' : '';
    if (document.body.dataset.night !== nightFlag) document.body.dataset.night = nightFlag;
    scene.environmentIntensity = 0.6 * (1 - env.night) + 0.08;
    bloom.enabled = Q.bloom && env.night > 0.05; // ban ngày tắt bloom để ảnh không bị mờ đục
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
      // thẻ địa danh: tên khu (Nhơn Lý ở Kỳ Co, Eo Gió) và địa điểm gần nhất
      {
        const zn = zoneAt(pos.x, pos.z), near = quest.nearest?.(pos);
        const title = zn ? 'NHƠN LÝ' : 'QUY NHƠN', sub = near && near.d < 500 ? near.place : zn ? zn.name : 'Thành phố biển Quy Nhơn';
        if ($('place-title').textContent !== title) $('place-title').textContent = title;
        if ($('place-sub').textContent !== sub) $('place-sub').textContent = sub;
      }
      $('assumed').hidden = !weather.assumed;
      $('sky-icon').textContent = weatherIcon(wxTest ?? weather.code, env.night > 0.5);
      $('sky-icon').title = wx.label;
      $('mana').textContent = Math.round(player.state.mana);
      $('mana-bar').style.width = `${player.state.mana}%`;
      const fps = Math.round(fpsMeter.fps);
      $('fps').textContent = `${fps} FPS`;
      // máy chậm ở mức Cao: chỉ gợi ý chuyển sang Thấp khi FPS thấp kéo dài ~8 giây liền
      // (bỏ qua lúc mới vào và những lúc khựng ngắn khi đang tải khu vực mới)
      slowTime = Q.id === 'high' && t > 20 && fps < 24 ? slowTime + 0.25 : 0;
      if (!lowWarned && slowTime >= 8) { lowWarned = true; ui.toast('Máy hơi chậm — bấm nút ⚙ để chuyển sang đồ hoạ Thấp cho mượt hơn.', 7000); }
    }
    minimap.draw(pos.x, pos.z, player.state.camYaw, player.state.facing, [...quest.markers(), ...side.markers()]);
  });
}

start().catch((e) => {
  console.error(e);
  $('loading').querySelector('.sub').textContent = 'Lỗi khi tải bản đồ: ' + e.message;
});
