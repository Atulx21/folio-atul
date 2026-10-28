'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useSpatialStore } from '@/store/useSpatialStore';
import { noRaycast } from '@/utils/spatialGuards';

/* ───────────────────────── Tunables ───────────────────────── */
const N_IMP = 8;               // simultaneous keystroke ripples
const PORTAL_Z = -62;          // must match CameraRig's final look-at
const SHOW_AFTER = 0.42;       // camera progress after which this stage renders
const IRIS_ENABLED = true;     // false = keep the dark void (no alabaster sanctuary)
const IRIS_START = 0.8;        // camera progress where the iris starts opening
const IRIS_END = 0.98;
const IRIS_MAX_RADIUS = 30;    // big enough to cover ultra-wide screens even with the FOV warp
const DISC_Z = -6;             // sanctuary disc depth behind the torus (local to PORTAL_Z)
const SANCTUARY_LUMA = 0.78;    // alabaster brightness (keep < ~0.85 so Bloom doesn't white out the screen)

/* ───────────────────────── Shaders ───────────────────────── */
const RIPPLE_VERTEX_SHADER = /* glsl */ `
  #define N_IMP ${N_IMP}

  uniform float uTime;
  uniform float uWarp;
  uniform vec2 uImp[N_IMP]; // x: start time, y: amplitude (0 = inactive)

  varying float vWave;
  varying float vDist;

  // One keystroke = one expanding ring that decays in time
  float impulseWave(float dist, vec2 imp) {
    if (imp.y <= 0.0) return 0.0;
    float age = uTime - imp.x;
    if (age < 0.0) return 0.0;
    float x = dist - age * 1.25;                              // distance from the wavefront
    float envelope = exp(-x * x * 90.0) * exp(-age * 1.1);    // ring-shaped, fading
    return sin(x * 46.0) * envelope * imp.y;
  }

  void main() {
    vec3 pos = position;
    float dist = length(uv - 0.5) * 2.0;

    // Ambient swell + keystroke ripples
    float wave = sin(dist * 14.0 - uTime * 1.1) * exp(-dist * 2.5) * 0.14;
    for (int i = 0; i < N_IMP; i++) wave += impulseWave(dist, uImp[i]);

    // Transmission: the fabric is pulled into a gravity well at the center
    float well = uWarp * exp(-dist * 3.0);
    pos.z += wave * 0.9 - well * 3.2;

    vWave = wave;
    vDist = dist;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const RIPPLE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uCherenkov;
  uniform vec3 uAmber;
  uniform vec3 uAlabaster;
  uniform float uWarp;

  varying float vWave;
  varying float vDist;

  void main() {
    if (vDist > 1.0) discard;

    // Crests glow Cherenkov ice, troughs glow Horizon amber
    float ring = smoothstep(0.03, 0.4, abs(vWave));
    vec3 col = mix(uAmber, uCherenkov, smoothstep(-0.05, 0.05, vWave));

    // Flash toward alabaster during the transmission collapse
    col = mix(col, uAlabaster, uWarp * (1.0 - vDist));

    float mask = pow(1.0 - vDist, 1.4);
    gl_FragColor = vec4(col * (1.0 + ring * 0.8), ring * mask * 0.95);
  }
`;

