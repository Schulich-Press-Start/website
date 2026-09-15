import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export async function mountHandheld(container: HTMLElement) {
  const canvas = container.querySelector<HTMLCanvasElement>('canvas')!;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.01, 100);
  const environment = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environmentMap = environment.fromScene(room, 0.04);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 0.7;
  environment.dispose();
  room.dispose();
  scene.add(new THREE.HemisphereLight('#ffffff', '#5d387b', 1.2));
  const keyLight = new THREE.DirectionalLight('#fff3dc', 2.0);
  keyLight.position.set(-3, 5, 4);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight('#d5c1ff', 1.5);
  rimLight.position.set(4, 2, -3);
  scene.add(rimLight);

  const loader = new GLTFLoader();
  let model: THREE.Group;
  try {
    const gltf = await loader.loadAsync('/models/sps-handheld.glb');
    model = gltf.scene;
  } catch (error) {
    renderer.dispose();
    environmentMap.dispose();
    throw error;
  }
  for (const child of [...model.children]) if (child instanceof THREE.Camera) model.remove(child);
  const orientation = new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  model.applyMatrix4(orientation);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const normalisation = 2.9 / size.y;
  model.position.sub(centre);
  const turntable = new THREE.Group();
  turntable.scale.setScalar(normalisation);
  turntable.add(model);
  const presentation = new THREE.Group();
  presentation.add(turntable);
  scene.add(presentation);

  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const conceptMaterials: THREE.Material[] = [];
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    originalMaterials.set(object, object.material);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const styled = materials.map((original) => {
      const material = (original as THREE.MeshStandardMaterial).clone();
      if (original.name === 'mattealuminum') {
        material.color.set('#7543b9');
        material.metalness = 0.16;
        material.roughness = 0.33;
      } else if (original.name === 'glossyrubber') {
        material.color.set('#e48c3d');
        material.metalness = 0.28;
        material.roughness = 0.32;
      } else if (original.name === 'green_backlit_lcd') {
        material.color.set('#12111e');
        material.metalness = 0.15;
        material.roughness = 0.23;
      } else {
        material.color.set('#252130');
        material.roughness = 0.55;
      }
      conceptMaterials.push(material);
      return material;
    });
    object.userData.conceptMaterials = Array.isArray(object.material) ? styled : styled[0];
    object.material = object.userData.conceptMaterials;
  });

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI * 0.24;
  controls.maxPolarAngle = Math.PI * 0.77;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let disposed = false;
  const render = () => { if (!disposed) renderer.render(scene, camera); };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };
  const reset = () => {
    stop();
    presentation.rotation.set(0, 0, 0);
    presentation.position.set(0, 0, 0);
    camera.position.set(1.7, 0.7, 6.5);
    controls.target.set(0, 0, 0);
    controls.update();
    render();
  };
  const intro = () => {
    reset();
    if (motion.matches) return;
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - started) / 1500, 1);
      const remaining = (1 - progress) ** 3;
      presentation.rotation.y = -0.7 * remaining;
      presentation.rotation.z = -0.15 * remaining;
      presentation.position.y = -0.22 * remaining;
      render();
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };
  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  controls.addEventListener('change', render);
  controls.addEventListener('start', stop);
  const onMotionChange = () => { if (motion.matches) reset(); };
  const onVisibility = () => { if (document.hidden) stop(); };
  motion.addEventListener('change', onMotionChange);
  document.addEventListener('visibilitychange', onVisibility);

  const rotate = (horizontal: number, vertical = 0) => {
    stop();
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += horizontal;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));
    controls.update();
    render();
  };

  resize();
  reset();
  return {
    intro,
    reset,
    rotate,
    setConcept(concept: boolean) {
      for (const [mesh, original] of originalMaterials) mesh.material = concept ? mesh.userData.conceptMaterials : original;
      render();
    },
    dispose() {
      stop();
      disposed = true;
      controls.dispose();
      resizeObserver.disconnect();
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibility);
      model.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      for (const materials of originalMaterials.values()) for (const material of Array.isArray(materials) ? materials : [materials]) material.dispose();
      conceptMaterials.forEach((material) => material.dispose());
      environmentMap.dispose();
      renderer.dispose();
    },
  };
}