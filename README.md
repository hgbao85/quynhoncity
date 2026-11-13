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
- 86 toà nhà có sẵn trên OSM, cộng khoảng 2.800 **footprint nhà thật** nhận dạng từ ảnh vệ tinh (Microsoft Global ML Building Footprints).
- Dãy nhà liền kề được cắt thành từng căn nhà ống rộng 4–6 m, có tum cầu thang trên mái.
- Dữ liệu không có độ cao, nên **số tầng là ước lượng**: khối lớn gần biển cao hơn (khách sạn), nhà ống 2–5 tầng.
- Đèn đường và cây dừa.

**Môi trường**
- Mặt trời đúng vị trí theo giờ Việt Nam thật.
- Ban đêm có sao, trăng, cửa sổ sáng đèn, đèn đường và đèn chiếu tượng.
- Biển là shader sóng tự viết.
- Nhiệt độ và thời tiết lấy từ Open-Meteo. Nếu không lấy được, game hiện nhãn "giả định".

**Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành** (dựng theo ảnh chụp và số liệu báo Nhân Dân, Tuổi Trẻ, VTC)
- Tượng đồng cao 10,8 m trên bệ 4,7 m, quay ra biển (vuông góc đường An Dương Vương).
- Người cha đứng phía bắc, mặc áo dài, đội khăn xếp, một tay đặt lên ngực con; người con mặc sơ mi, quần âu.
- Phía sau là phù điêu đá xanh hình cánh cung dài 76 m, vòm giữa cao 14,5 m. Hình chạm khắc từ nam ra bắc: Sài Gòn, tháp Chăm, Bình Định, Huế, Nam Đàn.
- Ban đêm có đèn chiếu tượng và đèn hắt phù điêu.
- Sân tượng đài lát **granite đỏ bóng** hình rẻ quạt, hai bậc cấp ở mép trước. Chân phù điêu có dải cỏ viền và hàng **cau cảnh trồng chậu** (theo ảnh chụp).
- Hai bồn **hoa sen** trước bệ (bông nở, nụ, lá khum) như ngày khánh thành, và lẵng hoa đỏ dâng trước bệ.

**Quảng trường Nguyễn Tất Thành** (bên kia đường An Dương Vương, theo ảnh chụp từ trên cao)
- Sân tròn lát đá xám, có viền đá sẫm, một vòng tròn trong và 16 đường hướng tâm.
- Giữa sân là lưới 7×7 ô cỏ bàn cờ; cột cờ cao 26 m có cờ bay; bốn cột đèn pha.
- Phần đất còn lại là thảm cỏ và cây xanh. Ban đêm mặt sân sáng như được đèn pha chiếu.
- Vị trí và kích thước sân được tính tự động: là hình tròn lớn nhất nằm gọn trong vùng quảng trường trên OSM.

**Nhiệm vụ "Khám phá Quảng trường"**
- Cột sáng vàng mở câu chuyện và 3 câu hỏi.
- Tìm 3 chi tiết (điểm sáng xanh).
- Chụp ảnh lưu niệm gần tượng.
- Hoàn thành cả ba thì nhận 1 mảnh ghép. Tiến độ lưu trong trình duyệt.

**Giao diện:** bản đồ nhỏ xoay theo camera, thẻ địa điểm, giờ, thời tiết, MANA (chạy thì tiêu hao), nút tua nhanh +3 giờ.

## Thay tượng bằng mô hình 3D thật

