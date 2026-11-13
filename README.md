# Quy Nhơn 3D · Bản mẫu

Game 3D chạy trên trình duyệt (máy tính và điện thoại): dạo khắp **nội thành Quy Nhơn** (khoảng 6,6 × 6,8 km, từ Ghềnh Ráng tới cảng và bờ đầm Thị Nại), với điểm nhấn là Quảng trường Trung tâm, Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành và bãi biển.

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
- `?zoom=600&pitch=0.6`: đưa camera lên cao để xem toàn cảnh.
- `?debug`: đưa `scene`, `THREE` và `game` (người chơi, thành phố) ra `window` để soi trong console; `game.city.tiles.stats()` cho biết số ô đang dựng và thời gian gắn ô.

## Dữ liệu bản đồ

Dữ liệu game trong `public/data` đã có sẵn trong kho. Chỉ cần tạo lại khi muốn cập nhật từ OSM hoặc đổi vùng bản đồ (`BBOX` trong `src/world/config.js`):

```bash
npm run build-data
```

Lệnh này chạy lần lượt:
1. `fetch-osm`: tải đường, vùng, bờ biển, nhà OSM, dựng đa giác đất liền → `.cache/osm.json`.
2. `fetch-buildings`: tải footprint nhà Microsoft (~24 MB) → `.cache/footprints.json`.
3. `fetch-terrain`: tải độ cao địa hình (AWS Terrain Tiles, dữ liệu SRTM ~30 m) → `public/data/terrain.bin` (0,7 MB): lưới 15 m cho vùng bản đồ, lưới 75 m cho phông nền ~30 km.
4. `build-tiles`: trồng rừng trên đồi, cắt nhà ống, ước lượng số tầng, gắn mái hiên cửa hàng, trồng cây, đặt đèn, chia thành ô 400 m → `public/data/world.json` và `public/data/tiles/*.json` (khoảng 8 MB).

**Cách game tải bản đồ lớn:**
- Lúc vào game chỉ dựng các ô trong bán kính 700 m quanh điểm xuất phát.
- Khi đi lại, ô trong bán kính 1,25 km được tải dần, ô xa hơn 1,6 km bị huỷ.
- Việc tải file và dựng hình chạy trong Web Worker; luồng chính chỉ gắn ô vào cảnh (khoảng 15 ms mỗi ô), nên không khựng.
- Mái hiên, biển hiệu, bụi cây chỉ hiện trong bán kính 650 m.

## Có gì trong bản mẫu

**Bản đồ thật từ OpenStreetMap**
- Toàn nội thành: đường phố, bờ biển, cảng, bờ đầm Thị Nại, hồ, bãi biển, công viên, quảng trường.
- 380 toà nhà có sẵn trên OSM, cộng khoảng 23 nghìn **footprint nhà thật** nhận dạng từ ảnh vệ tinh (Microsoft Global ML Building Footprints), sau khi cắt thành khoảng 83 nghìn căn.
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
- **Bố cục đo từ ảnh vệ tinh** (Esri World Imagery): phù điêu là cung tròn bán kính ~74 m, cách tượng 19 m; tượng quay hướng 62° (vuông góc đường An Dương Vương).
- Sân lát **granite đỏ bóng**, nâng cao 0,75 m với 4 bậc thềm rộng quanh mép (theo Street View): mặt sau theo cung phù điêu, mặt trước là cạnh thẳng dọc vỉa hè, hai góc có bồn cây bụi. Trước sân là vỉa hè đá xám rộng ~14 m.
- Phù điêu: vòm giữa cao 14,5 m, hai bên cao 9–10,5 m, hai đầu là khối cuộn tròn lớn.
- Chân phù điêu có dải cỏ viền và hàng **cau cảnh trồng chậu** (theo ảnh chụp). Phía sau phù điêu là rừng cây dày.
- Hai bồn **hoa sen** trước bệ (bông nở, nụ, lá khum) như ngày khánh thành, và lẵng hoa đỏ dâng trước bệ.

