import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

function petalGeometry(scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.22, 0.25, 0.42, 0.62, 0, 1.05);
  shape.bezierCurveTo(-0.42, 0.62, -0.22, 0.25, 0, 0);
  const geo = new THREE.ShapeGeometry(shape);
  geo.scale(scale, scale, 1);
  geo.translate(0, -scale * 0.15, 0);
  return geo;
}

function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
}

function addRose(group, radius, colors) {
  const rose = new THREE.Group();
  const layers = [
    { n: 6, s: 0.28, y: 0.02, c: colors[2] },
    { n: 7, s: 0.4, y: 0, c: colors[1] },
    { n: 8, s: 0.55, y: -0.02, c: colors[0] },
  ];
  layers.forEach((layer, index) => {
    const geo = petalGeometry(layer.s);
    const mat = makeMaterial(layer.c);
    for (let i = 0; i < layer.n; i += 1) {
      const petal = new THREE.Mesh(geo, mat);
      const a = (i / layer.n) * Math.PI * 2 + index * 0.35;
      const reach = 0.12 + index * 0.08;
      petal.position.set(Math.cos(a) * reach, Math.sin(a) * reach, index * 0.02);
      petal.rotation.z = a - Math.PI / 2;
      petal.rotation.x = 0.25 + index * 0.08;
      rose.add(petal);
    }
  });
  const heart = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 10),
    makeMaterial(0xf6d2b8)
  );
  rose.add(heart);
  group.add(rose);
  return rose;
}

function addHibiscus(group) {
  const flower = new THREE.Group();
  const geo = petalGeometry(0.7);
  const mat = makeMaterial(0xe07a8a);
  for (let i = 0; i < 5; i += 1) {
    const petal = new THREE.Mesh(geo, mat);
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
    petal.rotation.z = a - Math.PI / 2;
    petal.rotation.x = 0.2;
    flower.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), makeMaterial(0xf6d2b8));
  flower.add(center);
  const stamen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6),
    makeMaterial(0xb23e55)
  );
  stamen.rotation.x = Math.PI / 2;
  stamen.position.z = 0.12;
  flower.add(stamen);
  group.add(flower);
  return flower;
}

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
  camera.position.set(0, 0.15, 6.6);
  const rig = new THREE.Group();
  scene.add(rig);

  const colors = [0xf0b7c2, 0xd86b80, 0xb23e55];
  const spots = lite
    ? [[-1.7, 0.35, -0.2], [1.75, -0.15, 0.1]]
    : [[-2.05, 0.55, -0.25], [2.1, 0.35, 0.05], [-1.85, -0.85, 0.2], [1.9, -0.7, -0.15]];
  const blooms = spots.map(([x, y, z], i) => {
    const flower = i % 2 === 0 ? addRose(rig, 1, colors) : addHibiscus(rig);
    flower.position.set(x, y, z);
    flower.scale.setScalar(lite ? 0.85 : 1);
    return flower;
  });

  const fallCount = lite ? 7 : 14;
  const fallGeo = petalGeometry(0.16);
  const fallMat = makeMaterial(0xe7a3b0);
  const falling = [];
  for (let i = 0; i < fallCount; i += 1) {
    const petal = new THREE.Mesh(fallGeo, fallMat);
    petal.position.set((Math.random() - 0.5) * 4.2, Math.random() * 4 - 1.5, (Math.random() - 0.5) * 1.2);
    petal.userData.speed = 0.15 + Math.random() * 0.2;
    petal.userData.spin = 0.4 + Math.random() * 0.8;
    falling.push(petal);
    rig.add(petal);
  }

  scene.add(new THREE.AmbientLight(0xfff4f2, 0.9));
  const key = new THREE.DirectionalLight(0xfff0ea, 0.85);
  key.position.set(2, 3, 4);
  scene.add(key);

  const pointer = { x: 0, y: 0 };
  let progress = 0;
  let intro = 1;
  const dprCap = lite ? 1.1 : 1.4;

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  function render(time) {
    intro += (0 - intro) * 0.03;
    const t = time * 0.001;
    blooms.forEach((flower, i) => {
      flower.rotation.z = Math.sin(t * 0.6 + i) * 0.06 + pointer.x * 0.08;
    });
    falling.forEach((petal) => {
      petal.position.y -= petal.userData.speed * 0.01;
      petal.rotation.z += petal.userData.spin * 0.01;
      petal.position.x += Math.sin(t + petal.position.y) * 0.002;
      if (petal.position.y < -2.6) petal.position.y = 2.6;
    });
    rig.rotation.y += (pointer.x * 0.18 - rig.rotation.y) * 0.05;
    rig.rotation.x += (pointer.y * -0.08 - rig.rotation.x) * 0.05;
    const scale = 0.9 + (1 - intro) * 0.1 - progress * 0.06;
    rig.scale.setScalar(scale);
    camera.position.z = 6.6 + progress * 0.8;
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
