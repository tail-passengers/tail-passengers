import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function loadModel(scene) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");
    loader.setDRACOLoader(dracoLoader);

    loader.load(
        "../../public/assets/gltf/building_metallic_protective_fence_low_poly/scene.gltf",
        function (gltf) {
            const model = gltf.scene;
            model.position.set(1, 1, 0);
            model.scale.set(0.01, 0.01, 0.01);
            scene.add(model);
        },
        undefined,
        function (e) {
            console.error(e);
        }
    );
}