**Mô hình hiện tại** (`public/models/statue.glb`, 448 KB, khoảng 69 nghìn đỉnh) được tạo bằng [Hunyuan3D-2](https://huggingface.co/spaces/tencent/Hunyuan3D-2) từ một ảnh báo Tuổi Trẻ (đã cắt chỉ còn hai pho tượng, xoá bớt hoa sen trang trí ở chân tượng bằng OpenCV).
- Mô hình chỉ có hình khối, chất liệu đồng do game phủ lên.
- **Giấy phép:** Tencent Hunyuan Community License. Không áp dụng ở EU, Anh, Hàn Quốc; cần đọc kỹ nếu dùng thương mại.
- **Ảnh nguồn là ảnh báo có bản quyền.** Trước khi ra mắt nên tạo lại từ ảnh tự chụp.

Game tự nạp `public/models/statue.glb` nếu có. Nếu không có file này, game dùng tượng dựng bằng khối hình học.

**1. Chuẩn bị ảnh**
- Ảnh chụp **thẳng mặt trước**, thấy **đủ cả hai người từ đầu tới chân**, nền trời trơn càng tốt.
- **Cắt bỏ bệ tượng và phù điêu** phía sau, chỉ giữ hai pho tượng.
- Nên chụp hoặc tìm thêm ảnh mặt bên và mặt sau, vì nhiều công cụ nhận nhiều ảnh cùng lúc (multi-view) và cho kết quả tốt hơn.
- Lưu ý bản quyền: ảnh báo chí thuộc về tác giả. Tốt nhất là tự chụp tại quảng trường.

**2. Tạo mô hình bằng AI** (một trong các trang sau, đều có gói miễn phí)
- [Tripo3D](https://www.tripo3d.ai), [Meshy](https://www.meshy.ai) hoặc [Hunyuan3D](https://3d.hunyuan.tencent.com): chọn *Image to 3D*, tải ảnh lên.
- Nếu trang có tuỳ chọn *multi-view*, tải đủ ảnh trước, bên và sau.
- Xuất file định dạng **GLB**. Nên bật *texture* và chọn số tam giác vừa phải (khoảng 50–200 nghìn).
- Đọc kỹ điều khoản gói miễn phí: một số trang không cho dùng thương mại.

**3. Đưa vào game**
```bash
# chép file vừa tải về thành public/models/statue-raw.glb, rồi nén:
npm run optimize-statue
```
- Lệnh này giảm lưới, nén texture sang WebP 1024px và nén hình học (meshopt), ra file `public/models/statue.glb`. File thường chỉ còn vài MB, đủ nhẹ cho điện thoại.
- Có thể bỏ qua bước nén: chép thẳng file thành `statue.glb`.
- Game tự đặt mô hình lên bệ và phóng cho cao đúng **10,8 m**.

**4. Chỉnh trong game**
- `?statueRot=90`: xoay mô hình (độ) nếu mặt tượng không nhìn ra biển. Khi đã ưng góc nào, ghi giá trị vào `rotateY` trong `src/world/statue-model.js`.
- `?statueTex=1`: giữ màu và texture gốc của file. Mặc định game phủ chất liệu đồng, nhưng vẫn giữ texture để thấy rõ chi tiết.
- `?statue=off`: xem lại tượng khối để so sánh.

## Cấu trúc

| File | Vai trò |
|---|---|
| `scripts/fetch-osm.mjs` | Tải dữ liệu OSM, đổi sang mét, lưu `public/data/quynhon.json` (`npm run fetch-osm`) |
| `scripts/fetch-buildings.mjs` | Tải footprint nhà Microsoft (~24 MB), lọc quanh tượng đài, lưu `public/data/buildings.json` (`npm run fetch-buildings`, chạy sau `fetch-osm`) |
| `src/world/geo.js` | Lưới va chạm 2 m/ô, hàm đa giác, ghép đường bờ biển thành đất liền |
| `src/world/city.js` | Dựng mặt đất, đường, toà nhà, nhà ống tự sinh, đèn, cây |
| `src/world/sky.js` | Trời, vị trí mặt trời, ánh sáng ngày và đêm, sương mù |
| `src/world/sea.js` | Shader mặt biển |
| `src/world/site.js` | Bố cục khu tượng đài: hướng, kích thước, độ cao mặt sân, va chạm |
| `src/world/landmark.js` | Tượng đài, bệ, phù điêu, bồn hoa, đèn chiếu |
| `src/world/square.js` | Quảng trường tròn: mặt sân, ô cỏ, cột cờ, đèn pha |
| `src/world/plants.js` | Hoa sen, cau cảnh trồng chậu |
| `src/world/statue-model.js` | Nạp mô hình tượng `.glb`, tự canh tỉ lệ và đặt lên bệ |
| `src/character.js` | Người dựng từ khối cơ bản, có động tác đi và chạy |
| `src/player.js`, `src/npc.js` | Người chơi, camera, joystick; người đi dạo |
| `src/quest.js`, `src/minimap.js` | Nhiệm vụ và bản đồ nhỏ |

## Cần lưu ý trước khi ra mắt

- **Tượng đài vẫn là mô hình khối giản lược.** Tỉ lệ và dáng đứng đã theo ảnh, nhưng mặt, nếp áo và hình chạm phù điêu là vẽ phỏng. Muốn giống hẳn cần mô hình 3D dựng từ ảnh chụp (Blender hoặc photogrammetry).
- **Hướng tượng (60°) và kích thước sân** được suy ra từ bản đồ OSM, chưa đo thực địa.
- **Bản quyền dữ liệu nhà (Microsoft, ODbL):** giữ dòng ghi nguồn trên màn hình.
- **Câu chuyện và câu hỏi** trong `src/quest.js` cần kiểm chứng lại với nguồn chính thống.
- **Bản quyền OpenStreetMap (ODbL):** phải giữ dòng ghi nguồn "© OpenStreetMap" trên màn hình.
- **Nhà ống tự sinh là ngẫu nhiên,** không đúng từng căn ngoài đời.
