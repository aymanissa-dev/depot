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
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0, 6.4);

  const rig = new THREE.Group();
  scene.add(rig);

  const metal = new THREE.MeshStandardMaterial({
    color: 0x2a2a28,
    metalness: 0.82,
    roughness: 0.22,
    transparent: true,
    opacity: 0.55,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, lite ? 0.012 : 0.006, lite ? 8 : 16, lite ? 64 : 140),
    metal
  );
  ring.rotation.x = 1.15;
  rig.add(ring);

  let halo = null;
  if (!lite) {
    halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.0035, 10, 120),
      new THREE.MeshStandardMaterial({ color: 0xb9b4ac, metalness: 0.2, roughness: 0.65, transparent: true, opacity: 0.8 })
    );
    halo.rotation.x = 0.35;
    rig.add(halo);
  }

  const boxGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xded8d0, roughness: 0.85, metalness: 0.05 });
  const cubes = [];
  const count = lite ? 4 : 9;
  for (let i = 0; i < count; i += 1) {
    const cube = new THREE.Mesh(boxGeo, boxMat);
    const a = (i / count) * Math.PI * 2;
    cube.position.set(Math.cos(a) * 2.15, Math.sin(a * 0.7) * 0.85, Math.sin(a) * 0.7);
    cube.rotation.set(a, a * 0.4, 0);
    cubes.push(cube);
    rig.add(cube);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3, 4, 5);
  scene.add(key);

  const pointer = { x: 0, y: 0 };
  let progress = 0;
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
    const t = time * 0.001;
    ring.rotation.z = t * 0.18 + progress * 1.2;
    ring.rotation.y = pointer.x * 0.45;
    if (halo) {
      halo.rotation.z = -t * 0.08 + progress * 0.6;
      halo.rotation.x = 0.35 + pointer.y * 0.2;
    }
    cubes.forEach((cube, i) => {
      const a = t * 0.25 + (i / count) * Math.PI * 2;
      cube.position.x = Math.cos(a) * (2.05 + pointer.x * 0.2);
      cube.position.y = Math.sin(a * 0.85) * 0.9 + pointer.y * 0.15;
      cube.rotation.x += 0.004;
      cube.rotation.y += 0.006;
    });
    rig.rotation.y += (pointer.x * 0.28 - rig.rotation.y) * 0.06;
    rig.rotation.x += (pointer.y * -0.16 - rig.rotation.x) * 0.06;
    camera.position.z = 6.4 - progress * 0.8;
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
