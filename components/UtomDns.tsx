"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function UtomDns() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const dnaParams = {
    turns: 10,
    pointsPerTurn: 120,
    radius: 1.2,
    height: 10,
    tubeRadius: 0.12,
    bridgeEvery: 12,
    bridgeRadius: 0.06,
    colorA: new THREE.Color("#0070f3"),
    colorB: new THREE.Color("#ff4081"),
    bridgeColor: new THREE.Color("#9e9e9e")
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const { clientWidth: width, clientHeight: heightPx } = mountRef.current;

    // Scene / Camera / Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f7f9);

    const camera = new THREE.PerspectiveCamera(50, width / heightPx, 0.1, 100);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, heightPx);
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 10, 7);
    scene.add(dir);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.25);
    scene.add(hemi);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controls.autoRotate = false;

    // Parameters
    const {
      turns,
      pointsPerTurn,
      radius,
      height: dnaHeight,
      tubeRadius,
      bridgeEvery,
      bridgeRadius,
      colorA,
      colorB,
      bridgeColor
    } = dnaParams;

    const totalPoints = turns * pointsPerTurn;

    // Generate base points for two helices
    const pointsA: THREE.Vector3[] = [];
    const pointsB: THREE.Vector3[] = [];

    for (let i = 0; i < totalPoints; i++) {
      const t = i / pointsPerTurn; // step in turns
      const angle = t * Math.PI * 2;
      const y = (t / turns) * dnaHeight - dnaHeight / 2;

      pointsA.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      pointsB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
    }

    // Create smooth curves
    const curveA = new THREE.CatmullRomCurve3(pointsA);
    const curveB = new THREE.CatmullRomCurve3(pointsB);

    // Tube geometries (higher segments for smoothness)
    const segments = totalPoints;
    const radialSegments = 20;

    const tubeGeomA = new THREE.TubeGeometry(curveA, segments, tubeRadius, radialSegments, false);
    const tubeGeomB = new THREE.TubeGeometry(curveB, segments, tubeRadius, radialSegments, false);

    // Vertex colors: gradient along the tube from colorA to colorB (can be adjusted)
    const applyGradient = (geom: THREE.BufferGeometry, startColor: THREE.Color, endColor: THREE.Color) => {
      const posCount = geom.attributes.position.count;
      const colors = new Float32Array(posCount * 3);
      for (let i = 0; i < posCount; i++) {
        const t = i / (posCount - 1);
        const c = startColor.clone().lerp(endColor, t);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    };

    // Apply gradients: A goes from colorA -> lighter, B goes from colorB -> lighter
    const lighterA = colorA.clone().lerp(new THREE.Color(0xffffff), 0.25);
    const lighterB = colorB.clone().lerp(new THREE.Color(0xffffff), 0.25);
    applyGradient(tubeGeomA, colorA, lighterA);
    applyGradient(tubeGeomB, colorB, lighterB);

    // Materials using vertex colors
    const matA = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.2,
      roughness: 0.35,
      side: THREE.DoubleSide
    });
    const matB = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.2,
      roughness: 0.35,
      side: THREE.DoubleSide
    });

    const meshA = new THREE.Mesh(tubeGeomA, matA);
    const meshB = new THREE.Mesh(tubeGeomB, matB);
    scene.add(meshA, meshB);

    // Bridges (cylinders) connecting corresponding points
    const bridgeGroup = new THREE.Group();
    const cylGeom = new THREE.CylinderGeometry(bridgeRadius, bridgeRadius, 1, 12);

    for (let i = 0; i < totalPoints; i += bridgeEvery) {
      const a = pointsA[i];
      const b = pointsB[i];

      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const dirVec = new THREE.Vector3().subVectors(b, a);
      const length = dirVec.length();

      // Clone geometry per bridge to avoid shared transform issues
      const geom = cylGeom.clone();
      geom.translate(0, length / 2, 0); // center along Y after orientation

      const mat = new THREE.MeshStandardMaterial({
        color: bridgeColor,
        metalness: 0.1,
        roughness: 0.4
      });

      const bridge = new THREE.Mesh(geom, mat);

      // Orient cylinder from a -> b
      const up = new THREE.Vector3(0, 1, 0);
      const axis = new THREE.Vector3().crossVectors(up, dirVec).normalize();
      const angle = Math.acos(up.dot(dirVec.normalize()));
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);

      bridge.applyQuaternion(q);
      bridge.position.copy(a);

      // Move to midpoint (since we translated geometry)
      bridge.position.add(dirVec.clone().multiplyScalar(0.5));

      bridgeGroup.add(bridge);
    }

    scene.add(bridgeGroup);

    // Subtle ground / rim for depth (optional)
    const rimGeom = new THREE.RingGeometry(radius + tubeRadius * 1.6, radius + tubeRadius * 2.6, 64);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.03, transparent: true });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -dnaHeight / 2 - 0.05;
    scene.add(rim);

    // Resize handling
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // gentle rotation and subtle breathing
      const t = clock.getElapsedTime();
      meshA.rotation.y += 0.0025;
      meshB.rotation.y += 0.0025;
      bridgeGroup.rotation.y += 0.0025;

      const pulse = 1 + Math.sin(t * 1.6) * 0.02;
      meshA.scale.setScalar(pulse);
      meshB.scale.setScalar(pulse);

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();

      // remove renderer DOM
      mountRef.current?.removeChild(renderer.domElement);

      // dispose geometries & materials
      tubeGeomA.dispose();
      tubeGeomB.dispose();
      cylGeom.dispose();
      matA.dispose();
      matB.dispose();
      // dispose bridge materials
      bridgeGroup.traverse((o) => {
        if ((o as THREE.Mesh).material) {
          const m = (o as THREE.Mesh).material as THREE.Material;
          m.dispose();
        }
        if ((o as THREE.Mesh).geometry) {
          (o as THREE.Mesh).geometry.dispose();
        }
      });
    };
  }, []);

  return (
    <div className="w-full h-[640px] border rounded-lg shadow bg-white p-2">
      <h2 className="text-xl font-semibold mb-2">uTOM DNS Spirál (Vizualizáció)</h2>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
