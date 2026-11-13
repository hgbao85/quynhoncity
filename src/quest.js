// Nhiệm vụ "Khám phá Quảng trường": cột sáng + câu đố, tìm chi tiết, chụp ảnh lưu niệm.
import * as THREE from 'three';
import { pointInPoly } from './world/geo.js';
import { toWorld, PLAZA } from './world/site.js';

const STORY = `Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành khánh thành ngày 18-5-2017 tại Quảng trường Nguyễn Tất Thành, hướng ra biển. Tượng đồng cao 10,8 m trên bệ cao 4,7 m; phía sau là bức phù điêu đá xanh hình cánh cung dài 76 m.
Ông Nguyễn Sinh Sắc là thân phụ của Chủ tịch Hồ Chí Minh; Nguyễn Tất Thành là tên của Bác thời trẻ.
Khoảng năm 1909–1910, ông Nguyễn Sinh Sắc làm tri huyện Bình Khê (vùng Tây Sơn ngày nay) và người con Nguyễn Tất Thành đã vào thăm cha, trước khi tiếp tục hành trình vào phía Nam.
Tượng đài ghi dấu kỷ niệm của hai cha con trên đất Bình Định xưa.`;

const QUIZ = [
  { q: 'Nguyễn Tất Thành là tên thời trẻ của ai?', a: ['Chủ tịch Hồ Chí Minh', 'Vua Quang Trung', 'Nhà thơ Xuân Diệu', 'Đào Duy Từ'], ok: 0 },
  { q: 'Ông Nguyễn Sinh Sắc có quan hệ thế nào với Nguyễn Tất Thành?', a: ['Anh trai', 'Cha', 'Thầy giáo', 'Ông nội'], ok: 1 },
  { q: 'Ông Nguyễn Sinh Sắc từng làm tri huyện ở huyện nào của Bình Định xưa?', a: ['Hoài Nhơn', 'Phù Cát', 'Bình Khê', 'An Nhơn'], ok: 2 },
];

const SAVE_KEY = 'qn3d-progress-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* bỏ qua */ } };