/* ───────────────────────── Component ───────────────────────── */
export default function EventHorizonPortal() {
  const outerRef = useRef<THREE.Group>(null);   // fixed: sanctuary disc + iris rim
  const portalRef = useRef<THREE.Group>(null);  // recoils on transmission
  const discRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const outerTorusRef = useRef<THREE.Mesh>(null);
  const innerTorusRef = useRef<THREE.Mesh>(null);
  const coreSphereRef = useRef<THREE.Mesh>(null);
  const sim = useRef({ time: 0, warp: 0, prevPulse: 0, impIdx: 0 });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarp: { value: 0 },
      uImp: { value: Array.from({ length: N_IMP }, () => new THREE.Vector2(-1000, 0)) },
      uCherenkov: { value: new THREE.Color('#A6E1FA') },
      uAmber: { value: new THREE.Color('#FF5500') },
      uAlabaster: { value: new THREE.Color('#F2EFE9') },
    }),
    []
  );

  const discColor = useMemo(() => new THREE.Color('#F2EFE9').multiplyScalar(SANCTUARY_LUMA), []);
  const ringColor = useMemo(() => new THREE.Color('#FF5500').multiplyScalar(2.6), []); // HDR rim -> blooms

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useSpatialStore.getState();
    const s = sim.current;

    // ── Keystroke impulses. Runs every frame so the pulse always decays, even off-screen. ──
    const pulse = store.keystrokePulse;
    if (pulse > s.prevPulse + 0.15) {
      const amp = THREE.MathUtils.clamp((pulse - s.prevPulse) / 0.45, 0.35, 1.4);
      uniforms.uImp.value[s.impIdx].set(s.time, amp); // start time + amplitude -> a new ring
      s.impIdx = (s.impIdx + 1) % N_IMP;
    }
    store.keystrokePulse = THREE.MathUtils.damp(pulse, 0, 3.5, dt);
    s.prevPulse = store.keystrokePulse;

    const outer = outerRef.current;
    const portal = portalRef.current;
    if (!outer || !portal) return;

    const t = store.cameraProgress;
    const visible = t > SHOW_AFTER;
    outer.visible = visible;
    if (!visible) return;

    s.time += dt;
    s.warp = THREE.MathUtils.damp(s.warp, store.isTransmitting ? 1 : 0, 4.5, dt);
    uniforms.uTime.value = s.time;
    uniforms.uWarp.value = s.warp;

    const rotBoost = 1 + store.keystrokePulse * 3.5 + s.warp * 12;

    // Z-axis warp recoil + mouse parallax (the sanctuary disc is NOT part of this group)
    portal.position.z = THREE.MathUtils.damp(portal.position.z, -s.warp * 14, 5, dt);
    portal.rotation.y = THREE.MathUtils.damp(portal.rotation.y, store.mouse.x * 0.18, 4, dt);
    portal.rotation.x = THREE.MathUtils.damp(portal.rotation.x, -store.mouse.y * 0.12, 4, dt);

    if (outerTorusRef.current) {
      outerTorusRef.current.rotation.z += dt * 0.35 * rotBoost;
      outerTorusRef.current.rotation.x = Math.sin(s.time * 0.5) * 0.25;
    }
    if (innerTorusRef.current) {
      innerTorusRef.current.rotation.y -= dt * 0.65 * rotBoost;
      innerTorusRef.current.rotation.x += dt * 0.45 * rotBoost;
    }
    if (coreSphereRef.current) {
      const pulseScale = 1 + store.keystrokePulse * 0.28 - s.warp * 0.75;
      coreSphereRef.current.scale.setScalar(
        THREE.MathUtils.damp(coreSphereRef.current.scale.x, Math.max(0.1, pulseScale), 8, dt)
      );
    }

    // ── Expanding circular iris into the alabaster sanctuary ──
    if (IRIS_ENABLED) {
      const x = THREE.MathUtils.smoothstep(t, IRIS_START, IRIS_END);
      const iris = 1 - Math.pow(1 - x, 3); // ease-out cubic
      const r = Math.max(iris * IRIS_MAX_RADIUS, 0.0001);
      const open = iris > 0.001;
      if (discRef.current) {
        discRef.current.visible = open;
        discRef.current.scale.setScalar(r);
      }
      if (ringRef.current) {
        ringRef.current.visible = open && iris < 0.995; // the rim is off-screen once fully open
        ringRef.current.scale.setScalar(r);
      }
    }
  });

  return (
    <group ref={outerRef} position={[0, 0, PORTAL_Z]}>
      {IRIS_ENABLED && (
        <>
          {/* Alabaster sanctuary: an opaque disc behind the torus; its radius is the iris */}
          <mesh ref={discRef} position={[0, 0, DISC_Z]} visible={false} raycast={noRaycast}>
            <circleGeometry args={[1, 128]} />
            <meshBasicMaterial color={discColor} fog={false} toneMapped={false} />
          </mesh>

          {/* Glowing amber iris rim */}
          <mesh ref={ringRef} position={[0, 0, DISC_Z + 0.01]} visible={false} raycast={noRaycast}>
            <ringGeometry args={[0.985, 1, 128]} />
            <meshBasicMaterial color={ringColor} fog={false} toneMapped={false} />
          </mesh>
        </>
      )}

      <group ref={portalRef}>
        {/* 1. Keystroke-reactive wave-equation field */}
        <mesh position={[0, 0, -2.5]} raycast={noRaycast}>
          <planeGeometry args={[22, 22, 96, 96]} />
          <shaderMaterial
            vertexShader={RIPPLE_VERTEX_SHADER}
            fragmentShader={RIPPLE_FRAGMENT_SHADER}
            uniforms={uniforms}
            transparent
            depthWrite={false}
          />
        </mesh>

        {/* 2. Primary liquid-chrome torus */}
        <mesh ref={outerTorusRef} raycast={noRaycast}>
          <torusGeometry args={[3.1, 0.16, 32, 160]} />
          <meshStandardMaterial color="#F2EFE9" metalness={1} roughness={0.05} />
        </mesh>

        {/* 3. Counter-rotating Horizon-amber gyroscopic ring (HDR emissive -> blooms) */}
        <mesh ref={innerTorusRef} raycast={noRaycast}>
          <torusGeometry args={[2.15, 0.045, 24, 140]} />
          <meshStandardMaterial
            color="#FF5500"
            emissive="#FF5500"
            emissiveIntensity={3.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* 4. Central singularity transmission core */}
        <mesh ref={coreSphereRef} raycast={noRaycast}>
          <icosahedronGeometry args={[0.85, 8]} />
          <MeshDistortMaterial
            color="#F2EFE9"
            emissive="#FF5500"
            emissiveIntensity={0.45}
            metalness={0.95}
            roughness={0.08}
            distort={0.42}
            speed={3.0}
          />
        </mesh>
      </group>
    </group>
  );
}