**Quảng trường Nguyễn Tất Thành** (bên kia đường An Dương Vương, đo từ ảnh vệ tinh)
- Sân lát đá xám hình **nửa tròn**: tâm nằm ngay mép đường An Dương Vương, có bệ gạch đỏ và cột cờ cao 26 m.
- Vòng đá sẫm bán kính ~76 m viền răng cưa; 9 tia đá sẫm toả ra phía biển, mỗi tia cách nhau 20°.
- Lưới ô cỏ vuông 4 m (bước 7,5 m) gần như bằng mặt sân, nằm trong vòng, sát phía đường; năm cột đèn pha (một cột giữa sân).
- Phía đông bắc và phía nam là rừng cây dày. Ban đêm mặt sân sáng như được đèn pha chiếu.

**Bãi biển và đường Xuân Diệu**
- Từ phố ra biển: đường → dải công viên trồng dày **phi lao xen dừa** → **lối đi dạo lát đá** có viền gạch đỏ, đèn trang trí hai bóng, ghế đá → bãi cát có các cụm **dù lá** và ghế nằm → **mép sóng** có bọt trắng vỗ vào bờ và cát ướt (shader).
- Ven biển chủ yếu là dừa trên thảm cỏ, xen phi lao và bụi cây thấp (theo Street View).
- Nhà mặt phố có **mái hiên bạt sọc** và **biển hiệu** ở tầng trệt (cà phê, tạp hóa, phở…), vỉa hè đường lớn có cây bóng mát.
- Dãy nhà sâu (hai dãy nhà ống quay lưng vào nhau) được tách đôi rồi cắt thành từng căn. Mặt phố ven biển chủ yếu 4–9 tầng, thỉnh thoảng có khách sạn 12–18 tầng.

**Nhiệm vụ "Khám phá Quảng trường"**
- Cột sáng vàng mở câu chuyện và 3 câu hỏi.
- Tìm 3 chi tiết (điểm sáng xanh).
- Chụp ảnh lưu niệm gần tượng.
- Hoàn thành cả ba thì nhận 1 mảnh ghép. Tiến độ lưu trong trình duyệt.

**Quán Highlands Coffee, 162A Nguyễn Huệ** (góc Nguyễn Huệ – Đô Đốc Bảo, dựng theo ảnh Street View tháng 9-2026)
- Tầng trệt cột kem, kính sẫm; dải diềm đen hoa văn chữ V có chữ HIGHLANDS COFFEE chạy liền mặt Đô Đốc Bảo, góc bo và mặt Nguyễn Huệ; đèn rọi dưới diềm.
- Tầng 2 lam gỗ có hoa văn ô vuông ở góc; mái đua xám; tháp bo tròn ở góc với ban công cong lan can đen, huy hiệu tròn đỏ; các tầng trên ốp gạch tím nhạt, cửa sổ khung nâu đỏ.
- Vỉa hè có dù đỏ, bàn ghế sắt đỏ và hàng dừa cao. Ban đêm quán sáng đèn vàng ấm.