export function createQuest(scene, data, ui) {
  const prog = Object.assign({ quiz: 0, found: [], photo: false, piece: false }, load());

  // ---- cột sáng ----
  const PILLAR = new THREE.Vector3(toWorld(-9, 17)[0], PLAZA.y + 0.05, toWorld(-9, 17)[1]);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 30, 24, 1, true).translate(0, 15, 0), beamMat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 32).rotateX(-Math.PI / 2), beamMat);
  ring.position.y = 0.05;
  const pillar = new THREE.Group(); pillar.add(beam, ring); pillar.position.copy(PILLAR);
  scene.add(pillar);

  // ---- 3 chi tiết đặc trưng ----
  const beach = data.areas.find((a) => a.kind === 'beach');
  let beachSpot = [60, 120];
  if (beach) {
    let best = Infinity;
    for (let x = -300; x <= 400; x += 4) for (let z = -300; z <= 400; z += 4) {
      if (pointInPoly(x, z, beach.pts)) { const d = Math.hypot(x, z - 60); if (d < best) { best = d; beachSpot = [x, z]; } }
    }
  }
  const plaza = data.areas.find((a) => a.kind === 'plaza');
  const plazaSpot = plaza ? centroid(plaza.pts) : [130, 55];
  const DETAILS = [
    { id: 'plaque', pos: toWorld(0, 6), y: 1.0, title: 'Tấm biển trên bệ tượng', text: 'Bệ tượng khắc tên hai cha con: Nguyễn Sinh Sắc và Nguyễn Tất Thành.' },
    { id: 'beach', pos: beachSpot, y: 0.1, title: 'Bãi biển Quy Nhơn', text: 'Bãi biển cong hình vầng trăng chạy dọc trung tâm thành phố, ngay sát quảng trường.' },
    { id: 'plaza', pos: plazaSpot, y: 0.1, title: 'Quảng trường Trung tâm', text: 'Quảng trường rộng mở ra biển, là nơi tổ chức lễ hội và sự kiện lớn của thành phố.' },
  ];
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#7ff3ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparks = DETAILS.map((d) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), sparkMat);
    m.position.set(d.pos[0], d.y + 1.4, d.pos[1]);
    m.visible = !prog.found.includes(d.id);
    scene.add(m);
    return m;
  });

  // ---- giao diện ----
  const $ = (id) => document.getElementById(id);
  function render() {
    const tasks = [
      [`Trả lời câu hỏi (${prog.quiz}/${QUIZ.length})`, prog.quiz >= QUIZ.length],
      [`Tìm chi tiết đặc trưng (${prog.found.length}/${DETAILS.length})`, prog.found.length >= DETAILS.length],
      [`Chụp ảnh lưu niệm (${prog.photo ? 1 : 0}/1)`, prog.photo],
    ];
    $('tasks').innerHTML = tasks.map(([t, done]) => `<li class="${done ? 'done' : ''}"><span class="box">${done ? '✓' : ''}</span>${t}</li>`).join('');
    $('pieces').textContent = `${prog.piece ? 1 : 0}/1`;
    $('pieces-bar').style.width = prog.piece ? '100%' : `${(tasks.filter((t) => t[1]).length / 3) * 100}%`;
    if (!prog.piece && tasks.every((t) => t[1])) {
      prog.piece = true; save(prog);
      ui.toast('🧩 Bạn nhận được mảnh ghép "Tượng đài bên biển"!', 5000);
      render();
    }
  }
  render();

  function openStory() {
    $('modal-title').textContent = 'Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành';
    $('modal-body').innerHTML = STORY.split('\n').map((p) => `<p>${p}</p>`).join('') +
      (prog.quiz >= QUIZ.length ? '<p class="ok">Bạn đã trả lời đúng tất cả câu hỏi ở đây. 🎉</p>' : '<button id="start-quiz" class="primary">Trả lời câu hỏi</button>');
    ui.openModal();
    const b = $('start-quiz'); if (b) b.onclick = () => askQuestion(prog.quiz);
  }
  function askQuestion(i) {
    if (i >= QUIZ.length) {
      $('modal-body').innerHTML = '<p class="ok">Chính xác hết rồi! Bạn đã hiểu thêm về nơi này. 🎉</p>';
      return;
    }
    const Q = QUIZ[i];
    $('modal-title').textContent = `Câu hỏi ${i + 1}/${QUIZ.length}`;
    $('modal-body').innerHTML = `<p class="q">${Q.q}</p><div class="answers">${Q.a.map((a, k) => `<button data-k="${k}">${a}</button>`).join('')}</div><p id="quiz-msg"></p>`;
    $('modal-body').querySelectorAll('.answers button').forEach((btn) => {
      btn.onclick = () => {
        if (+btn.dataset.k === Q.ok) {
          btn.classList.add('right');
          prog.quiz = Math.max(prog.quiz, i + 1); save(prog); render();
          setTimeout(() => askQuestion(i + 1), 700);
        } else {
          btn.classList.add('wrong'); btn.disabled = true;
          $('quiz-msg').textContent = 'Chưa đúng, thử lại nhé!';
        }
      };
    });
  }
  $('action').onclick = () => openStory();

  function photoTaken(playerPos) {
    if (playerPos.length() < 60 && !prog.photo) {
      prog.photo = true; save(prog); render();
      ui.toast('📸 Đã lưu ảnh lưu niệm bên tượng đài!');
    } else if (!prog.photo) {
      ui.toast('📸 Đã chụp! Muốn hoàn thành nhiệm vụ, hãy chụp gần tượng đài.');
    } else ui.toast('📸 Đã chụp ảnh.');
  }

  function update(t, playerPos, night = 0) {
    beamMat.opacity = (0.32 + Math.sin(t * 2.2) * 0.1) * (1 - night * 0.6);
    ring.scale.setScalar(1 + (t % 1.6) * 0.4);
    const nearPillar = Math.hypot(playerPos.x - PILLAR.x, playerPos.z - PILLAR.z) < 4;
    $('action').hidden = !nearPillar;
    DETAILS.forEach((d, i) => {
      if (prog.found.includes(d.id)) return;
      const s = sparks[i];
      s.rotation.y = t * 2; s.position.y = d.y + 1.4 + Math.sin(t * 3 + i) * 0.2;
      if (Math.hypot(playerPos.x - d.pos[0], playerPos.z - d.pos[1]) < (d.id === 'plaque' ? 5 : 4)) {
        prog.found.push(d.id); save(prog); s.visible = false;
        ui.toast(`✨ ${d.title}: ${d.text}`, 5500);
        render();
      }
    });
  }

  const markers = () => [
    { pos: [PILLAR.x, PILLAR.z], color: '#ffd76a' },
    ...DETAILS.filter((d) => !prog.found.includes(d.id)).map((d) => ({ pos: d.pos, color: '#7ff3ff' })),
  ];
  return { update, photoTaken, markers };
}

function centroid(pts) {
  let x = 0, z = 0;
  for (const p of pts) { x += p[0]; z += p[1]; }
  return [x / pts.length, z / pts.length];
}
