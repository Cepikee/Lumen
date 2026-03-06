"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function UtomDns() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const cfg = {
    height: 10,
    points: 360,
    lateralAmp: 0.35,       // fő szálak kilengése
    twistAmount: 0.6,      // mennyit csavarodnak (kis érték = kevésbé helix)
    tubeRadius: 0.12,
    bridgeRadius: 0.05,
    bridgeStep: 12,        // hány pontonként legyen híd
    maxBridgesPerRow: 4,
    rowSpacing: 0.28,
    minSeparation: 0.9,
    colorA: "#0039ff",
    colorB: "#ff0033",
    background: 0xf6f7f9
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // Scene / Camera / Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.background);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 8);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.25));

    // root group: ide tesszük a szálakat és hidakat is, így együtt forognak
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1) Generáljuk a két "fő szál" pontjait: nem rugós helix, hanem függőleges, enyhe kilengéssel és kis csavarással
    const pointsA: THREE.Vector3[] = [];
    const pointsB: THREE.Vector3[] = [];

    for (let i = 0; i <= cfg.points; i++) {
      const t = i / cfg.points; // 0..1
      const y = t * cfg.height - cfg.height / 2;

      // enyhe kilengés és kis twist: x = sin(k*t)*amp, z = cos(k2*t)*amp2
      const phase = t * Math.PI * cfg.twistAmount * 2; // csavarodás
      const xOffset = Math.sin(phase) * cfg.lateralAmp;
      const zOffset = Math.cos(phase * 0.5) * cfg.lateralAmp * 0.25;

      // A és B ellentétes fázisban, így sose találkoznak
      let xA = xOffset;
      let zA = zOffset;
      let xB = -xOffset;
      let zB = -zOffset;

      // biztosítjuk a minimális távolságot (ha túl közel, toljuk szét)
      const dx = xA - xB;
      const dz = zA - zB;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < cfg.minSeparation) {
        const need = (cfg.minSeparation - dist) * 0.6;
        xA += need;
        xB -= need;
      }

      pointsA.push(new THREE.Vector3(xA, y, zA));
      pointsB.push(new THREE.Vector3(xB, y, zB));
    }

    // 2) Készítsük el a csöveket (TubeGeometry) a pontokból — kevésbé simítjuk, hogy ne legyen túl görbe
    const curveA = new THREE.CatmullRomCurve3(pointsA, false, "catmullrom", 0.2);
    const curveB = new THREE.CatmullRomCurve3(pointsB, false, "catmullrom", 0.2);

    const radialSeg = 16;
    const tubeA = new THREE.TubeGeometry(curveA, cfg.points, cfg.tubeRadius, radialSeg, false);
    const tubeB = new THREE.TubeGeometry(curveB, cfg.points, cfg.tubeRadius, radialSeg, false);

    const matA = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.colorA),
      emissive: new THREE.Color(cfg.colorA).multiplyScalar(0.06),
      metalness: 0.12,
      roughness: 0.2
    });
    const matB = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.colorB),
      emissive: new THREE.Color(cfg.colorB).multiplyScalar(0.06),
      metalness: 0.12,
      roughness: 0.2
    });

    const meshA = new THREE.Mesh(tubeA, matA);
    const meshB = new THREE.Mesh(tubeB, matB);

    // adjuk a rootGroup-hoz, így együtt forognak
    rootGroup.add(meshA);
    rootGroup.add(meshB);

    // 3) Hidak: mindig a két szál ugyanazon t pontjai közé helyezzük, középre pozícionálva
    const bridgeGroup = new THREE.Group();
    rootGroup.add(bridgeGroup);

    let bridgesInRow = 0;
    let currentRowYOffset = 0;

    for (let i = 0; i <= cfg.points; i += cfg.bridgeStep) {
      // ha megtelt a sor, új sor kezdődik (csak a hidak Y-át toljuk fel)
      if (bridgesInRow >= cfg.maxBridgesPerRow) {
        bridgesInRow = 0;
        currentRowYOffset += cfg.rowSpacing;
      }

      // pontok a két szálon ugyanazon t-hez
      const a = pointsA[i].clone();
      const b = pointsB[i].clone();

      // alkalmazzuk a sorok okozta Y eltolást csak a hidak pozíciójára
      a.y += currentRowYOffset;
      b.y += currentRowYOffset;

      // vektor és távolság
      const dir = new THREE.Vector3().subVectors(b, a);
      const length = dir.length();
      if (length < 0.2) continue; // túl rövid, kihagyjuk

      // híd geometriája: cylinder tengelye Y irányban alapból
      const cylGeom = new THREE.CylinderGeometry(cfg.bridgeRadius, cfg.bridgeRadius, length, 12);
      const cylMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random() * 0xffffff), // random szín
        metalness: 0.06,
        roughness: 0.45
      });
      const bridge = new THREE.Mesh(cylGeom, cylMat);

      // orientálás: forgassuk a hengert a a->b irányába
      const up = new THREE.Vector3(0, 1, 0);
      const dirNorm = dir.clone().normalize();
      const axis = new THREE.Vector3().crossVectors(up, dirNorm);
      const axisLen = axis.length();
      if (axisLen > 1e-6) {
        axis.normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(dirNorm))));
        bridge.quaternion.setFromAxisAngle(axis, angle);
      } else {
        if (up.dot(dirNorm) < 0) bridge.rotateX(Math.PI);
      }

      // pozíció: középpont
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      bridge.position.copy(mid);

      bridgeGroup.add(bridge);
      bridgesInRow += 1;
    }

    // 4) jobb környezet: finom ring és enyhe háttér
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.6, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.03, transparent: true })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -cfg.height / 2 - 0.05;
    scene.add(rim);

    // OrbitControls dinamikus import (TS kompatibilitás)
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

      // rootGroup forgatása: együtt mozognak a hidak és a szálak
      rootGroup.rotation.y = Math.sin(t * 0.12) * 0.06;

      // enyhe pulzálás
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

      const safeDispose = (m?: THREE.Material | THREE.Material[] | null) => {
        if (!m) return;
        if (Array.isArray(m)) m.forEach(mat => { try { mat.dispose(); } catch {} });
        else try { m.dispose(); } catch {}
      };

      try { tubeA.dispose(); } catch {}
      try { tubeB.dispose(); } catch {}
      safeDispose(matA);
      safeDispose(matB);

      bridgeGroup.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          try { mesh.geometry.dispose(); } catch {}
          safeDispose(mesh.material as THREE.Material | THREE.Material[] | undefined);
        }
      });

      try { rim.geometry.dispose(); } catch {}
      try { rim.material.dispose(); } catch {}
    };
  }, []);

  return (
    <div className="w-full h-[640px] border rounded-lg shadow bg-white p-2">
      <h2 className="text-xl font-semibold mb-2">uTOM DNS — javított</h2>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
