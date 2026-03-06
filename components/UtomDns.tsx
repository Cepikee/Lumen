"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function UtomDns() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const params = {
    height: 10,
    segments: 400,
    lateralAmplitude: 0.45,
    lateralFrequency: 2.2,
    tubeRadius: 0.12,
    bridgeEvery: 16,
    bridgeRadius: 0.055,
    colorA: "#0057d9",
    colorB: "#d9004a",
    bridgeColor: "#9e9e9e",
    background: 0xf6f7f9
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene / Camera / Renderer ---
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

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 8);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.25));

    // --- Generate vertical, slightly oscillating lines ---
    const {
      height: dnaHeight,
      segments,
      lateralAmplitude,
      lateralFrequency,
      tubeRadius,
      bridgeEvery,
      bridgeRadius,
      colorA,
      colorB,
      bridgeColor
    } = params;

    const pointsA: THREE.Vector3[] = [];
    const pointsB: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * dnaHeight - dnaHeight / 2;
      const phase = t * Math.PI * lateralFrequency;

      const xA = Math.sin(phase) * lateralAmplitude;
      const zA = Math.cos(phase * 0.5) * lateralAmplitude * 0.25;
      pointsA.push(new THREE.Vector3(xA, y, zA));

      const xB = -Math.sin(phase) * lateralAmplitude;
      const zB = -Math.cos(phase * 0.5) * lateralAmplitude * 0.25;
      pointsB.push(new THREE.Vector3(xB, y, zB));
    }

    const curveA = new THREE.CatmullRomCurve3(pointsA, false, "catmullrom", 0.5);
    const curveB = new THREE.CatmullRomCurve3(pointsB, false, "catmullrom", 0.5);

    const radialSegments = 18;
    const tubeGeomA = new THREE.TubeGeometry(curveA, segments, tubeRadius, radialSegments, false);
    const tubeGeomB = new THREE.TubeGeometry(curveB, segments, tubeRadius, radialSegments, false);

    const matA = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorA),
      emissive: new THREE.Color(colorA).multiplyScalar(0.06),
      metalness: 0.15,
      roughness: 0.28,
      side: THREE.DoubleSide
    });

    const matB = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorB),
      emissive: new THREE.Color(colorB).multiplyScalar(0.06),
      metalness: 0.12,
      roughness: 0.26,
      side: THREE.DoubleSide
    });

    const meshA = new THREE.Mesh(tubeGeomA, matA);
    const meshB = new THREE.Mesh(tubeGeomB, matB);
    scene.add(meshA, meshB);

    // Bridges group
    const bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);

    for (let i = 0; i <= segments; i += bridgeEvery) {
      const a = pointsA[i];
      const b = pointsB[i];
      const dirVec = new THREE.Vector3().subVectors(b, a);
      const length = dirVec.length();

      // Create cylinder per bridge (so we can set correct length)
      const cylGeom = new THREE.CylinderGeometry(bridgeRadius, bridgeRadius, length, 12);
      const cylMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bridgeColor),
        metalness: 0.08,
        roughness: 0.45
      });
      const bridge = new THREE.Mesh(cylGeom, cylMat);

      // Orient cylinder from a -> b
      const up = new THREE.Vector3(0, 1, 0);
      const dirNorm = dirVec.clone().normalize();
      const axis = new THREE.Vector3().crossVectors(up, dirNorm);
      const axisLen = axis.length();
      if (axisLen > 1e-6) {
        axis.normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(dirNorm))));
        bridge.quaternion.setFromAxisAngle(axis, angle);
      } else {
        // parallel or anti-parallel: rotate 0 or PI
        if (up.dot(dirNorm) < 0) bridge.rotateX(Math.PI);
      }

      // position at midpoint
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      bridge.position.copy(mid);

      bridgeGroup.add(bridge);
    }

    // Rim for depth
    const rimGeom = new THREE.RingGeometry(1.6, 2.6, 64);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.03, transparent: true });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -dnaHeight / 2 - 0.05;
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
        (controls as any).autoRotate = false;
      } catch (e) {
        console.warn("OrbitControls import failed:", e);
      }
    })();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation
    const clock = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      meshA.rotation.y += 0.0018;
      meshB.rotation.y += 0.0018;
      bridgeGroup.rotation.y += 0.0018;

      const pulse = 1 + Math.sin(t * 1.8) * 0.01;
      meshA.scale.setScalar(pulse);
      meshB.scale.setScalar(pulse);

      if (controls) controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- CLEANUP: csak egyetlen cleanup függvényt adunk vissza ---
    return () => {
      // stop animation
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);

      // dispose controls
      if (controls && typeof controls.dispose === "function") {
        controls.dispose();
      }

      // remove renderer DOM
      if (mountRef.current && renderer.domElement.parentElement === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }

      // dispose renderer
      try {
        renderer.dispose();
      } catch (e) {
        // ignore
      }

      // dispose geometries & materials safely
      const safeDisposeMaterial = (m?: THREE.Material | THREE.Material[] | null) => {
        if (!m) return;
        if (Array.isArray(m)) {
          m.forEach((mat) => {
            try { mat.dispose(); } catch (e) { /* ignore */ }
          });
        } else {
          try { m.dispose(); } catch (e) { /* ignore */ }
        }
      };

      try { tubeGeomA.dispose(); } catch {}
      try { tubeGeomB.dispose(); } catch {};
      safeDisposeMaterial(matA);
      safeDisposeMaterial(matB);

      // dispose bridges
      bridgeGroup.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          try { mesh.geometry.dispose(); } catch {}
          safeDisposeMaterial(mesh.material as THREE.Material | THREE.Material[] | undefined);
        }
      });

      // rim
      try { rim.geometry.dispose(); } catch {}
      try { rim.material.dispose(); } catch {}
    };
  }, []); // <-- dependency array: csak egyszer futjon

  return (
    <div className="w-full h-[640px] border rounded-lg shadow bg-white p-2">
      <h2 className="text-xl font-semibold mb-2">uTOM DNS Spirál (Egyszálú, kilengő)</h2>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