**Công trình nổi bật** (dựng tay theo ảnh vệ tinh, Street View và số liệu báo chí, `src/world/landmarks.js`)
- **Tháp Đôi (Tháp Hưng Thạnh):** hai tháp Chăm gạch đỏ đứng cạnh nhau theo hướng bắc – nam; tháp Bắc lớn hơn (~21 m), cửa chính có bậc thềm quay về phía đông; tháp Nam thấp và bè (~16 m) với khối mái cụt. Tỉ lệ chỉnh theo ảnh chụp; thân vuông có trụ áp tường và cửa giả vòm nhọn, mái nhiều tầng thu nhỏ dần đã mất chóp, chân đá; khuôn viên thảm cỏ.
- **Nhà thờ Chính tòa (Nhà thờ Nhọn):** dựng theo ảnh Street View chụp thẳng mặt tiền: tường trắng, mái ngói đỏ, thân dài ~58 m có cánh ngang. Tháp chuông cao 42,7 m mọc từ mặt đất giữa mặt tiền, thu nhỏ dần qua các tầng: cổng vòm có khung nhô, tranh ghép lớn và băng rôn, huy hiệu tròn, thánh giá nổi, tầng chuông có cửa chớp, đồng hồ bốn mặt, đèn lồng, chóp nhọn cam đỏ thanh mảnh. Hai cánh thấp hai bên có cửa sổ tròn và ba cửa sổ vòm. Sân trước lát đá, bụi cây cắt tỉa, cổng và hàng rào trụ đá ra đường Trần Hưng Đạo. Tranh ghép chỉ vẽ giản lược, không sao chép tác phẩm gốc.
- **Chợ Lớn:** nhà lồng chợ hai tầng mái tôn, biển tên, vòng quanh là sạp hàng mái bạt nhiều màu.
- **Ga Quy Nhơn:** nhà ga hai tầng sơn vàng, khối giữa có đầu hồi, đồng hồ và biển "GA QUY NHƠN", sân ga và đường ray phía sau.
- **Mộ Hàn Mặc Tử (đồi Thi Nhân):** nền đá ba bậc, bia đá trắng có thánh giá, đèn trụ xanh, sân lát đá, bồn hoa, bậc thang xuống phía biển.
- Vị trí và vùng đất của từng công trình nằm trong `src/world/landmark-sites.js`; script tạo dữ liệu tự bỏ nhà và cây tự sinh trong các vùng này.

**Địa hình thật** (dữ liệu độ cao SRTM qua AWS Terrain Tiles)
- Đồi núi đúng hình dạng và độ cao: Bà Hỏa giữa thành phố, Vũng Chua phía tây nam, Ghềnh Ráng phía nam, cùng phông nền ~30 km: bán đảo Phương Mai, các đảo, đồng bằng và núi phía tây.
- Dữ liệu gốc là độ cao bề mặt (lẫn cả mái nhà, tán cây) nên **phố dưới ~14 m được làm phẳng**; đồi núi chuyển tiếp mềm từ 14 m lên và thấp hơn thật khoảng 20 m.
- Đồi phủ rừng (khoảng 23 nghìn tán cây). Nhà, đường, đèn, cây, người chơi, người đi dạo đều bám theo độ cao; đường lên dốc được chia nhỏ để không chìm vào sườn đồi; camera không chui vào sườn đồi.
- Bản đồ nhỏ tô xanh đậm dần theo độ cao đồi.

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
| `src/world/config.js` | Vùng bản đồ, gốc toạ độ, kích thước ô (dùng chung cho game và script) |
| `scripts/fetch-osm.mjs`, `scripts/lib/coast.mjs` | Tải dữ liệu OSM, dựng đa giác đất liền từ đường bờ biển |
| `scripts/fetch-buildings.mjs` | Tải footprint nhà Microsoft cho cả vùng |
| `scripts/build-tiles.mjs` | Tạo dữ liệu game: cắt nhà ống, chiều cao, cửa hàng, cây, đèn, chia ô |
| `src/world/worldgrid.js` | Dựng lưới va chạm cả vùng (dùng chung cho game và script) |
| `src/world/tiles.js`, `tilework.js`, `tileworker.js` | Tải/huỷ ô theo vị trí; dựng hình trong Web Worker |
| `src/world/lots.js`, `citykit.js` | Hàm cắt lô nhà; công cụ dựng hình (nhà, cửa sổ, mái hiên, cây) |
| `src/world/geo.js` | Lưới va chạm 2 m/ô, hàm đa giác |
| `src/world/city.js` | Mặt đất, công viên, mặt nước, vật liệu dùng chung, khởi tạo trình quản lý ô |
| `src/world/sky.js` | Trời, vị trí mặt trời, ánh sáng ngày và đêm, sương mù |
| `src/world/sea.js` | Shader mặt biển |
| `src/world/site.js` | Bố cục khu tượng đài: hướng, kích thước, độ cao mặt sân, va chạm |
| `src/world/landmark.js` | Tượng đài, bệ, phù điêu, bồn hoa, đèn chiếu |
| `src/world/square.js` | Quảng trường nửa tròn: mặt sân, ô cỏ, cột cờ, đèn pha |
| `src/world/landmark-sites.js`, `landmarks.js` | Vị trí và mô hình các công trình nổi bật |
| `src/world/highlands.js` | Toà nhà quán Highlands Coffee góc Nguyễn Huệ – Đô Đốc Bảo |
| `scripts/fetch-terrain.mjs` | Tải và làm phẳng dữ liệu độ cao |
| `src/world/terrain.js` | Đọc độ cao tại một điểm (dùng chung game, Web Worker, script) |
| `src/world/terrainmesh.js` | Mặt đồi núi gần và phông nền địa hình xa |
| `src/world/beach.js` | Mép sóng, cát ướt, lối đi dạo ven biển, đèn, ghế đá, dù lá |
| `src/world/plants.js` | Hoa sen, cau cảnh trồng chậu |
| `src/world/statue-model.js` | Nạp mô hình tượng `.glb`, tự canh tỉ lệ và đặt lên bệ |
| `src/character.js` | Người dựng từ khối cơ bản, có động tác đi và chạy |
| `src/player.js`, `src/npc.js` | Người chơi, camera, joystick; người đi dạo |
| `src/quest.js`, `src/minimap.js` | Nhiệm vụ và bản đồ nhỏ |

