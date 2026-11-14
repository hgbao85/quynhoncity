// Hành trình khám phá Quy Nhơn: mỗi địa điểm trong quests-data.js có cột sáng vàng (câu chuyện +
// câu hỏi), các điểm sáng xanh cần tìm và một tấm ảnh lưu niệm. Xong cả ba thì nhận một mảnh ghép.
// Bảng nhiệm vụ trên màn hình hiện địa điểm gần người chơi nhất.
import * as THREE from 'three';
import { QUESTS } from './quests-data.js';
import { groundHeight } from './world/site.js';
import { track } from './stats.js';

const SAVE_KEY = 'qn3d-progress-v2';
const OLD_KEY = 'qn3d-progress-v1';
const load = () => {
  try {
    const v2 = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (v2) return v2;
    const v1 = JSON.parse(localStorage.getItem(OLD_KEY)); // tiến độ của bản cũ (chỉ có tượng đài)
    return v1 ? { monument: v1 } : {};
  } catch { return {}; }
};
const save = (s) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* bỏ qua */ } };

export function createQuest(scene, data, ui) {
  const all = load();
  const P = (q) => (all[q.id] = Object.assign({ quiz: 0, found: [], photo: false, piece: false }, all[q.id] || {}));
  QUESTS.forEach(P);
  const $ = (id) => document.getElementById(id);

  // ---- cột sáng và điểm sáng cho mọi địa điểm ----
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beamGeo = new THREE.CylinderGeometry(0.9, 0.9, 30, 24, 1, true).translate(0, 15, 0);
  const ringGeo = new THREE.RingGeometry(1.1, 1.5, 32).rotateX(-Math.PI / 2);
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#7ff3ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparkGeo = new THREE.OctahedronGeometry(0.45);
  const rings = [];
  const state = QUESTS.map((q) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(beamGeo, beamMat));
    const ring = new THREE.Mesh(ringGeo, beamMat); ring.position.y = 0.05; g.add(ring); rings.push(ring);
    g.position.set(q.pillar[0], groundHeight(q.pillar[0], q.pillar[1]) + 0.05, q.pillar[1]);
    scene.add(g);
    const sparks = q.details.map((d) => {
      const m = new THREE.Mesh(sparkGeo, sparkMat);
      m.position.set(d.pos[0], groundHeight(d.pos[0], d.pos[1]) + d.y + 1.4, d.pos[1]);
      m.visible = !all[q.id].found.includes(d.id);
      scene.add(m);
      return m;
    });
    return { q, pillar: g, sparks };
  });

  let current = QUESTS[0];
  const done = (q) => {
    const p = all[q.id];
    return [p.quiz >= q.quiz.length, p.found.length >= q.details.length, p.photo];
  };
  const pieces = () => QUESTS.filter((q) => all[q.id].piece).length;

  function render() {
    const q = current, p = all[q.id], [d1, d2, d3] = done(q);
    $('quest-title').textContent = `${q.place}: ${q.title}`;
    const tasks = [
      [`Trả lời câu hỏi (${p.quiz}/${q.quiz.length})`, d1],
      [`Tìm chi tiết đặc trưng (${p.found.length}/${q.details.length})`, d2],
      [`Chụp ảnh lưu niệm (${p.photo ? 1 : 0}/1)`, d3],
    ];
    $('tasks').innerHTML = tasks.map(([t, ok]) => `<li class="${ok ? 'done' : ''}"><span class="box">${ok ? '✓' : ''}</span><span class="t">${t}</span></li>`).join('');
    $('pieces').textContent = `${pieces()}/${QUESTS.length}`;
    $('pieces-bar').style.width = `${(pieces() / QUESTS.length) * 100}%`;
    if (!p.piece && d1 && d2 && d3) {
      p.piece = true; save(all);
      track('piece', { place: q.id, n: pieces() });
      if (pieces() === QUESTS.length) track('complete');
      ui.toast(`🧩 Bạn nhận được mảnh ghép "${q.piece}"! (${pieces()}/${QUESTS.length})`, 5000);
      ui.sfx?.('piece');
      if (pieces() === QUESTS.length) setTimeout(() => { ui.toast('🎉 Bạn đã khám phá đủ mọi địa điểm của Quy Nhơn! Tạo bưu thiếp để lưu lại nhé.', 7000); ui.onComplete?.(); }, 3000);
      render();
    }
  }

  function openStory() {
    const q = current, p = all[q.id];
    $('modal-title').textContent = q.place;
    $('modal-body').innerHTML = q.story.map((s) => `<p>${s}</p>`).join('') +
      (p.quiz >= q.quiz.length ? '<p class="ok">Bạn đã trả lời đúng tất cả câu hỏi ở đây. 🎉</p>' : '<button id="start-quiz" class="primary">Trả lời câu hỏi</button>');
    ui.openModal();
    const b = $('start-quiz'); if (b) b.onclick = () => askQuestion(q, p.quiz);
  }
  function askQuestion(q, i) {
    const p = all[q.id];
    if (i >= q.quiz.length) { $('modal-body').innerHTML = '<p class="ok">Chính xác hết rồi! Bạn đã hiểu thêm về nơi này. 🎉</p>'; return; }
    const Q = q.quiz[i];
    $('modal-title').textContent = `${q.place} · Câu hỏi ${i + 1}/${q.quiz.length}`;
    $('modal-body').innerHTML = `<p class="q">${Q.q}</p><div class="answers">${Q.a.map((a, k) => `<button data-k="${k}">${a}</button>`).join('')}</div><p id="quiz-msg"></p>`;
    $('modal-body').querySelectorAll('.answers button').forEach((btn) => {
      btn.onclick = () => {
        if (+btn.dataset.k === Q.ok) {
          btn.classList.add('right'); ui.sfx?.('right');
          $('modal-body').querySelectorAll('.answers button').forEach((x) => { x.disabled = true; });
          p.quiz = Math.max(p.quiz, i + 1); save(all); render();
          setTimeout(() => askQuestion(q, i + 1), 700);
        } else {
          btn.classList.add('wrong'); btn.disabled = true; ui.sfx?.('wrong');
          $('quiz-msg').textContent = 'Chưa đúng, thử lại nhé!';
        }
      };
    });
  }
  $('action').onclick = () => openStory();

  // góc máy đẹp của địa điểm đang làm, nếu người chơi đứng đủ gần
  const shotNear = (pos) => (current && Math.hypot(pos.x - current.center[0], pos.z - current.center[1]) < current.photoRadius ? current.shot : null);

  function photoTaken(pos, thumb) {
    const q = current, p = all[q.id];
    const near = Math.hypot(pos.x - q.center[0], pos.z - q.center[1]) < q.photoRadius;
    if (near && thumb) ui.onPhoto?.(q.id, thumb); // ảnh mới nhất tại địa điểm dùng cho album, bưu thiếp
    if (near && !p.photo) { p.photo = true; save(all); render(); ui.toast(`📸 Đã lưu ảnh lưu niệm tại ${q.place}!`); }
    else if (!p.photo) ui.toast(`📸 Đã chụp! Muốn hoàn thành nhiệm vụ, hãy chụp gần ${q.place}.`);
    else ui.toast('📸 Đã chụp ảnh.');
  }

  let timer = 0;
  function update(t, pos, night = 0, dt = 0.016) {
    beamMat.opacity = (0.32 + Math.sin(t * 2.2) * 0.1) * (1 - night * 0.6);
    for (const r of rings) r.scale.setScalar(1 + (t % 1.6) * 0.4);
    // chọn địa điểm gần nhất làm nhiệm vụ đang hiện
    timer -= dt;
    if (timer <= 0) {
      timer = 0.5;
      let best = current, bd = 1e9;
      for (const q of QUESTS) { const d = Math.hypot(pos.x - q.center[0], pos.z - q.center[1]); if (d < bd) { bd = d; best = q; } }
      if (best !== current) { current = best; render(); }
    }
    const s0 = state.find((s) => s.q === current);
    $('action').hidden = !(s0 && Math.hypot(pos.x - current.pillar[0], pos.z - current.pillar[1]) < 4);
    for (const s of state) {
      const p = all[s.q.id];
      // xét từng chi tiết theo khoảng cách tới chính nó (cầu Thị Nại dài 2,8 km: chi tiết cách tâm hơn 1 km)
      s.q.details.forEach((d, i) => {
        if (p.found.includes(d.id) || Math.hypot(pos.x - d.pos[0], pos.z - d.pos[1]) > 300) return;
        const m = s.sparks[i];
        m.rotation.y = t * 2; m.position.y = groundHeight(d.pos[0], d.pos[1]) + d.y + 1.4 + Math.sin(t * 3 + i) * 0.2;
        if (Math.hypot(pos.x - d.pos[0], pos.z - d.pos[1]) < d.r) {
          p.found.push(d.id); save(all); m.visible = false;
          ui.toast(`✨ ${d.title}: ${d.text}`, 5500); ui.sfx?.('found');
          render();
        }
      });
    }
  }

  // Điểm đánh dấu trên bản đồ nhỏ: cột sáng của mọi địa điểm chưa xong + chi tiết chưa tìm của địa điểm hiện tại
  const markers = () => [
    ...QUESTS.filter((q) => !all[q.id].piece || q === current).map((q) => ({ pos: q.pillar, color: '#ffd76a' })),
    ...current.details.filter((d) => !all[current.id].found.includes(d.id)).map((d) => ({ pos: d.pos, color: '#7ff3ff' })),
  ];
  const progress = () => QUESTS.map((q) => ({ id: q.id, place: q.place, piece: all[q.id].piece, steps: done(q).filter(Boolean).length }));

  // ẩn/hiện cột sáng và điểm sáng (khi chụp ảnh lưu niệm cho đẹp)
  function setMarkersVisible(on) {
    for (const s of state) {
      s.pillar.visible = on;
      s.sparks.forEach((m, i) => { m.visible = on && !all[s.q.id].found.includes(s.q.details[i].id); });
    }
  }
  render();
  // đặt lại độ cao cột sáng (sau khi nạp địa hình một khu riêng)
  const refreshHeights = () => { for (const s of state) s.pillar.position.y = groundHeight(s.q.pillar[0], s.q.pillar[1]) + 0.05; };
  // địa điểm gần nhất (cho thẻ địa danh)
  const nearest = (pos) => { let best = null; for (const q of QUESTS) { const d = Math.hypot(pos.x - q.center[0], pos.z - q.center[1]); if (!best || d < best.d) best = { place: q.place, d }; } return best; };
  return { update, photoTaken, shotNear, markers, progress, setMarkersVisible, refreshHeights, nearest };
}
