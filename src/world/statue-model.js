// Nạp mô hình 3D thật của nhóm tượng (file .glb tạo bằng AI hoặc quét 3D) và đặt lên bệ.
// Không có file thì giữ nguyên tượng dựng bằng khối hình học.
//
// Cách dùng: chép file vào public/models/statue.glb (nên nén trước: npm run optimize-statue).
// Nếu mô hình bị quay sai hướng, chỉnh STATUE_MODEL.rotateY ở dưới
// hoặc thử nhanh bằng tham số URL ?statueRot=90.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { STATUE_H } from './site.js';

export const STATUE_MODEL = {
  url: '/models/statue.glb',
  // Góc xoay quanh trục đứng (độ) để mặt tượng nhìn ra phía trước (+z, hướng biển).
  rotateY: 0,
  // true: phủ chất liệu đồng của game lên mô hình (giữ normal map nếu có).
  // false: giữ nguyên màu/texture gốc của file.
  bronze: true,
  // Tỉ lệ được tính để phần cao nhất của mô hình bằng chiều cao tượng thật (10,8 m).
  height: STATUE_H,
};

export function loadStatueModel(fallback, bronzeMat, onLoaded) {
  const params = new URLSearchParams(location.search);
  if (params.get('statue') === 'off') return; // ?statue=off: xem lại tượng khối
  const rotateY = params.has('statueRot') ? +params.get('statueRot') : STATUE_MODEL.rotateY;
  const useBronze = params.has('statueTex') ? params.get('statueTex') !== '1' : STATUE_MODEL.bronze;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(STATUE_MODEL.url, (gltf) => {
    const model = gltf.scene;
    const holder = new THREE.Group();
    model.rotation.y = (rotateY * Math.PI) / 180;
    holder.add(model);
    holder.updateMatrixWorld(true);

    // đưa về kích thước thật: chân chạm mặt bệ, tâm ngang ở giữa bệ
    // (hộp bao đo sau khi xoay, nên dời model trong hệ của holder là đúng)
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);
    const s = STATUE_MODEL.height / size.y;
    holder.scale.setScalar(s);
    holder.position.copy(fallback.position);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      // mô hình AI chỉ có hình khối thường không kèm pháp tuyến
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      if (useBronze) {
        const old = o.material;
        const m = bronzeMat.clone();
        if (old && old.normalMap) m.normalMap = old.normalMap;
        // giữ lại độ đậm nhạt của texture gốc để thấy rõ chi tiết khuôn mặt, nếp áo
        if (old && old.map) { m.map = old.map; m.color.set('#c58a62'); }
        o.material = m;
      }
    });

    fallback.parent.add(holder);
    fallback.visible = false;
    console.info(`[statue] đã nạp ${STATUE_MODEL.url}, kích thước gốc ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}, tỉ lệ ×${s.toFixed(2)}`);
    onLoaded?.(holder);
  }, undefined, () => {
    // không có file hoặc file lỗi: giữ tượng khối, không báo lỗi cho người chơi
    console.info('[statue] chưa có public/models/statue.glb, dùng tượng khối');
  });
}
