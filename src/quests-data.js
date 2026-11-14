// Nội dung nhiệm vụ cho từng địa điểm. Mỗi địa điểm: cột sáng (mở câu chuyện + câu hỏi),
// các chi tiết cần tìm (điểm sáng xanh), chụp ảnh gần công trình; xong cả ba thì nhận một mảnh ghép.
// Vị trí dùng toạ độ local của công trình (xem landmark-sites.js): lx sang phải, lz về phía trước.
// Nguồn (đã đối chiếu 11/2026): Wikipedia tiếng Việt (Tháp Đôi; Nhà thờ Chính tòa: tháp 47,2 m theo Lược sử giáo xứ,
// khởi công 1938, khánh thành 1939, đồng hồ lắp 1992), Báo Văn Hóa (Tháp Đôi thế kỷ XII–XIII), SGGP 2008 (tượng đồng
// Quang Trung 5 m, 13 tấn), Vietnam Airlines, Vinwonders (chùa Long Khánh: chuông đúc 1805), Google Maps (Chợ Lớn Mới
// trên đường Tăng Bạt Hổ; Bảo tàng Tổng hợp Gia Lai, 26 Nguyễn Huệ), Báo Chính phủ (cầu Thị Nại), báo Nhân Dân,
// Tuổi Trẻ, VTC (tượng đài), Mia.vn (đồi Thi Nhân, dốc Mộng Cầm; chùa Long Khánh: sắc phong 1805, chuông
// đồng 1,7 m), kiến thức lịch sử phổ thông (Quang Trung, bãi tắm Hoàng Hậu: Nam Phương Hoàng hậu). Các điểm chưa có nguồn rõ đã được viết lại theo lối "tương truyền" hoặc bỏ.
import { LANDMARKS, siteToWorld } from './world/landmark-sites.js';
import { toWorld } from './world/site.js';

const site = (id) => LANDMARKS.find((l) => l.id === id);
const at = (id, lx, lz) => siteToWorld(site(id), lx, lz);
// góc máy đẹp cho ảnh lưu niệm: vị trí camera và điểm nhìn (toạ độ local, độ cao tính từ mặt đất)
// góc máy theo toạ độ thế giới: [x, độ cao, z]
const shotW = (cam, look) => ({ cam: [cam[0], cam[2], cam[1]], look: [look[0], look[2], look[1]] });
const shotAt = (id, cam, look) => {
  const w = id ? (x, z) => at(id, x, z) : (x, z) => toWorld(x, z);
  return { cam: [...w(cam[0], cam[2]), cam[1]], look: [...w(look[0], look[2]), look[1]] };
};

