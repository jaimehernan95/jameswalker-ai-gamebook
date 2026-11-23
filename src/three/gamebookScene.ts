import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type CameraPresetId =
  | 'overview'
  | 'ai-for-online-work'
  | 'chatgpt-9-to-5'
  | 'ai-workflow-architect'
  | 'prompt-engineering-manual'
  | 'plan';

export type MaterialFinishId = 'gallery' | 'obsidian' | 'atelier';

export interface Studio3DCallbacks {
  onSelectBook: (slug: string) => void;
  onOpenBook?: (slug: string) => void;
  onContextStatus: (status: 'ready' | 'lost' | 'unsupported') => void;
}

export interface Studio3DController {
  setExplode: (value: number) => void;
  setCameraPreset: (preset: CameraPresetId) => void;
  setFinish: (finish: MaterialFinishId) => void;
  dispose: () => void;
}

// Pre-allocated scratch helpers (zero GC inside render loop)
const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

// Generous, face-forward camera framing so all 4 large books and their titles read crisply
const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  overview: { pos: [0.0, 2.45, 6.25], look: [0, 1.38, -0.1] },
  'ai-for-online-work': { pos: [0.0, 1.72, 4.15], look: [0, 1.48, 0.85] },
  'chatgpt-9-to-5': { pos: [-1.45, 1.65, 3.35], look: [-2.4, 1.35, 0.15] },
  'ai-workflow-architect': { pos: [1.45, 1.65, 3.35], look: [2.4, 1.35, 0.15] },
  'prompt-engineering-manual': { pos: [0.0, 2.35, 1.75], look: [0, 1.98, -1.55] },
  plan: { pos: [0.01, 8.2, 2.8], look: [0, 0.8, -0.1] },
};

interface StudioThemeSpec {
  bg: number;
  floorBg: string;
  floorGrid: string;
  floorCross: string;
  pedestal: number;
  pedestalTrim: number;
  metal: number;
  metalRough: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  keyIntensity: number;
  rimColor: number;
  rimIntensity: number;
}

