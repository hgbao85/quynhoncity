// Cài game như ứng dụng (PWA) và chế độ toàn màn hình.
// - Android/Chrome: trình duyệt báo "có thể cài" → hiện nút 📲, bấm để cài ra màn hình chính.
// - iPhone/iPad (Safari): không có lời mời cài tự động → bấm 📲 hiện hướng dẫn "Chia sẻ → Thêm vào MH chính".
// - Nút ⛶: bật/tắt toàn màn hình (ẩn hẳn khi trình duyệt không hỗ trợ, ví dụ iPhone).
// - Đã mở từ biểu tượng trên màn hình chính thì ẩn cả hai nút (game đã chạy toàn màn hình).
// Các phần dưới đây chạy ngay khi trang tải mã (trước khi dựng bản đồ): trình duyệt chỉ báo
// "có thể cài" một lần mỗi lần tải trang, thường là lúc màn hình chờ còn đang hiện.
const installed = matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let deferred = null, onInstallable = null, onInstalled = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; onInstallable?.(); });
addEventListener('appinstalled', () => { deferred = null; onInstalled?.(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const reg = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
  if (document.readyState === 'complete') reg(); else addEventListener('load', reg);
}

export function setupPwa(ui) {
  const $ = (id) => document.getElementById(id);
  const btn = $('install-btn');
  onInstallable = () => { if (!installed) btn.hidden = false; };
  onInstalled = () => { btn.hidden = true; ui.toast('📲 Đã cài Quy Nhơn 3D ra màn hình chính!'); };
  if (deferred) onInstallable(); // sự kiện đã đến trong lúc tải
  if (isIOS && !installed) btn.hidden = false;
  btn.onclick = async () => {
    if (deferred) {
      deferred.prompt();
      const r = await deferred.userChoice.catch(() => null);
      if (r?.outcome === 'accepted') btn.hidden = true;
      deferred = null;
    } else if (isIOS) {
      $('modal-title').textContent = 'Cài Quy Nhơn 3D lên iPhone/iPad';
      $('modal-body').innerHTML = '<ol class="howto"><li>Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên) ở thanh dưới của Safari.</li><li>Chọn <b>Thêm vào MH chính</b>.</li><li>Bấm <b>Thêm</b>. Mở game từ biểu tượng mới để chơi toàn màn hình.</li></ol>';
      ui.openModal();
    }
  };

  const fs = $('fs-btn');
  const canFs = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  fs.hidden = installed || !canFs;
  fs.onclick = async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        const el = document.documentElement;
        await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
        // trên điện thoại: thử khoá màn hình ngang cho dễ chơi (bỏ qua nếu không được)
        screen.orientation?.lock?.('landscape').catch(() => {});
      }
    } catch { ui.toast('Trình duyệt này không cho bật toàn màn hình.'); }
  };
  const sync = () => fs.classList.toggle('on', !!(document.fullscreenElement || document.webkitFullscreenElement));
  document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
}