export const QUESTS = [
  {
    id: 'monument', title: 'Tượng đài bên biển', place: 'Quảng trường Nguyễn Tất Thành', piece: 'Tượng đài bên biển',
    center: [0, 0], pillar: toWorld(-9, 17), photoRadius: 60,
    shot: shotAt(null, [9, 6, 30], [0, 7.5, -2]),
    story: [
      'Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành khánh thành ngày 18-5-2017 tại Quảng trường Nguyễn Tất Thành, hướng ra biển. Tượng đồng cao 10,8 m trên bệ cao 4,7 m; phía sau là bức phù điêu đá xanh hình cánh cung dài 76 m.',
      'Ông Nguyễn Sinh Sắc là thân phụ của Chủ tịch Hồ Chí Minh; Nguyễn Tất Thành là tên của Bác thời trẻ.',
      'Khoảng năm 1909–1910, ông Nguyễn Sinh Sắc làm tri huyện Bình Khê (vùng Tây Sơn ngày nay) và người con Nguyễn Tất Thành đã vào thăm cha, trước khi tiếp tục hành trình vào phía Nam.',
    ],
    quiz: [
      { q: 'Nguyễn Tất Thành là tên thời trẻ của ai?', a: ['Chủ tịch Hồ Chí Minh', 'Vua Quang Trung', 'Nhà thơ Xuân Diệu', 'Đào Duy Từ'], ok: 0 },
      { q: 'Ông Nguyễn Sinh Sắc có quan hệ thế nào với Nguyễn Tất Thành?', a: ['Anh trai', 'Cha', 'Thầy giáo', 'Ông nội'], ok: 1 },
      { q: 'Ông Nguyễn Sinh Sắc từng làm tri huyện ở huyện nào của Bình Định xưa?', a: ['Hoài Nhơn', 'Phù Cát', 'Bình Khê', 'An Nhơn'], ok: 2 },
    ],
    details: [
      { id: 'plaque', pos: toWorld(0, 6), y: 1.0, r: 5, title: 'Tấm biển trên bệ tượng', text: 'Hai cha con đứng cạnh nhau trên bệ cao 4,7 m, cùng nhìn ra Biển Đông.' },
      { id: 'beach', pos: [224, 128], y: 0.1, r: 4, title: 'Bãi biển Quy Nhơn', text: 'Bãi biển cong hình vầng trăng chạy dọc trung tâm thành phố, ngay sát quảng trường.' },
      { id: 'plaza', pos: [140, 40], y: 0.1, r: 4, title: 'Quảng trường Trung tâm', text: 'Quảng trường rộng mở ra biển, là nơi tổ chức lễ hội và sự kiện lớn của thành phố.' },
    ],
  },
  {
    id: 'thapdoi', title: 'Dấu tích Chăm Pa', place: 'Tháp Đôi', piece: 'Tháp Đôi gạch đỏ',
    center: at('thapdoi', 0, 0), pillar: at('thapdoi', 0, 18), photoRadius: 45,
    shot: shotAt('thapdoi', [30, 6, 26], [0, 9, 0]),
    story: [
      'Tháp Đôi, còn gọi là tháp Hưng Thạnh, là cụm hai ngôi tháp Chăm Pa nằm cạnh nhau, xây khoảng thế kỷ XII–XIII, nay là di tích quốc gia giữa lòng Quy Nhơn.',
      'Tháp phía bắc lớn hơn, cao hơn và ít hư hại hơn tháp phía nam. Thân tháp hình khối vuông, mái thu nhỏ dần, nay cả hai đều đã mất chóp.',
      'Chân tháp Bắc là đài sen bằng đá; bốn góc diềm mái có bốn tượng thần điểu Garuda bằng đá. Kiến trúc tháp mang nhiều nét ảnh hưởng của đền Khmer thời Angkor.',
    ],
    quiz: [
      { q: 'Tháp Đôi là công trình của nền văn hoá nào?', a: ['Óc Eo', 'Chăm Pa', 'Đông Sơn', 'Sa Huỳnh'], ok: 1 },
      { q: 'Tháp Đôi còn có tên gọi khác là gì?', a: ['Tháp Hưng Thạnh', 'Tháp Bánh Ít', 'Tháp Dương Long', 'Tháp Bình Lâm'], ok: 0 },
      { q: 'Trong hai tháp, tháp nào cao và lớn hơn?', a: ['Tháp phía nam', 'Tháp phía bắc', 'Hai tháp cao bằng nhau', 'Tháp phía tây'], ok: 1 },
    ],
    details: [
      { id: 'door', pos: at('thapdoi', 6, 8.5), y: 0.6, r: 4.5, title: 'Cửa tháp Bắc', text: 'Cửa tháp Bắc chỉ còn khung cửa bằng những khối đá lớn.' },
      { id: 'garuda', pos: at('thapdoi', -6.2, -6), y: 0.6, r: 4.5, title: 'Thần điểu Garuda', text: 'Bốn góc diềm mái tháp Bắc từng có bốn tượng Garuda bằng đá, tay giơ cao như đỡ lấy mái tháp.' },
    ],
  },
  {
    id: 'cathedral', title: 'Ngọn tháp nhọn', place: 'Nhà thờ Chính tòa Quy Nhơn', piece: 'Nhà thờ Nhọn',
    center: at('cathedral', 0, 20), pillar: at('cathedral', 6, 44), photoRadius: 70,
    shot: shotAt('cathedral', [-10, 4, 80], [0, 19, 28]),
    story: [
      'Nhà thờ Chính tòa Quy Nhơn nằm trên đường Trần Hưng Đạo, là nhà thờ chính của giáo phận Quy Nhơn, kính Đức Mẹ Lên Trời.',
      'Nhà thờ khởi công năm 1938, khánh thành năm 1939; tháp chuông nhọn cao khoảng 47 m nên người dân quen gọi là "Nhà thờ Nhọn".',
      'Công trình mang phong cách châu Âu: tháp chuông nhiều tầng thu nhỏ dần, có đồng hồ bốn mặt (lắp năm 1992) và trên đỉnh là cây thánh giá bằng đồng.',
    ],
    quiz: [
      { q: 'Vì sao người dân gọi đây là "Nhà thờ Nhọn"?', a: ['Vì mái nhà thờ rất dốc', 'Vì tháp chuông nhọn cao vút', 'Vì nằm trên mũi đất nhọn', 'Vì cổng có hình mũi tên'], ok: 1 },
      { q: 'Tháp chuông của nhà thờ cao khoảng bao nhiêu?', a: ['Khoảng 15 m', 'Khoảng 25 m', 'Khoảng 47 m', 'Khoảng 100 m'], ok: 2 },
      { q: 'Nhà thờ Chính tòa Quy Nhơn nằm trên đường nào?', a: ['Trần Hưng Đạo', 'Xuân Diệu', 'An Dương Vương', 'Nguyễn Huệ'], ok: 0 },
    ],
    details: [
      { id: 'clock', pos: at('cathedral', 0, 34), y: 0.4, r: 5, title: 'Đồng hồ trên tháp chuông', text: 'Đồng hồ bốn mặt được lắp lên tháp chuông năm 1992.' },
      { id: 'gate', pos: at('cathedral', 0, 64), y: 0.4, r: 5, title: 'Cổng nhà thờ', text: 'Cổng nhà thờ mở ra đường Trần Hưng Đạo, phía trong là khoảng sân rộng.' },
    ],
  },
  {
    id: 'market', title: 'Hương vị Bình Định', place: 'Chợ Lớn Quy Nhơn', piece: 'Phiên chợ Lớn',
    center: at('market', 0, 0), pillar: at('market', -12, 26), photoRadius: 50,
    shot: shotAt('market', [10, 15, 62], [2, 3, 2]),
    story: [
      'Chợ Lớn nằm trên đường Tăng Bạt Hổ, ở trung tâm Quy Nhơn; khu chợ mới được xây lại thay cho chợ Lớn cũ. Quanh nhà lồng chợ là các sạp hàng mái bạt bán quần áo, tạp hoá, thực phẩm.',
      'Đây là nơi người dân và du khách tìm mua hải sản tươi, cá khô, bánh tráng và nhiều đặc sản của đất Bình Định.',
      'Ẩm thực Bình Định nổi tiếng với bánh hỏi cháo lòng, bánh xèo tôm nhảy, nem chợ Huyện và tré.',
    ],
    quiz: [
      { q: 'Chợ Lớn nằm trên con đường nào?', a: ['Tăng Bạt Hổ', 'Lê Duẩn', 'Ngô Mây', 'Hàn Mặc Tử'], ok: 0 },
      { q: 'Món nào là đặc sản nổi tiếng của Bình Định?', a: ['Phở cuốn', 'Bánh hỏi cháo lòng', 'Bún bò Huế', 'Cao lầu'], ok: 1 },
      { q: '"Nem chợ Huyện" là đặc sản của vùng đất nào?', a: ['Quảng Nam', 'Bình Định', 'Khánh Hoà', 'Phú Yên'], ok: 1 },
    ],
    details: [
      { id: 'stalls', pos: at('market', 10, 27), y: 0.3, r: 4.5, title: 'Sạp hàng mái bạt', text: 'Những dãy sạp mái bạt nhiều màu bao quanh nhà lồng chợ, bày bán đủ thứ hàng.' },
      { id: 'sign', pos: at('market', 0, 22), y: 0.3, r: 4.5, title: 'Biển chợ', text: 'Biển tên chợ đặt ở mặt tiền nhà lồng chợ.' },
    ],
  },
  {
    id: 'longkhanh', title: 'Tiếng chuông cổ tự', place: 'Chùa Long Khánh', piece: 'Chuông chùa Long Khánh',
    center: at('longkhanh', 0, 0), pillar: at('longkhanh', 6, 30), photoRadius: 60,
    shot: shotAt('longkhanh', [5, 7, 4], [-2, 5, -30]),
    story: [
      'Chùa Long Khánh nằm trên đường Trần Cao Vân, là một trong những ngôi chùa cổ và lớn nhất Quy Nhơn, do Thiền sư Tích Thọ khai sơn vào thế kỷ XVIII.',
      'Chùa còn lưu giữ quả chuông đồng cao khoảng 1,7 m, nặng hơn 700 kg, đúc năm 1805 dưới triều vua Gia Long; minh văn trên chuông ghi lại lịch sử ngôi chùa.',
      'Chánh điện được bố trí theo hình chữ "khẩu" (口) với Thượng điện và Hậu điện; trong khuôn viên có lầu chuông và tượng Phật A Di Đà cao 17 m trên đài sen.',
    ],
    quiz: [
      { q: 'Vị thiền sư nào khai sơn chùa Long Khánh?', a: ['Thiền sư Tích Thọ', 'Thiền sư Liễu Quán', 'Thiền sư Nguyên Thiều', 'Thiền sư Vạn Hạnh'], ok: 0 },
      { q: 'Quả chuông đồng cổ của chùa được đúc vào năm nào?', a: ['1805', '1945', '1702', '1975'], ok: 0 },
      { q: 'Chánh điện chùa Long Khánh được bố trí theo hình chữ gì?', a: ['Chữ Đinh (丁)', 'Chữ Khẩu (口)', 'Chữ Nhất (一)', 'Chữ Môn (門)'], ok: 1 },
    ],
    details: [
      { id: 'gate', pos: at('longkhanh', 0, 50), y: 0.3, r: 5, title: 'Cổng tam quan', text: 'Cổng bốn trụ, đỉnh mỗi trụ là một ngọn tháp nhỏ nhiều tầng; giữa cổng là biển tên và bánh xe pháp luân.' },
      { id: 'bell', pos: at('longkhanh', -12, 13), y: 0.3, r: 5, title: 'Lầu chuông', text: 'Lầu chuông hai tầng mái, chân xây đá, nơi treo quả chuông đồng cổ.' },
    ],
  },
  {
    id: 'quangtrung', title: 'Người anh hùng áo vải', place: 'Tượng đài Quang Trung', piece: 'Vó ngựa Tây Sơn',
    center: at('quangtrung', 0, 0), pillar: at('quangtrung', 0, 30), photoRadius: 45,
    shot: shotAt('quangtrung', [11, 4.5, 23], [0, 8.5, 0]),
    story: [
      'Giữa vòng xoay Lê Hồng Phong – Trần Hưng Đạo là tượng đồng vua Quang Trung cưỡi ngựa, tay cầm gươm, cao 5 m, nặng 13 tấn, khánh thành năm 2008.',
      'Quang Trung – Nguyễn Huệ là người con của đất Tây Sơn, Bình Định (nay thuộc tỉnh Gia Lai). Cùng anh em nhà Tây Sơn, ông dựng cờ khởi nghĩa và lên ngôi hoàng đế năm 1788.',
      'Mùa xuân năm Kỷ Dậu 1789, ông chỉ huy đại phá quân Thanh ở Ngọc Hồi – Đống Đa, một trong những chiến công lừng lẫy nhất lịch sử Việt Nam.',
    ],
    quiz: [
      { q: 'Vua Quang Trung có tên thật là gì?', a: ['Nguyễn Nhạc', 'Nguyễn Huệ', 'Nguyễn Lữ', 'Nguyễn Ánh'], ok: 1 },
      { q: 'Phong trào Tây Sơn khởi nghĩa từ vùng đất nào?', a: ['Thanh Hoá', 'Nghệ An', 'Bình Định', 'Quảng Nam'], ok: 2 },
      { q: 'Chiến thắng Ngọc Hồi – Đống Đa năm 1789 đánh bại đội quân nào?', a: ['Quân Thanh', 'Quân Xiêm', 'Quân Nguyên', 'Quân Minh'], ok: 0 },
    ],
    details: [
      { id: 'fountain', pos: at('quangtrung', 0, 13.5), y: 0.3, r: 4.5, title: 'Vòng phun nước', text: 'Quanh bệ tượng là vòng vòi phun nước, buổi tối được thắp sáng.' },
      { id: 'sword', pos: at('quangtrung', 0, -14), y: 0.3, r: 4.5, title: 'Thanh gươm', text: 'Nhà vua ngồi trên lưng ngựa chiến, tay cầm thanh gươm; bệ tượng chạm phù điêu.' },
    ],
  },
  {
    id: 'hanmactu', title: 'Đồi Thi Nhân', place: 'Mộ Hàn Mặc Tử', piece: 'Đồi Thi Nhân',
    center: at('hanmactu', 0, 0), pillar: at('hanmactu', -8, 6), photoRadius: 35,
    shot: shotAt('hanmactu', [7, 3.5, 13], [0, 1.6, 0]),
    story: [
      'Nhà thơ Hàn Mặc Tử (tên thật Nguyễn Trọng Trí, 1912–1940) là một gương mặt tiêu biểu của phong trào Thơ mới, tác giả bài thơ nổi tiếng "Đây thôn Vĩ Dạ".',
      'Mộ của ông nằm trên đồi Thi Nhân thuộc khu du lịch Ghềnh Ráng – Tiên Sa, nhìn ra biển Quy Nhơn. Ngôi mộ thiết kế giản dị, mang biểu tượng Công giáo vì nhà thơ theo đạo.',
      'Con đường quanh co dẫn lên đồi mang tên dốc Mộng Cầm, gợi nhớ người con gái gắn với những vần thơ của ông.',
    ],
    quiz: [
      { q: 'Tên thật của nhà thơ Hàn Mặc Tử là gì?', a: ['Nguyễn Trọng Trí', 'Nguyễn Văn Thành', 'Trần Đăng Khoa', 'Phan Văn Trị'], ok: 0 },
      { q: 'Bài thơ nào dưới đây là của Hàn Mặc Tử?', a: ['Tây Tiến', 'Đây thôn Vĩ Dạ', 'Nhớ rừng', 'Tràng giang'], ok: 1 },
      { q: 'Con dốc dẫn lên đồi Thi Nhân mang tên gì?', a: ['Dốc Mộng Cầm', 'Dốc Hoàng Cúc', 'Dốc Mai Đình', 'Dốc Thương Thương'], ok: 0 },
    ],
    details: [
      { id: 'stele', pos: at('hanmactu', 0, 3), y: 0.6, r: 4, title: 'Mộ thi sĩ', text: 'Mộ được dời về đồi Thi Nhân năm 1959; trước mộ dựng cây thánh giá.' },
      { id: 'view', pos: at('hanmactu', 0, 13), y: 0.3, r: 4, title: 'Nhìn ra biển', text: 'Từ đồi Thi Nhân có thể nhìn bao quát Ghềnh Ráng và biển Quy Nhơn.' },
    ],
  },
  {
    id: 'hoanghau', title: 'Bãi đá trứng', place: 'Bãi tắm Hoàng Hậu', piece: 'Bãi đá Hoàng Hậu',
    center: at('hoanghau', 0, 0), pillar: at('hoanghau', 4, -24), photoRadius: 50,
    shot: shotAt('hoanghau', [26, 9, 30], [-2, 2, 2]),
    story: [
      'Bãi tắm Hoàng Hậu là một vịnh nhỏ dưới chân đồi trong khu du lịch Ghềnh Ráng – Tiên Sa, phía nam trung tâm Quy Nhơn, chỉ cách mộ Hàn Mặc Tử vài trăm mét.',
      'Tương truyền vào thập niên 1930–1940, Nam Phương Hoàng hậu, vợ vua Bảo Đại, thường đến đây tắm biển, nên bãi được gọi là Bãi tắm Hoàng Hậu.',
      'Nét đặc biệt của bãi là những viên đá tròn nhẵn nhiều màu, nằm chồng lên nhau như những quả trứng, được sóng biển mài giũa qua rất nhiều năm.',
    ],
    quiz: [
      { q: 'Theo tương truyền, bãi tắm gắn với vị hoàng hậu nào?', a: ['Từ Dũ', 'Nam Phương', 'Lệ Thiên', 'Thánh Thiên'], ok: 1 },
      { q: 'Đá ở bãi tắm Hoàng Hậu nổi tiếng với hình dáng gì?', a: ['Nhọn như mũi giáo', 'Phẳng như mặt bàn', 'Tròn nhẵn như quả trứng', 'Xếp thành cột lục giác'], ok: 2 },
      { q: 'Bãi tắm Hoàng Hậu nằm trong khu du lịch nào?', a: ['Kỳ Co – Eo Gió', 'Ghềnh Ráng – Tiên Sa', 'Hầm Hô', 'Cù Lao Xanh'], ok: 1 },
    ],
    details: [
      { id: 'pebbles', pos: at('hoanghau', 2, 3), y: 0.3, r: 5, title: 'Bãi đá trứng', text: 'Hàng nghìn viên đá tròn nhẵn đủ màu xám, nâu, trắng phủ kín mép nước.' },
      { id: 'egg', pos: at('hoanghau', -6, 1), y: 0.3, r: 4.5, title: 'Hòn đá chênh vênh', text: 'Một tảng đá tròn lớn đứng chênh vênh trên tảng đá bẹt, như quả trứng khổng lồ.' },
    ],
  },
  {
    id: 'museum', title: 'Kho báu Chăm Pa', place: 'Bảo tàng Tổng hợp', piece: 'Sư tử đá Chăm Pa',
    center: at('museum', 0, 6), pillar: at('museum', -6, 26), photoRadius: 45,
    shot: shotAt('museum', [14, 4, 40], [0, 4, 0]),
    story: [
      'Bảo tàng nằm ở số 26 Nguyễn Huệ, Quy Nhơn. Tiền thân là Bảo tàng Nghĩa Bình, thành lập năm 1980 và mở cửa đón khách từ đầu năm 1981; sau này mang tên Bảo tàng tổng hợp Bình Định, nay là Bảo tàng Tổng hợp Gia Lai.',
      'Toà nhà vốn là một trung tâm văn hoá được xây năm 1969, mang dáng kiến trúc của thời kỳ đó với mái đua bê tông rộng che lối vào.',
      'Bảo tàng lưu giữ nhiều hiện vật Chăm Pa quý; nhiều hiện vật đã được công nhận là bảo vật quốc gia, như phù điêu Garuda, tượng thần Brahma, nữ thần Sarasvati và đôi sư tử đá thành Đồ Bàn.',
    ],
    quiz: [
      { q: 'Bảo tàng nằm trên con đường nào?', a: ['Nguyễn Huệ', 'Trần Hưng Đạo', 'Lê Lợi', 'Xuân Diệu'], ok: 0 },
      { q: 'Đôi sư tử đá – bảo vật quốc gia ở bảo tàng – có nguồn gốc từ đâu?', a: ['Thành Đồ Bàn', 'Hoàng thành Thăng Long', 'Thánh địa Mỹ Sơn', 'Óc Eo'], ok: 0 },
      { q: 'Nhiều bảo vật quốc gia ở đây thuộc nền văn hoá nào?', a: ['Chăm Pa', 'Đông Sơn', 'Óc Eo', 'Sa Huỳnh'], ok: 0 },
    ],
    details: [
      { id: 'lions', pos: at('museum', 0, 17), y: 0.3, r: 5, title: 'Tượng đá trong sân', text: 'Sân trước bày nhiều tượng đá Chăm Pa: sư tử, đầu thuỷ quái makara, trụ đá và bia chạm hình thần.' },
      { id: 'entrance', pos: at('museum', 0, 10), y: 0.3, r: 4.5, title: 'Mái đua lối vào', text: 'Mái bê tông vươn rộng trên những cột mảnh che lối vào, nét kiến trúc đặc trưng của những năm 1960.' },
    ],
  },
  {
    // cầu Thị Nại theo OSM (way 292021136): từ (806, -5441) tới (3561, -5966), dài ~2,8 km
    id: 'thinai', title: 'Cầu vượt đầm', place: 'Cầu Thị Nại', piece: 'Cầu Thị Nại',
    center: [2181, -5706], pillar: [767, -5433], photoRadius: 320,
    shot: shotW([2010, 26, -5470], [2330, 12, -5760]),
    story: [
      'Cầu Thị Nại vượt qua đầm Thị Nại, nối Quy Nhơn với bán đảo Phương Mai và khu kinh tế Nhơn Hội.',
      'Cầu khởi công ngày 3-11-2002 và thông xe ngày 12-12-2006. Phần cầu chính dài khoảng 2,5 km; tính cả đường dẫn, cả tuyến dài gần 7 km.',
      'Khi hoàn thành, đây là cây cầu vượt biển dài nhất Việt Nam, cho tới khi cầu Tân Vũ – Lạch Huyện ở Hải Phòng thông xe năm 2017.',
    ],
    quiz: [
      { q: 'Cầu Thị Nại bắc qua vùng nước nào?', a: ['Đầm Thị Nại', 'Vịnh Hạ Long', 'Sông Hàn', 'Đầm Ô Loan'], ok: 0 },
      { q: 'Cầu Thị Nại được thông xe vào năm nào?', a: ['1996', '2006', '2016', '2020'], ok: 1 },
      { q: 'Cầu nối Quy Nhơn với bán đảo nào?', a: ['Sơn Trà', 'Phương Mai', 'Cà Mau', 'Hòn Gốm'], ok: 1 },
    ],
    details: [
      { id: 'top', pos: [2181, -5706], y: 0.3, r: 9, title: 'Đoạn cao nhất của cầu', text: 'Từ giữa cầu nhìn bao quát đầm Thị Nại, thành phố Quy Nhơn và dãy núi Phương Mai.' },
      { id: 'east', pos: [3520, -5958], y: 0.3, r: 9, title: 'Đầu cầu Phương Mai', text: 'Đầu cầu phía đông dẫn vào bán đảo Phương Mai và khu kinh tế Nhơn Hội.' },
    ],
  },
  {
    // khu riêng Kỳ Co (zones-config.js): bãi cát theo OSM 13.85012, 109.29233
    id: 'kyco', zone: 'kyco', title: 'Biển xanh Nhơn Lý', place: 'Kỳ Co', piece: 'Bãi cát Kỳ Co',
    center: [7760, -9720], pillar: [7745, -9700], photoRadius: 220,
    shot: shotW([7835, 16, -9800], [7745, 3, -9690]),
    story: [
      'Kỳ Co thuộc xã Nhơn Lý cũ (nay thuộc phường Quy Nhơn Đông), cách trung tâm Quy Nhơn khoảng 25 km đường bộ về phía đông bắc.',
      'Bãi biển cát trắng nằm giữa hai mỏm núi, nước trong xanh, có rạn san hô, nên thường được ví là "Maldives của Việt Nam".',
      'Du khách thường đi ca nô khoảng 15 phút từ Nhơn Lý hoặc Eo Gió để tới đây; mùa đẹp nhất là từ tháng 4 tới tháng 9.',
    ],
    quiz: [
      { q: 'Kỳ Co thường được ví là gì?', a: ['"Maldives của Việt Nam"', '"Sa Pa thu nhỏ"', '"Vịnh Hạ Long trên cạn"', '"Đà Lạt thứ hai"'], ok: 0 },
      { q: 'Du khách thường đến Kỳ Co bằng phương tiện gì từ Nhơn Lý?', a: ['Cáp treo', 'Ca nô', 'Tàu hoả', 'Khinh khí cầu'], ok: 1 },
      { q: 'Mùa đẹp nhất để tắm biển Kỳ Co là khoảng thời gian nào?', a: ['Tháng 11 – tháng 1', 'Tháng 4 – tháng 9', 'Tháng 10 – tháng 12', 'Quanh năm đều có bão'], ok: 1 },
    ],
    details: [
      { id: 'pier', pos: [7752, -9722], y: 0.3, r: 8, title: 'Cầu cảng gỗ', text: 'Cầu cảng gỗ vươn ra biển giữa bãi, nơi ca nô đưa đón khách cập bến.' },
      { id: 'south', pos: [7795, -9560], y: 0.3, r: 8, title: 'Mỏm đá phía nam', text: 'Hai đầu bãi là những mỏm đá granite, nước ở đây xanh trong, nhìn thấy cả san hô.' },
    ],
  },
  {
    // khu riêng Eo Gió: sống đá hẹp theo ảnh vệ tinh, điểm OSM 13.88486–13.89088, 109.292
    id: 'eogio', zone: 'eogio', title: 'Nơi ngắm hoàng hôn', place: 'Eo Gió', piece: 'Hoàng hôn Eo Gió',
    center: [7650, -13800], pillar: [7640, -13700], photoRadius: 220,
    shot: shotW([7480, 40, -13980], [7650, 25, -13820]),
    story: [
      'Eo Gió ở Nhơn Lý, cách trung tâm Quy Nhơn hơn 20 km, là một eo biển nhỏ nằm giữa hai dãy núi đá, có lối đi bộ men theo sườn núi nhìn xuống biển.',
      'Nơi đây thường được nhắc tới như một trong những điểm ngắm hoàng hôn đẹp nhất Việt Nam.',
      'Eo Gió chỉ cách Kỳ Co khoảng 2 km; từ đây có thuyền đưa khách sang Kỳ Co.',
    ],
    quiz: [
      { q: 'Eo Gió nổi tiếng là nơi ngắm cảnh gì đẹp?', a: ['Hoàng hôn', 'Tuyết rơi', 'Ruộng bậc thang', 'Thác nước'], ok: 0 },
      { q: 'Eo Gió nằm ở đâu?', a: ['Nhơn Lý', 'Ghềnh Ráng', 'Tháp Đôi', 'Cù Lao Xanh'], ok: 0 },
      { q: 'Eo Gió cách bãi Kỳ Co khoảng bao xa?', a: ['Khoảng 2 km', 'Khoảng 50 km', 'Khoảng 200 m', 'Khoảng 100 km'], ok: 0 },
    ],
    details: [
      { id: 'view', pos: [7654, -13830], y: 0.6, r: 6, title: 'Đài ngắm cảnh', text: 'Từ sống đá nhìn một bên là vịnh lặng có thuyền thúng neo, một bên là biển khơi sóng vỗ.' },
      { id: 'bay', pos: [7605, -13950], y: 0.3, r: 7, title: 'Vịnh làng chài', text: 'Vịnh phía tây kín gió là nơi thuyền thúng, thuyền gỗ của làng chài Nhơn Lý neo đậu.' },
    ],
  },
];

