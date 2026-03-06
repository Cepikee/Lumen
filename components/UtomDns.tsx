"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function UtomDns() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const params = {
    height: 10,
    segments: 400,
    lateralAmplitude: 0.6,
    lateralFrequency: 3.0,
    tubeRadius: 0.12,
    bridgeRadius: 0.05,
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(params.background);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 8);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.25));

    const {
      height: dnaHeight,
      segments,
      lateralAmplitude,
      lateralFrequency,
      tubeRadius,
      bridgeRadius,
      maxBridgesPerRow,
      rowSpacing,
      minSeparation,
      colorA,
      colorB
    } = params;

    // root group: ide tesszük a szálakat és hidakat is, így együtt forognak
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1) Generáljuk a két középvonal pontjait úgy, hogy garantált a minimális távolság
    const pointsA: THREE.Vector3[] = [];
    const pointsB: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * dnaHeight - dnaHeight / 2;
      const phase = t * Math.PI * lateralFrequency;

      // alap kilengés
      let xA = Math.sin(phase) * lateralAmplitude;
      let zA = Math.cos(phase * 0.6) * lateralAmplitude * 0.25;

      let xB = -Math.sin(phase) * lateralAmplitude;
      let zB = -Math.cos(phase * 0.6) * lateralAmplitude * 0.25;

      // ha túl közel vannak, toljuk szét őket X irányban (ez a fő garancia)
      const dx = xA - xB;
      const dz = zA - zB;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minSeparation) {
        const need = (minSeparation - dist) * 0.6;
        // növeljük a távolságot úgy, hogy A jobbra, B balra tolódik
        xA += need;
        xB -= need;
      }

      pointsA.push(new THREE.Vector3(xA, y, zA));
      pointsB.push(new THREE.Vector3(xB, y, zB));
    }

    // 2) Görbék és csövek (szálak)
    const curveA = new THREE.CatmullRomCurve3(pointsA, false, "catmullrom", 0.5);
    const curveB = new THREE.CatmullRomCurve3(pointsB, false, "catmullrom", 0.5);

    const radialSegments = 18;
    const tubeGeomA = new THREE.TubeGeometry(curveA, segments, tubeRadius, radialSegments, false);
    const tubeGeomB = new THREE.TubeGeometry(curveB, segments, tubeRadius, radialSegments, false);

    const matA = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorA),
      emissive: new THREE.Color(colorA).multiplyScalar(0.06),
      metalness: 0.12,
      roughness: 0.22,
      side: THREE.DoubleSide
    });
    const matB = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorB),
      emissive: new THREE.Color(colorB).multiplyScalar(0.06),
      metalness: 0.12,
      roughness: 0.22,
      side: THREE.DoubleSide
    });

    const meshA = new THREE.Mesh(tubeGeomA, matA);
    const meshB = new THREE.Mesh(tubeGeomB, matB);

    // a szálakat a rootGroup alá tesszük
    rootGroup.add(meshA);
    rootGroup.add(meshB);

    // 3) Hidak: a hidakat a két görbe azonos t paraméterénél helyezzük el,
    //     soronként max maxBridgesPerRow, majd a következő sor Y-offsetet kap (de csak a hidak)
    const bridgeGroup = new THREE.Group();
    rootGroup.add(bridgeGroup);

    // lépés: hányadik pontnál legyen potenciális híd
    const step = Math.max(1, Math.floor(segments / 80));
    let bridgesInCurrentRow = 0;
    let currentRowYOffset = 0;

    for (let i = 0; i <= segments; i += step) {
      // ha a sor megtelt, új sor kezdődik (hidak Y eltolása nő)
      if (bridgesInCurrentRow >= maxBridgesPerRow) {
        bridgesInCurrentRow = 0;
        currentRowYOffset += rowSpacing;
      }

      // pontok a két szálon ugyanazon t paraméterhez
      const a = pointsA[i].clone();
      const b = pointsB[i].clone();

      // a hidak Y-át csak a hidakra alkalmazzuk (nem módosítjuk a fő szálakat)
      a.y += currentRowYOffset;
      b.y += currentRowYOffset;

      // újra számoljuk a vektor a->b és a távolságot
      const dirVec = new THREE.Vector3().subVectors(b, a);
      const length = dirVec.length();

      // ha túl rövid, kihagyjuk (biztonság)
      if (length < 0.2) {
        continue;
      }

      // véletlenszerű szín a hídhoz
      const randColor = new THREE.Color(Math.random() * 0xffffff);

      // Cylinder: tengelye Y irányban, ezért a magasságot length-re állítjuk
      const cylGeom = new THREE.CylinderGeometry(bridgeRadius, bridgeRadius, length, 12);
      const cylMat = new THREE.MeshStandardMaterial({
        color: randColor,
        metalness: 0.06,
        roughness: 0.45
      });
      const bridge = new THREE.Mesh(cylGeom, cylMat);

      // orientálás: forgassuk a hengert a a->b irányába
      const up = new THREE.Vector3(0, 1, 0);
      const dirNorm = dirVec.clone().normalize();
      const axis = new THREE.Vector3().crossVectors(up, dirNorm);
      const axisLen = axis.length();
      if (axisLen > 1e-6) {
        axis.normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(dirNorm))));
        bridge.quaternion.setFromAxisAngle(axis, angle);
      } else {
        if (up.dot(dirNorm) < 0) bridge.rotateX(Math.PI);
      }

      // pozíció: középpont a két pont között
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      bridge.position.copy(mid);

      bridgeGroup.add(bridge);
      bridgesInCurrentRow += 1;
    }

    // 4) Kis vizuális ring
    const rimGeom = new THREE.RingGeometry(1.6, 2.6, 64);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.03, transparent: true });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -dnaHeight / 2 - 0.05;
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
        (controls as any).autoRotate = false;
      } catch (e) {
        console.warn("OrbitControls import failed:", e);
      }
    })();

    // Resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 5) Animáció: forgassuk a rootGroup-ot, így minden együtt forog
    const clock = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // rootGroup forgatása — így a hidak és szálak együtt mozognak
      rootGroup.rotation.y = Math.sin(t * 0.12) * 0.06;

      // enyhe pulzálás a csöveken
      const pulse = 1 + Math.sin(t * 1.6) * 0.008;
      meshA.scale.setScalar(pulse);
      meshB.scale.setScalar(pulse);

      if (controls) controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
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
      try { tubeGeomA.dispose(); } catch {}
      try { tubeGeomB.dispose(); } catch {}
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
      <h2 className="text-xl font-semibold mb-2">uTOM DNS Spirál (Javított: nem érnek össze, hidak középre)</h2>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
