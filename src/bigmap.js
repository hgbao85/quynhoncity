// Bản đồ lớn toàn thành phố (bấm nút 🗺️ hoặc bấm vào bản đồ nhỏ): đất liền, mặt nước, công viên,
// đồi núi, đường chính, các địa điểm có tiến độ nhiệm vụ, vị trí người chơi.
// Bấm vào một địa điểm để dịch chuyển nhanh tới đó.
import { BOUNDS } from './world/config.js';
import { heightAt } from './world/terrain.js';
import { PLACES } from './quests-data.js';

export function createBigMap(data, { onTravel, getPlayer, getProgress }) {
  const $ = (id) => document.getElementById(id);
  const W = BOUNDS.x1 - BOUNDS.x0, H = BOUNDS.z1 - BOUNDS.z0;
  const S = 1100; // kích thước ảnh nền (px), giữ tỉ lệ vùng bản đồ
  const sx = S / Math.max(W, H);
  const cw = Math.round(W * sx), ch = Math.round(H * sx);
  const P = (x, z) => [(x - BOUNDS.x0) * sx, (z - BOUNDS.z0) * sx];

  // ---- vẽ ảnh nền một lần ----
  const base = document.createElement('canvas'); base.width = cw; base.height = ch;
  const g = base.getContext('2d');
  const path = (pts) => { g.beginPath(); pts.forEach(([x, z], i) => { const [u, v] = P(x, z); i ? g.lineTo(u, v) : g.moveTo(u, v); }); g.closePath(); };
  g.fillStyle = '#7fb7d9'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#efe9dd'; for (const l of data.land) { path(l); g.fill(); }
  const col = { park: '#c3dfa8', beach: '#f3e2b0', plaza: '#dcd6cc', water: '#7fb7d9' };
  for (const a of data.areas) { path(a.pts); g.fillStyle = col[a.kind] || col.park; g.fill(); }
  // đồi núi theo độ cao
  const step = 6;
  for (let u = 0; u < cw; u += step) for (let v = 0; v < ch; v += step) {
    const h = heightAt(BOUNDS.x0 + (u + step / 2) / sx, BOUNDS.z0 + (v + step / 2) / sx);
    if (h < 1) continue;
    g.fillStyle = `rgba(60,110,55,${Math.min(0.85, 0.3 + h / 300)})`; g.fillRect(u, v, step, step);
  }
  g.lineCap = g.lineJoin = 'round';
  for (const [types, color, w] of [[/residential|unclassified|living_street/, '#ffffff', 1.4], [/primary|secondary|tertiary|trunk/, '#f6c873', 3]]) {
    g.strokeStyle = color; g.lineWidth = w;
    for (const r of data.roads) {
      if (!types.test(r.type)) continue;
      g.beginPath(); r.pts.forEach(([x, z], i) => { const [u, v] = P(x, z); i ? g.lineTo(u, v) : g.moveTo(u, v); }); g.stroke();
    }
  }
  // nhãn khu vực lớn
  g.fillStyle = 'rgba(29,43,74,.55)'; g.font = 'italic bold 15px "Be Vietnam Pro", sans-serif'; g.textAlign = 'center';
  for (const [t, x, z] of [['Biển Đông', 1500, 1400], ['Núi Bà Hỏa', -1150, -1650], ['Núi Vũng Chua', -2500, 1500], ['Đầm Thị Nại', 1200, -3100], ['Ghềnh Ráng', -350, 2850]]) {
    const [u, v] = P(x, z); g.fillText(t, u, v);
  }

  // ---- giao diện ----
  const cv = $('bigmap-canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  const list = $('bigmap-list');
  function draw() {
    ctx.drawImage(base, 0, 0);
    const prog = Object.fromEntries((getProgress?.() || []).map((p) => [p.id, p]));
    for (const pl of PLACES) {
      const [u, v] = P(...pl.pos), pr = prog[pl.id];
      ctx.beginPath(); ctx.arc(u, v, 13, 0, 7);
      ctx.fillStyle = pr ? (pr.piece ? '#4cd964' : '#ffd76a') : '#ffffff'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#1d2b4a'; ctx.stroke();
      ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pl.icon, u, v + 1);
      // vị trí nhãn: mặc định dưới điểm; vài điểm đứng sát nhau thì đặt lên trên hoặc sang phải
      const [lx, ly, al, bl] = pl.label === 'up' ? [u, v - 16, 'center', 'bottom'] : pl.label === 'right' ? [u + 17, v, 'left', 'middle'] : [u, v + 16, 'center', 'top'];
      ctx.font = 'bold 13px "Be Vietnam Pro", sans-serif'; ctx.textAlign = al; ctx.textBaseline = bl;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(pl.name, lx, ly);
      ctx.fillStyle = '#1d2b4a'; ctx.fillText(pl.name, lx, ly);
    }
    // người chơi
    const pp = getPlayer();
    const [u, v] = P(pp.x, pp.z);
    ctx.save(); ctx.translate(u, v); ctx.rotate(Math.PI - pp.facing);
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath();
    ctx.fillStyle = '#e74c3c'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    // danh sách địa điểm
    list.innerHTML = PLACES.map((pl) => {
      const pr = prog[pl.id];
      const d = Math.round(Math.hypot(pl.pos[0] - pp.x, pl.pos[1] - pp.z));
      const status = pr ? (pr.piece ? '🧩 đã xong' : `${pr.steps}/3 việc`) : '';
      return `<button data-id="${pl.id}"><span>${pl.icon}</span><b>${pl.name}</b><small>${d >= 1000 ? (d / 1000).toFixed(1) + ' km' : d + ' m'}${status ? ' · ' + status : ''}</small></button>`;
    }).join('');
    list.querySelectorAll('button').forEach((b) => { b.onclick = () => travel(b.dataset.id); });
  }
  function travel(id) {
    const pl = PLACES.find((p) => p.id === id);
    if (!pl) return;
    close();
    onTravel(pl);
  }
  // bấm vào điểm trên bản đồ
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    const u = ((e.clientX - r.left) / r.width) * cw, v = ((e.clientY - r.top) / r.height) * ch;
    let best = null, bd = 30;
    for (const pl of PLACES) { const [a, b] = P(...pl.pos); const d = Math.hypot(a - u, b - v); if (d < bd) { bd = d; best = pl; } }
    if (best) travel(best.id);
  });
  function open() { draw(); $('bigmap').hidden = false; }
  function close() { $('bigmap').hidden = true; }
  $('bigmap-close').onclick = close;
  $('bigmap').addEventListener('pointerdown', (e) => { if (e.target.id === 'bigmap') close(); });
  $('map-btn').onclick = open;
  $('minimap').style.pointerEvents = 'auto';
  $('minimap').style.cursor = 'pointer';
  $('minimap').addEventListener('click', open);
  addEventListener('keydown', (e) => { if (e.code === 'KeyM' && e.target.tagName !== 'INPUT') ($('bigmap').hidden ? open() : close()); });
  return { open, close, isOpen: () => !$('bigmap').hidden };
}
