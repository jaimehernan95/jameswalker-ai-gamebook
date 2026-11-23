import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type CameraPresetId = 'overview' | 'chatgpt-9-to-5' | 'ai-workflow-architect' | 'prompt-engineering-manual' | 'plan';
export type MaterialFinishId = 'archival' | 'brass' | 'graphite';

export interface Studio3DCallbacks {
  onSelectBook: (slug: string) => void;
  onContextStatus: (status: 'ready' | 'lost' | 'unsupported') => void;
}

export interface Studio3DController {
  setExplode: (value: number) => void;
  setCameraPreset: (preset: CameraPresetId) => void;
  setFinish: (finish: MaterialFinishId) => void;
  dispose: () => void;
}

// Pre-allocated scratch helpers (zero GC inside animation loop)
const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

const CAMERA_PRESETS: Record<CameraPresetId, { pos: [number, number, number]; look: [number, number, number] }> = {
  overview: { pos: [5.4, 3.8, 6.2], look: [0, 1.15, 0] },
  'chatgpt-9-to-5': { pos: [-1.1, 2.2, 4.9], look: [-2.35, 0.95, 1.35] },
  'ai-workflow-architect': { pos: [1.3, 2.2, 4.9], look: [2.35, 0.95, 1.35] },
  'prompt-engineering-manual': { pos: [0.4, 2.55, 1.35], look: [0, 1.05, -2.55] },
  plan: { pos: [0.01, 8.2, 1.6], look: [0, 0.4, 0] },
};

const FINISH_PALETTES: Record<
  MaterialFinishId,
  { cover: number; metal: number; metalRough: number; accent: number; pedestal: number }
> = {
  archival: {
    cover: 0x1c1b19,
    metal: 0xc29b61,
    metalRough: 0.24,
    accent: 0xd94e1f,
    pedestal: 0xe9e5dc,
  },
  brass: {
    cover: 0x2b2520,
    metal: 0xd4a957,
    metalRough: 0.18,
    accent: 0xd94e1f,
    pedestal: 0xede8dc,
  },
  graphite: {
    cover: 0x141413,
    metal: 0x6f7276,
    metalRough: 0.28,
    accent: 0xd94e1f,
    pedestal: 0xdad7cf,
  },
};

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createPaperTexture(maxAnisotropy: number): { albedo: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  ctx.fillStyle = '#F7F4EC';
  ctx.fillRect(0, 0, size, size);

  // Subtle cotton fiber flecks + editorial grid hairlines
  for (let i = 0; i < 1800; i++) {
    const x = (i * 97) % size;
    const y = (i * 53 + Math.floor(i / 7) * 19) % size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(20,20,19,0.035)' : 'rgba(180,170,150,0.045)';
    ctx.fillRect(x, y, 2, 1);
  }
  ctx.strokeStyle = 'rgba(20, 20, 19, 0.08)';
  ctx.lineWidth = 1;
  for (let y = 32; y < size; y += 24) {
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(size - 28, y);
    ctx.stroke();
  }
  // Vermilion editorial margin rule
  ctx.strokeStyle = 'rgba(217, 78, 31, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(46, 20);
  ctx.lineTo(46, size - 20);
  ctx.stroke();

  const albedo = new THREE.CanvasTexture(colorCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAnisotropy;

  // Linear-space bump canvas
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 61) % 256;
    const y = (i * 37 + Math.floor(i / 5) * 13) % 256;
    bCtx.fillStyle = i % 2 === 0 ? '#969696' : '#6c6c6c';
    bCtx.fillRect(x, y, 2, 2);
  }
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.anisotropy = maxAnisotropy;

  return { albedo, bump };
}

function createDraftingFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F5F3EC';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(20, 20, 19, 0.055)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Calibration crosshairs
  ctx.strokeStyle = 'rgba(217, 78, 31, 0.25)';
  ctx.beginPath();
  ctx.moveTo(256 - 10, 256);
  ctx.lineTo(256 + 10, 256);
  ctx.moveTo(256, 256 - 10);
  ctx.lineTo(256, 256 + 10);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 16, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(20, 20, 19, 0.42)');
  grad.addColorStop(0.55, 'rgba(20, 20, 19, 0.16)');
  grad.addColorStop(1, 'rgba(20, 20, 19, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBeveledRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

export function mountGamebookStudio3D(
  container: HTMLDivElement,
  callbacks: Studio3DCallbacks,
): Studio3DController {
  const isSoftwareGl = detectSoftwareWebGL();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
  } catch {
    callbacks.onContextStatus('unsupported');
    return {
      setExplode: () => {},
      setCameraPreset: () => {},
      setFinish: () => {},
      dispose: () => {},
    };
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const bgColor = new THREE.Color(0xfaf9f6);
  scene.background = bgColor;
  scene.fog = new THREE.FogExp2(0xfaf9f6, 0.036);

  // Studio environment reflection via RoomEnvironment + PMREMGenerator on every device
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  track(envTarget);
  pmremGenerator.dispose();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  const camera = new THREE.PerspectiveCamera(42, width / Math.max(1, height), 0.1, 80);
  camera.position.set(...CAMERA_PRESETS.overview.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 2.8;
  controls.maxDistance = 12.5;
  controls.target.set(...CAMERA_PRESETS.overview.look);
  controls.update();

  // Studio 3-point lighting: Warm Key + Cool Hemisphere Fill + Back Rim
  const hemiLight = new THREE.HemisphereLight(0xdce6f2, 0xcfc8bc, 0.72);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff4e2, 1.55);
  keyLight.position.set(5.5, 8.5, 5.2);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 26;
  const d = 6.5;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xe4edf8, 0.65);
  rimLight.position.set(-5.0, 4.5, -6.0);
  scene.add(rimLight);

  // Procedural Textures (Zero external 404 assets)
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const { albedo: paperAlbedo, bump: paperBump } = createPaperTexture(maxAniso);
  track(paperAlbedo);
  track(paperBump);
  const floorTex = createDraftingFloorTexture(maxAniso);
  track(floorTex);
  const contactTex = createContactShadowTexture();
  track(contactTex);

  // Shared PBR Materials (varied roughness >= 0.25 & metalness across adjacent parts)
  const coverMat = track(
    new THREE.MeshStandardMaterial({
      color: FINISH_PALETTES.archival.cover,
      roughness: 0.72,
      metalness: 0.08,
      bumpMap: paperBump,
      bumpScale: 0.008,
    }),
  );

  const metalMat = track(
    new THREE.MeshPhysicalMaterial({
      color: FINISH_PALETTES.archival.metal,
      roughness: FINISH_PALETTES.archival.metalRough,
      metalness: 0.92,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
    }),
  );

  const vermilionMat = track(
    new THREE.MeshPhysicalMaterial({
      color: FINISH_PALETTES.archival.accent,
      roughness: 0.32,
      metalness: 0.12,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    }),
  );

  const paperMat = track(
    new THREE.MeshStandardMaterial({
      map: paperAlbedo,
      bumpMap: paperBump,
      bumpScale: 0.006,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const pedestalMat = track(
    new THREE.MeshStandardMaterial({
      color: FINISH_PALETTES.archival.pedestal,
      roughness: 0.85,
      metalness: 0.04,
      bumpMap: paperBump,
      bumpScale: 0.004,
    }),
  );

  const contactMat = track(
    new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  // Infinite Drafting Table Ground Plane
  const groundGeo = track(new THREE.PlaneGeometry(70, 70));
  const groundMat = track(
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // =========================================================================
  // HERO COMPOSITE MODEL (10-part THREE.Group): "The Editorial Prompt Press"
  // Pivoted at bottom-center (y = 0) flush with the drafting floor.
  // =========================================================================
  const heroGroup = new THREE.Group();
  heroGroup.position.set(0, 0, 0);
  scene.add(heroGroup);

  // Contact shadow disc grounded just above floor (+0.02 to avoid z-fighting)
  const heroShadowGeo = track(new THREE.PlaneGeometry(4.4, 4.4));
  const heroShadow = new THREE.Mesh(heroShadowGeo, contactMat);
  heroShadow.rotation.x = -Math.PI / 2;
  heroShadow.position.y = 0.02;
  heroGroup.add(heroShadow);

  // Part 1: Stepped architectural plinth (LatheGeometry)
  const plinthPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.55, 0.0),
    new THREE.Vector2(1.55, 0.14),
    new THREE.Vector2(1.42, 0.18),
    new THREE.Vector2(1.42, 0.34),
    new THREE.Vector2(1.26, 0.38),
    new THREE.Vector2(0.0, 0.38),
  ];
  const plinthGeo = track(new THREE.LatheGeometry(plinthPoints, 48));
  const plinthMesh = new THREE.Mesh(plinthGeo, pedestalMat);
  plinthMesh.castShadow = true;
  plinthMesh.receiveShadow = true;
  heroGroup.add(plinthMesh);

  // Part 2: Calibrated brass azimuth collar around plinth
  const collarGeo = track(new THREE.TorusGeometry(1.36, 0.025, 16, 64));
  const collarMesh = new THREE.Mesh(collarGeo, metalMat);
  collarMesh.rotation.x = Math.PI / 2;
  collarMesh.position.y = 0.37;
  heroGroup.add(collarMesh);

  // Explodable layers inside the hero monument
  const lowerCoverLayer = new THREE.Group();
  const pageBlockLayer = new THREE.Group();
  const upperCoverLayer = new THREE.Group();
  const pressBridgeLayer = new THREE.Group();
  const dialRingLayer = new THREE.Group();
  heroGroup.add(lowerCoverLayer, pageBlockLayer, upperCoverLayer, pressBridgeLayer, dialRingLayer);

  // Part 3: Beveled Bottom Hardcover Folio (ExtrudeGeometry)
  const boardShape = createBeveledRectShape(1.52, 1.98, 0.08);
  const boardGeo = track(
    new THREE.ExtrudeGeometry(boardShape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
    }),
  );
  boardGeo.rotateX(-Math.PI / 2);
  boardGeo.center();

  const lowerCover = new THREE.Mesh(boardGeo, coverMat);
  lowerCover.position.set(0, 0.44, 0);
  lowerCover.castShadow = true;
  lowerCover.receiveShadow = true;
  lowerCoverLayer.add(lowerCover);

  // Part 4: Brass corner clasps on lower folio
  const claspGeo = track(new THREE.BoxGeometry(0.16, 0.11, 0.16));
  const claspOffsets: Array<[number, number]> = [
    [0.7, 0.92],
    [0.7, -0.92],
  ];
  for (const [cx, cz] of claspOffsets) {
    const clasp = new THREE.Mesh(claspGeo, metalMat);
    clasp.position.set(cx, 0.45, cz);
    clasp.castShadow = true;
    lowerCoverLayer.add(clasp);
  }

  // Part 5: Curved binding spine rib (TubeGeometry)
  const spineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.78, 0.45, -0.98),
    new THREE.Vector3(-0.83, 0.62, -0.98),
    new THREE.Vector3(-0.83, 0.62, 0.98),
    new THREE.Vector3(-0.78, 0.45, 0.98),
  ]);
  const spineGeo = track(new THREE.TubeGeometry(spineCurve, 32, 0.05, 12, false));
  const spineMesh = new THREE.Mesh(spineGeo, vermilionMat);
  spineMesh.castShadow = true;
  pageBlockLayer.add(spineMesh);

  // Part 6: Cotton Paper Page Block (ExtrudeGeometry with ruled paper texture)
  const pageShape = createBeveledRectShape(1.4, 1.86, 0.03);
  const pageGeo = track(
    new THREE.ExtrudeGeometry(pageShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    }),
  );
  pageGeo.rotateX(-Math.PI / 2);
  pageGeo.center();
  const pageBlock = new THREE.Mesh(pageGeo, paperMat);
  pageBlock.position.set(0.02, 0.62, 0);
  pageBlock.castShadow = true;
  pageBlock.receiveShadow = true;
  pageBlockLayer.add(pageBlock);

  // Part 7: Upper Hardcover Folio + Vermilion Inlay Plate
  const upperCover = new THREE.Mesh(boardGeo, coverMat);
  upperCover.position.set(0, 0.82, 0);
  upperCover.castShadow = true;
  upperCover.receiveShadow = true;
  upperCoverLayer.add(upperCover);

  const inlayGeo = track(new THREE.BoxGeometry(0.68, 0.024, 0.88));
  const inlayMesh = new THREE.Mesh(inlayGeo, vermilionMat);
  inlayMesh.position.set(0.06, 0.875, 0);
  inlayMesh.castShadow = true;
  upperCoverLayer.add(inlayMesh);

  // Part 8: Twin Arched Letterpress Bridge Struts (TubeGeometry)
  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.12, 0.38, 0),
    new THREE.Vector3(-0.98, 1.48, 0),
    new THREE.Vector3(0, 1.72, 0),
    new THREE.Vector3(0.98, 1.48, 0),
    new THREE.Vector3(1.12, 0.38, 0),
  ]);
  const archGeo = track(new THREE.TubeGeometry(archCurve, 44, 0.042, 14, false));
  const archMesh = new THREE.Mesh(archGeo, metalMat);
  archMesh.castShadow = true;
  pressBridgeLayer.add(archMesh);

  // Part 9: Lathe-turned Brass Calibration Plunger Spindle
  const spindlePoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.24, 0.0),
    new THREE.Vector2(0.24, 0.06),
    new THREE.Vector2(0.09, 0.1),
    new THREE.Vector2(0.09, 0.56),
    new THREE.Vector2(0.18, 0.6),
    new THREE.Vector2(0.18, 0.68),
    new THREE.Vector2(0.0, 0.68),
  ];
  const spindleGeo = track(new THREE.LatheGeometry(spindlePoints, 32));
  const spindleMesh = new THREE.Mesh(spindleGeo, metalMat);
  spindleMesh.position.set(0, 1.18, 0);
  spindleMesh.castShadow = true;
  pressBridgeLayer.add(spindleMesh);

  // Part 10: Floating Vermilion Calibrated Focus Ring + Vernier Pointers
  const focusRingGeo = track(new THREE.TorusGeometry(0.92, 0.028, 16, 72));
  const focusRing = new THREE.Mesh(focusRingGeo, vermilionMat);
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(0, 1.24, 0);
  focusRing.castShadow = true;
  dialRingLayer.add(focusRing);

  const pointerGeo = track(new THREE.ConeGeometry(0.055, 0.16, 4));
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const ptr = new THREE.Mesh(pointerGeo, metalMat);
    ptr.position.set(Math.cos(angle) * 0.92, 1.24, Math.sin(angle) * 0.92);
    ptr.rotation.z = Math.PI / 2;
    ptr.rotation.y = -angle;
    dialRingLayer.add(ptr);
  }

  // =========================================================================
  // THREE CLICKABLE COMPOSITE PLAYBOOK SATELLITE MONUMENTS (Layer 1 Raycast)
  // =========================================================================
  const clickableProxies: THREE.Object3D[] = [];
  const bookMonuments: Array<{
    slug: string;
    group: THREE.Group;
    tomeGroup: THREE.Group;
    baseY: number;
    phase: number;
  }> = [];

  const satelliteSpecs: Array<{ slug: string; pos: [number, number, number]; tilt: number; accent: number }> = [
    { slug: 'chatgpt-9-to-5', pos: [-2.35, 0, 1.35], tilt: 0.35, accent: 0xd94e1f },
    { slug: 'ai-workflow-architect', pos: [2.35, 0, 1.35], tilt: -0.35, accent: 0x141413 },
    { slug: 'prompt-engineering-manual', pos: [0, 0, -2.55], tilt: 0, accent: 0xc29b61 },
  ];

  const miniPlinthGeo = track(new THREE.CylinderGeometry(0.62, 0.72, 0.24, 32));
  const miniShadowGeo = track(new THREE.PlaneGeometry(1.9, 1.9));
  const miniCoverShape = createBeveledRectShape(0.68, 0.92, 0.04);
  const miniCoverGeo = track(
    new THREE.ExtrudeGeometry(miniCoverShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    }),
  );
  miniCoverGeo.center();
  const miniPagesGeo = track(new THREE.BoxGeometry(0.62, 0.84, 0.11));
  const miniBandGeo = track(new THREE.BoxGeometry(0.14, 0.94, 0.18));
  const proxyGeo = track(new THREE.BoxGeometry(1.3, 1.6, 1.3));
  const proxyMat = track(new THREE.MeshBasicMaterial({ visible: false }));

  satelliteSpecs.forEach((spec, idx) => {
    const satGroup = new THREE.Group();
    satGroup.position.set(...spec.pos);
    scene.add(satGroup);

    // Contact shadow
    const sh = new THREE.Mesh(miniShadowGeo, contactMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    satGroup.add(sh);

    // Grounded base plinth (y=0 bottom)
    const base = new THREE.Mesh(miniPlinthGeo, pedestalMat);
    base.position.y = 0.12;
    base.castShadow = true;
    base.receiveShadow = true;
    satGroup.add(base);

    // Brass collar ring
    const ringGeo = track(new THREE.TorusGeometry(0.62, 0.016, 12, 40));
    const ring = new THREE.Mesh(ringGeo, metalMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.245;
    satGroup.add(ring);

    // Composite 4-part standing Playbook Tome
    const tomeGroup = new THREE.Group();
    tomeGroup.position.set(0, 0.86, 0);
    tomeGroup.rotation.y = spec.tilt;
    satGroup.add(tomeGroup);

    const coverMesh = new THREE.Mesh(miniCoverGeo, coverMat);
    coverMesh.castShadow = true;
    tomeGroup.add(coverMesh);

    const pagesMesh = new THREE.Mesh(miniPagesGeo, paperMat);
    pagesMesh.position.x = 0.05;
    tomeGroup.add(pagesMesh);

    const bandMat = track(
      new THREE.MeshStandardMaterial({
        color: spec.accent,
        roughness: 0.38,
        metalness: spec.accent === 0xc29b61 ? 0.85 : 0.15,
      }),
    );
    const bandMesh = new THREE.Mesh(miniBandGeo, bandMat);
    bandMesh.position.x = -0.27;
    bandMesh.castShadow = true;
    tomeGroup.add(bandMesh);

    const badgeGeo = track(new THREE.TorusGeometry(0.14, 0.018, 12, 28));
    const badgeMesh = new THREE.Mesh(badgeGeo, vermilionMat);
    badgeMesh.position.set(0.06, 0.08, 0.095);
    tomeGroup.add(badgeMesh);

    // Simplified invisible proxy hitbox on Layer 1 for fast raycasting
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    proxy.position.set(0, 0.8, 0);
    proxy.userData.bookSlug = spec.slug;
    proxy.layers.set(1);
    satGroup.add(proxy);
    clickableProxies.push(proxy);

    // Signal conduit tube connecting satellite plinth to central press
    const conduitCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(spec.pos[0] * 0.72, 0.06, spec.pos[2] * 0.72),
      new THREE.Vector3(spec.pos[0] * 0.52, 0.14, spec.pos[2] * 0.52),
      new THREE.Vector3(spec.pos[0] * 0.36, 0.08, spec.pos[2] * 0.36),
    ]);
    const conduitGeo = track(new THREE.TubeGeometry(conduitCurve, 18, 0.02, 8, false));
    const conduit = new THREE.Mesh(conduitGeo, metalMat);
    conduit.receiveShadow = true;
    scene.add(conduit);

    bookMonuments.push({
      slug: spec.slug,
      group: satGroup,
      tomeGroup,
      baseY: 0.86,
      phase: idx * 2.1,
    });
  });

  // =========================================================================
  // INSTANCED MESH (48 Orbital Ink & Token Glyph Tiles)
  // =========================================================================
  const GLYPH_COUNT = 48;
  const glyphGeo = track(new THREE.BoxGeometry(0.11, 0.025, 0.15));
  const glyphMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.3,
    }),
  );
  const glyphMesh = new THREE.InstancedMesh(glyphGeo, glyphMat, GLYPH_COUNT);
  glyphMesh.frustumCulled = false;

  const glyphMeta: Array<{ radius: number; angle: number; speed: number; yBase: number; scale: number }> = [];
  const paletteTints = [0x141413, 0xd94e1f, 0xc29b61, 0x57554f];

  for (let i = 0; i < GLYPH_COUNT; i++) {
    const ringTier = i % 3;
    const radius = 1.9 + ringTier * 0.75 + ((i * 17) % 10) * 0.04;
    const angle = (i / GLYPH_COUNT) * Math.PI * 2;
    const speed = (ringTier % 2 === 0 ? 1 : -1) * (0.14 + (i % 5) * 0.02);
    const yBase = 1.15 + ringTier * 0.42 + Math.sin(i * 1.7) * 0.22;
    const scale = 0.85 + ((i * 29) % 30) / 100; // +-15% variation
    glyphMeta.push({ radius, angle, speed, yBase, scale });

    _color.setHex(paletteTints[i % paletteTints.length]);
    glyphMesh.setColorAt(i, _color);
  }
  if (glyphMesh.instanceColor) glyphMesh.instanceColor.needsUpdate = true;
  scene.add(glyphMesh);

  // =========================================================================
  // INTERACTIVE STATE, SMOOTH DAMPING & RAYCASTING
  // =========================================================================
  let explodeTarget = 0;
  let explodeCurrent = 0;
  let cameraTransitionActive = false;
  let hoveredSlug: string | null = null;

  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(1);
  const pointer = new THREE.Vector2();

  const onControlsStart = () => {
    cameraTransitionActive = false;
  };
  controls.addEventListener('start', onControlsStart);

  let lastMoveTime = 0;
  const updatePointer = (ev: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const onPointerMove = (ev: PointerEvent) => {
    const now = performance.now();
    if (now - lastMoveTime < 50) return;
    lastMoveTime = now;
    updatePointer(ev);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableProxies, false);
    const nextSlug = (hits[0]?.object.userData.bookSlug as string | undefined) ?? null;
    if (nextSlug !== hoveredSlug) {
      hoveredSlug = nextSlug;
      renderer.domElement.style.cursor = hoveredSlug ? 'pointer' : 'grab';
    }
  };

  let pointerDownPos = { x: 0, y: 0 };
  const onPointerDown = (ev: PointerEvent) => {
    pointerDownPos = { x: ev.clientX, y: ev.clientY };
  };

  const onPointerUp = (ev: PointerEvent) => {
    const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
    if (dist > 6) return;
    updatePointer(ev);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableProxies, false);
    const slug = hits[0]?.object.userData.bookSlug as CameraPresetId | undefined;
    if (slug && CAMERA_PRESETS[slug]) {
      setCameraPreset(slug);
      callbacks.onSelectBook(slug);
    }
  };

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  // WebGL context loss safety
  const onContextLost = (e: Event) => {
    e.preventDefault();
    callbacks.onContextStatus('lost');
  };
  const onContextRestored = () => {
    callbacks.onContextStatus('ready');
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }
  callbacks.onContextStatus('ready');

  // =========================================================================
  // RENDER LOOP (60fps GPU / afterDraw-paced Software WebGL)
  // =========================================================================
  const clock = new THREE.Clock();
  let disposed = false;
  let frameId = 0;

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function tick() {
    if (disposed) return;
    const dt = Math.min(0.05, clock.getDelta());
    const elapsed = clock.getElapsedTime();

    // Exponentially damped exploded-view layer separation
    explodeCurrent = THREE.MathUtils.damp(explodeCurrent, explodeTarget, 6.5, dt);
    lowerCoverLayer.position.y = 0;
    pageBlockLayer.position.y = explodeCurrent * 0.42;
    upperCoverLayer.position.y = explodeCurrent * 0.92;
    pressBridgeLayer.position.y = explodeCurrent * 1.15;
    dialRingLayer.position.y = explodeCurrent * 0.68;

    // Gentle living mechanics on hero focus ring & satellite books
    dialRingLayer.rotation.y = elapsed * 0.22;
    spindleMesh.position.y = 1.18 + Math.sin(elapsed * 1.3) * 0.025;

    for (const mon of bookMonuments) {
      const hoverBoost = hoveredSlug === mon.slug ? 0.09 : 0;
      const targetY = mon.baseY + Math.sin(elapsed * 1.4 + mon.phase) * 0.03 + hoverBoost;
      mon.tomeGroup.position.y = THREE.MathUtils.damp(mon.tomeGroup.position.y, targetY, 8, dt);
    }

    // Update 48 instanced ink glyphs with zero allocations
    for (let i = 0; i < GLYPH_COUNT; i++) {
      const g = glyphMeta[i];
      const a = g.angle + elapsed * g.speed;
      _vec3.set(
        Math.cos(a) * g.radius,
        g.yBase + Math.sin(elapsed * 1.1 + i) * 0.06 + explodeCurrent * 0.25,
        Math.sin(a) * g.radius,
      );
      _euler.set(0.25 * Math.sin(elapsed + i), -a + Math.PI / 2, 0.15);
      _quat.setFromEuler(_euler);
      _scale.setScalar(g.scale);
      _mat4.compose(_vec3, _quat, _scale);
      glyphMesh.setMatrixAt(i, _mat4);
    }
    glyphMesh.instanceMatrix.needsUpdate = true;

    // Exponentially damped scripted camera preset glide
    if (cameraTransitionActive) {
      const alpha = 1 - Math.exp(-5.5 * dt);
      camera.position.lerp(_targetPos, alpha);
      controls.target.lerp(_targetLook, alpha);
      if (
        camera.position.distanceToSquared(_targetPos) < 0.002 &&
        controls.target.distanceToSquared(_targetLook) < 0.002
      ) {
        cameraTransitionActive = false;
      }
    }

    controls.update();
    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  glyphMesh.computeBoundingSphere();
  tick();

  function setExplode(value: number) {
    explodeTarget = THREE.MathUtils.clamp(value, 0, 1);
  }

  function setCameraPreset(preset: CameraPresetId) {
    const spec = CAMERA_PRESETS[preset];
    if (!spec) return;
    _targetPos.set(...spec.pos);
    _targetLook.set(...spec.look);
    cameraTransitionActive = true;
  }

  function setFinish(finish: MaterialFinishId) {
    const p = FINISH_PALETTES[finish];
    if (!p) return;
    coverMat.color.setHex(p.cover);
    metalMat.color.setHex(p.metal);
    metalMat.roughness = p.metalRough;
    vermilionMat.color.setHex(p.accent);
    pedestalMat.color.setHex(p.pedestal);
  }

  function dispose() {
    disposed = true;
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(frameId);
    window.removeEventListener('resize', onResize);
    controls.removeEventListener('start', onControlsStart);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
    controls.dispose();
    for (const item of disposables) {
      item.dispose();
    }
    renderer.dispose();
  }

  return {
    setExplode,
    setCameraPreset,
    setFinish,
    dispose,
  };
}
