// Bản đồ nhỏ hình tròn, xoay theo hướng camera, người chơi ở giữa.
import { HALF } from './world/geo.js';

const COL = { sea: '#7fb7d9', land: '#efe9dd', park: '#b5d99c', beach: '#f3e2b0', plaza: '#dcd6cc', water: '#7fb7d9', road: '#ffffff', major: '#f6c873', building: '#c9b9a6' };

export function createMinimap(canvas, data, land) {
  const S = HALF * 2;
  const off = document.createElement('canvas');
  off.width = off.height = S;
  const g = off.getContext('2d');
  const P = (p) => [p[0] + HALF, p[1] + HALF];
  const poly = (pts, fill) => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fillStyle = fill; g.fill(); };
  g.fillStyle = COL.sea; g.fillRect(0, 0, S, S);
  poly(land, COL.land);
  for (const a of data.areas) poly(a.pts, COL[a.kind] || COL.park);
  g.lineCap = g.lineJoin = 'round';
  const major = /primary|secondary|tertiary/;
  for (const pass of [0, 1]) for (const r of data.roads) {
    if (/footway|path|steps|cycleway/.test(r.type)) continue;
    const isMajor = major.test(r.type);
    if (pass === 0 ? isMajor : !isMajor) continue;
    g.beginPath(); r.pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = isMajor ? COL.major : COL.road; g.lineWidth = isMajor ? 11 : 6; g.stroke();
  }
  for (const b of data.buildings) poly(b.pts, COL.building);

  const ctx = canvas.getContext('2d');
  const W = canvas.width, VIEW = 320; // mét hiển thị theo đường kính
  function draw(px, pz, camYaw, facing, markers) {
    const k = W / VIEW;
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); ctx.clip();
    ctx.translate(W / 2, W / 2);
    ctx.rotate(camYaw); // hướng camera nhìn luôn ở phía trên
    ctx.scale(k, k);
    ctx.drawImage(off, -(px + HALF), -(pz + HALF));
    for (const m of markers) {
      ctx.beginPath(); ctx.arc(m.pos[0] - px, m.pos[1] - pz, 5, 0, Math.PI * 2);
      ctx.fillStyle = m.color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#333'; ctx.stroke();
    }
    // tượng đài
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-px - 4, -pz - 4, 8, 8);
    ctx.restore();
    // mũi tên người chơi
    ctx.save();
    ctx.translate(W / 2, W / 2);
    ctx.rotate(camYaw - facing + Math.PI);
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath();
    ctx.fillStyle = '#e74c3c'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // chữ N
    const nx = W / 2 + Math.sin(-camYaw) * (W / 2 - 10) * -1, ny = W / 2 - Math.cos(-camYaw) * (W / 2 - 10);
    ctx.fillStyle = '#1d2b4a'; ctx.beginPath(); ctx.arc(nx, ny, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', nx, ny + 0.5);
  }
  return { draw };
}
