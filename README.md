# Quy Nhơn 3D · Bản mẫu

Game 3D chạy trên trình duyệt (máy tính và điện thoại): dạo khắp **nội thành Quy Nhơn** (khoảng 7,8 × 10,2 km, từ Ghềnh Ráng tới cầu Thị Nại và đầu bán đảo Phương Mai), với điểm nhấn là Quảng trường Trung tâm, Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành và bãi biển.

**▶ Chơi ngay: [quynhoncity.vercel.app](https://quynhoncity.vercel.app)** (máy tính và điện thoại; điện thoại tự dùng đồ hoạ mức Thấp)

## Đưa lên mạng (Vercel)

Mỗi lần push lên `main`, Vercel tự build (`npm run build`) và đăng bản mới. File `vercel.json` đặt thời gian lưu đệm cho trình duyệt:
- `/assets/*` (JS, CSS có mã băm trong tên): lưu 1 năm.
- `/data/*` (bản đồ, địa hình, các ô nhà): trình duyệt luôn hỏi lại máy chủ (không đổi thì chỉ nhận mã 304), nên dữ liệu tạo lại có hiệu lực ngay, không lẫn với mã mới.
- `/sw.js`: không lưu đệm, để bản mới được nhận ngay.
- `/models/*` (mô hình tượng): lưu 1 ngày.

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
- `?q=low` / `?q=high`: chọn mức đồ hoạ.
- `?wx=rain|storm|cloud|fog|clear`: thử thời tiết.
- `?debug`: đưa `scene`, `THREE` và `game` (người chơi, thành phố, camera) ra `window` để soi trong console; `game.city.tiles.stats()` cho biết số ô đang dựng và thời gian gắn ô.

## Dữ liệu bản đồ

Dữ liệu game trong `public/data` đã có sẵn trong kho. Chỉ cần tạo lại khi muốn cập nhật từ OSM hoặc đổi vùng bản đồ (`BBOX` trong `src/world/config.js`):

```bash
npm run build-data
```

Lệnh này chạy lần lượt:
1. `fetch-osm`: tải đường, vùng, bờ biển, nhà OSM, dựng đa giác đất liền → `.cache/osm.json`.
2. `fetch-buildings`: tải footprint nhà Microsoft (~24 MB) → `.cache/footprints.json`.
3. `fetch-terrain`: tải độ cao địa hình (AWS Terrain Tiles, dữ liệu SRTM ~30 m) → `public/data/terrain.bin` (1,05 MB): lưới 15 m cho vùng bản đồ, lưới 75 m cho phông nền ~30 km.
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
- **Số tầng theo loại đường mặt tiền** (quan sát Street View): nhà ống mặt đường lớn 3–5 tầng, đường tertiary 2–4, đường nhỏ 2–3, trong hẻm 1–2; khách sạn ven biển 6–22 tầng, cao ốc mặt đường chính 5–9 tầng, khối lớn khác (trường, chợ, kho) 2–4 tầng.
- Dãy nhà sâu (hai dãy nhà ống quay lưng vào nhau) được tách đôi rồi cắt thành từng căn. Mặt phố ven biển chủ yếu 4–9 tầng, thỉnh thoảng có khách sạn 12–18 tầng.

**Hành trình khám phá: 12 địa điểm, 12 mảnh ghép** (nội dung trong `src/quests-data.js`)
- Tượng đài & Quảng trường, Tháp Đôi, Nhà thờ Nhọn, Chợ Lớn, Chùa Long Khánh, Tượng đài Quang Trung, Bảo tàng Tổng hợp, Cầu Thị Nại, Mộ Hàn Mặc Tử, Bãi tắm Hoàng Hậu, Kỳ Co, Eo Gió.
- Mỗi nơi: cột sáng vàng mở câu chuyện và 3 câu hỏi; tìm các chi tiết (điểm sáng xanh); chụp ảnh lưu niệm gần công trình. Xong cả ba thì nhận 1 mảnh ghép.
- Ảnh lưu niệm (cho album, bưu thiếp) luôn chụp từ góc máy đẹp đặt sẵn của từng địa điểm (`shot` trong `src/quests-data.js`), giữ nguyên giờ, thời tiết lúc bấm chụp. Trên máy tính, ảnh PNG tải về vẫn là đúng góc người chơi đang nhìn; trên điện thoại không tải PNG.
- Người đi dạo vẽ gộp: mỗi bộ phận cơ thể là một InstancedMesh, cả đám đông chỉ tốn 12 lần vẽ.
- Bảng nhiệm vụ tự hiện địa điểm gần người chơi nhất. Tiến độ lưu trong trình duyệt (tiến độ bản cũ ở tượng đài được giữ lại).

**Bản đồ lớn và dịch chuyển nhanh** (nút 🗺️, bấm vào bản đồ nhỏ, hoặc phím M)
- Bản đồ toàn thành phố: đất, nước, công viên, đồi núi, đường chính, các địa điểm kèm khoảng cách và tiến độ nhiệm vụ.
- Bấm vào địa điểm để dịch chuyển tới đó; game tải sẵn khu vực rồi đặt người chơi vào chỗ đi được. Người đi dạo cũng chuyển theo.

**Xe máy** (nút 🛵 hoặc phím F)
- Lên xe chạy ~40 km/h, giữ Shift ~55 km/h; không tốn MANA. Xe rẽ có giới hạn, nghiêng theo cua; người lái đội mũ bảo hiểm; camera tự xoay ra sau lưng khi chạy.
- Chỗ hẹp quá thì không lên xe được.

**Xe cộ trên đường** (`src/traffic.js`, hình xe trong `src/vehicles.js`)
- Chủ yếu xe máy (có người lái đội mũ), ít ô tô, thỉnh thoảng xe buýt trên đường lớn. Xe đi bên phải, tới ngã ba ngã tư thì rẽ ngẫu nhiên, đường cụt thì quay đầu, dừng lại khi người chơi đứng chắn phía trước.
- Xe giữ khoảng cách với xe phía trước cùng làn. Khoảng 160 ngã tư có hai đường lớn cắt nhau có **đèn giao thông** (xanh 14 s, vàng 3 s, rồi đổi hướng); xe dừng trước vạch khi đèn đỏ.
- Chỉ có xe trong bán kính ~300 m quanh người chơi (45 xe ở mức Cao, 24 xe ở mức Thấp); mỗi loại xe vẽ bằng vài InstancedMesh nên rất nhẹ. Ban đêm đèn xe sáng.

**Âm thanh** (nút 🔊: bật hết → tắt nhạc → tắt tiếng; `src/audio.js`)
- Toàn bộ tự tạo bằng Web Audio, không dùng file ghi âm: tiếng sóng to dần khi lại gần biển, tiếng phố theo số xe xung quanh, còi xe xa xa, tiếng máy xe máy cao dần theo tốc độ, nhạc nền ngũ cung tự sinh (gảy đàn và sáo).
- Hiệu ứng khi tìm thấy chi tiết, trả lời đúng/sai, nhận mảnh ghép, chụp ảnh. Âm thanh bắt đầu sau lần chạm/bấm đầu tiên (quy định của trình duyệt).

**Album và bưu thiếp** (bấm thẻ 🧩 Mảnh ghép; `src/album.js`)
- Mỗi lần chụp ảnh gần một địa điểm, ảnh 640×360 được lưu vào album (trong trình duyệt). Lúc chụp, cột sáng và điểm sáng nhiệm vụ được ẩn đi; các bảng thông tin là lớp HTML nên cũng không lọt vào ảnh.
- Đủ 8 mảnh ghép: album tự mở, nhập tên rồi tạo **bưu thiếp 1200×630** ghép 8 tấm ảnh (một ảnh lớn, các ảnh nhỏ xếp 2 hàng, số cột tự tính) đã chụp, tên, ngày hoàn thành và đường dẫn game; tải về hoặc chia sẻ thẳng (trên điện thoại dùng bảng chia sẻ của máy).

**Thời tiết thật** (`src/world/weather.js`)
- Theo dữ liệu Open-Meteo (mã thời tiết WMO): ít mây/nhiều mây có mây trôi; mưa, mưa rào có mưa rơi quanh người chơi, trời u ám, sương mù dày hơn, tiếng mưa; dông có chớp sáng và tiếng sấm; sương mù làm tầm nhìn ngắn lại.
- Thử nhanh không cần chờ trời mưa: `?wx=rain`, `?wx=storm`, `?wx=cloud`, `?wx=fog`, `?wx=clear`.

**Khu riêng Kỳ Co và Eo Gió** (`src/world/zones.js`, `src/world/zones-config.js`, `scripts/fetch-zones.mjs`)
- Hai khu ở Nhơn Lý, cách trung tâm 12–15 km, nằm ngoài bản đồ chính. Mỗi khu là một ô vuông khoảng 1,2 km, **chỉ tải khi dịch chuyển tới** (250–380 KB mỗi khu), nên không làm chậm lúc mở game.
- Đất/biển cắt theo đường bờ biển OSM, độ cao SRTM lấy mẫu lưới 4 m; dải đất thấp sát biển được hạ thành dốc thoai thoải (SRTM 30 m làm bãi cát gò cao 5–9 m). Lưới địa hình xa được đục lỗ đúng chỗ khu để không chồng hình.
- Va chạm: lưới riêng của khu (biển, đất, đường, nhà) ghép vào lưới chính qua `grid.get`. Đi tới mép khu là gặp "tường" vô hình.
- Kỳ Co: bãi cát trắng rộng, cầu cảng gỗ ~130 m giữa bãi (theo ảnh vệ tinh), ca nô, dù lá và ghế nằm, biển tên, khu nghỉ dưỡng (footprint Microsoft), đồi cây.
- Eo Gió: sống đá hẹp màu đá nâu xen cây bụi, đài ngắm cảnh có lan can ở chỗ cao nhất, biển tên, làng chài Nhơn Lý (~1.100 nhà từ footprint Microsoft), thuyền thúng và thuyền gỗ trong vịnh phía tây.
- Tạo lại dữ liệu: `npm run fetch-zones`.

**Nhiệm vụ phụ** (`src/sidequests.js`, tóm tắt trong album)
- Xe ôm: đang chạy xe máy sẽ có khách đứng chờ bên đường (cột sáng xanh lá); dừng gần để đón, chở tới nơi khách muốn (cột sáng xanh dương, chấm xanh trên bản đồ nhỏ), nhận tiền công (tiền trong game).
- Sổ ẩm thực: 5 xe hàng đặc sản (bánh xèo tôm nhảy, bún chả cá, bánh hỏi cháo lòng, nem chợ Huyện, tré), chấm cam trên bản đồ nhỏ, bấm "Ăn thử".
- Hoàng hôn: chụp ảnh lúc chiều tà (khoảng 16:40 – 17:45 giờ trong game) gần biển hoặc đầm.

**Cài như ứng dụng** (`public/manifest.webmanifest`, `public/sw.js`, `src/pwa.js`)
- Android/Chrome: nút 📲 để cài game ra màn hình chính; mở từ biểu tượng là chơi toàn màn hình, không có thanh địa chỉ.
- iPhone/iPad: nút 📲 hiện hướng dẫn "Chia sẻ → Thêm vào MH chính".
- Nút ⛶ bật toàn màn hình ngay trong trình duyệt (và thử xoay ngang trên điện thoại).
- Service worker lưu sẵn trang, mã JS/CSS, bản đồ, địa hình và các khu đã đi qua, nên lần sau mở nhanh hơn và vẫn mở được khi mất mạng. Chỉ chạy trên HTTPS (bản Vercel), không chạy khi `npm run dev`.
- Tên bộ nhớ đệm gắn với từng bản build (`vite.config.js` thay `__BUILD__` trong `dist/sw.js`). Mỗi lần đăng bản mới, service worker mới tải lại toàn bộ và xoá bộ nhớ cũ.

**Mức đồ hoạ** (nút ⚙, có hiện FPS)
- **Cao** (mặc định trên máy tính): bóng đổ, hiệu ứng toả sáng ban đêm, tải bản đồ trong bán kính 1,25 km.
- **Thấp** (mặc định trên điện thoại): tắt bóng đổ và toả sáng, độ phân giải 1×, tải bán kính 800 m, rừng thưa còn 45%, cây còn 60%, ít người đi dạo hơn.
- Bấm ⚙ để đổi (tải lại trang, lựa chọn được ghi nhớ), hoặc dùng `?q=low` / `?q=high`. Nếu máy chậm dưới 24 FPS ở mức Cao, game sẽ gợi ý chuyển sang Thấp.

**Quán Highlands Coffee, 162A Nguyễn Huệ** (góc Nguyễn Huệ – Đô Đốc Bảo, dựng theo ảnh Street View tháng 9-2026)
- Tầng trệt cột kem, kính sẫm; dải diềm đen hoa văn chữ V có chữ HIGHLANDS COFFEE chạy liền mặt Đô Đốc Bảo, góc bo và mặt Nguyễn Huệ; đèn rọi dưới diềm.
- Tầng 2 lam gỗ có hoa văn ô vuông ở góc; mái đua xám; tháp bo tròn ở góc với ban công cong lan can đen, huy hiệu tròn đỏ; các tầng trên ốp gạch tím nhạt, cửa sổ khung nâu đỏ.
- Vỉa hè có dù đỏ, bàn ghế sắt đỏ và hàng dừa cao. Ban đêm quán sáng đèn vàng ấm.

**Công trình nổi bật** (dựng tay theo ảnh vệ tinh, Street View và số liệu báo chí, `src/world/landmarks.js`)
- **Tháp Đôi (Tháp Hưng Thạnh):** hai tháp Chăm gạch đỏ đứng cạnh nhau theo hướng bắc – nam; tháp Bắc lớn hơn (~21 m), cửa chính có bậc thềm quay về phía đông; tháp Nam thấp và bè (~16 m) với khối mái cụt. Tỉ lệ chỉnh theo ảnh chụp; thân vuông có trụ áp tường và cửa giả vòm nhọn, mái nhiều tầng thu nhỏ dần đã mất chóp, chân đá; khuôn viên thảm cỏ.
- **Nhà thờ Chính tòa (Nhà thờ Nhọn):** dựng theo ảnh Street View chụp thẳng mặt tiền: tường trắng, mái ngói đỏ, thân dài ~58 m có cánh ngang. Tháp chuông cao 47,2 m (theo lược sử giáo xứ) mọc từ mặt đất giữa mặt tiền, thu nhỏ dần qua các tầng: cổng vòm có khung nhô, tranh ghép lớn và băng rôn, huy hiệu tròn, thánh giá nổi, tầng chuông có cửa chớp, đồng hồ bốn mặt, đèn lồng, chóp nhọn cam đỏ thanh mảnh. Hai cánh thấp hai bên có cửa sổ tròn và ba cửa sổ vòm. Sân trước lát đá, bụi cây cắt tỉa, cổng và hàng rào trụ đá ra đường Trần Hưng Đạo. Tranh ghép chỉ vẽ giản lược, không sao chép tác phẩm gốc.
- **Chợ Lớn:** nhà lồng chợ hai tầng mái tôn, biển tên, vòng quanh là sạp hàng mái bạt nhiều màu.
- **Chùa Long Khánh** (chỉnh theo Street View): chánh điện mái cong hai lớp đầu đao đặt trên nền cao lát gạch đỏ có bậc thềm rộng, hậu điện và hai dãy nhà bên (kiểu chữ Khẩu); lầu chuông chân xây đá có cửa vòm, tầng trên tường vàng cửa chấn song; cổng bốn trụ vàng đất đỉnh là tháp nhỏ nhiều tầng, xà giữa có biển tên và bánh xe pháp luân, cửa sắt đỏ hai bên; sư tử đá, cây cổ thụ, đèn lồng.
- **Tượng đài Quang Trung** (chỉnh theo Street View): bệ trụ đá vàng nhạt chạm phù điêu, bồn hoa đỏ sát chân bệ, vòng bể 32 vòi phun, sân đá sẫm, viền ngoài hoa đỏ và hàng cây xanh; tượng đồng vua Quang Trung cưỡi ngựa chồm, tay giơ gươm (tượng thật cao 5 m).
- **Bảo tàng Tổng hợp** (26 Nguyễn Huệ, trước là Bảo tàng Bình Định; theo ảnh): nhà hai tầng màu kem kiểu những năm 1960, mái đua bê tông rộng trên cột mảnh che lối vào, tầng trên lùi vào có dãy cửa sổ và chữ "BẢO TÀNG", sân trước bày tượng đá Chăm Pa (sư tử, đầu makara, trụ đá, bia đá).
- **Cầu Thị Nại** (`src/world/bridges.js`, `src/world/bridgemesh.js`): lấy đường tim cầu từ OSM, dài ~2,8 km; mặt cầu dốc lên 7 m trong 250 m đầu, đoạn giữa vồng cao thêm 9 m; dầm bê tông, lan can, vạch giữa đường, trụ đôi mỗi 44 m, cột đèn so le sáng ban đêm. Người chơi, xe máy, xe cộ đều chạy trên mặt cầu. Mọi cây cầu OSM khác (46 cầu) cũng được dựng mặt cầu theo cùng cách và đi qua được trên mặt nước.
- **Bãi tắm Hoàng Hậu (Ghềnh Ráng):** vịnh nhỏ dưới chân đồi (vị trí theo OSM), dải đá cuội tròn nhẵn nhiều màu sát mép nước, các tảng granite trên bờ và dưới nước, "hòn trứng" đứng chênh vênh trên tảng đá bẹt, bậc đá có lan can xuống bãi, chòi nghỉ mái ngói, biển tên, hàng dừa nghiêng. Địa hình dốc nên từng vật được đặt theo độ cao thật tại chỗ.
- **Ga Quy Nhơn:** nhà ga hai tầng sơn vàng, khối giữa có đầu hồi, đồng hồ và biển "GA QUY NHƠN", sân ga và đường ray phía sau.
- **Mộ Hàn Mặc Tử (đồi Thi Nhân):** nền đá ba bậc, bia đá trắng có thánh giá, đèn trụ xanh, sân lát đá, bồn hoa, bậc thang xuống phía biển.
- Vị trí và vùng đất của từng công trình nằm trong `src/world/landmark-sites.js`; script tạo dữ liệu tự bỏ nhà và cây tự sinh trong các vùng này.

**Địa hình thật** (dữ liệu độ cao SRTM qua AWS Terrain Tiles)
- Đồi núi đúng hình dạng và độ cao: Bà Hỏa giữa thành phố, Vũng Chua phía tây nam, Ghềnh Ráng phía nam, cùng phông nền ~30 km: bán đảo Phương Mai, các đảo, đồng bằng và núi phía tây.
- Dữ liệu gốc là độ cao bề mặt (lẫn cả mái nhà, tán cây) nên **phố dưới ~14 m được làm phẳng**; đồi núi chuyển tiếp mềm từ 14 m lên và thấp hơn thật khoảng 20 m.
- Đồi phủ rừng (khoảng 23 nghìn tán cây). Nhà, đường, đèn, cây, người chơi, người đi dạo đều bám theo độ cao; đường lên dốc được chia nhỏ để không chìm vào sườn đồi; camera không chui vào sườn đồi.
- Bản đồ nhỏ tô xanh đậm dần theo độ cao đồi.

**Thẻ chia sẻ:** khi gửi link qua Zalo, Facebook, Messenger sẽ hiện ảnh xem trước `public/og.jpg` (1200×630, chụp trong game), tiêu đề và mô tả (thẻ Open Graph trong `index.html`).

**Giao diện:** bản đồ nhỏ xoay theo camera, thẻ địa điểm, giờ, thời tiết, MANA (chạy thì tiêu hao), nút âm thanh, nút xe máy, nút bản đồ, nút tua nhanh +3 giờ, nút đồ hoạ. Trên điện thoại các nút xếp dọc bên phải để không che joystick.

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
| `src/world/bridges.js`, `src/world/bridgemesh.js` | Mặt cầu nâng cao (độ cao, va chạm) và hình khối các cây cầu |
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
| `src/quests-data.js`, `src/quest.js` | Nội dung và cơ chế nhiệm vụ 12 địa điểm; danh sách điểm dịch chuyển |
| `src/minimap.js`, `src/bigmap.js` | Bản đồ nhỏ; bản đồ lớn và dịch chuyển nhanh |
| `src/quality.js` | Mức đồ hoạ Cao/Thấp, đo FPS |
| `src/audio.js` | Âm thanh tự tạo: sóng, phố, máy xe, nhạc nền, hiệu ứng |
| `src/album.js` | Album ảnh hành trình và bưu thiếp chia sẻ |
| `src/world/weather.js` | Mây, mưa, sương mù, dông theo thời tiết thật |
| `src/pwa.js`, `public/sw.js`, `public/manifest.webmanifest` | Cài như ứng dụng, toàn màn hình, lưu sẵn dữ liệu |
| `vite.config.js` | Gắn mã phiên bản build vào `dist/sw.js` |
| `src/tutorial.js` | Hướng dẫn lần đầu chơi (8 bước, khoanh sáng từng phần giao diện); mở lại bằng `?tutorial` |
| `src/stats.js` | Vercel Web Analytics và các sự kiện: mảnh ghép, hoàn thành, bưu thiếp, dịch chuyển, hướng dẫn, cài đặt |
| `api/weather.js` | Hàm Vercel chuyển tiếp thời tiết Open-Meteo (cho máy không gọi thẳng được), lưu đệm 10 phút |

## Thống kê người chơi

Game dùng Vercel Web Analytics (không cookie, không thu thông tin cá nhân). Cần bật một lần: trang dự án trên Vercel → **Analytics** → **Enable**. Gói miễn phí có lượt xem, quốc gia, thiết bị, trình duyệt; các sự kiện riêng (`piece`, `complete`, `postcard`, `travel`, `tutorial`, `install`) chỉ hiện ở gói Pro trở lên. Khi chạy `npm run dev` không gửi gì.

**Hiệu năng:** các công trình dựng tay, tượng đài và quảng trường gồm hàng trăm khối nhỏ được gộp theo vật liệu lúc tải (`mergeStatic` trong `landmarks.js`); công trình xa hơn 1,7 km (ngoài tầm sương) không vẽ. Số lần vẽ ở điểm xuất phát giảm từ ~900 xuống ~280 mỗi khung hình (lượt bóng đổ từ 363 xuống 73).

## Cần lưu ý trước khi ra mắt

- **Địa hình độ phân giải ~30 m:** đủ cho đồi núi nhìn từ xa, nhưng đi bộ trên sườn đồi sẽ thấy mặt đất góc cạnh. Dữ liệu là độ cao bề mặt nên đỉnh đồi có thể lệch vài mét do tán cây.
- **Cảnh nặng hơn:** khoảng 1,5 triệu tam giác ở điểm xuất phát (trước khi lọc phần ngoài khung nhìn). Cần đo trên điện thoại thật; nếu chậm có thể giảm mật độ rừng, cây hoặc độ chi tiết địa hình xa.
- **Nội dung đã đối chiếu nguồn (11/2026):** sửa chiều cao nhà thờ (47,2 m), bỏ chi tiết "Gia Long sắc phong năm 1805" (chỉ một nguồn yếu; năm 1805 là năm đúc chuông), "Hạ điện" → "Hậu điện", thêm năm khánh thành tượng Quang Trung (2008) và nhà thờ (1939). Nguồn ghi ở đầu `src/quests-data.js`.
- **Hướng các cửa tháp Đôi:** các nguồn mô tả khác nhau (hướng đông hay hướng nam), mô hình đang để cửa chính tháp Bắc quay về phía đông.
- **Một số vùng nước OSM đã lỗi thời** (khu lấn đầm đã xây nhà): script bỏ vùng nước có mật độ nhà trên 0,5 căn/ha. Đầm Thị Nại rộng có nhà chòi, ao nuôi rải rác (139 nhà trên ~4.000 ha) vẫn được giữ là mặt nước.

- **Tượng đài vẫn là mô hình khối giản lược.** Tỉ lệ và dáng đứng đã theo ảnh, nhưng mặt, nếp áo và hình chạm phù điêu là vẽ phỏng. Muốn giống hẳn cần mô hình 3D dựng từ ảnh chụp (Blender hoặc photogrammetry).
- **Hướng tượng (60°) và kích thước sân** được suy ra từ bản đồ OSM, chưa đo thực địa.
- **Công trình nổi bật là mô hình khối giản lược.** Tháp Đôi, nhà thờ, chợ, mộ dựng theo ảnh Street View; **Ga Quy Nhơn chưa có ảnh Street View** nên hình dáng, màu vàng và hướng mặt tiền là ước lượng theo kiểu nhà ga Việt Nam, cần chụp ảnh thực địa để chỉnh.
- **Bản quyền dữ liệu nhà (Microsoft, ODbL):** giữ dòng ghi nguồn trên màn hình.
- **Tên Highlands Coffee là thương hiệu đã đăng ký.** Bản mẫu chỉ vẽ chữ đơn giản, không chép logo gốc. Trước khi phát hành công khai hay dùng thương mại cần xin phép chủ thương hiệu, hoặc đổi sang tên chung.
- **Câu chuyện và câu hỏi** trong `src/quests-data.js` đã đối chiếu với báo chí và trang chính thống (nguồn ở đầu file); nên nhờ người am hiểu lịch sử địa phương đọc lại lần cuối.
- **Bản quyền OpenStreetMap (ODbL):** phải giữ dòng ghi nguồn "© OpenStreetMap" trên màn hình.
- **Nhà ống tự sinh là ngẫu nhiên,** không đúng từng căn ngoài đời.
