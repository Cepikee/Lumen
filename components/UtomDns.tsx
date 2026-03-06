"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function UtomDns() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const cfg = {
    height: 10,
    points: 240,            // kevesebb pont → kevésbé hullámos
    lateralAmp: 0.28,
    twistAmount: 0.9,
    tubeRadius: 0.12,
    bridgeRadius: 0.05,
    bridgeStep: 12,
    maxBridgesPerRow: 4,
    rowSpacing: 0.28,
    minSeparation: 1.2,     // nagyobb minimális távolság
    colorA: "#0039ff",
    colorB: "#ff0033",
    background: 0xf6f7f9
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // Renderer / Scene / Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.background);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 8);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.25));

    // Root group: minden ide kerül, így együtt forognak
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1) Generáljuk a két középvonal pontjait, iteratív távolságtartással
    const pointsA: THREE.Vector3[] = [];
    const pointsB: THREE.Vector3[] = [];

    for (let i = 0; i <= cfg.points; i++) {
      const t = i / cfg.points;
      const y = t * cfg.height - cfg.height / 2;

      const phase = t * Math.PI * cfg.twistAmount * 2;
      let xA = Math.sin(phase) * cfg.lateralAmp;
      let zA = Math.cos(phase * 0.5) * cfg.lateralAmp * 0.25;
      let xB = -Math.sin(phase) * cfg.lateralAmp;
      let zB = -Math.cos(phase * 0.5) * cfg.lateralAmp * 0.25;

      // iteratív széttolás, ha túl közel vannak
      let dx = xA - xB;
      let dz = zA - zB;
      let dist = Math.sqrt(dx * dx + dz * dz);
      let iter = 0;
      while (dist < cfg.minSeparation && iter < 10) {
        const push = 0.02 + iter * 0.01;
        xA += push;
        xB -= push;
        dx = xA - xB;
        dz = zA - zB;
        dist = Math.sqrt(dx * dx + dz * dz);
        iter++;
      }

      pointsA.push(new THREE.Vector3(xA, y, zA));
      pointsB.push(new THREE.Vector3(xB, y, zB));
    }

    // 2) Görbék és TubeGeometry (kevesebb simítás)
    const curveA = new THREE.CatmullRomCurve3(pointsA, false, "catmullrom", 0.0);
    const curveB = new THREE.CatmullRomCurve3(pointsB, false, "catmullrom", 0.0);

    const radialSeg = 12;
    const tubeA = new THREE.TubeGeometry(curveA, cfg.points, cfg.tubeRadius, radialSeg, false);
    const tubeB = new THREE.TubeGeometry(curveB, cfg.points, cfg.tubeRadius, radialSeg, false);

    const matA = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.colorA),
      emissive: new THREE.Color(cfg.colorA).multiplyScalar(0.06),
      metalness: 0.12,
      roughness: 0.18
    });
    const matB = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.colorB),
      emissive: new THREE.Color(cfg.colorB).multiplyScalar(0.06),
      metalness: 0.12,
      roughness: 0.18
    });

    const meshA = new THREE.Mesh(tubeA, matA);
    const meshB = new THREE.Mesh(tubeB, matB);

    rootGroup.add(meshA);
    rootGroup.add(meshB);

    // 3) Hidak: a görbéből kérjük le a pontokat (getPointAt), Y-eltolás csak a hidakon
    const bridgeGroup = new THREE.Group();
    rootGroup.add(bridgeGroup);

    let bridgesInRow = 0;
    let currentRowYOffset = 0;

    for (let i = 0; i <= cfg.points; i += cfg.bridgeStep) {
      if (bridgesInRow >= cfg.maxBridgesPerRow) {
        bridgesInRow = 0;
        currentRowYOffset += cfg.rowSpacing;
      }

      const u = i / cfg.points;
      const a = curveA.getPointAt(u);
      const b = curveB.getPointAt(u);

      const aBridge = a.clone();
      const bBridge = b.clone();
      aBridge.y += currentRowYOffset;
      bBridge.y += currentRowYOffset;

      const dir = new THREE.Vector3().subVectors(bBridge, aBridge);
      const length = dir.length();
      if (length < 0.18) continue;

      const cylGeom = new THREE.CylinderGeometry(cfg.bridgeRadius, cfg.bridgeRadius, length, 12);
      const cylMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random() * 0xffffff),
        metalness: 0.06,
        roughness: 0.45
      });
      const bridge = new THREE.Mesh(cylGeom, cylMat);

      // orientálás: quaternion from up -> dir
      const up = new THREE.Vector3(0, 1, 0);
      const dirNorm = dir.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dirNorm);
      bridge.quaternion.copy(quat);

      // pozíció: középpont
      const mid = new THREE.Vector3().addVectors(aBridge, bBridge).multiplyScalar(0.5);
      bridge.position.copy(mid);

      bridgeGroup.add(bridge);
      bridgesInRow += 1;
    }

    // 4) vizuális ring
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.6, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.03, transparent: true })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -cfg.height / 2 - 0.05;
    scene.add(rim);

    // OrbitControls dinamikus import
    let controls: any = null;
    (async () => {
      try {
        const mod = await import("three/examples/jsm/controls/OrbitControls");
        const OrbitControls = (mod as any).OrbitControls ?? (mod as any).default;
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 6;
        controls.maxDistance = 40;
      } catch (e) {
        console.warn("OrbitControls import failed:", e);
      }
    })();

    // Resize
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // 5) Animáció: forgatjuk a rootGroup-ot → minden együtt mozog
    const clock = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // rotate whole structure
      rootGroup.rotation.y = Math.sin(t * 0.12) * 0.06;

      // subtle breathing
      const pulse = 1 + Math.sin(t * 1.6) * 0.008;
      meshA.scale.setScalar(pulse);
      meshB.scale.setScalar(pulse);

      if (controls) controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // CLEANUP
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      if (controls && typeof controls.dispose === "function") controls.dispose();

      if (mountRef.current && renderer.domElement.parentElement === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      try { renderer.dispose(); } catch {}

      const safeDisposeMaterial = (m?: THREE.Material | THREE.Material[] | null) => {
        if (!m) return;
        if (Array.isArray(m)) m.forEach(mat => { try { mat.dispose(); } catch {} });
        else try { m.dispose(); } catch {}
      };

      try { tubeA.dispose(); } catch {}
      try { tubeB.dispose(); } catch {}
      safeDisposeMaterial(matA);
      safeDisposeMaterial(matB);

      bridgeGroup.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          try { mesh.geometry.dispose(); } catch {}
          safeDisposeMaterial(mesh.material as THREE.Material | THREE.Material[] | undefined);
        }
      });

      try { rim.geometry.dispose(); } catch {}
      try { rim.material.dispose(); } catch {}
    };
  }, []);

  return (
    <div className="w-full h-[640px] border rounded-lg shadow bg-white p-2">
      <h2 className="text-xl font-semibold mb-2">uTOM DNS — javított verzió</h2>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
