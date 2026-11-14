// Nội dung nhiệm vụ cho từng địa điểm. Mỗi địa điểm: cột sáng (mở câu chuyện + câu hỏi),
// các chi tiết cần tìm (điểm sáng xanh), chụp ảnh gần công trình; xong cả ba thì nhận một mảnh ghép.
// Vị trí dùng toạ độ local của công trình (xem landmark-sites.js): lx sang phải, lz về phía trước.
// Nguồn: Wikipedia tiếng Việt (Tháp Đôi), VnExpress (Nhà thờ Chính tòa, tháp 42,7 m), báo Nhân Dân,
// Tuổi Trẻ, VTC (tượng đài), Mia.vn (đồi Thi Nhân, dốc Mộng Cầm; chùa Long Khánh: sắc phong 1805, chuông
// đồng 1,7 m), kiến thức lịch sử phổ thông (Quang Trung, bãi tắm Hoàng Hậu: Nam Phương Hoàng hậu). CẦN KIỂM CHỨNG LẠI TRƯỚC KHI RA MẮT.
import { LANDMARKS, siteToWorld } from './world/landmark-sites.js';
import { toWorld } from './world/site.js';

const site = (id) => LANDMARKS.find((l) => l.id === id);
const at = (id, lx, lz) => siteToWorld(site(id), lx, lz);
// góc máy đẹp cho ảnh lưu niệm: vị trí camera và điểm nhìn (toạ độ local, độ cao tính từ mặt đất)
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
      { id: 'plaque', pos: toWorld(0, 6), y: 1.0, r: 5, title: 'Tấm biển trên bệ tượng', text: 'Bệ tượng khắc tên hai cha con: Nguyễn Sinh Sắc và Nguyễn Tất Thành.' },
      { id: 'beach', pos: [224, 128], y: 0.1, r: 4, title: 'Bãi biển Quy Nhơn', text: 'Bãi biển cong hình vầng trăng chạy dọc trung tâm thành phố, ngay sát quảng trường.' },
      { id: 'plaza', pos: [140, 40], y: 0.1, r: 4, title: 'Quảng trường Trung tâm', text: 'Quảng trường rộng mở ra biển, là nơi tổ chức lễ hội và sự kiện lớn của thành phố.' },
    ],
  },
  {
    id: 'thapdoi', title: 'Dấu tích Chăm Pa', place: 'Tháp Đôi', piece: 'Tháp Đôi gạch đỏ',
    center: at('thapdoi', 0, 0), pillar: at('thapdoi', 0, 18), photoRadius: 45,
    shot: shotAt('thapdoi', [30, 6, 26], [0, 9, 0]),
    story: [
      'Tháp Đôi, còn gọi là tháp Hưng Thạnh, là cụm hai ngôi tháp Chăm Pa nằm cạnh nhau giữa lòng thành phố Quy Nhơn.',
      'Tháp phía bắc lớn hơn, cao hơn và ít hư hại hơn tháp phía nam. Thân tháp hình khối vuông, mái thu nhỏ dần, nay cả hai đều đã mất chóp.',
      'Chân tháp Bắc là đài sen bằng đá; bốn góc diềm mái có bốn tượng thần điểu Garuda bằng đá. Kiến trúc tháp mang nhiều nét ảnh hưởng của đền Khmer thời Angkor.',
    ],
    quiz: [
      { q: 'Tháp Đôi là công trình của nền văn hoá nào?', a: ['Óc Eo', 'Chăm Pa', 'Đông Sơn', 'Sa Huỳnh'], ok: 1 },
      { q: 'Tháp Đôi còn có tên gọi khác là gì?', a: ['Tháp Hưng Thạnh', 'Tháp Bánh Ít', 'Tháp Dương Long', 'Tháp Bình Lâm'], ok: 0 },
      { q: 'Trong hai tháp, tháp nào cao và lớn hơn?', a: ['Tháp phía nam', 'Tháp phía bắc', 'Hai tháp cao bằng nhau', 'Tháp phía tây'], ok: 1 },
    ],
    details: [
      { id: 'door', pos: at('thapdoi', 6, 8.5), y: 0.6, r: 4.5, title: 'Cửa chính tháp Bắc', text: 'Cửa chính của tháp Bắc mở ra phía đông, có bậc thềm đá.' },
      { id: 'garuda', pos: at('thapdoi', -6.2, -6), y: 0.6, r: 4.5, title: 'Thần điểu Garuda', text: 'Bốn góc diềm mái tháp Bắc từng có bốn tượng Garuda bằng đá, tay giơ cao như đỡ lấy mái tháp.' },
    ],
  },
  {
    id: 'cathedral', title: 'Ngọn tháp nhọn', place: 'Nhà thờ Chính tòa Quy Nhơn', piece: 'Nhà thờ Nhọn',
    center: at('cathedral', 0, 20), pillar: at('cathedral', 6, 44), photoRadius: 70,
    shot: shotAt('cathedral', [-10, 4, 80], [0, 19, 28]),
    story: [
      'Nhà thờ Chính tòa Quy Nhơn nằm trên đường Trần Hưng Đạo, là nhà thờ chính của giáo phận Quy Nhơn, kính Đức Mẹ Lên Trời.',
      'Nhà thờ có một tháp chuông nhọn cao 42,7 m nên người dân quen gọi là "Nhà thờ Nhọn".',
      'Công trình mang dáng dấp kiến trúc Gothic: tháp chuông nhiều tầng thu nhỏ dần, có mặt đồng hồ và chóp nhọn vươn cao.',
    ],
    quiz: [
      { q: 'Vì sao người dân gọi đây là "Nhà thờ Nhọn"?', a: ['Vì mái nhà thờ rất dốc', 'Vì tháp chuông nhọn cao vút', 'Vì nằm trên mũi đất nhọn', 'Vì cổng có hình mũi tên'], ok: 1 },
      { q: 'Tháp chuông của nhà thờ cao khoảng bao nhiêu?', a: ['22,5 m', '42,7 m', '65 m', '15 m'], ok: 1 },
      { q: 'Nhà thờ Chính tòa Quy Nhơn nằm trên đường nào?', a: ['Trần Hưng Đạo', 'Xuân Diệu', 'An Dương Vương', 'Nguyễn Huệ'], ok: 0 },
    ],
    details: [
      { id: 'clock', pos: at('cathedral', 0, 34), y: 0.4, r: 5, title: 'Đồng hồ trên tháp chuông', text: 'Tháp chuông có đồng hồ bốn mặt, phía trên là tầng đèn lồng và chóp nhọn màu cam đỏ.' },
      { id: 'gate', pos: at('cathedral', 0, 64), y: 0.4, r: 5, title: 'Cổng nhà thờ', text: 'Cổng và hàng rào trụ đá mở ra đường Trần Hưng Đạo; sân trước rộng, lát đá.' },
    ],
  },
  {
    id: 'market', title: 'Hương vị Bình Định', place: 'Chợ Lớn Quy Nhơn', piece: 'Phiên chợ Lớn',
    center: at('market', 0, 0), pillar: at('market', -12, 26), photoRadius: 50,
    shot: shotAt('market', [-9, 6, 44], [0, 5, 0]),
    story: [
      'Chợ Lớn nằm ở trung tâm thành phố, mặt trước quay ra đường Tăng Bạt Hổ. Quanh nhà lồng chợ là các sạp hàng mái bạt bán quần áo, tạp hoá, thực phẩm.',
      'Đây là nơi người dân và du khách tìm mua hải sản tươi, cá khô, bánh tráng và nhiều đặc sản của đất Bình Định.',
      'Ẩm thực Bình Định nổi tiếng với bánh hỏi cháo lòng, bánh xèo tôm nhảy, nem chợ Huyện và tré.',
    ],
    quiz: [
      { q: 'Mặt trước Chợ Lớn quay ra con đường nào?', a: ['Tăng Bạt Hổ', 'Lê Duẩn', 'Ngô Mây', 'Hàn Mặc Tử'], ok: 0 },
      { q: 'Món nào là đặc sản nổi tiếng của Bình Định?', a: ['Phở cuốn', 'Bánh hỏi cháo lòng', 'Bún bò Huế', 'Cao lầu'], ok: 1 },
      { q: '"Nem chợ Huyện" là đặc sản của vùng đất nào?', a: ['Quảng Nam', 'Bình Định', 'Khánh Hoà', 'Phú Yên'], ok: 1 },
    ],
    details: [
      { id: 'stalls', pos: at('market', 10, 27), y: 0.3, r: 4.5, title: 'Sạp hàng mái bạt', text: 'Những dãy sạp mái bạt nhiều màu bao quanh nhà lồng chợ, bày bán đủ thứ hàng.' },
      { id: 'sign', pos: at('market', 0, 22), y: 0.3, r: 4.5, title: 'Biển chợ', text: 'Biển tên chợ ở mặt tiền nhà lồng, nhìn ra đường Tăng Bạt Hổ.' },
    ],
  },
  {
    id: 'longkhanh', title: 'Tiếng chuông cổ tự', place: 'Chùa Long Khánh', piece: 'Chuông chùa Long Khánh',
    center: at('longkhanh', 0, 0), pillar: at('longkhanh', 6, 30), photoRadius: 60,
    shot: shotAt('longkhanh', [8, 6, -4], [-3, 5, -34]),
    story: [
      'Chùa Long Khánh nằm trên đường Trần Cao Vân, là một trong những ngôi chùa cổ và lớn nhất Quy Nhơn, có lịch sử hơn 200 năm.',
      'Năm 1805, chùa được vua Gia Long sắc phong là "Sắc tứ Long Khánh tự". Chùa còn lưu giữ một quả chuông đồng cao khoảng 1,7 m, nặng hơn 700 kg, đúc cùng năm đó.',
      'Chánh điện được bố trí theo hình chữ "khẩu" (口) với Thượng điện và Hạ điện; trước sân là cổng tam quan và lầu chuông.',
    ],
    quiz: [
      { q: 'Vị vua nào đã sắc phong chùa là "Sắc tứ Long Khánh tự"?', a: ['Minh Mạng', 'Gia Long', 'Tự Đức', 'Quang Trung'], ok: 1 },
      { q: 'Quả chuông đồng cổ của chùa được đúc vào năm nào?', a: ['1805', '1945', '1702', '1975'], ok: 0 },
      { q: 'Chánh điện chùa Long Khánh được bố trí theo hình chữ gì?', a: ['Chữ Đinh (丁)', 'Chữ Khẩu (口)', 'Chữ Nhất (一)', 'Chữ Môn (門)'], ok: 1 },
    ],
    details: [
      { id: 'gate', pos: at('longkhanh', 0, 50), y: 0.3, r: 5, title: 'Cổng tam quan', text: 'Cổng ba lối với biển tên "Long Khánh" chữ vàng trên nền đỏ.' },
      { id: 'bell', pos: at('longkhanh', -12, 13), y: 0.3, r: 5, title: 'Lầu chuông', text: 'Lầu chuông hai tầng mái, chân xây đá, nơi treo quả chuông đồng cổ.' },
    ],
  },
  {
    id: 'quangtrung', title: 'Người anh hùng áo vải', place: 'Tượng đài Quang Trung', piece: 'Vó ngựa Tây Sơn',
    center: at('quangtrung', 0, 0), pillar: at('quangtrung', 0, 30), photoRadius: 45,
    shot: shotAt('quangtrung', [11, 4.5, 23], [0, 8.5, 0]),
    story: [
      'Giữa vòng xoay Lê Hồng Phong – Trần Hưng Đạo là tượng đài vua Quang Trung cưỡi ngựa chiến, tay giơ cao thanh gươm.',
      'Quang Trung – Nguyễn Huệ là người con của đất Tây Sơn, Bình Định. Cùng anh em nhà Tây Sơn, ông dựng cờ khởi nghĩa và lên ngôi hoàng đế năm 1788.',
      'Mùa xuân năm Kỷ Dậu 1789, ông chỉ huy đại phá quân Thanh ở Ngọc Hồi – Đống Đa, một trong những chiến công lừng lẫy nhất lịch sử Việt Nam.',
    ],
    quiz: [
      { q: 'Vua Quang Trung có tên thật là gì?', a: ['Nguyễn Nhạc', 'Nguyễn Huệ', 'Nguyễn Lữ', 'Nguyễn Ánh'], ok: 1 },
      { q: 'Phong trào Tây Sơn khởi nghĩa từ vùng đất nào?', a: ['Thanh Hoá', 'Nghệ An', 'Bình Định', 'Quảng Nam'], ok: 2 },
      { q: 'Chiến thắng Ngọc Hồi – Đống Đa năm 1789 đánh bại đội quân nào?', a: ['Quân Thanh', 'Quân Xiêm', 'Quân Nguyên', 'Quân Minh'], ok: 0 },
    ],
    details: [
      { id: 'fountain', pos: at('quangtrung', 0, 13.5), y: 0.3, r: 4.5, title: 'Vòng phun nước', text: 'Quanh bệ tượng là vòng vòi phun nước, buổi tối được thắp sáng.' },
      { id: 'sword', pos: at('quangtrung', 0, -14), y: 0.3, r: 4.5, title: 'Thanh gươm giơ cao', text: 'Nhà vua ngồi trên lưng ngựa chồm, tay phải giơ thanh gươm như đang ra trận.' },
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
      { id: 'stele', pos: at('hanmactu', 0, 3), y: 0.6, r: 4, title: 'Bia mộ thi sĩ', text: 'Bia đá trắng trên nền ba bậc, có hình thánh giá trên đỉnh.' },
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
      { q: 'Bãi tắm mang tên vị hoàng hậu nào?', a: ['Từ Dũ', 'Nam Phương', 'Lệ Thiên', 'Thánh Thiên'], ok: 1 },
      { q: 'Đá ở bãi tắm Hoàng Hậu nổi tiếng với hình dáng gì?', a: ['Nhọn như mũi giáo', 'Phẳng như mặt bàn', 'Tròn nhẵn như quả trứng', 'Xếp thành cột lục giác'], ok: 2 },
      { q: 'Bãi tắm Hoàng Hậu nằm trong khu du lịch nào?', a: ['Kỳ Co – Eo Gió', 'Ghềnh Ráng – Tiên Sa', 'Hầm Hô', 'Cù Lao Xanh'], ok: 1 },
    ],
    details: [
      { id: 'pebbles', pos: at('hoanghau', 2, 3), y: 0.3, r: 5, title: 'Bãi đá trứng', text: 'Hàng nghìn viên đá tròn nhẵn đủ màu xám, nâu, trắng phủ kín mép nước.' },
      { id: 'egg', pos: at('hoanghau', -6, 1), y: 0.3, r: 4.5, title: 'Hòn đá chênh vênh', text: 'Một tảng đá tròn lớn đứng chênh vênh trên tảng đá bẹt, như quả trứng khổng lồ.' },
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
  { id: 'hoanghau', name: 'Bãi tắm Hoàng Hậu', pos: at('hoanghau', 4, -20), icon: '🪨', label: 'right' },
  { id: 'hanmactu', name: 'Mộ Hàn Mặc Tử', pos: at('hanmactu', -8, 9), icon: '✒️' },
];