## Cần lưu ý trước khi ra mắt

- **Địa hình độ phân giải ~30 m:** đủ cho đồi núi nhìn từ xa, nhưng đi bộ trên sườn đồi sẽ thấy mặt đất góc cạnh. Dữ liệu là độ cao bề mặt nên đỉnh đồi có thể lệch vài mét do tán cây.
- **Cảnh nặng hơn:** khoảng 1,5 triệu tam giác ở điểm xuất phát (trước khi lọc phần ngoài khung nhìn). Cần đo trên điện thoại thật; nếu chậm có thể giảm mật độ rừng, cây hoặc độ chi tiết địa hình xa.
- **Một số vùng nước OSM đã lỗi thời** (khu lấn đầm Thị Nại đã xây nhà): script tự bỏ vùng nước có trên 15 nhà bên trong.

- **Tượng đài vẫn là mô hình khối giản lược.** Tỉ lệ và dáng đứng đã theo ảnh, nhưng mặt, nếp áo và hình chạm phù điêu là vẽ phỏng. Muốn giống hẳn cần mô hình 3D dựng từ ảnh chụp (Blender hoặc photogrammetry).
- **Hướng tượng (60°) và kích thước sân** được suy ra từ bản đồ OSM, chưa đo thực địa.
- **Công trình nổi bật là mô hình khối giản lược.** Tháp Đôi, nhà thờ, chợ, mộ dựng theo ảnh Street View; **Ga Quy Nhơn chưa có ảnh Street View** nên hình dáng, màu vàng và hướng mặt tiền là ước lượng theo kiểu nhà ga Việt Nam, cần chụp ảnh thực địa để chỉnh.
- **Bản quyền dữ liệu nhà (Microsoft, ODbL):** giữ dòng ghi nguồn trên màn hình.
- **Tên Highlands Coffee là thương hiệu đã đăng ký.** Bản mẫu chỉ vẽ chữ đơn giản, không chép logo gốc. Trước khi phát hành công khai hay dùng thương mại cần xin phép chủ thương hiệu, hoặc đổi sang tên chung.
- **Câu chuyện và câu hỏi** trong `src/quest.js` cần kiểm chứng lại với nguồn chính thống.
- **Bản quyền OpenStreetMap (ODbL):** phải giữ dòng ghi nguồn "© OpenStreetMap" trên màn hình.
- **Nhà ống tự sinh là ngẫu nhiên,** không đúng từng căn ngoài đời.
