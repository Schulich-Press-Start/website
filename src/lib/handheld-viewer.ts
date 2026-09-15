import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type ViewName = 'overview' | 'controls' | 'profile';
type ViewerOptions = { onPlaybackChange?: (playing: boolean) => void; onViewChange?: (view: ViewName) => void };

export async function mountHandheld(container: HTMLElement, options: ViewerOptions = {}) {
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
  const inspectionMaterials: THREE.Material[] = [];
  let screen: THREE.Mesh | undefined;
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
        screen = object;
      } else {
        material.color.set('#252130');
        material.roughness = 0.55;
      }
      conceptMaterials.push(material);
      return material;
    });
    object.userData.conceptMaterials = Array.isArray(object.material) ? styled : styled[0];
    const inspected = styled.map((material) => {
      const translucent = material.clone();
      translucent.color.set('#59327e');
      translucent.transparent = true;
      translucent.opacity = 0.09;
      translucent.depthWrite = false;
      inspectionMaterials.push(translucent);
      return translucent;
    });
    object.userData.inspectionMaterials = Array.isArray(object.material) ? inspected : inspected[0];
    object.material = object.userData.conceptMaterials;
  });

  const display = document.createElement('canvas');
  display.width = 768;
  display.height = 600;
  const displayContext = display.getContext('2d')!;
  const displayTexture = new THREE.CanvasTexture(display);
  displayTexture.colorSpace = THREE.SRGBColorSpace;
  const displayMaterial = new THREE.MeshBasicMaterial({ map: displayTexture, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  let displayPanel: THREE.Mesh | undefined;
  if (screen) {
    const geometry = screen.geometry.clone();
    const positions = geometry.getAttribute('position');
    const uv = new Float32Array(positions.count * 2);
    geometry.computeBoundingBox();
    const screenBounds = geometry.boundingBox!;
    for (let index = 0; index < positions.count; index++) {
      uv[index * 2] = (positions.getY(index) - screenBounds.min.y) / (screenBounds.max.y - screenBounds.min.y);
      uv[index * 2 + 1] = (positions.getZ(index) - screenBounds.min.z) / (screenBounds.max.z - screenBounds.min.z);
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    displayPanel = new THREE.Mesh(geometry, displayMaterial);
    displayPanel.position.x = 0.00008;
    displayPanel.visible = false;
    screen.add(displayPanel);
  }
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#ffbb70', transparent: true, opacity: 0.9, depthTest: true, toneMapped: false });
  for (const mesh of originalMaterials.keys()) {
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 18), lineMaterial);
    mesh.add(lines);
    mesh.userData.inspectionLines = lines;
    lines.visible = false;
  }

  let powered = false;
  let conceptEnabled = true;
  let inspecting = false;
  let screenProgress = 1;
  const drawDisplay = (progress = 1) => {
    screenProgress = progress;
    displayContext.fillStyle = '#151222';
    displayContext.fillRect(0, 0, 768, 600);
    displayContext.strokeStyle = '#302541';
    displayContext.lineWidth = 1;
    for (let row = 0; row < 600; row += 30) {
      displayContext.beginPath();
      displayContext.moveTo(0, row);
      displayContext.lineTo(768, row);
      displayContext.stroke();
    }
    displayContext.fillStyle = '#bfa6ef';
    displayContext.font = '24px sans-serif';
    displayContext.textAlign = 'center';
    displayContext.fillText('SCHULICH', 384, 150);
    displayContext.fillStyle = '#fff6e8';
    displayContext.font = 'bold 76px sans-serif';
    displayContext.fillText('PRESS START', 384, 265);
    displayContext.fillStyle = '#f7a056';
    displayContext.fillRect(144, 337, 480 * progress, 10);
    displayContext.strokeStyle = '#f7a056';
    displayContext.strokeRect(144, 337, 480, 10);
    displayContext.font = '22px sans-serif';
    displayContext.fillText(progress < 1 ? 'STARTING SOMETHING GOOD' : 'MADE TO PLAY. MADE BY US.', 384, 410);
    displayTexture.needsUpdate = true;
    if (displayPanel) displayPanel.visible = powered && conceptEnabled && !inspecting;
  };

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI * 0.24;
  controls.maxPolarAngle = Math.PI * 0.77;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let disposed = false;
  let playing = false;
  const views: Record<ViewName, { position: [number, number, number]; target: [number, number, number] }> = {
    overview: { position: [2.6, 0.75, 6.35], target: [0, 0, 0] },
    controls: { position: [1.0, -0.15, 4.1], target: [0, -0.50, 0.05] },
    profile: { position: [6.4, 0.7, 2.1], target: [0, 0, 0] },
  };
  const render = () => { if (!disposed) renderer.render(scene, camera); };
  const setPlaying = (value: boolean) => {
    if (playing === value) return;
    playing = value;
    container.dataset.playing = String(value);
    options.onPlaybackChange?.(value);
  };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; setPlaying(false); };
  const applyView = (name: ViewName) => {
    camera.position.set(...views[name].position);
    controls.target.set(...views[name].target);
    controls.update();
    options.onViewChange?.(name);
  };
  const clearPresentation = () => {
    presentation.rotation.set(0, 0, 0);
    presentation.position.set(0, 0, 0);
  };
  const reset = () => {
    stop();
    clearPresentation();
    applyView('overview');
    drawDisplay();
    render();
  };
  const intro = () => {
    reset();
    powered = true;
    drawDisplay();
    render();
    if (motion.matches) return;
    const started = performance.now();
    const initialPosition = new THREE.Vector3(4.8, 1.9, 6.2);
    const controlsPosition = new THREE.Vector3(...views.controls.position);
    const overviewPosition = new THREE.Vector3(...views.overview.position);
    const controlsTarget = new THREE.Vector3(...views.controls.target);
    setPlaying(true);
    const step = (now: number) => {
      const progress = Math.min((now - started) / 4400, 1);
      const part = progress < 0.52 ? progress / 0.52 : (progress - 0.52) / 0.48;
      const eased = part * part * (3 - 2 * part);
      if (progress < 0.52) {
        camera.position.lerpVectors(initialPosition, controlsPosition, eased);
        controls.target.copy(controlsTarget).multiplyScalar(eased);
      } else {
        camera.position.lerpVectors(controlsPosition, overviewPosition, eased);
        controls.target.copy(controlsTarget).multiplyScalar(1 - eased);
      }
      presentation.rotation.z = -Math.sin(progress * Math.PI) * 0.10;
      controls.update();
      drawDisplay(Math.min(progress * 2.6, 1));
      render();
      if (progress < 1) frame = requestAnimationFrame(step);
      else { frame = 0; setPlaying(false); }
    };
    frame = requestAnimationFrame(step);
  };
  const selectView = (name: ViewName) => {
    stop();
    clearPresentation();
    options.onViewChange?.(name);
    const initialPosition = camera.position.clone();
    const initialTarget = controls.target.clone();
    const targetPosition = new THREE.Vector3(...views[name].position);
    const targetLook = new THREE.Vector3(...views[name].target);
    if (motion.matches) { applyView(name); render(); return; }
    const started = performance.now();
    setPlaying(true);
    const step = (now: number) => {
      const progress = Math.min((now - started) / 700, 1);
      const eased = 1 - (1 - progress) ** 3;
      camera.position.lerpVectors(initialPosition, targetPosition, eased);
      controls.target.lerpVectors(initialTarget, targetLook, eased);
      controls.update();
      render();
      if (progress < 1) frame = requestAnimationFrame(step);
      else { frame = 0; setPlaying(false); }
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
  const intersectionObserver = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); });
  intersectionObserver.observe(container);

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
    stop,
    reset,
    rotate,
    selectView,
    setPowered(value: boolean) {
      stop();
      powered = value;
      drawDisplay();
      render();
    },
    setInspection(value: boolean) {
      stop();
      inspecting = value;
      for (const [mesh, original] of originalMaterials) {
        mesh.userData.inspectionLines.visible = value;
        mesh.material = value ? mesh.userData.inspectionMaterials : conceptEnabled ? mesh.userData.conceptMaterials : original;
      }
      drawDisplay();
      render();
    },
    setConcept(concept: boolean) {
      stop();
      conceptEnabled = concept;
      for (const [mesh, original] of originalMaterials) mesh.material = inspecting ? mesh.userData.inspectionMaterials : concept ? mesh.userData.conceptMaterials : original;
      drawDisplay(screenProgress);
      render();
    },
    dispose() {
      stop();
      disposed = true;
      controls.dispose();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibility);
      model.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      for (const mesh of originalMaterials.keys()) mesh.userData.inspectionLines.geometry.dispose();
      lineMaterial.dispose();
      displayTexture.dispose();
      displayMaterial.dispose();
      for (const materials of originalMaterials.values()) for (const material of Array.isArray(materials) ? materials : [materials]) material.dispose();
      conceptMaterials.forEach((material) => material.dispose());
      inspectionMaterials.forEach((material) => material.dispose());
      environmentMap.dispose();
      renderer.dispose();
    },
  };
}