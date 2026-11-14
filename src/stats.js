// Thống kê lượt chơi bằng Vercel Web Analytics (không dùng cookie, không lưu thông tin cá nhân).
// Chỉ chạy ở bản đã đăng (npm run build); khi chạy dev thì không gửi gì.
// Cần bật Analytics trong trang dự án trên Vercel. Sự kiện riêng (track) chỉ được ghi ở gói Pro trở lên;
// ở gói miễn phí vẫn có lượt xem trang, quốc gia, loại thiết bị, trình duyệt.
import { inject, track as vercelTrack } from '@vercel/analytics';

if (import.meta.env.PROD) inject();

export function track(name, props) {
  if (!import.meta.env.PROD) return;
  try { vercelTrack(name, props); } catch { /* bị chặn hoặc chưa tải: bỏ qua */ }
}
