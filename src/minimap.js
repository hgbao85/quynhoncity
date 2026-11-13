// Bản đồ nhỏ hình tròn, xoay theo hướng camera, người chơi ở giữa.
// Thành phố lớn nên không vẽ sẵn cả bản đồ: chỉ vẽ một mảng 1 km quanh người chơi (1 px = 1 m),
// vẽ lại khi người chơi đi xa tâm mảng hoặc khi có ô nhà mới được tải.
const COL = { sea: '#7fb7d9', land: '#efe9dd', park: '#b5d99c', beach: '#f3e2b0', plaza: '#dcd6cc', water: '#7fb7d9', road: '#ffffff', major: '#f6c873', building: '#c9b9a6' };
const PATCH = 1024, REDRAW = 280;

const boxOf = (pts) => {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
  return [a, b, c, d];
};

export function createMinimap(canvas, data, tiles) {
  const off = document.createElement('canvas');
  off.width = off.height = PATCH;
  const g = off.getContext('2d');
  // tính sẵn hộp bao để bỏ qua nhanh các đối tượng ngoài mảng
  const land = data.land.map((pts) => ({ pts, box: boxOf(pts) }));
  const areas = data.areas.map((a) => ({ pts: a.pts, kind: a.kind, box: boxOf(a.pts) }));
  const roads = data.roads.filter((r) => !/footway|path|steps|cycleway/.test(r.type))
    .map((r) => ({ pts: r.pts, major: /primary|secondary|tertiary/.test(r.type), box: boxOf(r.pts) }));
  const blds = data.buildings.map((b) => ({ pts: b.pts, box: boxOf(b.pts) }));

  let cx = NaN, cz = NaN, drawnVersion = -1, lastDraw = 0;
  function redraw(px, pz) {
    cx = Math.round(px); cz = Math.round(pz);
    const x0 = cx - PATCH / 2, z0 = cz - PATCH / 2, x1 = x0 + PATCH, z1 = z0 + PATCH;
    const hit = ([a, b, c, d]) => !(c < x0 || a > x1 || d < z0 || b > z1);
    const path = (pts) => { g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(x - x0, z - z0) : g.moveTo(x - x0, z - z0))); };
    g.fillStyle = COL.sea; g.fillRect(0, 0, PATCH, PATCH);
    for (const l of land) if (hit(l.box)) { path(l.pts); g.closePath(); g.fillStyle = COL.land; g.fill(); }
    for (const a of areas) if (hit(a.box)) { path(a.pts); g.closePath(); g.fillStyle = COL[a.kind] || COL.park; g.fill(); }
    g.fillStyle = COL.building;
    tiles.forEachLot(x0, z0, x1, z1, (pts) => { path(pts); g.closePath(); g.fill(); });
    for (const b of blds) if (hit(b.box)) { path(b.pts); g.closePath(); g.fill(); }
    g.lineCap = g.lineJoin = 'round';
    for (const major of [false, true]) for (const r of roads) {
      if (r.major !== major || !hit(r.box)) continue;
      path(r.pts); g.strokeStyle = major ? COL.major : COL.road; g.lineWidth = major ? 11 : 6; g.stroke();
    }
    drawnVersion = tiles.version;
  }

  const ctx = canvas.getContext('2d');
  const W = canvas.width, VIEW = 320; // mét hiển thị theo đường kính
  function draw(px, pz, camYaw, facing, markers) {
    const now = performance.now();
    if (!(Math.abs(px - cx) < REDRAW && Math.abs(pz - cz) < REDRAW) || (tiles.version !== drawnVersion && now - lastDraw > 1500)) {
      redraw(px, pz); lastDraw = now;
    }
    const k = W / VIEW;
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); ctx.clip();
    ctx.translate(W / 2, W / 2);
    ctx.rotate(camYaw); // hướng camera nhìn luôn ở phía trên
    ctx.scale(k, k);
    ctx.drawImage(off, cx - PATCH / 2 - px, cz - PATCH / 2 - pz);
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
