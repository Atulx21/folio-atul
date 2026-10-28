'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useSpatialStore } from '@/store/useSpatialStore';
import SingularityCore from './SingularityCore';
import ArchiveMonoliths from './ArchiveMonoliths';
import EngineTopology from './EngineTopology';
import TesseractChronology from './TesseractChronology';
import EventHorizonPortal from './EventHorizonPortal';

export default function CameraRig() {
  const smoothedProgress = useRef(0);
  const roll = useRef(0);
  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());
  const frameCount = useRef(0);

  // Define the 5-dimensional camera path through the Tesseract
  const { cameraSpline, lookAtSpline, trajectoryPoints } = useMemo(() => {
    const camPts = [
      new THREE.Vector3(0, 0, 14.5),      // t = 0.00 -> Stage 00: Singularity (Hero)
      new THREE.Vector3(4.8, -2.5, 3.2),  // t = 0.25 -> Stage 01: The Archive (Directly facing the 4 Monoliths)
      new THREE.Vector3(-1.2, 2.8, -11.5),// t = 0.50 -> Stage 02: The Engine (Facing the 3-Tier Topology)
      new THREE.Vector3(0, 12, -32.5),    // t = 0.75 -> Stage 03: Chronology (Facing the Tesseract Timeline)
      new THREE.Vector3(0, 0, -52.5),     // t = 1.00 -> Stage 04: Event Horizon (Facing the Chrome Ripple Sanctuary)
    ];

    const lookPts = [
      new THREE.Vector3(0, 0, 0),         // Stage 00 Target
      new THREE.Vector3(4.8, -2.8, -4.2), // Stage 01 Target (Center of the 4 Helical Monoliths)
      new THREE.Vector3(-1.2, 2.0, -20.0),// Stage 02 Target (Center of the 3-Tier Engine)
      new THREE.Vector3(0, 12, -41.5),    // Stage 03 Target (Center of the 5 Tesseract Pillars)
      new THREE.Vector3(0, 0, -62),       // Stage 04 Target (Center of the Event Horizon Portal)
    ];

    const camCurve = new THREE.CatmullRomCurve3(camPts, false, 'catmullrom', 0.35);
    const lookCurve = new THREE.CatmullRomCurve3(lookPts, false, 'catmullrom', 0.35);

    return {
      cameraSpline: camCurve,
      lookAtSpline: lookCurve,
      trajectoryPoints: camCurve.getPoints(200),
    };
  }, []);

  useFrame((state, delta) => {
    const store = useSpatialStore.getState();
    const dt = Math.min(delta, 0.05); // avoid big jumps after a tab switch

    // 1. Single camera smoother (Lenis already smooths the raw scroll input)
    smoothedProgress.current = THREE.MathUtils.damp(
      smoothedProgress.current,
      store.scrollProgress,
      8,
      dt
    );
    const t = THREE.MathUtils.clamp(smoothedProgress.current, 0, 1);
    store.cameraProgress = t;

    // 2. Smooth mouse coordinates for subtle handheld camera parallax
    store.mouse.x = THREE.MathUtils.damp(store.mouse.x, store.mouse.targetX, 6, dt);
    store.mouse.y = THREE.MathUtils.damp(store.mouse.y, store.mouse.targetY, 6, dt);

    // 3. Spline sampling into reusable vectors (no per-frame allocations)
    const pos = cameraSpline.getPoint(t, tmpPos.current);
    const look = lookAtSpline.getPoint(t, tmpLook.current);

    pos.x += store.mouse.x * 1.1;
    pos.y += store.mouse.y * 0.8;

    state.camera.position.copy(pos);
    state.camera.lookAt(look);

    // 4. INCEPTION HALLWAY ROLL: stored separately and applied AFTER lookAt
    //    (lookAt overwrites rotation every frame, so roll can't live on rotation.z)
    const rollInfluence = THREE.MathUtils.smoothstep(1 - Math.abs(t - 0.75) * 5, 0, 1);
    roll.current = THREE.MathUtils.damp(roll.current, rollInfluence * (Math.PI * 0.18), 4, dt);
    state.camera.rotateZ(roll.current);

    // 5. VELOCITY FOV WARP: soft-saturating (no hard clamp), only updates projection when changed
    const cam = state.camera as THREE.PerspectiveCamera;
    const speedFactor = 16 * (1 - Math.exp(-Math.abs(store.scrollVelocity) * 0.04));
    const transmitBoost = store.isTransmitting ? 28 : 0;
    const targetFov = 45 + speedFactor + transmitBoost;
    const nextFov = THREE.MathUtils.damp(cam.fov, targetFov, 5, dt);
    if (Math.abs(nextFov - cam.fov) > 0.005) {
      cam.fov = nextFov;
      cam.updateProjectionMatrix();
    }

    // 6. Export live telemetry to Zustand for the HUD readout
    store.cameraCoords.x = cam.position.x;
    store.cameraCoords.y = cam.position.y;
    store.cameraCoords.z = cam.position.z;
    store.cameraCoords.fov = cam.fov;

        // Tell the preloader the scene is really rendering (shaders compiled, first frames drawn)
    if (frameCount.current < 40 && ++frameCount.current === 40) {
      useSpatialStore.getState().setSceneReady();
    }
  });

  return (
    <group>
      {/* Subtle architectural guide spline running through the 3D void */}
      <Line
        points={trajectoryPoints}
        color="#A6E1FA"
        lineWidth={1}
        transparent
        opacity={0.14}
      />

      {/* STAGE 00: The 35,000-Particle Singularity & Ferrofluid Core */}
      <SingularityCore />

      {/* STAGE 01: The 4 Velocity-Warped Helical Project Monoliths */}
      <ArchiveMonoliths />

      {/* STAGE 02: The Exploded 3-Tier System Topology & X-Ray Scanner */}
      <EngineTopology />

      {/* STAGE 03: The 5-Node Interstellar Tesseract Timeline */}
      <TesseractChronology />

      {/* STAGE 04: The Keystroke-Reactive Event Horizon Sanctuary */}
      <EventHorizonPortal />
    </group>
  );
}