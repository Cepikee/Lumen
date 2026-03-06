"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function UtomDns() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // 🔵 Alap DNS paraméterek (később a 20+ dimenzió írja felül)
  const dnaParams = {
    turns: 10,
    pointsPerTurn: 80,
    radius: 1.2,
    height: 8,
    bridgeEvery: 10,       // hány pontonként legyen összekötő híd
    colorA: "#0070f3",
    colorB: "#ff4081",
    bridgeColor: "#888"
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Alap Three.js setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f0f2f5");

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    // --- Fények ---
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    // --- DNS paraméterek ---
    const {
      turns,
      pointsPerTurn,
      radius,
      height,
      bridgeEvery,
      colorA,
      colorB,
      bridgeColor
    } = dnaParams;

    const totalPoints = turns * pointsPerTurn;

    // --- HELIX A ---
    const geometryA = new THREE.BufferGeometry();
    const positionsA = new Float32Array(totalPoints * 3);

    // --- HELIX B ---
    const geometryB = new THREE.BufferGeometry();
    const positionsB = new Float32Array(totalPoints * 3);

    // --- ÖSSZEKÖTŐ HIDAK ---
    const bridgeGroup = new THREE.Group();

    for (let i = 0; i < totalPoints; i++) {
      const t = i / pointsPerTurn;
      const angle = t * Math.PI * 2;

      // Helix A
      const xA = Math.cos(angle) * radius;
      const yA = (t / turns) * height - height / 2;
      const zA = Math.sin(angle) * radius;

      positionsA[i * 3] = xA;
      positionsA[i * 3 + 1] = yA;
      positionsA[i * 3 + 2] = zA;

      // Helix B (180° eltolva)
      const xB = Math.cos(angle + Math.PI) * radius;
      const yB = yA;
      const zB = Math.sin(angle + Math.PI) * radius;

      positionsB[i * 3] = xB;
      positionsB[i * 3 + 1] = yB;
      positionsB[i * 3 + 2] = zB;

      // --- Összekötő híd minden N. pontnál ---
      if (i % bridgeEvery === 0) {
        const bridgeGeometry = new THREE.BufferGeometry();
        const bridgePositions = new Float32Array([
          xA, yA, zA,
          xB, yB, zB
        ]);
        bridgeGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(bridgePositions, 3)
        );

        const bridgeMaterial = new THREE.LineBasicMaterial({
          color: bridgeColor,
          linewidth: 1
        });

        const bridge = new THREE.Line(bridgeGeometry, bridgeMaterial);
        bridgeGroup.add(bridge);
      }
    }

    geometryA.setAttribute("position", new THREE.BufferAttribute(positionsA, 3));
    geometryB.setAttribute("position", new THREE.BufferAttribute(positionsB, 3));

    const materialA = new THREE.LineBasicMaterial({ color: colorA });
    const materialB = new THREE.LineBasicMaterial({ color: colorB });

    const helixA = new THREE.Line(geometryA, materialA);
    const helixB = new THREE.Line(geometryB, materialB);

    scene.add(helixA);
    scene.add(helixB);
    scene.add(bridgeGroup);

    // --- Animáció ---
    const animate = () => {
      requestAnimationFrame(animate);

      helixA.rotation.y += 0.003;
      helixB.rotation.y += 0.003;
      bridgeGroup.rotation.y += 0.003;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      geometryA.dispose();
      geometryB.dispose();
      materialA.dispose();
      materialB.dispose();
    };
  }, []);

  return (
    <div className="w-full h-[600px] border rounded-lg shadow bg-white p-2">
      <h2 className="text-xl font-semibold mb-2">uTOM DNS Spirál (Dual Helix)</h2>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
