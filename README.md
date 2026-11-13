# Quy Nhơn 3D · Bản mẫu

Game 3D chạy trên trình duyệt (máy tính và điện thoại): dạo quanh **Quảng trường Trung tâm Quy Nhơn**, Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành và bãi biển Quy Nhơn.

## Chạy thử

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`. Điện thoại cùng mạng Wi-Fi mở địa chỉ "Network" mà Vite in ra.

**Điều khiển:**
- **Máy tính:** WASD hoặc mũi tên để đi, giữ Shift để chạy, kéo chuột để xoay camera, cuộn chuột để thu phóng.
- **Điện thoại:** dùng joystick ảo, đẩy hết cỡ để chạy, vuốt màn hình để xoay camera.

**Tham số URL để thử nhanh:**
- `?h=20`: đặt giờ (ví dụ 20 giờ để xem cảnh đêm).
- `?at=157,44`: đặt vị trí xuất phát x,z (mét, gốc tại tượng đài; x hướng đông, z hướng nam).
- `?yaw=225`: đặt hướng camera (độ).

## Có gì trong bản mẫu

**Bản đồ thật từ OpenStreetMap**
- Đường phố, đường bờ biển, bãi biển, công viên, quảng trường.
- 86 toà nhà có sẵn trên OSM, cộng khoảng 2.900 **nhà ống tự sinh** dọc mặt đường, vì OSM ở Quy Nhơn còn thiếu nhiều nhà.
- Thêm khách sạn cao tầng gần biển, đèn đường và cây dừa.

**Môi trường**
- Mặt trời đúng vị trí theo giờ Việt Nam thật.
- Ban đêm có sao, trăng, cửa sổ sáng đèn, đèn đường và đèn chiếu tượng.
- Biển là shader sóng tự viết.
- Nhiệt độ và thời tiết lấy từ Open-Meteo. Nếu không lấy được, game hiện nhãn "giả định".

**Nhiệm vụ "Khám phá Quảng trường"**
- Cột sáng vàng mở câu chuyện và 3 câu hỏi.
- Tìm 3 chi tiết (điểm sáng xanh).
- Chụp ảnh lưu niệm gần tượng.
- Hoàn thành cả ba thì nhận 1 mảnh ghép. Tiến độ lưu trong trình duyệt.

**Giao diện:** bản đồ nhỏ xoay theo camera, thẻ địa điểm, giờ, thời tiết, MANA (chạy thì tiêu hao), nút tua nhanh +3 giờ.

## Cấu trúc

| File | Vai trò |
|---|---|
| `scripts/fetch-osm.mjs` | Tải dữ liệu OSM, đổi sang mét, lưu `public/data/quynhon.json` (`npm run fetch-osm`) |
| `src/world/geo.js` | Lưới va chạm 2 m/ô, hàm đa giác, ghép đường bờ biển thành đất liền |
| `src/world/city.js` | Dựng mặt đất, đường, toà nhà, nhà ống tự sinh, đèn, cây |
| `src/world/sky.js` | Trời, vị trí mặt trời, ánh sáng ngày và đêm, sương mù |
| `src/world/sea.js` | Shader mặt biển |
| `src/world/landmark.js` | Tượng đài (phỏng dựng) |
| `src/character.js` | Người dựng từ khối cơ bản, có động tác đi và chạy |
| `src/player.js`, `src/npc.js` | Người chơi, camera, joystick; người đi dạo |
| `src/quest.js`, `src/minimap.js` | Nhiệm vụ và bản đồ nhỏ |

## Cần lưu ý trước khi ra mắt

- **Tượng đài chỉ là phỏng dựng.** Hình dáng chưa đúng mẫu thật, cần làm lại bằng mô hình 3D (Blender hoặc công cụ AI tạo mô hình) dựa trên ảnh chụp.
- **Câu chuyện và câu hỏi** trong `src/quest.js` cần kiểm chứng lại với nguồn chính thống.
- **Bản quyền OpenStreetMap (ODbL):** phải giữ dòng ghi nguồn "© OpenStreetMap" trên màn hình.
- **Nhà ống tự sinh là ngẫu nhiên,** không đúng từng căn ngoài đời.
