// Dựng đa giác đất liền từ các đường bờ biển OSM (natural=coastline) trong một hình chữ nhật.
// Quy ước OSM: đi theo hướng đường bờ biển thì đất liền nằm bên TRÁI.
// Cách làm: nối các đoạn thành chuỗi → cắt theo khung → khép vòng bằng cách đi dọc
// mép khung NGƯỢC chiều kim đồng hồ (theo hệ đông/bắc) từ điểm ra tới điểm vào kế tiếp.
// Toạ độ vào/ra: [x đông, z nam] (mét). Bên trong đổi sang [x, y = -z] để dùng hệ đông/bắc.

export function landPolygons(ways, rect) {
  const { x0, z0, x1, z1 } = rect;
  // khung trong hệ đông/bắc
  const X0 = x0, X1 = x1, Y0 = -z1, Y1 = -z0;
  const W = X1 - X0, H = Y1 - Y0, PER = 2 * (W + H);
  const toEN = ([x, z]) => [x, -z];
  const toXZ = ([x, y]) => [+x.toFixed(2), +(-y).toFixed(2)];

  // 1) nối các đoạn có chung đầu mút
  const key = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const segs = ways.map((w) => w.map(toEN));
  const byStart = new Map();
  segs.forEach((s, i) => byStart.set(key(s[0]), i));
  const used = new Set(), chains = [];
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    // lùi về đầu chuỗi
    let head = i, guard = 0;
    for (;;) {
      const prev = segs.findIndex((s, k) => !used.has(k) && k !== head && key(s[s.length - 1]) === key(segs[head][0]));
      if (prev < 0 || prev === i || guard++ > segs.length) break;
      head = prev;
    }
    const chain = [...segs[head]]; used.add(head);
    for (;;) {
      const nx = byStart.get(key(chain[chain.length - 1]));
      if (nx === undefined || used.has(nx)) break;
      chain.push(...segs[nx].slice(1)); used.add(nx);
    }
    chains.push(chain);
  }

  const inside = ([x, y]) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1;
  // tham số chu vi, tăng ngược chiều kim đồng hồ bắt đầu ở góc tây nam
  const perim = ([x, y]) => {
    const e = 1e-6;
    if (Math.abs(y - Y0) < e) return x - X0; // cạnh nam, đi về đông
    if (Math.abs(x - X1) < e) return W + (y - Y0); // cạnh đông, đi lên bắc
    if (Math.abs(y - Y1) < e) return W + H + (X1 - x); // cạnh bắc, đi về tây
    return 2 * W + H + (Y1 - y); // cạnh tây, đi xuống nam
  };
  const corners = [[X0, Y0, 0], [X1, Y0, W], [X1, Y1, W + H], [X0, Y1, 2 * W + H]];
  // giao điểm đoạn a→b với khung (điểm đầu tiên tính từ a)
  const clipHit = (a, b) => {
    let best = null;
    const tryT = (t) => {
      if (t < 0 || t > 1) return;
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (p[0] < X0 - 1e-6 || p[0] > X1 + 1e-6 || p[1] < Y0 - 1e-6 || p[1] > Y1 + 1e-6) return;
      p[0] = Math.min(X1, Math.max(X0, p[0])); p[1] = Math.min(Y1, Math.max(Y0, p[1]));
      // dán điểm vào đúng cạnh
      const dX0 = Math.abs(p[0] - X0), dX1 = Math.abs(p[0] - X1), dY0 = Math.abs(p[1] - Y0), dY1 = Math.abs(p[1] - Y1);
      const m = Math.min(dX0, dX1, dY0, dY1);
      if (m === dX0) p[0] = X0; else if (m === dX1) p[0] = X1; else if (m === dY0) p[1] = Y0; else p[1] = Y1;
      if (!best || t < best.t) best = { t, p };
    };
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (dx) { tryT((X0 - a[0]) / dx); tryT((X1 - a[0]) / dx); }
    if (dy) { tryT((Y0 - a[1]) / dy); tryT((Y1 - a[1]) / dy); }
    return best;
  };

  // 2) cắt chuỗi thành các mảnh nằm trong khung, mỗi mảnh vào ở mép và ra ở mép
  const pieces = [], rings = [];
  for (const c of chains) {
    const closed = key(c[0]) === key(c[c.length - 1]);
    if (closed && c.every(inside)) { rings.push(c); continue; }
    let cur = inside(c[0]) ? [c[0]] : null;
    for (let i = 1; i < c.length; i++) {
      const a = c[i - 1], b = c[i], ia = inside(a), ib = inside(b);
      if (ia && ib) { cur.push(b); continue; }
      if (ia && !ib) { const h = clipHit(b, a); cur.push(h ? h.p : a); pieces.push(cur); cur = null; continue; }
      if (!ia && ib) { const h = clipHit(a, b); cur = [h ? h.p : b, b]; continue; }
      // cả hai ở ngoài: đoạn có thể cắt ngang khung
      const h1 = clipHit(a, b), h2 = clipHit(b, a);
      if (h1 && h2 && (Math.abs(h1.p[0] - h2.p[0]) + Math.abs(h1.p[1] - h2.p[1]) > 1e-3)) pieces.push([h1.p, h2.p]);
    }
    if (cur && cur.length > 1) pieces.push(cur); // chuỗi kết thúc bên trong khung (dữ liệu thiếu)
  }

  // 3) khép vòng
  const polys = [];
  const onEdge = (p) => Math.abs(p[0] - X0) < 1e-6 || Math.abs(p[0] - X1) < 1e-6 || Math.abs(p[1] - Y0) < 1e-6 || Math.abs(p[1] - Y1) < 1e-6;
  const open = pieces.filter((p) => onEdge(p[0]) && onEdge(p[p.length - 1]));
  const left = new Set(open.map((_, i) => i));
  while (left.size) {
    const startIdx = left.values().next().value;
    const poly = [];
    let idx = startIdx, guard = 0;
    for (;;) {
      left.delete(idx);
      const piece = open[idx];
      poly.push(...piece);
      const exitT = perim(piece[piece.length - 1]);
      // điểm vào kế tiếp theo chiều tăng tham số chu vi
      let bestI = -1, bestD = Infinity;
      open.forEach((q, k) => {
        if (k !== startIdx && !left.has(k)) return;
        let d = perim(q[0]) - exitT; if (d < 0) d += PER;
        if (d < bestD) { bestD = d; bestI = k; }
      });
      // thêm các góc khung nằm giữa
      const cornersBetween = [];
      for (const [cx, cy, ct] of corners) {
        let d = ct - exitT; if (d < 0) d += PER;
        if (d > 0 && d < bestD) cornersBetween.push([d, [cx, cy]]);
      }
      cornersBetween.sort((m, n) => m[0] - n[0]).forEach(([, p]) => poly.push(p));
      if (bestI === startIdx || bestI < 0 || guard++ > open.length + 2) break;
      idx = bestI;
    }
    polys.push(poly);
  }
  if (!open.length && !rings.length) polys.push([[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]]); // không có bờ biển: toàn đất
  // đảo (vòng kín, đi ngược chiều kim đồng hồ = đất bên trong)
  for (const r of rings) {
    let a = 0;
    for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    if (a > 0) polys.push(r.slice(0, -1));
  }
  return polys.map((p) => p.map(toXZ));
}
