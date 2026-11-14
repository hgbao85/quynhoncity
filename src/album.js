// Album hành trình (bấm thẻ 🧩 Mảnh ghép): 5 ô ảnh lưu niệm chụp tại từng địa điểm, tiến độ mỗi nơi.
// Đủ mọi mảnh ghép thì tạo được "Bưu thiếp Quy Nhơn" 1200×630: ghép các tấm ảnh người chơi đã chụp,
// tên người chơi, ngày hoàn thành và đường dẫn game; tải về hoặc chia sẻ thẳng (Zalo, Facebook...).
import { QUESTS } from './quests-data.js';

const PHOTO_KEY = 'qn3d-photos';
const NAME_KEY = 'qn3d-name';
const loadPhotos = () => { try { return JSON.parse(localStorage.getItem(PHOTO_KEY)) || {}; } catch { return {}; } };

export function createAlbum({ getProgress, ui }) {
  const $ = (id) => document.getElementById(id);
  let photos = loadPhotos();

  // lưu ảnh lưu niệm (JPEG 640×360) cho một địa điểm
  function savePhoto(id, dataUrl) {
    photos[id] = dataUrl;
    try { localStorage.setItem(PHOTO_KEY, JSON.stringify(photos)); } catch { /* đầy bộ nhớ: bỏ qua */ }
  }

  function open() {
    const prog = Object.fromEntries(getProgress().map((p) => [p.id, p]));
    const done = QUESTS.filter((q) => prog[q.id]?.piece).length;
    $('modal-title').textContent = `Hành trình Quy Nhơn · ${done}/${QUESTS.length} mảnh ghép`;
    const cards = QUESTS.map((q) => {
      const p = prog[q.id], img = photos[q.id];
      return `<div class="alb-card ${p?.piece ? 'got' : ''}">
        <div class="alb-img">${img ? `<img src="${img}" alt="${q.place}">` : '<span>📷</span>'}</div>
        <b>${p?.piece ? '🧩 ' : ''}${q.place}</b>
        <small>${p?.piece ? `Mảnh ghép "${q.piece}"` : `${p?.steps || 0}/3 việc${img ? '' : ' · chưa có ảnh'}`}</small>
      </div>`;
    }).join('');
    const complete = done === QUESTS.length;
    let name = ''; try { name = localStorage.getItem(NAME_KEY) || ''; } catch { /* bỏ qua */ }
    $('modal-body').innerHTML = `<div class="album">${cards}</div>` + (complete
      ? `<div class="postcard-box"><p class="ok">🎉 Bạn đã khám phá đủ ${QUESTS.length} địa điểm! Tạo bưu thiếp để lưu lại hoặc khoe với bạn bè.</p>
         <label>Tên của bạn <input id="pc-name" maxlength="28" placeholder="Ví dụ: Bảo" value="${name.replace(/"/g, '&quot;')}"></label>
         <button id="pc-make" class="primary">Tạo bưu thiếp</button>
         <div id="pc-out"></div></div>`
      : `<p class="alb-hint">Ở mỗi địa điểm: trả lời câu hỏi ở cột sáng vàng, tìm các điểm sáng xanh và bấm 📷 chụp ảnh gần công trình. Ảnh đẹp nhất sẽ được dùng cho bưu thiếp khi bạn đủ ${QUESTS.length} mảnh ghép.</p>`);
    ui.openModal();
    const mk = $('pc-make');
    if (mk) mk.onclick = async () => {
      const nm = $('pc-name').value.trim();
      try { localStorage.setItem(NAME_KEY, nm); } catch { /* bỏ qua */ }
      const canvas = await makePostcard(nm);
      const url = canvas.toDataURL('image/jpeg', 0.9);
      // chuẩn bị sẵn tệp ảnh để bấm Chia sẻ gọi navigator.share ngay (Safari yêu cầu đúng lúc bấm)
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      shareFile = new File([blob], 'buu-thiep-quy-nhon-3d.jpg', { type: 'image/jpeg' });
      $('pc-out').innerHTML = `<img class="pc-preview" src="${url}" alt="Bưu thiếp Quy Nhơn 3D">
        <div class="pc-actions"><button id="pc-dl" class="primary">⬇ Tải về</button><button id="pc-share">↗ Chia sẻ</button></div>`;
      $('pc-dl').onclick = () => { const a = document.createElement('a'); a.href = url; a.download = 'buu-thiep-quy-nhon-3d.jpg'; a.click(); };
      $('pc-share').onclick = () => share();
    };
  }

  let shareFile = null;
  async function share() {
    const text = `Mình vừa khám phá đủ ${QUESTS.length} địa điểm trong Quy Nhơn 3D! Chơi thử tại https://quynhoncity.vercel.app`;
    try {
      if (shareFile && navigator.canShare?.({ files: [shareFile] })) { await navigator.share({ files: [shareFile], text, title: 'Quy Nhơn 3D' }); return; }
      if (navigator.share) { await navigator.share({ text, url: 'https://quynhoncity.vercel.app', title: 'Quy Nhơn 3D' }); return; }
      await navigator.clipboard.writeText(text);
      ui.toast('Đã chép lời mời và đường dẫn. Dán vào Zalo/Facebook kèm ảnh bưu thiếp nhé!');
    } catch (e) {
      if (e?.name !== 'AbortError') ui.toast('Không chia sẻ được, hãy bấm Tải về rồi gửi ảnh nhé.');
    }
  }

  // ---- vẽ bưu thiếp ----
  async function makePostcard(name) {
    const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#16335e'); g.addColorStop(1, '#0d1b33'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // sóng biển trang trí
    x.strokeStyle = 'rgba(127,183,217,.18)'; x.lineWidth = 3;
    for (let k = 0; k < 6; k++) { x.beginPath(); for (let u = 0; u <= W; u += 10) x.lineTo(u, 560 + k * 14 + Math.sin(u / 60 + k) * 6); x.stroke(); }
    const imgs = await Promise.all(QUESTS.map((q) => new Promise((res) => {
      if (!photos[q.id]) return res(null);
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = photos[q.id];
    })));
    // bố cục: ảnh lớn bên trái (tượng đài), 4 ảnh nhỏ bên phải
    // mỗi khung ảnh có viền trắng và dòng tên cao ~34 px bên dưới: chừa đủ khoảng cách giữa hai hàng.
    // ảnh đầu (tượng đài) lớn bên trái, các ảnh còn lại xếp lưới 3 cột × 2 hàng bên phải
    const slots = [[40, 158, 450, 253]];
    for (let i = 1; i < QUESTS.length; i++) { const k = i - 1; slots.push([530 + (k % 3) * 214, 158 + Math.floor(k / 3) * 176, 196, 110]); }
    QUESTS.forEach((q, i) => {
      const [sx, sy, sw, sh] = slots[i], im = imgs[i];
      x.save();
      x.translate(sx + sw / 2, sy + sh / 2); x.rotate(((i % 2 ? 1 : -1) * (i === 0 ? 0.8 : 1.6) * Math.PI) / 180); x.translate(-sw / 2, -sh / 2);
      x.fillStyle = '#f8f5ee'; x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 16; x.fillRect(-8, -8, sw + 16, sh + 34); x.shadowBlur = 0;
      if (im) { const r = Math.max(sw / im.width, sh / im.height), iw = im.width * r, ih = im.height * r; x.save(); x.beginPath(); x.rect(0, 0, sw, sh); x.clip(); x.drawImage(im, (sw - iw) / 2, (sh - ih) / 2, iw, ih); x.restore(); }
      else { x.fillStyle = '#d8d2c6'; x.fillRect(0, 0, sw, sh); }
      x.fillStyle = '#1d2b4a'; x.font = `bold ${i === 0 ? 17 : 13}px "Be Vietnam Pro", Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(q.place, sw / 2, sh + 13, sw);
      x.restore();
    });
    // tiêu đề
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#ffffff'; x.font = '800 46px "Be Vietnam Pro", Arial, sans-serif';
    x.fillText('QUY NHƠN', 40, 72);
    const w = x.measureText('QUY NHƠN ').width; x.fillStyle = '#f5c542'; x.fillText('3D', 40 + w, 72);
    x.fillStyle = '#dbe5f5'; x.font = '600 22px "Be Vietnam Pro", Arial, sans-serif';
    x.fillText(`${name ? name + ' đã' : 'Đã'} khám phá đủ ${QUESTS.length} địa điểm · ${new Date().toLocaleDateString('vi-VN')}`, 40, 110);
    // con dấu
    x.save(); x.translate(1085, 70); x.rotate(-0.18);
    x.strokeStyle = '#e8574a'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 48, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 40, 0, 7); x.stroke();
    x.fillStyle = '#e8574a'; x.font = '800 15px "Be Vietnam Pro", Arial, sans-serif'; x.textAlign = 'center';
    x.fillText(`${QUESTS.length}/${QUESTS.length}`, 0, -6); x.font = '700 11px "Be Vietnam Pro", Arial, sans-serif'; x.fillText('MẢNH GHÉP', 0, 12);
    x.restore();
    x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '500 18px "Be Vietnam Pro", Arial, sans-serif'; x.textAlign = 'right';
    x.fillText('quynhoncity.vercel.app', W - 40, H - 24);
    return c;
  }

  $('piece-card').addEventListener('click', open);
  $('piece-card').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return { open, savePhoto };
}
