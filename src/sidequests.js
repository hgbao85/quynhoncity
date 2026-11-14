// Nhiệm vụ phụ (không bắt buộc, không tính mảnh ghép):
//   - Xe ôm: đang chạy xe máy thì gặp khách đứng chờ bên đường (cột sáng xanh lá); dừng lại gần để đón,
//     chở tới địa điểm khách muốn (cột sáng xanh ở nơi đến), nhận tiền công (tiền trong game).
//   - Sổ ẩm thực: 5 xe hàng đặc sản Bình Định trong thành phố; ghé "Ăn thử" để ghi vào sổ.
//   - Hoàng hôn: chụp ảnh lúc chiều tà khi đứng gần biển hoặc đầm.
// Tiến độ lưu trong máy (localStorage). Tóm tắt hiện trong album hành trình.
import * as THREE from 'three';
import { createPerson, SHIRTS, PANTS, SKINS, HAIRS } from './character.js';
import { PLACES } from './quests-data.js';
import { LANDMARKS, siteToWorld } from './world/landmark-sites.js';
import { groundHeight } from './world/site.js';
import { ROAD, SEA } from './world/geo.js';
import { track } from './stats.js';

const KEY = 'qn3d-side-v1';
const at = (id, lx, lz) => siteToWorld(LANDMARKS.find((l) => l.id === id), lx, lz);

export const FOODS = [
  { id: 'banhxeo', name: 'Bánh xèo tôm nhảy', icon: '🥞', pos: at('market', -20, 30), text: 'Bánh xèo nhỏ đổ trong khuôn, nhân tôm nhảy (tôm đất) tươi, ăn kèm rau sống, cuốn bánh tráng chấm nước mắm.' },
  { id: 'bunchaca', name: 'Bún chả cá', icon: '🍜', pos: [463, -139], text: 'Nước dùng ngọt thanh, chả cá chiên và chả hấp làm từ cá biển tươi: bữa sáng quen thuộc của người Quy Nhơn.' },
  { id: 'banhhoi', name: 'Bánh hỏi cháo lòng', icon: '🥣', pos: at('longkhanh', 12, 54), text: 'Bánh hỏi sợi mảnh rắc mỡ hành, ăn cùng cháo lòng nóng: món sáng đặc trưng của đất Bình Định.' },
  { id: 'nem', name: 'Nem chợ Huyện', icon: '🍃', pos: at('museum', 16, 30), text: 'Nem chua gói lá chuối, vị chua nhẹ, nổi tiếng từ vùng chợ Huyện (Tuy Phước).' },
  { id: 'tre', name: 'Tré', icon: '🌿', pos: at('thapdoi', 12, 26), text: 'Tré làm từ thịt và da heo thái sợi, trộn thính, riềng, tỏi, gói lá ổi rồi lá chuối, để lên men vài ngày.' },
];

const LINES = [
  'Cho em tới {p} với nha!', 'Anh/chị chở giúp tới {p} được không?', 'Đi {p} gấp giùm em với!',
  'Tới {p} nha, em đang trễ hẹn rồi!', 'Chở em ra {p}, em muốn chụp vài tấm ảnh.',
];
const THANKS = ['Cảm ơn nha, chạy êm ghê!', 'Tới rồi, cảm ơn nhiều nha!', 'Hay quá, đúng chỗ luôn!', 'Cảm ơn, lần sau em gọi tiếp nha!'];