// Điểm dịch chuyển nhanh trên bản đồ lớn (toạ độ thế giới, mét)
export const PLACES = [
  { id: 'monument', name: 'Tượng đài & Quảng trường', pos: toWorld(0, 26), icon: '🗽' },
  { id: 'beach', name: 'Bãi biển Xuân Diệu', pos: [455, -145], icon: '🏖️', label: 'right' },
  { id: 'highlands', name: 'Highlands Nguyễn Huệ', pos: [200, -124], icon: '☕', label: 'up' },
  { id: 'market', name: 'Chợ Lớn', pos: at('market', -12, 30), icon: '🛒' },
  { id: 'station', name: 'Ga Quy Nhơn', pos: at('station', 0, 16), icon: '🚉' },
  { id: 'cathedral', name: 'Nhà thờ Nhọn', pos: at('cathedral', 6, 50), icon: '⛪' },
  { id: 'thapdoi', name: 'Tháp Đôi', pos: at('thapdoi', 0, 22), icon: '🛕' },
  { id: 'longkhanh', name: 'Chùa Long Khánh', pos: at('longkhanh', 0, 40), icon: '🔔' },
  { id: 'quangtrung', name: 'Tượng Quang Trung', pos: at('quangtrung', 0, 30), icon: '🐎', label: 'right' },
  { id: 'museum', name: 'Bảo tàng Tổng hợp', pos: at('museum', -6, 30), icon: '🏛️' },
  { id: 'thinai', name: 'Cầu Thị Nại', pos: [767, -5433], icon: '🌉', label: 'right' },
  { id: 'kyco', zone: 'kyco', name: 'Kỳ Co', pos: [7730, -9690], icon: '🏝️' },
  { id: 'eogio', zone: 'eogio', name: 'Eo Gió', pos: [7630, -13690], icon: '🌅' },
  { id: 'hoanghau', name: 'Bãi tắm Hoàng Hậu', pos: at('hoanghau', 4, -20), icon: '🪨', label: 'right' },
  { id: 'hanmactu', name: 'Mộ Hàn Mặc Tử', pos: at('hanmactu', -8, 9), icon: '✒️' },
];
