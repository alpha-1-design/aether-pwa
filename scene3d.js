/**
 * Aether 3D Visualizer - NASA Style Immersive Space
 * Uses Three.js to create a high-fidelity astronomical environment.
 */
export class Scene3D {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('3D Canvas not found');
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.initEnvironment();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initEnvironment() {
    // Deep space background
    this.scene.background = new THREE.Color(0x020205);

    // Ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);

    // Directional light (The "Sun")
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    this.scene.add(sunLight);

    // Stars field
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      starVertices.push(THREE.MathUtils.randFloatSpread(2000));
      starVertices.push(THREE.MathUtils.randFloatSpread(2000));
      starVertices.push(THREE.MathUtils.randFloatSpread(2000));
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);

    this.camera.position.z = 5;
  }

  async synthesizeObject(description) {
    // Parse AI JSON description
    try {
      const data = JSON.parse(description);
      let geometry;

      switch (data.type) {
        case 'sphere': geometry = new THREE.SphereGeometry(1, 32, 32); break;
        case 'cube': geometry = new THREE.BoxGeometry(1, 1, 1); break;
        case 'torus': geometry = new THREE.TorusGeometry(1, 0.4, 16, 100); break;
        case 'cylinder': geometry = new THREE.CylinderGeometry(1, 1, 2, 32); break;
        default: geometry = new THREE.IcosahedronGeometry(1, 0);
      }

      const material = new THREE.MeshStandardMaterial({
        color: data.color || 0x00ffcc,
        metalness: 0.7,
        roughness: 0.2,
        emissive: data.color || 0x00ffcc,
        emissiveIntensity: 0.2
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...(data.position || [0, 0, 0]));

      this.scene.add(mesh);
      return mesh;
    } catch (e) {
      console.error('3D Synthesis Error:', e);
      throw new Error('Invalid 3D JSON description');
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Rotate all objects slightly for a "living" scene
    this.scene.children.forEach(child => {
      if (child.isMesh) {
        child.rotation.y += 0.01;
        child.rotation.x += 0.005;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  clearScene() {
    const objects = this.scene.children.filter(child => child.isMesh);
    objects.forEach(obj => this.scene.remove(obj));
  }
}
