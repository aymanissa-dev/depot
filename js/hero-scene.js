import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

export function createHeroScene(canvas, { lite = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !lite,
      powerPreference: lite ? "low-power" : "high-performance",
    });
  } catch (err) {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  camera.position.set(0, 0.1, 7.2);

  const rig = new THREE.Group();
  scene.add(rig);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.85, lite ? 0.008 : 0.0045, lite ? 8 : 12, lite ? 80 : 160),
    new THREE.MeshStandardMaterial({
      color: 0x2c2c2a,
      metalness: 0.72,
      roughness: 0.28,
      transparent: true,
      opacity: 0.42,
    })
  );
  ring.rotation.x = 1.25;
  rig.add(ring);

  let halo = null;
  if (!lite) {
    halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.0022, 8, 140),
      new THREE.MeshStandardMaterial({
        color: 0xc8c3bb,
        metalness: 0.15,
        roughness: 0.7,
        transparent: true,
        opacity: 0.85,
      })
    );
    halo.rotation.x = 0.55;
    rig.add(halo);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(2.5, 3.5, 5);
  scene.add(key);

  const pointer = { x: 0, y: 0 };
  let progress = 0;
  let intro = 1;
  const dprCap = lite ? 1.15 : 1.5;

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  function render(time) {
    intro += (0 - intro) * 0.035;
    const t = time * 0.001;
    const settle = 1 - intro;
    ring.rotation.z = t * 0.12 + progress * 0.9;
    ring.rotation.y = pointer.x * 0.35;
    if (halo) {
      halo.rotation.z = -t * 0.05 + progress * 0.45;
      halo.rotation.x = 0.55 + pointer.y * 0.16;
    }
    rig.rotation.y += (pointer.x * 0.22 - rig.rotation.y) * 0.05;
    rig.rotation.x += (pointer.y * -0.12 - rig.rotation.x) * 0.05;
    const scale = 0.86 + settle * 0.14 - progress * 0.08;
    rig.scale.setScalar(Math.max(0.7, scale));
    camera.position.z = 7.2 + progress * 1.1;
    camera.position.x = pointer.x * 0.25;
    camera.position.y = 0.1 + pointer.y * 0.12;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  const onLost = (event) => event.preventDefault();
  canvas.addEventListener("webglcontextlost", onLost);
  resize();
  render(0);

  return {
    resize,
    render,
    setPointer(x, y) { pointer.x = x; pointer.y = y; },
    setProgress(value) { progress = value; },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      renderer.dispose();
    },
  };
}
