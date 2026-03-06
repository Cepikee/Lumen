"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function UtomDns() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // DNS paraméterek (később a 20+ dimenzió írja felül)
  const dnaParams = {
    turns: 10,
    pointsPerTurn: 100,
    radius: 1.2,
    height: 10,
    tubeRadius: 0.12,
    bridgeEvery: 12,
    bridgeRadius: 0.05,
    colorA: "#0070f3",
    colorB: "#ff4081",
    bridgeColor: "#ffaa00"
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f0f2f5");

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // --- DNS paraméterek ---
    const {
      turns,
      pointsPerTurn,
      radius,
      height,
      tubeRadius,
      bridgeEvery,
      bridgeRadius,
      colorA,
      colorB,
      bridgeColor
    } = dnaParams;

    const totalPoints = turns * pointsPerTurn;

    // --- Spirál pontok generálása ---
    const pointsA: THREE.Vector3[] = [];
    const pointsB: THREE.Vector3[] = [];

    for (let i = 0; i < totalPoints; i++) {
      const t = i / pointsPerTurn;
      const angle = t * Math.PI * 2;

      const y = (t / turns) * height - height / 2;

      // Helix A
      pointsA.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        )
      );

      // Helix B (180° eltolva)
      pointsB.push(
        new THREE.Vector3(
          Math.cos(angle + Math.PI) * radius,
          y,
          Math.sin(angle + Math.PI) * radius
        )
      );
    }

    // --- TubeGeometry spirálok ---
    const curveA = new THREE.CatmullRomCurve3(pointsA);
    const curveB = new THREE.CatmullRomCurve3(pointsB);

    const tubeA = new THREE.TubeGeometry(curveA, totalPoints, tubeRadius, 16, false);
    const tubeB = new THREE.TubeGeometry(curveB, totalPoints, tubeRadius, 16, false);

    const materialA = new THREE.MeshStandardMaterial({ color: colorA });
    const materialB = new THREE.MeshStandardMaterial({ color: colorB });

    const meshA = new THREE.Mesh(tubeA, materialA);
    const meshB = new THREE.Mesh(tubeB, materialB);

    scene.add(meshA);
    scene.add(meshB);

    // --- Összekötő hidak (CylinderGeometry) ---
    const bridgeGroup = new THREE.Group();

    for (let i = 0; i < totalPoints; i += bridgeEvery) {
      const a = pointsA[i];
      const b = pointsB[i];

      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(b, a);
      const length = dir.length();

      const bridgeGeom = new THREE.CylinderGeometry(
        bridgeRadius,
        bridgeRadius,
        length,
        8
      );

      const bridgeMat = new THREE.MeshStandardMaterial({ color: bridgeColor });
      const bridge = new THREE.Mesh(bridgeGeom, bridgeMat);

      // Cylinder orientation
      bridge.position.copy(mid);
      bridge.lookAt(b);
      bridge.rotateX(Math.PI / 2);

      bridgeGroup.add(bridge);
    }

    scene.add(bridgeGroup);

    // --- Animáció ---
    const animate = () => {
      requestAnimationFrame(animate);

      meshA.rotation.y += 0.003;
      meshB.rotation.y += 0.003;
      bridgeGroup.rotation.y += 0.003;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      tubeA.dispose();
      tubeB.dispose();
      materialA.dispose();
      materialB.dispose();
    };
  }, []);

  return (
    <div className="w-full h-[600px] border rounded-lg shadow bg-white p-2">
      <h2 className="text-xl font-semibold mb-2">uTOM DNS Spirál (TubeGeometry)</h2>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