export function createSideQuests({ scene, grid, player, ui, audio }) {
  let save = { trips: 0, money: 0, foods: [], sunset: false };
  try { save = { ...save, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* bộ nhớ trống */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* bỏ qua */ } };
  const $ = (id) => document.getElementById(id);

  // ---- cột sáng chung (xanh lá: khách chờ; xanh dương: nơi đến) ----
  const beamGeo = new THREE.CylinderGeometry(1.1, 1.1, 40, 16, 1, true).translate(0, 20, 0);
  const beam = (color) => {
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
    m.visible = false; scene.add(m); return m;
  };
  const pickBeam = beam('#5ee87a'), dropBeam = beam('#4fb8ff');

  // ---- xe hàng ăn: xe đẩy, dù che, bảng tên ----
  const stallMats = {
    cart: new THREE.MeshStandardMaterial({ color: '#2f6f9a', roughness: 0.6 }),
    top: new THREE.MeshStandardMaterial({ color: '#d9d4c8', roughness: 0.7 }),
    pole: new THREE.MeshStandardMaterial({ color: '#d0d0d0', metalness: 0.6, roughness: 0.4 }),
    stool: new THREE.MeshStandardMaterial({ color: '#d0392b', roughness: 0.7 }),
  };
  const umbrellaColors = ['#e74c3c', '#f1c40f', '#27ae60', '#e67e22', '#8e44ad'];
  for (const [i, f] of FOODS.entries()) {
    const g = new THREE.Group();
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.9).translate(0, 0.75, 0), stallMats.cart); g.add(cart);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1).translate(0, 1.24, 0), stallMats.top); g.add(top);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6).translate(0, 1.3, 0), stallMats.pole); pole.position.x = 0.7; g.add(pole);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8, 1, true).translate(0, 2.7, 0), new THREE.MeshStandardMaterial({ color: umbrellaColors[i], side: THREE.DoubleSide, roughness: 0.8 }));
    umb.position.x = 0.7; g.add(umb);
    for (const [x, z] of [[-0.6, 1.2], [0.5, 1.4], [1.4, 1.0]]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.42, 8).translate(0, 0.21, 0), stallMats.stool); st.position.set(x, 0, z); g.add(st);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshStandardMaterial({ map: signTexture(f.name), roughness: 0.7 }));
    sign.position.set(0, 0.85, 0.46); g.add(sign);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.position.set(f.pos[0], groundHeight(f.pos[0], f.pos[1]), f.pos[1]);
    g.rotation.y = i * 1.3;
    scene.add(g);
    f.group = g;
  }

  // ---- khách xe ôm ----
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rider = createPerson({ shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIRS), height: 1.6 });
  scene.add(rider.root);
  rider.root.visible = false;
  let trip = null; // { state: 'wait' | 'ride', from:[x,z], to: place, cool }
  let cooldown = 6;

  // tìm một ô đường cách người chơi 70–180 m (khách đứng chờ bên đường)
  function roadSpot(pos) {
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 110;
      const x = pos.x + Math.cos(a) * d, z = pos.z + Math.sin(a) * d;
      if (grid.get(x, z) === ROAD) return [x, z];
    }
    return null;
  }
  function newPassenger(pos) {
    const from = roadSpot(pos);
    if (!from) return;
    const far = PLACES.filter((p) => { const d = Math.hypot(p.pos[0] - from[0], p.pos[1] - from[1]); return d > 500 && d < 3500; });
    if (!far.length) return;
    const to = pick(far);
    trip = { state: 'wait', from, to, line: pick(LINES).replace('{p}', to.name) };
    rider.root.visible = true;
    rider.root.position.set(from[0], groundHeight(from[0], from[1]), from[1]);
    rider.animate(0, 0);
    pickBeam.position.copy(rider.root.position); pickBeam.visible = true;
    ui.toast('🙋 Có khách đang đứng chờ xe ôm gần đây (cột sáng xanh lá). Chạy xe tới đón nhé!', 5000);
  }
  function cancel(msg) {
    if (msg) ui.toast(msg, 4000);
    trip = null; rider.root.visible = false; pickBeam.visible = false; dropBeam.visible = false;
    if (rider.root.parent !== scene) scene.add(rider.root);
    rider.parts.legL.rotation.x = rider.parts.legR.rotation.x = 0;
    cooldown = 20;
  }

  function update(dt, pos) {
    cooldown -= dt;
    const riding = player.riding(), speed = player.state.speed;
    if (!trip && riding && cooldown <= 0) { newPassenger(pos); cooldown = trip ? 15 : 3; } // không tìm được chỗ: thử lại sau 3 giây
    if (trip?.state === 'wait') {
      const d = Math.hypot(pos.x - trip.from[0], pos.z - trip.from[1]);
      rider.root.rotation.y = Math.atan2(pos.x - trip.from[0], pos.z - trip.from[1]); // nhìn về phía người chơi
      if (d > 320) cancel(); // chạy đi xa: khách gọi xe khác
      else if (riding && d < 5 && speed < 4) {
        // đón khách: ngồi sau yên xe
        trip.state = 'ride'; pickBeam.visible = false;
        player.bike.add(rider.root);
        rider.root.position.set(0, 0.32, -0.62); rider.root.rotation.set(0, 0, 0);
        rider.parts.legL.rotation.x = rider.parts.legR.rotation.x = -1.35;
        dropBeam.position.set(trip.to.pos[0], groundHeight(trip.to.pos[0], trip.to.pos[1]), trip.to.pos[1]); dropBeam.visible = true;
        trip.start = [pos.x, pos.z];
        ui.toast(`🛵 Khách: "${trip.line}" Theo cột sáng xanh dương trên bản đồ nhỏ.`, 6000);
        audio?.sfx?.('found');
      }
    } else if (trip?.state === 'ride') {
      if (!riding) { cancel('🙋 Khách xuống xe giữa đường rồi. Lên xe lại để đón khách khác nhé.'); return; }
      const d = Math.hypot(pos.x - trip.to.pos[0], pos.z - trip.to.pos[1]);
      if (d < 22 && speed < 5) {
        const km = Math.hypot(trip.to.pos[0] - trip.start[0], trip.to.pos[1] - trip.start[1]) / 1000;
        const pay = Math.round((15 + km * 8) * 1000 / 1000) * 1000;
        save.trips++; save.money += pay; persist();
        track('ride', { to: trip.to.id, n: save.trips });
        ui.toast(`💵 Khách: "${pick(THANKS)}" +${pay.toLocaleString('vi-VN')}đ · Đã chạy ${save.trips} chuyến`, 5500);
        audio?.sfx?.('piece');
        cancel();
        cooldown = 8;
      }
    }
    // xe hàng ăn: hiện nút "Ăn thử" khi đứng gần và chưa ăn
    let near = null;
    for (const f of FOODS) if (!riding && Math.hypot(pos.x - f.pos[0], pos.z - f.pos[1]) < 4) near = f;
    const btn = $('side-action');
    if (btn) {
      btn.hidden = !near;
      if (near) { btn.textContent = `${near.icon} Ăn thử`; btn.onclick = () => eat(near); }
    }
  }

  function eat(f) {
    const first = !save.foods.includes(f.id);
    if (first) { save.foods.push(f.id); persist(); track('food', { id: f.id, n: save.foods.length }); }
    ui.openModal?.();
    $('modal-title').textContent = `${f.icon} ${f.name}`;
    $('modal-body').innerHTML = `<p>${f.text}</p><p class="ok">${first ? `Đã ghi vào Sổ ẩm thực (${save.foods.length}/${FOODS.length}).` : 'Món này đã có trong Sổ ẩm thực.'}</p>` +
      (save.foods.length === FOODS.length && first ? '<p class="ok">🎉 Bạn đã nếm đủ 5 món đặc sản!</p>' : '');
    audio?.sfx?.(first ? 'piece' : 'found');
  }

  // ảnh hoàng hôn: chiều tà (mặt trời thấp, chưa tối hẳn) và có mặt nước trong vòng ~150 m
  function onPhoto(pos, env) {
    if (save.sunset) return;
    // mặt trời thấp sát chân trời buổi chiều (khoảng 16:40 – 17:45 giờ trong game)
    const golden = env.sunDir.y > -0.06 && env.sunDir.y < 0.22 && (env.hours ?? 17) > 12;
    if (!golden) return;
    let water = false;
    for (let a = 0; a < 16 && !water; a++) for (const r of [20, 50, 90, 150]) if (grid.get(pos.x + Math.cos(a * 0.39) * r, pos.z + Math.sin(a * 0.39) * r) === SEA) water = true;
    if (!water) return;
    save.sunset = true; persist(); track('sunset');
    setTimeout(() => ui.toast('🌅 Ảnh hoàng hôn bên mặt nước, đẹp quá! Đã hoàn thành nhiệm vụ phụ "Hoàng hôn".', 6000), 1200);
  }

  const markers = () => {
    const m = FOODS.filter((f) => !save.foods.includes(f.id)).map((f) => ({ pos: f.pos, color: '#ff9f43' }));
    if (trip?.state === 'wait') m.push({ pos: trip.from, color: '#5ee87a' });
    if (trip?.state === 'ride') m.push({ pos: trip.to.pos, color: '#4fb8ff' });
    return m;
  };

  const summaryHTML = () => `<div class="side-sum"><h3>Nhiệm vụ phụ</h3><ul>
    <li>🛵 Xe ôm: ${save.trips} chuyến · ${save.money.toLocaleString('vi-VN')}đ <small>(lên xe máy, khách sẽ đứng chờ bên đường)</small></li>
    <li>🍜 Sổ ẩm thực: ${save.foods.length}/${FOODS.length} ${FOODS.map((f) => (save.foods.includes(f.id) ? f.icon : '·')).join(' ')} <small>(chấm cam trên bản đồ nhỏ)</small></li>
    <li>🌅 Hoàng hôn: ${save.sunset ? 'đã chụp ✓' : 'chưa <small>(chụp ảnh lúc chiều tà gần biển hoặc đầm; nút ⏩ để tua giờ)</small>'}</li></ul></div>`;

  return { update, onPhoto, markers, summaryHTML, debug: () => ({ trip, save, cooldown }) };
}

function signTexture(text) {
  const c = document.createElement('canvas'); c.width = 400; c.height = 100;
  const x = c.getContext('2d');
  x.fillStyle = '#fff6e0'; x.fillRect(0, 0, 400, 100);
  x.fillStyle = '#b3282d'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 40px "Be Vietnam Pro", Arial, sans-serif'; x.fillText(text.toUpperCase(), 200, 52, 380);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
