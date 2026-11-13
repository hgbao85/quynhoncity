// Hàm hình học thuần (không cần three.js) để cắt footprint thành từng lô nhà ống.
// Dùng chung cho script tạo dữ liệu (Node) và game.

export function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a / 2);
}

// Hộp bao định hướng theo cạnh dài nhất của đa giác:
// u = trục dọc (cạnh dài), v = trục ngang; s0..s1 trên u, t0..t0+short trên v.
export function orientedBox(pts) {
  let best = 0, ux = 1, uz = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L > best) { best = L; ux = (q[0] - p[0]) / L; uz = (q[1] - p[1]) / L; }
  }
  let s0 = Infinity, s1 = -Infinity, t0 = Infinity, t1 = -Infinity;
  for (const [x, z] of pts) {
    const s = x * ux + z * uz, t = -x * uz + z * ux;
    s0 = Math.min(s0, s); s1 = Math.max(s1, s); t0 = Math.min(t0, t); t1 = Math.max(t1, t);
  }
  // luôn để u là chiều dài hơn
  if (t1 - t0 > s1 - s0) {
    return { ux: -uz, uz: ux, s0: t0, s1: t1, t0: -s1, long: t1 - t0, short: s1 - s0 };
  }
  return { ux, uz, s0, s1, t0, long: s1 - s0, short: t1 - t0 };
}

// Cắt đa giác bởi nửa mặt phẳng dot(p, n) >= c (Sutherland–Hodgman)
export function clipHalf(pts, nx, nz, c) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const dp = p[0] * nx + p[1] * nz - c, dq = q[0] * nx + q[1] * nz - c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
export const clipSlab = (pts, ux, uz, a, b) => clipHalf(clipHalf(pts, ux, uz, a), -ux, -uz, -b);
export const clipStrip = clipSlab;

