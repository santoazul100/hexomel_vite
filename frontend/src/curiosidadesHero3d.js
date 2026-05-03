import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const PART_DETAILS = {
  all: {
    title: "Modelo completo",
    text: "Frasco Hexomel inspirado numa fotografia real, com tampa metalica dourada, vidro com relevo de favos e mel ambar quase ate ao ombro.",
    targetY: 0.4,
  },
  lid: {
    title: "Tampa metalica",
    text: "A tampa foi redesenhada como metal dourado baixo e largo, com reflexos de estudio e encaixe mais proximo do frasco de referencia.",
    targetY: 2.4,
  },
  glass: {
    title: "Vidro e rotulo",
    text: "O corpo usa vidro fisico com transparencia real, banda de favos em relevo e um rotulo frontal Hexomel curvado na superficie.",
    targetY: 0.5,
  },
  honey: {
    title: "Mel ambar",
    text: "O interior foi preenchido com um volume mais alto, denso e transluzido, para lembrar o tom alaranjado do mel da fotografia.",
    targetY: 0.0,
  },
};

const HONEY_TYPES = [
  {
    id: "lavender",
    name: "Mel de Alfazema",
    color: 0xfde68a,
    coreColor: 0xfbbf24,
    surfaceColor: 0xfcd34d,
    transmission: 0.72,
    attenuationDistance: 2.5,
    attenuationColor: 0xfef3c7,
    description: "Um mel extremamente claro e suave, colhido nas flores de alfazema (lavanda). É conhecido pela sua doçura delicada e transparência cristalina.",
  },
  {
    id: "orange",
    name: "Flor de Laranjeira",
    color: 0xf59e0b,
    coreColor: 0xd97706,
    surfaceColor: 0xfbbf24,
    transmission: 0.55,
    attenuationDistance: 1.8,
    attenuationColor: 0xfde68a,
    description: "Um mel aromático com notas cítricas, de cor âmbar clara e brilho radiante. Muito popular pela sua textura fluida e sabor refrescante.",
  },
  {
    id: "wildflower",
    name: "Mel Multiflora",
    color: 0xe67e22,
    coreColor: 0xd35400,
    surfaceColor: 0xf39c12,
    transmission: 0.38,
    attenuationDistance: 1.2,
    attenuationColor: 0xca6f1e,
    description: "O clássico mel de mil flores, com um tom âmbar médio e sabor equilibrado. Representa a diversidade da flora mediterrânica.",
  },
  {
    id: "eucalyptus",
    name: "Mel de Eucalipto",
    color: 0xc0792a,
    coreColor: 0x935f20,
    surfaceColor: 0xa8681e,
    transmission: 0.22,
    attenuationDistance: 0.7,
    attenuationColor: 0x7d4e1a,
    description: "Um mel de cor âmbar escura com reflexos dourados. Possui um aroma intenso a madeira e propriedades balsâmicas naturais.",
  },
  {
    id: "buckwheat",
    name: "Mel de Urze / Escuro",
    color: 0x8b5e34,
    coreColor: 0x5d3a1a,
    surfaceColor: 0x6d4c2a,
    transmission: 0.08,
    attenuationDistance: 0.35,
    attenuationColor: 0x3e2215,
    description: "Um dos méis mais escuros e densos, rico em minerais. Tem um sabor persistente, quase amargo, e uma opacidade profunda.",
  },
];

class HoneyJarHero3D {
  constructor(root) {
    this.root = root;
    this.canvasHost = root.querySelector("[data-honey-canvas]");
    this.buttons = [...root.querySelectorAll("[data-focus-part]")];
    this.titleNode = root.querySelector("[data-part-title]");
    this.textNode = root.querySelector("[data-part-text]");
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    this.presentationGroup = null;
    this.jarGroup = null;
    this.parts = new Map();
    this.activePart = "all";
    this.targetFocusY = PART_DETAILS.all.targetY;
    this.textureLoader = null;
    this.maxAnisotropy = 1;
    this.environmentTarget = null;
    this.honeyMaterials = {
      volume: null,
      core: null,
      surface: null,
    };
    this.colorSlider = null;
    this.typeLabel = null;

    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    this.init();
  }

