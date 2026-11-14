// Hướng dẫn lần đầu chơi: vài bước ngắn, mỗi bước khoanh sáng một phần giao diện (joystick, bản đồ nhỏ,
// bảng nhiệm vụ, nút chụp ảnh, bản đồ lớn, xe máy, mảnh ghép). Chỉ hiện một lần; mở lại bằng ?tutorial
// trên đường dẫn hoặc gọi lại hàm trả về.
import { track } from './stats.js';
const KEY = 'qn3d-tutorial-done';

export function createTutorial({ isTouch, total }) {
  const steps = [
    { title: 'Chào mừng đến Quy Nhơn 3D!', text: `Dạo quanh thành phố biển, khám phá ${total} địa điểm nổi tiếng. Mỗi nơi hoàn thành cho bạn một mảnh ghép.` },
    isTouch
      ? { el: 'joystick', title: 'Di chuyển', text: 'Kéo vòng tròn này để đi; kéo hết cỡ để chạy. Vuốt ở phần còn lại của màn hình để xoay góc nhìn.' }
      : { title: 'Di chuyển', text: 'Dùng W A S D hoặc phím mũi tên để đi, giữ Shift để chạy. Kéo chuột để xoay góc nhìn, lăn chuột để phóng to/thu nhỏ.' },
    { el: 'minimap', title: 'Tìm cột sáng vàng', text: 'Mỗi địa điểm có một cột sáng vàng. Chấm vàng trên bản đồ nhỏ chỉ chỗ các cột sáng; chấm xanh là chi tiết cần tìm.' },
    { el: 'quest-card', title: 'Việc cần làm', text: 'Ở mỗi nơi: trả lời câu hỏi tại cột sáng, tìm các điểm sáng xanh và chụp một ảnh lưu niệm. Bấm vào bảng để mở rộng hoặc thu gọn.' },
    { el: 'photo', title: 'Chụp ảnh lưu niệm', text: 'Đứng gần công trình rồi bấm nút này. Ảnh được lưu vào album hành trình của bạn.' },
    { el: 'map-btn', title: 'Bản đồ lớn', text: 'Xem toàn thành phố và bấm vào một địa điểm để dịch chuyển nhanh tới đó.' + (isTouch ? '' : ' Phím tắt: M.') },
    { el: 'ride-btn', title: 'Xe máy', text: 'Lên xe để đi nhanh hơn trên đường phố.' + (isTouch ? '' : ' Phím tắt: F.') },
    { el: 'piece-card', title: 'Mảnh ghép và bưu thiếp', text: `Bấm vào đây để xem album. Đủ ${total} mảnh ghép, bạn tạo được bưu thiếp có ảnh và tên của mình để chia sẻ.` },
  ];

  let root = null, i = 0, onClose = null;
  const done = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

  function close() {
    track('tutorial', { result: i >= steps.length - 1 ? 'done' : 'skip', step: i + 1 });
    try { localStorage.setItem(KEY, '1'); } catch { /* không có bộ nhớ */ }
    root?.remove(); root = null;
    removeEventListener('resize', place);
    onClose?.();
  }

  function place() {
    if (!root) return;
    const s = steps[i], ring = root.querySelector('.tut-ring'), card = root.querySelector('.tut-card');
    const el = s.el && document.getElementById(s.el);
    const r = el && el.offsetParent !== null ? el.getBoundingClientRect() : null;
    if (r && r.width) {
      const pad = 6;
      Object.assign(ring.style, { display: 'block', left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
        borderRadius: getComputedStyle(el).borderRadius || '14px' });
      // thẻ chữ nằm ở nửa màn hình không có phần được khoanh
      const below = r.top + r.height / 2 < innerHeight / 2;
      card.style.top = below ? `${Math.min(innerHeight - card.offsetHeight - 12, r.bottom + 18)}px` : '';
      card.style.bottom = below ? 'auto' : `${Math.min(innerHeight - card.offsetHeight - 12, innerHeight - r.top + 18)}px`;
      root.classList.remove('dim');
    } else {
      ring.style.display = 'none';
      card.style.top = ''; card.style.bottom = '';
      root.classList.add('dim', 'center');
      return;
    }
    root.classList.remove('center');
  }

  function show() {
    const s = steps[i];
    root.querySelector('.tut-step').textContent = `${i + 1}/${steps.length}`;
    root.querySelector('h3').textContent = s.title;
    root.querySelector('p').textContent = s.text;
    root.querySelector('.tut-next').textContent = i === steps.length - 1 ? 'Bắt đầu chơi' : 'Tiếp ›';
    root.querySelector('.tut-back').hidden = i === 0;
    place();
    root.querySelector('.tut-next').focus();
  }

  function start(cb) {
    if (root) return;
    onClose = cb; i = 0;
    root = document.createElement('div');
    root.id = 'tutorial';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Hướng dẫn chơi');
    root.innerHTML = `<div class="tut-ring"></div>
      <div class="tut-card"><small class="tut-step"></small><h3></h3><p></p>
        <div class="tut-actions"><button class="tut-skip">Bỏ qua</button><span></span><button class="tut-back">‹ Lại</button><button class="tut-next primary"></button></div></div>`;
    document.body.appendChild(root);
    root.querySelector('.tut-skip').onclick = close;
    root.querySelector('.tut-back').onclick = () => { i = Math.max(0, i - 1); show(); };
    root.querySelector('.tut-next').onclick = () => { if (i >= steps.length - 1) close(); else { i++; show(); } };
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    addEventListener('resize', place);
    show();
  }

  return { start, done, get open() { return !!root; } };
}
