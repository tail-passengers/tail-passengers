import loadModel from "./modelLoader";

export default function initializePong(containerId) {
    const container = document.getElementById(containerId);
    const renderer = initializeRenderer();
    const scene = initializeScene();
    const camera = initializeCamera();
    const controls = initializeControls(camera, renderer.domElement);

    loadModel(scene);

    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    animate();

    function initializeRenderer() {
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
        return renderer;
    }

    function initializeScene() {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        return scene;
    }

    function initializeCamera() {
        const camera = new THREE.PerspectiveCamera(
            40,
            window.innerWidth / window.innerHeight,
            1,
            100
        );
        camera.position.set(5, 2, 8);
        return camera;
    }

    function initializeControls(camera, domElement) {
        const controls = new THREE.OrbitControls(camera, domElement);
        controls.target.set(0, 0.5, 0);
        controls.enablePan = false;
        controls.enableDamping = true;
        return controls;
    }
}