  init() {
    if (!this.canvasHost) return;

    if (!this.supportsWebGL()) {
      this.enableFallback();
      return;
    }

    try {
      this.createRenderer();
      this.textureLoader = new THREE.TextureLoader();
      this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
      this.createScene();
      this.createLights();
      this.createStage();
      this.buildJar();
      this.bindEvents();
      this.handleResize();
      this.setActivePart("all");
      this.renderer.setAnimationLoop(this.animate);
    } catch (error) {
      console.error("Nao foi possivel criar o modelo 3D do frasco.", error);
      this.enableFallback();
    }
  }

  supportsWebGL() {
    const canvas = document.createElement("canvas");

    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.canvasHost.appendChild(this.renderer.domElement);
  }

  createScene() {
    this.scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = pmremGenerator.fromScene(
      new RoomEnvironment(this.renderer),
      0.05
    );
    this.scene.environment = this.environmentTarget.texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    this.camera.position.set(6.0, 3.0, 11.8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.minDistance = 8.5;
    this.controls.maxDistance = 14.0;
    this.controls.minPolarAngle = Math.PI * 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.58;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.42;
    this.controls.target.set(0, PART_DETAILS.all.targetY, 0);
  }

  createLights() {
    const ambient = new THREE.AmbientLight(0xfffbef, 0.72);
    this.scene.add(ambient);

    const hemisphere = new THREE.HemisphereLight(0xffffff, 0xe2b66e, 0.82);
    hemisphere.position.set(0, 4, 0);
    this.scene.add(hemisphere);

    const keyLight = new THREE.DirectionalLight(0xfff3da, 2.7);
    keyLight.position.set(4.8, 6.6, 5.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.00012;
    keyLight.shadow.camera.left = -5.8;
    keyLight.shadow.camera.right = 5.8;
    keyLight.shadow.camera.top = 5.8;
    keyLight.shadow.camera.bottom = -5.8;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf7ffff, 1.55);
    rimLight.position.set(-5.8, 3.4, -4.2);
    this.scene.add(rimLight);

    const frontFill = new THREE.PointLight(0xffc862, 20, 18, 2);
    frontFill.position.set(0.3, 1.8, 3.2);
    this.scene.add(frontFill);
  }

  createStage() {
    this.presentationGroup = new THREE.Group();
    this.presentationGroup.position.y = -0.12;
    this.scene.add(this.presentationGroup);

    const shadowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 64),
      new THREE.ShadowMaterial({ opacity: 0.18 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.20;
    shadowPlane.scale.set(1.05, 0.62, 1);
    shadowPlane.receiveShadow = true;
    this.presentationGroup.add(shadowPlane);

    const floorGlow = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 64),
      new THREE.MeshBasicMaterial({
        color: 0xf3d07c,
        transparent: true,
        opacity: 0.08,
      })
    );
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.y = -2.14;
    floorGlow.scale.set(1.1, 0.68, 1);
    this.presentationGroup.add(floorGlow);
  }

  buildJar() {
    this.jarGroup = new THREE.Group();
    this.jarGroup.rotation.y = -0.08;
    this.presentationGroup.add(this.jarGroup);

    const glassGroup = this.buildGlass();
    glassGroup.add(this.buildHoneycombBand());
    glassGroup.add(this.buildLabel());
    glassGroup.add(this.buildReflections());

    const honeyGroup = this.buildHoney();
    const lidGroup = this.buildLid();

    this.jarGroup.add(honeyGroup, glassGroup, lidGroup);

    this.registerPart("glass", glassGroup);
    this.registerPart("honey", honeyGroup);
    this.registerPart("lid", lidGroup);

    // Initial state for slider if UI exists
    this.setupColorSlider();
  }

  setupColorSlider() {
    this.colorSlider = document.querySelector("[data-honey-color-slider]");
    this.typeLabel = document.querySelector("[data-honey-type-name]");
    this.typeDesc = document.querySelector("[data-honey-type-desc]");

    if (this.colorSlider) {
      this.colorSlider.addEventListener("input", (e) => {
        this.updateHoneyType(parseInt(e.target.value));
      });
      // Set initial
      this.updateHoneyType(2); // Wildflower as default
    }
  }