const STUDIO_THEMES: Record<MaterialFinishId, StudioThemeSpec> = {
  gallery: {
    bg: 0xf4f6f9,
    floorBg: '#F1F4F8',
    floorGrid: 'rgba(15, 20, 30, 0.05)',
    floorCross: 'rgba(29, 78, 216, 0.22)',
    pedestal: 0xffffff,
    pedestalTrim: 0xdde3ec,
    metal: 0xb89352,
    metalRough: 0.22,
    hemiSky: 0xeaf1fc,
    hemiGround: 0xd9dee6,
    hemiIntensity: 0.9,
    keyIntensity: 1.45,
    rimColor: 0xdbeafe,
    rimIntensity: 0.72,
  },
  obsidian: {
    bg: 0x0d121c,
    floorBg: '#101622',
    floorGrid: 'rgba(226, 232, 240, 0.06)',
    floorCross: 'rgba(96, 165, 250, 0.28)',
    pedestal: 0x171f2e,
    pedestalTrim: 0x243046,
    metal: 0xd4af6a,
    metalRough: 0.18,
    hemiSky: 0xbfd6f8,
    hemiGround: 0x161c28,
    hemiIntensity: 0.78,
    keyIntensity: 1.65,
    rimColor: 0x60a5fa,
    rimIntensity: 0.95,
  },
  atelier: {
    bg: 0xf3f2ee,
    floorBg: '#EFECE5',
    floorGrid: 'rgba(26, 29, 34, 0.055)',
    floorCross: 'rgba(184, 147, 82, 0.32)',
    pedestal: 0xfbfaf7,
    pedestalTrim: 0xe3dfd4,
    metal: 0xa68147,
    metalRough: 0.26,
    hemiSky: 0xf7f2e8,
    hemiGround: 0xd7d1c5,
    hemiIntensity: 0.88,
    keyIntensity: 1.48,
    rimColor: 0xfef3c7,
    rimIntensity: 0.65,
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

function createPaperBlockTextures(maxAnisotropy: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  // Crisp archival cream-white stacked paper edge lines
  ctx.fillStyle = '#F7F6F1';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(15, 20, 30, 0.07)' : 'rgba(184, 147, 82, 0.05)';
    ctx.fillRect(0, y, size, 1);
  }

  const albedo = new THREE.CanvasTexture(colorCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAnisotropy;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    bCtx.fillStyle = y % 6 === 0 ? '#989898' : '#6c6c6c';
    bCtx.fillRect(0, y, 256, 1);
  }
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.anisotropy = maxAnisotropy;

  return { albedo, bump };
}

function createStudioFloorTexture(
  theme: StudioThemeSpec,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = theme.floorBg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = theme.floorGrid;
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

  ctx.strokeStyle = theme.floorCross;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(256 - 9, 256);
  ctx.lineTo(256 + 9, 256);
  ctx.moveTo(256, 256 - 9);
  ctx.lineTo(256, 256 + 9);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 18, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(15, 20, 30, 0.36)');
  grad.addColorStop(0.58, 'rgba(15, 20, 30, 0.14)');
  grad.addColorStop(1, 'rgba(15, 20, 30, 0)');
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

interface BookCoverArtSpec {
  volCode: string;
  eyebrow: string;
  titleLines: string[];
  subtitle: string;
  editionTag: string;
  bgHex: string;
  panelHex: string;
  accentHex: string;
  textHex: string;
  mutedTextHex: string;
  badgeTextHex: string;
  motif: 'grid' | 'columns' | 'nodes' | 'frames';
}

/** High-DPI 1024x1408 editorial book cover renderer with huge, crystal-clear typography */
function createHighDpiBookCoverTexture(
  spec: BookCoverArtSpec,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 1024;
  const h = 1408;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base cloth-bound background
  ctx.fillStyle = spec.bgHex;
  ctx.fillRect(0, 0, w, h);

  // Subtle woven bookcloth grain
  ctx.fillStyle = spec.textHex;
  ctx.globalAlpha = 0.025;
  for (let y = 0; y < h; y += 6) {
    ctx.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 6) {
    ctx.fillRect(x, 0, 1, h);
  }
  ctx.globalAlpha = 1;

  // Left architectural cloth spine band
  ctx.fillStyle = spec.accentHex;
  ctx.fillRect(0, 0, 62, h);

  // Inner editorial frame border
  ctx.strokeStyle = spec.accentHex;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 4;
  ctx.strokeRect(86, 46, w - 132, h - 92);
  ctx.globalAlpha = 1;

  // Top header row: Volume number + category eyebrow
  ctx.fillStyle = spec.accentHex;
  ctx.font = '700 32px "Plus Jakarta Sans", -apple-system, sans-serif';
  ctx.fillText(spec.eyebrow, 126, 122);

  ctx.fillStyle = spec.mutedTextHex;
  ctx.font = '600 30px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(spec.volCode, w - 82, 122);
  ctx.textAlign = 'left';

  // Crisp top hairline rule
  ctx.fillStyle = spec.accentHex;
  ctx.globalAlpha = 0.28;
  ctx.fillRect(126, 154, w - 208, 3);
  ctx.globalAlpha = 1;

  // Bold, oversized, razor-sharp book title
  ctx.fillStyle = spec.textHex;
  ctx.font = '700 104px "Fraunces", Georgia, serif';
  let cursorY = 300;
  for (const line of spec.titleLines) {
    ctx.fillText(line, 126, cursorY, w - 208);
    cursorY += 114;
  }

  // Concise subtitle directly beneath title
  ctx.fillStyle = spec.mutedTextHex;
  ctx.font = '500 35px "Plus Jakarta Sans", -apple-system, sans-serif';
  ctx.fillText(spec.subtitle, 126, cursorY + 18, w - 208);

  // Curated Swiss-editorial geometric emblem box
  const artTop = cursorY + 86;
  const artHeight = 250;
  const artWidth = w - 208;
  ctx.fillStyle = spec.panelHex;
  ctx.fillRect(126, artTop, artWidth, artHeight);

  ctx.save();
  ctx.strokeStyle = spec.accentHex;
  ctx.fillStyle = spec.accentHex;
  ctx.lineWidth = 4;

  if (spec.motif === 'grid') {
    // 4-Path Architectural Matrix (AI for Online Work)
    const cols = 4;
    const cellW = (artWidth - 96) / cols;
    for (let c = 0; c < cols; c++) {
      const bx = 174 + c * cellW;
      ctx.globalAlpha = c === 0 ? 0.92 : 0.22 + c * 0.14;
      ctx.fillRect(bx, artTop + 48, cellW - 22, 154);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = spec.badgeTextHex;
    ctx.font = '700 30px "JetBrains Mono", monospace';
    ctx.fillText('01', 196, artTop + 102);
  } else if (spec.motif === 'columns') {
    // Executive Brief Compression Bars (ChatGPT 9-to-5)
    const bars = [0.85, 0.62, 0.44, 0.28];
    bars.forEach((ratio, i) => {
      ctx.globalAlpha = i === 3 ? 1 : 0.38 + i * 0.15;
      ctx.fillRect(174, artTop + 44 + i * 44, (artWidth - 96) * ratio, 22);
    });
  } else if (spec.motif === 'nodes') {
    // 3-Stage Workflow Chain + Gate (AI Workflow Architect)
    const cy = artTop + artHeight / 2;
    const xs = [235, 512, 789];
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(xs[0], cy);
    ctx.lineTo(xs[2], cy);
    ctx.stroke();
    xs.forEach((cx, idx) => {
      ctx.globalAlpha = idx === 1 ? 1 : 0.72;
      ctx.beginPath();
      ctx.arc(cx, cy, idx === 1 ? 42 : 30, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // Nested Prompt Frames (Prompt Engineering Manual)
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = 0.35 + k * 0.3;
      const pad = 34 + k * 28;
      ctx.strokeRect(126 + pad, artTop + pad * 0.6, artWidth - pad * 2, artHeight - pad * 1.2);
    }
  }
  ctx.restore();

  // Author signature line
  ctx.fillStyle = spec.textHex;
  ctx.font = '600 34px "Plus Jakarta Sans", -apple-system, sans-serif';
  ctx.fillText('James Walker AI', 126, 1134);

  ctx.fillStyle = spec.mutedTextHex;
  ctx.font = '500 28px "Plus Jakarta Sans", -apple-system, sans-serif';
  ctx.fillText('Interactive Game-Book Edition', 126, 1178);

  // High-contrast bottom CTA / Edition ribbon
  ctx.fillStyle = spec.accentHex;
  ctx.fillRect(126, 1226, w - 208, 92);
  ctx.fillStyle = spec.badgeTextHex;
  ctx.font = '700 34px "Plus Jakarta Sans", -apple-system, sans-serif';
  ctx.fillText(spec.editionTag, 162, 1284);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Crisp book spine title texture so books read clearly even from side orbit angles */
function createBookSpineTexture(
  title: string,
  bgHex: string,
  textHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 160;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = textHex;
  ctx.font = '700 44px "Fraunces", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 0, 4);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
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
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight,
  );

  container.replaceChildren();
  container.appendChild(renderer.domElement);

  const initialTheme = STUDIO_THEMES.gallery;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(initialTheme.bg);
  scene.fog = new THREE.FogExp2(initialTheme.bg, 0.028);

  // Studio IBL via RoomEnvironment + PMREMGenerator on every device
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  track(envTarget);
  pmremGenerator.dispose();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  const camera = new THREE.PerspectiveCamera(38, width / Math.max(1, height), 0.1, 80);
  camera.position.set(...CAMERA_PRESETS.overview.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.minDistance = 2.4;
  controls.maxDistance = 12.0;
  controls.target.set(...CAMERA_PRESETS.overview.look);
  controls.update();

  // Balanced 3-Point Museum Lighting Rig (Warm Key + Cool Sky Fill + Rim)
  const hemiLight = new THREE.HemisphereLight(
    initialTheme.hemiSky,
    initialTheme.hemiGround,
    initialTheme.hemiIntensity,
  );
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff9f0, initialTheme.keyIntensity);
  keyLight.position.set(4.5, 8.2, 6.4);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 26;
  const sd = 6.2;
  keyLight.shadow.camera.left = -sd;
  keyLight.shadow.camera.right = sd;
  keyLight.shadow.camera.top = sd;
  keyLight.shadow.camera.bottom = -sd;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(initialTheme.rimColor, initialTheme.rimIntensity);
  rimLight.position.set(-5.2, 5.0, -5.5);
  scene.add(rimLight);

  // Procedural Textures
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const { albedo: paperAlbedo, bump: paperBump } = createPaperBlockTextures(maxAniso);
  track(paperAlbedo);
  track(paperBump);

  const floorTextures: Record<MaterialFinishId, THREE.CanvasTexture> = {
    gallery: track(createStudioFloorTexture(STUDIO_THEMES.gallery, maxAniso)),
    obsidian: track(createStudioFloorTexture(STUDIO_THEMES.obsidian, maxAniso)),
    atelier: track(createStudioFloorTexture(STUDIO_THEMES.atelier, maxAniso)),
  };

  const contactTex = track(createContactShadowTexture());

  // Shared Studio Materials
  const pedestalMat = track(
    new THREE.MeshStandardMaterial({
      color: initialTheme.pedestal,
      roughness: 0.78,
      metalness: 0.04,
    }),
  );

  const pedestalTrimMat = track(
    new THREE.MeshStandardMaterial({
      color: initialTheme.pedestalTrim,
      roughness: 0.65,
      metalness: 0.08,
    }),
  );

  const metalMat = track(
    new THREE.MeshPhysicalMaterial({
      color: initialTheme.metal,
      roughness: initialTheme.metalRough,
      metalness: 0.92,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
    }),
  );

  const paperMat = track(
    new THREE.MeshStandardMaterial({
      map: paperAlbedo,
      bumpMap: paperBump,
      bumpScale: 0.005,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const contactMat = track(
    new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  // Infinite Architectural Drafting Floor
  const groundGeo = track(new THREE.PlaneGeometry(76, 76));
  const groundMat = track(
    new THREE.MeshStandardMaterial({
      map: floorTextures.gallery,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // =========================================================================
  // ARCHITECTURAL GALLERY STAGE (Stepped Reading Plinth + Brass Azimuth Ring)
  // =========================================================================
  const stageGroup = new THREE.Group();
  scene.add(stageGroup);

  const stageShadow = new THREE.Mesh(track(new THREE.PlaneGeometry(9.2, 6.2)), contactMat);
  stageShadow.rotation.x = -Math.PI / 2;
  stageShadow.position.set(0, 0.018, -0.15);
  stageGroup.add(stageShadow);

  // Wide lower plinth dais (grounded flush at y = 0)
  const lowerDaisGeo = track(new THREE.CylinderGeometry(3.85, 4.05, 0.22, 64));
  const lowerDais = new THREE.Mesh(lowerDaisGeo, pedestalMat);
  lowerDais.position.set(0, 0.11, -0.1);
  lowerDais.receiveShadow = true;
  lowerDais.castShadow = true;
  stageGroup.add(lowerDais);

  // Subtle brass perimeter inlay ring on the dais
  const daisRingGeo = track(new THREE.TorusGeometry(3.84, 0.022, 16, 96));
  const daisRing = new THREE.Mesh(daisRingGeo, metalMat);
  daisRing.rotation.x = Math.PI / 2;
  daisRing.position.set(0, 0.22, -0.1);
  stageGroup.add(daisRing);

  // Elevated rear gallery riser for Book #4 so all 4 volumes read clearly from the front
  const rearRiserGeo = track(new THREE.CylinderGeometry(1.18, 1.32, 0.62, 48));
  const rearRiser = new THREE.Mesh(rearRiserGeo, pedestalTrimMat);
  rearRiser.position.set(0, 0.53, -1.55);
  rearRiser.castShadow = true;
  rearRiser.receiveShadow = true;
  stageGroup.add(rearRiser);

  const rearRiserRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(1.18, 0.02, 14, 64)),
    metalMat,
  );
  rearRiserRing.rotation.x = Math.PI / 2;
  rearRiserRing.position.set(0, 0.84, -1.55);
  stageGroup.add(rearRiserRing);

  // =========================================================================
  // FOUR HERO COMPOSITE 6-PART HARDCOVER BOOKS (Large, Face-Forward & Crisp)
  // =========================================================================
  const clickableProxies: THREE.Object3D[] = [];

  interface BookMonument {
    slug: string;
    group: THREE.Group;
    tomeGroup: THREE.Group;
    frontCoverBoard: THREE.Mesh;
    coverPlate: THREE.Mesh;
    pageBlock: THREE.Mesh;
    backCoverBoard: THREE.Mesh;
    spineBand: THREE.Mesh;
    bookmarkRibbon: THREE.Mesh;
    plinthRing: THREE.Mesh;
    baseY: number;
    baseTiltY: number;
    phase: number;
  }

  const bookMonuments: BookMonument[] = [];

  const volumeSpecs: Array<{
    slug: string;
    pos: [number, number, number];
    baseFloorY: number;
    tilt: number;
    scale: number;
    featured?: boolean;
    boardHex: number;
    spineHex: number;
    ribbonHex: number;
    spineTitle: string;
    cover: BookCoverArtSpec;
  }> = [
    {
      slug: 'ai-for-online-work',
      pos: [0, 0, 0.85],
      baseFloorY: 0.22,
      tilt: 0,
      scale: 1.15,
      featured: true,
      boardHex: 0xffffff,
      spineHex: 0x1d4ed8,
      ribbonHex: 0x1d4ed8,
      spineTitle: 'AI FOR ONLINE WORK · 2026',
      cover: {
        volCode: 'VOL. 01',
        eyebrow: '2026 FLAGSHIP ROADMAP',
        titleLines: ['AI for', 'Online', 'Work'],
        subtitle: 'Practical Digital Skills Guide',
        editionTag: '2 Free Chapters · Open Book',
        bgHex: '#FFFFFF',
        panelHex: '#EFF4FF',
        accentHex: '#1D4ED8',
        textHex: '#0F141E',
        mutedTextHex: '#4E5869',
        badgeTextHex: '#FFFFFF',
        motif: 'grid',
      },
    },
    {
      slug: 'chatgpt-9-to-5',
      pos: [-2.4, 0, 0.15],
      baseFloorY: 0.22,
      tilt: 0.34,
      scale: 1.0,
      boardHex: 0x111b2e,
      spineHex: 0xd4af6a,
      ribbonHex: 0xd4af6a,
      spineTitle: 'CHATGPT FOR YOUR 9-TO-5',
      cover: {
        volCode: 'VOL. 02',
        eyebrow: 'WORKPLACE OPERATIONS',
        titleLines: ['ChatGPT', 'for Your', '9-to-5'],
        subtitle: 'Inbox, Memos & Escalations',
        editionTag: '2 Free Chapters · Gumroad',
        bgHex: '#111B2E',
        panelHex: '#192640',
        accentHex: '#D4AF6A',
        textHex: '#FFFFFF',
        mutedTextHex: '#B6C2D6',
        badgeTextHex: '#0F141E',
        motif: 'columns',
      },
    },
    {
      slug: 'ai-workflow-architect',
      pos: [2.4, 0, 0.15],
      baseFloorY: 0.22,
      tilt: -0.34,
      scale: 1.0,
      boardHex: 0x122624,
      spineHex: 0xd9b77a,
      ribbonHex: 0xd9b77a,
      spineTitle: 'AI WORKFLOW ARCHITECT',
      cover: {
        volCode: 'VOL. 03',
        eyebrow: 'AUTOMATION & CHAINS',
        titleLines: ['AI', 'Workflow', 'Architect'],
        subtitle: 'Modular Chains & Safety Gates',
        editionTag: '2 Free Chapters · Gumroad',
        bgHex: '#122624',
        panelHex: '#1A3633',
        accentHex: '#D9B77A',
        textHex: '#FFFFFF',
        mutedTextHex: '#B7CFCB',
        badgeTextHex: '#0F141E',
        motif: 'nodes',
      },
    },
    {
      slug: 'prompt-engineering-manual',
      pos: [0, 0, -1.55],
      baseFloorY: 0.84,
      tilt: 0,
      scale: 1.02,
      boardHex: 0x16181d,
      spineHex: 0x3b82f6,
      ribbonHex: 0x3b82f6,
      spineTitle: 'PROMPT ENGINEERING MANUAL',
      cover: {
        volCode: 'VOL. 04',
        eyebrow: 'PROMPT CRAFT MANUAL',
        titleLines: ['Prompt', 'Engineering', 'Manual'],
        subtitle: 'Style Anchors & System Prompts',
        editionTag: '2 Free Chapters · Gumroad',
        bgHex: '#16181D',
        panelHex: '#20242D',
        accentHex: '#3B82F6',
        textHex: '#FFFFFF',
        mutedTextHex: '#B8C0CC',
        badgeTextHex: '#FFFFFF',
        motif: 'frames',
      },
    },
  ];

  // Generous Hero Book Dimensions (more than 2x larger than before!)
  const BOOK_W = 1.36;
  const BOOK_H = 1.88;
  const BOARD_T = 0.036;
  const PAGE_T = 0.16;

  const bookBoardShape = createBeveledRectShape(BOOK_W, BOOK_H, 0.045);
  const bookBoardGeo = track(
    new THREE.ExtrudeGeometry(bookBoardShape, {
      depth: BOARD_T,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    }),
  );
  bookBoardGeo.center();

  const pageBlockGeo = track(new THREE.BoxGeometry(BOOK_W - 0.08, BOOK_H - 0.08, PAGE_T));
  const spineGeo = track(new THREE.BoxGeometry(0.1, BOOK_H + 0.015, PAGE_T + BOARD_T * 2 + 0.02));
  const coverPlateGeo = track(new THREE.PlaneGeometry(BOOK_W - 0.02, BOOK_H - 0.02));
  const ribbonGeo = track(new THREE.BoxGeometry(0.085, 0.42, 0.012));
  const bookShadowGeo = track(new THREE.PlaneGeometry(2.3, 2.3));
  const bookStandGeo = track(new THREE.CylinderGeometry(0.86, 0.94, 0.14, 40));
  const proxyGeo = track(new THREE.BoxGeometry(1.75, 2.35, 1.1));
  const proxyMat = track(new THREE.MeshBasicMaterial({ visible: false }));

  volumeSpecs.forEach((spec, idx) => {
    const volRoot = new THREE.Group();
    volRoot.position.set(spec.pos[0], spec.baseFloorY, spec.pos[2]);
    scene.add(volRoot);

    // Contact shadow on pedestal surface
    const sh = new THREE.Mesh(bookShadowGeo, contactMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.015;
    volRoot.add(sh);

    // Individual gallery puck pedestal
    const stand = new THREE.Mesh(bookStandGeo, pedestalMat);
    stand.position.y = 0.07;
    stand.castShadow = true;
    stand.receiveShadow = true;
    volRoot.add(stand);

    const ringGeo = track(new THREE.TorusGeometry(0.86, spec.featured ? 0.024 : 0.017, 14, 48));
    const ringMat = track(
      new THREE.MeshPhysicalMaterial({
        color: spec.featured ? 0x1d4ed8 : initialTheme.metal,
        roughness: 0.22,
        metalness: spec.featured ? 0.35 : 0.92,
        clearcoat: 0.45,
      }),
    );
    const plinthRing = new THREE.Mesh(ringGeo, ringMat);
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.y = 0.142;
    volRoot.add(plinthRing);

    // Composite 6-Part Hardcover Book Assembly
    const tomeGroup = new THREE.Group();
    const baseY = 0.14 + (BOOK_H * spec.scale) / 2 + 0.06;
    tomeGroup.position.set(0, baseY, 0);
    tomeGroup.rotation.y = spec.tilt;
    tomeGroup.rotation.x = -0.07; // Subtle gallery easel tilt back so covers catch key light cleanly
    tomeGroup.scale.setScalar(spec.scale);
    volRoot.add(tomeGroup);

    const boardMat = track(
      new THREE.MeshStandardMaterial({
        color: spec.boardHex,
        roughness: 0.68,
        metalness: 0.06,
      }),
    );

    // Part 1: Front hardcover board
    const frontCoverBoard = new THREE.Mesh(bookBoardGeo, boardMat);
    frontCoverBoard.position.z = PAGE_T / 2 + BOARD_T / 2;
    frontCoverBoard.castShadow = true;
    frontCoverBoard.receiveShadow = true;
    tomeGroup.add(frontCoverBoard);

    // Part 2: Ultra-crisp High-DPI Front Cover Art Plate (emissive lift prevents shadowed muddy letters)
    const coverTex = track(createHighDpiBookCoverTexture(spec.cover, maxAniso));
    const coverPlateMat = track(
      new THREE.MeshStandardMaterial({
        map: coverTex,
        emissive: 0xffffff,
        emissiveMap: coverTex,
        emissiveIntensity: 0.14,
        roughness: 0.56,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    const coverPlate = new THREE.Mesh(coverPlateGeo, coverPlateMat);
    coverPlate.position.z = PAGE_T / 2 + BOARD_T + 0.012;
    tomeGroup.add(coverPlate);

    // Refresh cover texture cleanly once web fonts (Fraunces / Plus Jakarta Sans) finish loading
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (disposed) return;
        const freshTex = track(createHighDpiBookCoverTexture(spec.cover, maxAniso));
        coverPlateMat.map = freshTex;
        coverPlateMat.emissiveMap = freshTex;
        coverPlateMat.needsUpdate = true;
      });
    }

    // Part 3: Cotton Paper Page Block
    const pageBlock = new THREE.Mesh(pageBlockGeo, paperMat);
    pageBlock.position.x = 0.025;
    pageBlock.castShadow = true;
    pageBlock.receiveShadow = true;
    tomeGroup.add(pageBlock);

    // Part 4: Back hardcover board
    const backCoverBoard = new THREE.Mesh(bookBoardGeo, boardMat);
    backCoverBoard.position.z = -(PAGE_T / 2 + BOARD_T / 2);
    backCoverBoard.castShadow = true;
    backCoverBoard.receiveShadow = true;
    tomeGroup.add(backCoverBoard);

    // Part 5: Cloth Spine with Printed Vertical Title
    const spineTex = track(
      createBookSpineTexture(
        spec.spineTitle,
        spec.cover.accentHex,
        spec.cover.badgeTextHex,
        maxAniso,
      ),
    );
    const spineMatSide = track(
      new THREE.MeshStandardMaterial({
        color: spec.spineHex,
        roughness: 0.45,
        metalness: 0.15,
      }),
    );
    const spineMatTitle = track(
      new THREE.MeshStandardMaterial({
        map: spineTex,
        emissive: 0xffffff,
        emissiveMap: spineTex,
        emissiveIntensity: 0.1,
        roughness: 0.45,
        metalness: 0.12,
      }),
    );
    const spineBand = new THREE.Mesh(spineGeo, [
      spineMatSide,
      spineMatTitle, // -X face is the outward book spine!
      spineMatSide,
      spineMatSide,
      spineMatSide,
      spineMatSide,
    ]);
    spineBand.position.x = -BOOK_W / 2 - 0.01;
    spineBand.castShadow = true;
    tomeGroup.add(spineBand);

    // Part 6: Woven Satin Bookmark Ribbon tucked below bottom page edge
    const ribbonMat = track(
      new THREE.MeshStandardMaterial({
        color: spec.ribbonHex,
        roughness: 0.55,
        metalness: 0.08,
      }),
    );
    const bookmarkRibbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    bookmarkRibbon.position.set(0.24, -BOOK_H / 2 - 0.06, 0.01);
    bookmarkRibbon.rotation.z = 0.06;
    tomeGroup.add(bookmarkRibbon);

    // Layer 1 Proxy Hitbox for instant pointer picking
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    proxy.position.set(0, baseY, 0);
    proxy.rotation.y = spec.tilt;
    proxy.scale.setScalar(spec.scale);
    proxy.userData.bookSlug = spec.slug;
    proxy.layers.set(1);
    volRoot.add(proxy);
    clickableProxies.push(proxy);

    bookMonuments.push({
      slug: spec.slug,
      group: volRoot,
      tomeGroup,
      frontCoverBoard,
      coverPlate,
      pageBlock,
      backCoverBoard,
      spineBand,
      bookmarkRibbon,
      plinthRing,
      baseY,
      baseTiltY: spec.tilt,
      phase: idx * 1.45,
    });
  });

  // =========================================================================
  // SUBTLE INSTANCED EDITORIAL INDEX TILES (36 Architectural Orbit Markers)
  // =========================================================================
  const GLYPH_COUNT = 36;
  const glyphGeo = track(new THREE.BoxGeometry(0.085, 0.018, 0.12));
  const glyphMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.45,
    }),
  );
  const glyphMesh = new THREE.InstancedMesh(glyphGeo, glyphMat, GLYPH_COUNT);
  glyphMesh.frustumCulled = false;

  const glyphMeta: Array<{ radius: number; angle: number; speed: number; yBase: number; scale: number }> = [];
  const paletteTints = [0x1d4ed8, 0xb89352, 0x0f141e, 0x64748b];

  for (let i = 0; i < GLYPH_COUNT; i++) {
    const ringTier = i % 2;
    const radius = 3.65 + ringTier * 0.72 + ((i * 13) % 8) * 0.05;
    const angle = (i / GLYPH_COUNT) * Math.PI * 2;
    const speed = (ringTier % 2 === 0 ? 1 : -1) * (0.09 + (i % 4) * 0.015);
    const yBase = 0.55 + ringTier * 1.65 + Math.sin(i * 1.9) * 0.18;
    const scale = 0.85 + ((i * 23) % 30) / 100;
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
  let selectedSlug: string | null = 'ai-for-online-work';

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

  let lastClickTime = 0;
  let lastClickedSlug: string | null = null;
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
      const now = performance.now();
      const isSecondTap = slug === lastClickedSlug && now - lastClickTime < 650;
      lastClickTime = now;
      lastClickedSlug = slug;
      selectedSlug = slug;
      setCameraPreset(slug);
      callbacks.onSelectBook(slug);
      if (isSecondTap && callbacks.onOpenBook) {
        callbacks.onOpenBook(slug);
      }
    }
  };

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

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

    // Exponentially damped exploded-book-anatomy separation across all 4 volumes
    explodeCurrent = THREE.MathUtils.damp(explodeCurrent, explodeTarget, 6.5, dt);

    for (const mon of bookMonuments) {
      const isHovered = hoveredSlug === mon.slug;
      const isSelected = selectedSlug === mon.slug;
      const lift = isHovered ? 0.16 : isSelected ? 0.08 : 0;
      const targetY = mon.baseY + Math.sin(elapsed * 1.25 + mon.phase) * 0.022 + lift;
      const targetRotX = isHovered ? -0.14 : isSelected ? -0.1 : -0.07;

      mon.tomeGroup.position.y = THREE.MathUtils.damp(mon.tomeGroup.position.y, targetY, 8, dt);
      mon.tomeGroup.rotation.x = THREE.MathUtils.damp(mon.tomeGroup.rotation.x, targetRotX, 7, dt);

      // Explode layers smoothly along book depth/spine axes
      const frontZ = PAGE_T / 2 + BOARD_T / 2 + explodeCurrent * 0.34;
      mon.frontCoverBoard.position.z = frontZ;
      mon.coverPlate.position.z = frontZ + BOARD_T / 2 + 0.012 + explodeCurrent * 0.12;
      mon.pageBlock.position.z = 0;
      mon.backCoverBoard.position.z = -(PAGE_T / 2 + BOARD_T / 2) - explodeCurrent * 0.34;
      mon.spineBand.position.x = -BOOK_W / 2 - 0.01 - explodeCurrent * 0.24;
      mon.bookmarkRibbon.position.y = -BOOK_H / 2 - 0.06 - explodeCurrent * 0.14;
    }

    // Update orbital editorial index markers (zero per-frame allocations)
    for (let i = 0; i < GLYPH_COUNT; i++) {
      const g = glyphMeta[i];
      const a = g.angle + elapsed * g.speed;
      _vec3.set(
        Math.cos(a) * g.radius,
        g.yBase + Math.sin(elapsed * 1.0 + i) * 0.05 + explodeCurrent * 0.2,
        Math.sin(a) * g.radius - 0.1,
      );
      _euler.set(0.2 * Math.sin(elapsed + i), -a + Math.PI / 2, 0.12);
      _quat.setFromEuler(_euler);
      _scale.setScalar(g.scale);
      _mat4.compose(_vec3, _quat, _scale);
      glyphMesh.setMatrixAt(i, _mat4);
    }
    glyphMesh.instanceMatrix.needsUpdate = true;

    // Smooth camera preset glide
    if (cameraTransitionActive) {
      const alpha = 1 - Math.exp(-5.8 * dt);
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
    if (preset !== 'overview' && preset !== 'plan') {
      selectedSlug = preset;
    }
    _targetPos.set(...spec.pos);
    _targetLook.set(...spec.look);
    cameraTransitionActive = true;
  }

  function setFinish(finish: MaterialFinishId) {
    const t = STUDIO_THEMES[finish];
    if (!t) return;
    scene.background = new THREE.Color(t.bg);
    scene.fog = new THREE.FogExp2(t.bg, 0.028);
    groundMat.map = floorTextures[finish];
    groundMat.needsUpdate = true;
    pedestalMat.color.setHex(t.pedestal);
    pedestalTrimMat.color.setHex(t.pedestalTrim);
    metalMat.color.setHex(t.metal);
    metalMat.roughness = t.metalRough;
    hemiLight.color.setHex(t.hemiSky);
    hemiLight.groundColor.setHex(t.hemiGround);
    hemiLight.intensity = t.hemiIntensity;
    keyLight.intensity = t.keyIntensity;
    rimLight.color.setHex(t.rimColor);
    rimLight.intensity = t.rimIntensity;
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