  updateHoneyType(index) {
    const type = HONEY_TYPES[index];
    if (!type || !this.honeyMaterials.volume) return;

    // Update materials
    this.honeyMaterials.volume.color.setHex(type.color);
    this.honeyMaterials.volume.transmission = type.transmission;
    this.honeyMaterials.volume.attenuationDistance = type.attenuationDistance;
    this.honeyMaterials.volume.attenuationColor.setHex(type.attenuationColor);

    this.honeyMaterials.core.color.setHex(type.coreColor);
    this.honeyMaterials.core.transmission = type.transmission * 0.4;
    this.honeyMaterials.core.attenuationColor.setHex(type.attenuationColor);

    this.honeyMaterials.surface.color.setHex(type.surfaceColor);

    // Update UI text
    if (this.typeLabel) this.typeLabel.textContent = type.name;
    if (this.typeDesc) this.typeDesc.textContent = type.description;

    // If focused on honey, update the text too
    if (this.activePart === "honey") {
      this.titleNode.textContent = type.name;
      this.textNode.textContent = type.description;
    }
  }

  buildGlass() {
    const group = new THREE.Group();

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf7efe3,
      transmission: 0.98,
      thickness: 0.34,
      roughness: 0.04,
      metalness: 0,
      ior: 1.49,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.34,
      attenuationDistance: 4.5,
      attenuationColor: new THREE.Color(0xf5eedf),
      envMapIntensity: 1.35,
      side: THREE.DoubleSide,
    });
    glassMaterial.depthWrite = false;

    const shell = new THREE.Mesh(
      this.createLatheGeometry([
        [0, -2.05],
        [1.12, -2.05],
        [1.28, -1.92],
        [1.42, -1.55],
        [1.50, -0.88],
        [1.52, -0.14],
        [1.50, 0.54],
        [1.42, 0.97],
        [1.30, 1.24],
        [1.22, 1.40],
        [1.10, 1.58],
        [0.98, 1.72],
        [1.02, 1.88],
        [1.18, 2.02],
        [1.18, 2.12],
        [0, 2.12],
      ]),
      glassMaterial
    );
    shell.castShadow = true;
    shell.receiveShadow = true;
    shell.renderOrder = 3;
    group.add(shell);

    const lipRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.045, 20, 96),
      new THREE.MeshPhysicalMaterial({
        color: 0xf7f0e4,
        transmission: 0.94,
        thickness: 0.14,
        roughness: 0.07,
        transparent: true,
        opacity: 0.32,
        envMapIntensity: 1.2,
      })
    );
    lipRing.rotation.x = Math.PI / 2;
    lipRing.position.y = 2.02;
    group.add(lipRing);

    const neckRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.04, 0.038, 18, 72),
      new THREE.MeshPhysicalMaterial({
        color: 0xf7f0e4,
        transmission: 0.92,
        thickness: 0.12,
        roughness: 0.08,
        transparent: true,
        opacity: 0.28,
        envMapIntensity: 1.15,
      })
    );
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.y = 1.75;
    group.add(neckRing);

    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.055, 20, 96),
      new THREE.MeshPhysicalMaterial({
        color: 0xf4ebde,
        transmission: 0.9,
        thickness: 0.12,
        roughness: 0.08,
        transparent: true,
        opacity: 0.24,
        envMapIntensity: 1.1,
      })
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -1.97;
    group.add(baseRing);

    return group;
  }

  buildHoneycombBand() {
    const group = new THREE.Group();
    const bumpTexture = this.createHoneycombBumpTexture();

    const honeycombMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf6f0e5,
      transmission: 0.97,
      thickness: 0.2,
      roughness: 0.06,
      transparent: true,
      opacity: 0.18,
      envMapIntensity: 1.2,
      bumpMap: bumpTexture,
      bumpScale: 0.045,
      side: THREE.DoubleSide,
    });
    honeycombMaterial.depthWrite = false;

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(1.24, 1.14, 0.90, 96, 1, true),
      honeycombMaterial
    );
    band.position.y = 1.18;
    band.renderOrder = 4;
    group.add(band);

    return group;
  }

  buildLabel() {
    const group = new THREE.Group();
    const labelArc = 1.9;
    const labelStart = Math.PI / 2 - labelArc / 2;
    const labelTexture = this.textureLoader.load("/images/hexomel_jar_label.png");
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    labelTexture.anisotropy = this.maxAnisotropy;

    const labelMaterial = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.82,
      metalness: 0.02,
      envMapIntensity: 0.36,
    });

    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(
        1.54,
        1.54,
        1.8,
        72,
        1,
        true,
        labelStart,
        labelArc
      ),
      labelMaterial
    );
    label.position.y = -0.38;
    label.renderOrder = 2;
    group.add(label);

    return group;
  }

  buildReflections() {
    const group = new THREE.Group();
    const reflectionTexture = this.createReflectionTexture();

    const highlightMaterial = new THREE.MeshBasicMaterial({
      map: reflectionTexture,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const softMaterial = new THREE.MeshBasicMaterial({
      map: reflectionTexture,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const frontArc = 0.16;
    const frontStart = Math.PI / 2 - frontArc / 2;
    const sideArc = 0.11;
    const sideStart = Math.PI / 2 + 0.22;

    const frontHighlight = new THREE.Mesh(
      new THREE.CylinderGeometry(
        1.56,
        1.56,
        3.5,
        48,
        1,
        true,
        frontStart,
        frontArc
      ),
      highlightMaterial
    );
    frontHighlight.position.y = -0.14;
    frontHighlight.renderOrder = 6;
    group.add(frontHighlight);

    const sideHighlight = new THREE.Mesh(
      new THREE.CylinderGeometry(
        1.55,
        1.55,
        3.0,
        48,
        1,
        true,
        sideStart,
        sideArc
      ),
      softMaterial
    );
    sideHighlight.position.set(0, 0.0, 0);
    sideHighlight.renderOrder = 6;
    group.add(sideHighlight);

    return group;
  }

  buildHoney() {
    const group = new THREE.Group();

    const honeyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe67e22,
      roughness: 0.15,
      transmission: 0.38,
      thickness: 2.8,
      ior: 1.49,
      metalness: 0,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.94,
      attenuationDistance: 1.2,
      attenuationColor: new THREE.Color(0xca6f1e),
      envMapIntensity: 0.92,
      side: THREE.DoubleSide,
    });
    this.honeyMaterials.volume = honeyMaterial;

    const honeyMesh = new THREE.Mesh(
      this.createLatheGeometry([
        [0, -1.95],
        [1.04, -1.95],
        [1.20, -1.82],
        [1.34, -1.44],
        [1.42, -0.76],
        [1.44, -0.04],
        [1.42, 0.52],
        [1.34, 0.88],
        [1.22, 1.12],
        [1.12, 1.22],
        [0.25, 1.22],
        [0, 1.20],
      ]),
      honeyMaterial
    );
    honeyMesh.castShadow = true;
    honeyMesh.receiveShadow = true;
    honeyMesh.renderOrder = 1;
    group.add(honeyMesh);

    const core = new THREE.Mesh(
      this.createLatheGeometry([
        [0, -1.84],
        [0.88, -1.84],
        [1.02, -1.71],
        [1.14, -1.30],
        [1.22, -0.62],
        [1.24, 0.04],
        [1.22, 0.52],
        [1.12, 0.84],
        [1.02, 1.04],
        [0.92, 1.12],
        [0.20, 1.12],
        [0, 1.10],
      ]),
      new THREE.MeshPhysicalMaterial({
        color: 0xd35400,
        roughness: 0.18,
        transmission: 0.15,
        thickness: 2.4,
        transparent: true,
        opacity: 0.75,
        attenuationDistance: 0.8,
        attenuationColor: new THREE.Color(0xb34700),
        envMapIntensity: 0.5,
        side: THREE.DoubleSide,
      })
    );
    this.honeyMaterials.core = core.material;
    core.position.z = -0.02;
    core.renderOrder = 1;
    group.add(core);

    const surface = new THREE.Mesh(
      new THREE.CircleGeometry(1.38, 72),
      new THREE.MeshPhysicalMaterial({
        color: 0xf39c12,
        transparent: true,
        opacity: 0.72,
        roughness: 0.06,
        transmission: 0.2,
        clearcoat: 0.6,
        envMapIntensity: 0.62,
      })
    );
    this.honeyMaterials.surface = surface.material;
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 1.21;
    group.add(surface);

    const bubbleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      transmission: 0.5,
      thickness: 0.1,
    });
    const bubbleGeometry = new THREE.SphereGeometry(0.055, 14, 14);
    const bubbleOffsets = [
      [-0.3, 0.6, 0.22],
      [0.24, 0.48, -0.18],
      [0.35, 0.72, 0.10],
      [-0.4, 0.34, -0.20],
      [0.06, 0.78, -0.28],
      [-0.12, 0.52, 0.26],
      [0.42, 0.20, 0.14],
      [-0.36, -0.10, -0.24],
    ];

    bubbleOffsets.forEach(([x, y, z], index) => {
      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial.clone());
      bubble.position.set(x, y, z);
      bubble.scale.setScalar(0.88 + index * 0.06);
      group.add(bubble);
    });

    return group;
  }

  buildLid() {
    const group = new THREE.Group();
    const sideTexture = this.createLidSideTexture();
    const topTexture = this.createLidTopTexture();

    const sideMaterial = new THREE.MeshStandardMaterial({
      map: sideTexture,
      color: 0xe0c262,
      metalness: 0.94,
      roughness: 0.3,
      envMapIntensity: 2,
      side: THREE.DoubleSide,
    });

    const topMaterial = new THREE.MeshStandardMaterial({
      map: topTexture,
      color: 0xe7cd74,
      metalness: 0.97,
      roughness: 0.24,
      envMapIntensity: 2.1,
    });

    const bandMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7b24f,
      metalness: 0.9,
      roughness: 0.34,
      envMapIntensity: 1.8,
    });

    const side = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.36, 0.32, 96, 1, true),
      sideMaterial
    );
    side.position.y = 2.34;
    side.castShadow = true;
    side.receiveShadow = true;
    group.add(side);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.39, 1.35, 0.048, 96),
      topMaterial
    );
    top.position.y = 2.52;
    top.castShadow = true;
    group.add(top);

    const underside = new THREE.Mesh(
      new THREE.CylinderGeometry(1.14, 1.14, 0.09, 96),
      bandMaterial
    );
    underside.position.y = 2.12;
    underside.castShadow = true;
    group.add(underside);

    const sealBand = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.10, 0.12, 96),
      new THREE.MeshStandardMaterial({
        color: 0xd9b24a,
        metalness: 0.88,
        roughness: 0.38,
        envMapIntensity: 1.7,
      })
    );
    sealBand.position.y = 2.00;
    sealBand.castShadow = true;
    group.add(sealBand);

    return group;
  }

  createLatheGeometry(points) {
    const geometry = new THREE.LatheGeometry(
      points.map(([radius, y]) => new THREE.Vector2(radius, y)),
      96
    );
    geometry.computeVertexNormals();
    return geometry;
  }

  createBackdropTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");

    const background = context.createLinearGradient(0, 0, 0, 1024);
    background.addColorStop(0, "#ffffff");
    background.addColorStop(0.66, "#f9f9f7");
    background.addColorStop(1, "#eef1f3");
    context.fillStyle = background;
    context.fillRect(0, 0, 1024, 1024);

    const topGlow = context.createRadialGradient(512, 220, 60, 512, 220, 340);
    topGlow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    topGlow.addColorStop(0.55, "rgba(255, 241, 206, 0.2)");
    topGlow.addColorStop(1, "rgba(255, 241, 206, 0)");
    context.fillStyle = topGlow;
    context.fillRect(0, 0, 1024, 1024);

    const floorGradient = context.createLinearGradient(0, 640, 0, 1024);
    floorGradient.addColorStop(0, "rgba(210, 214, 216, 0)");
    floorGradient.addColorStop(0.3, "rgba(210, 214, 216, 0.18)");
    floorGradient.addColorStop(1, "rgba(195, 198, 202, 0.38)");
    context.fillStyle = floorGradient;
    context.fillRect(0, 640, 1024, 384);

    const floorLine = context.createLinearGradient(0, 0, 1024, 0);
    floorLine.addColorStop(0, "rgba(210, 214, 216, 0)");
    floorLine.addColorStop(0.5, "rgba(198, 202, 205, 0.6)");
    floorLine.addColorStop(1, "rgba(210, 214, 216, 0)");
    context.fillStyle = floorLine;
    context.fillRect(64, 700, 896, 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  createHoneycombBumpTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#888888";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.lineWidth = 6;
    context.strokeStyle = "#f5f5f5";
    context.fillStyle = "#9e9e9e";

    const radius = 34;
    const dx = radius * 1.72;
    const dy = radius * 1.48;
    const columns = 10;
    const rows = 5;

    const drawHexagon = (cx, cy) => {
      context.beginPath();

      for (let index = 0; index < 6; index += 1) {
        const angle = Math.PI / 3 * index - Math.PI / 6;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.closePath();
      context.fill();
      context.stroke();
    };

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const offsetX = row % 2 === 0 ? 0 : dx / 2;
        drawHexagon(column * dx + 24 + offsetX, row * dy + 26);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.8, 1.8);
    return texture;
  }

  createReflectionTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1024;
    const context = canvas.getContext("2d");

    const horizontalGlow = context.createLinearGradient(0, 0, 256, 0);
    horizontalGlow.addColorStop(0, "rgba(255,255,255,0)");
    horizontalGlow.addColorStop(0.28, "rgba(255,255,255,0.2)");
    horizontalGlow.addColorStop(0.5, "rgba(255,255,255,1)");
    horizontalGlow.addColorStop(0.72, "rgba(255,255,255,0.2)");
    horizontalGlow.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = horizontalGlow;
    context.fillRect(0, 0, 256, 1024);

    const verticalFade = context.createLinearGradient(0, 0, 0, 1024);
    verticalFade.addColorStop(0, "rgba(255,255,255,0)");
    verticalFade.addColorStop(0.22, "rgba(255,255,255,0.55)");
    verticalFade.addColorStop(0.8, "rgba(255,255,255,0.55)");
    verticalFade.addColorStop(1, "rgba(255,255,255,0)");
    context.globalCompositeOperation = "destination-in";
    context.fillStyle = verticalFade;
    context.fillRect(0, 0, 256, 1024);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  createLidSideTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    const gold = context.createLinearGradient(0, 0, 0, 256);
    gold.addColorStop(0, "#f9e39a");
    gold.addColorStop(0.32, "#d6b34f");
    gold.addColorStop(0.56, "#f7dd84");
    gold.addColorStop(0.78, "#b98f32");
    gold.addColorStop(1, "#e7cb73");
    context.fillStyle = gold;
    context.fillRect(0, 0, 1024, 256);

    for (let index = 0; index < 220; index += 1) {
      const x = (index / 220) * 1024;
      const alpha = index % 4 === 0 ? 0.18 : 0.08;
      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.fillRect(x, 0, 2, 256);
    }

    for (let index = 0; index < 160; index += 1) {
      const x = Math.random() * 1024;
      const width = 3 + Math.random() * 6;
      context.fillStyle = `rgba(120,84,18,${0.04 + Math.random() * 0.08})`;
      context.fillRect(x, 18, width, 220);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(1.2, 1);
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  createLidTopTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");

    const radial = context.createRadialGradient(512, 512, 40, 512, 512, 512);
    radial.addColorStop(0, "#fff2b8");
    radial.addColorStop(0.38, "#ecd27f");
    radial.addColorStop(0.7, "#c7a14a");
    radial.addColorStop(1, "#f0d379");
    context.fillStyle = radial;
    context.fillRect(0, 0, 1024, 1024);

    context.strokeStyle = "rgba(255,255,255,0.08)";
    context.lineWidth = 2;

    for (let index = 0; index < 120; index += 1) {
      const angle = (index / 120) * Math.PI * 2;
      context.beginPath();
      context.moveTo(512 + Math.cos(angle) * 90, 512 + Math.sin(angle) * 90);
      context.lineTo(512 + Math.cos(angle) * 500, 512 + Math.sin(angle) * 500);
      context.stroke();
    }

    context.strokeStyle = "rgba(122, 88, 24, 0.12)";

    for (let index = 0; index < 90; index += 1) {
      const angle = (index / 90) * Math.PI * 2;
      context.beginPath();
      context.moveTo(512 + Math.cos(angle) * 120, 512 + Math.sin(angle) * 120);
      context.lineTo(512 + Math.cos(angle) * 470, 512 + Math.sin(angle) * 470);
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  registerPart(name, group) {
    const materials = [];
    const seenMaterials = new Set();

    group.traverse((node) => {
      if (!node.isMesh) return;

      const materialList = Array.isArray(node.material)
        ? node.material
        : [node.material];

      materialList.forEach((material) => {
        if (!material || seenMaterials.has(material)) return;
        seenMaterials.add(material);

        materials.push({
          material,
          opacity: typeof material.opacity === "number" ? material.opacity : 1,
          color: material.color ? material.color.clone() : null,
          emissive:
            "emissive" in material && material.emissive
              ? material.emissive.clone()
              : null,
        });
      });
    });

    this.parts.set(name, {
      group,
      materials,
      baseY: group.position.y,
      baseScale: group.scale.clone(),
    });
  }

  bindEvents() {
    this.buttons.forEach((button) => {
      button.addEventListener("click", () => {
        this.setActivePart(button.dataset.focusPart || "all");
      });
    });

    window.addEventListener("resize", this.handleResize);
  }

  setActivePart(partName) {
    const part = PART_DETAILS[partName] ? partName : "all";
    this.activePart = part;
    this.targetFocusY = PART_DETAILS[part].targetY;

    this.buttons.forEach((button) => {
      const isActive = button.dataset.focusPart === part;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (this.titleNode) {
      this.titleNode.textContent = PART_DETAILS[part].title;
    }

    if (this.textNode) {
      this.textNode.textContent = PART_DETAILS[part].text;
    }

    this.parts.forEach((entry, key) => {
      const isSelected = part === "all" || key === part;
      const isDimmed = part !== "all" && key !== part;

      entry.group.position.y =
        entry.baseY + (part !== "all" && key === part ? 0.08 : 0);

      if (part === "all") {
        entry.group.scale.copy(entry.baseScale);
      } else {
        const scaleOffset = key === part ? 1.03 : 0.992;
        entry.group.scale.copy(entry.baseScale).multiplyScalar(scaleOffset);
      }

      entry.materials.forEach(({ material, opacity, color, emissive }) => {
        if (typeof material.opacity === "number") {
          material.opacity = isDimmed ? Math.max(0.12, opacity * 0.2) : opacity;
        }

        if (color && material.color) {
          material.color.copy(color);

          if (isDimmed) {
            material.color.lerp(new THREE.Color(0xbababa), 0.34);
          } else if (!isSelected) {
            material.color.multiplyScalar(0.95);
          }
        }

        if (emissive && "emissive" in material && material.emissive) {
          material.emissive.copy(emissive);

          if (part !== "all" && key === part) {
            material.emissive.addScalar(0.04);
          }
        }
      });
    });
  }

  handleResize() {
    if (!this.renderer || !this.camera || !this.canvasHost) return;

    const width = this.canvasHost.clientWidth;
    const height = this.canvasHost.clientHeight;

    if (!width || !height) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    const elapsed = this.clock.getElapsedTime();

    if (this.presentationGroup) {
      this.presentationGroup.position.y = -0.12 + Math.sin(elapsed * 0.82) * 0.035;
      this.presentationGroup.rotation.z = Math.sin(elapsed * 0.32) * 0.012;
    }

    if (this.jarGroup) {
      this.jarGroup.rotation.y = -0.08 + Math.sin(elapsed * 0.28) * 0.03;
    }

    if (this.controls) {
      this.controls.target.y +=
        (this.targetFocusY - this.controls.target.y) * 0.08;
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  enableFallback() {
    if (!this.canvasHost) return;

    const fallbackImage =
      this.canvasHost.dataset.fallbackImage ||
      "/images/honey_jar_reference_hexomel.jpg";

    this.canvasHost.innerHTML = `
      <div class="honey-showcase__fallback-note">
        Mantive a referencia fotografica do frasco Hexomel enquanto o navegador nao abre o WebGL.
      </div>
    `;
    this.canvasHost.classList.add("is-fallback");
    this.canvasHost.style.setProperty(
      "--fallback-image",
      `url("${fallbackImage}")`
    );
  }
}

const initHoneyHero3D = () => {
  const hero = document.querySelector("[data-honey-hero]");
  if (!hero) return;

  new HoneyJarHero3D(hero);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHoneyHero3D, {
    once: true,
  });
} else {
  initHoneyHero3D();
}
