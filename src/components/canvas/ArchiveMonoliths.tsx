'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PROJECTS_ARCHIVE, ProjectSpec } from '@/data/projectsData';
import { useSpatialStore } from '@/store/useSpatialStore';
import { soundEngine } from '@/utils/soundEngine';

/* ───────────────────────── Tunables ───────────────────────── */
const HIDE_AFTER_SCROLL = 0.6; // camera is long past the monoliths after this progress
const TEXT_MAX_WIDTH = 2.1;    // text auto-shrinks to fit inside the panel
const UI_SELECTOR = 'a,button,input,textarea,select,[role="button"],[data-ui]';

const tmpV = new THREE.Vector3();
const noRaycast = () => null; // only the glass plane should receive pointer events

/* ───────────────────────── Helpers ───────────────────────── */
// True when the real DOM target of a pointer/click is part of the UI overlay.
// (eventSource is document.body, so the ray also "hits" monoliths behind the DOM.)
const isUiTarget = (e: { nativeEvent: Event }) => {
  const t = e.nativeEvent.target;
  return t instanceof Element && !!t.closest(UI_SELECTOR);
};

type TroikaText = THREE.Object3D & { textRenderInfo?: { blockBounds: number[] } };
const fitTo = (maxWidth: number) => (t: unknown) => {
  const m = t as TroikaText;
  const b = m.textRenderInfo?.blockBounds;
  if (!b) return;
  const w = b[2] - b[0]; // local-space width, unaffected by scale (idempotent)
  m.scale.setScalar(w > maxWidth ? maxWidth / w : 1);
};
const fitText = fitTo(TEXT_MAX_WIDTH);

type SharedState = {
  uTime: { value: number };
  uVelocity: { value: number };
  active: boolean;
};

/* ───────────────────────── Shaders ───────────────────────── */
const MONOLITH_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity; // normalized -1..1
  uniform float uHover;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // 1. Velocity bend: top & bottom edges curl backward (quadratic bow, symmetric)
    float b = (uv.y - 0.5) * 2.0;
    pos.z -= b * b * abs(uVelocity) * 0.13;

    // 2. Subtle S-curve torsion when hovered (the hover lift itself happens on the group)
    pos.z += sin(uv.y * 10.0 - uTime * 4.0) * 0.03 * uHover;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const MONOLITH_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uHover;
  uniform float uPatternSeed;
  uniform vec3 uAccent;
  uniform vec3 uObsidian;
  uniform vec3 uTungsten;

  varying vec2 vUv;

  void main() {
    vec3 color = mix(uObsidian, uTungsten, vUv.y);

    // 1. Anti-aliased architectural sub-grid (12 x 18 cells, ~1px lines at any distance)
    vec2 gv = vUv * vec2(12.0, 18.0);
    vec2 gd = abs(fract(gv - 0.5) - 0.5) / max(fwidth(gv), vec2(0.0001));
    float gridLine = 1.0 - min(min(gd.x, gd.y), 1.0);

    // 2. Project-specific radar rings (morph per seed)
    vec2 c = vUv - vec2(0.5, 0.54);
    c.x *= 0.72;
    float dist = length(c);
    float rings = sin(dist * (28.0 + uPatternSeed * 8.0) - uTime * (1.4 + uHover * 2.0));
    float sharpRings = smoothstep(0.88, 0.98, rings) * (1.0 - smoothstep(0.08, 0.38, dist));

    // 3. Horizontal telemetry scanner beam (fades at the wrap point instead of popping)
    float scanY = fract(uTime * 0.22 + uPatternSeed * 0.37);
    float scanBeam = (1.0 - smoothstep(0.0, 0.04, abs(vUv.y - scanY))) * 0.35 * sin(scanY * 3.14159265);

    // 4. Corner targeting brackets over a faint full border
    vec2 q = abs(vUv - 0.5) * 2.0;
    float edge = smoothstep(0.95, 0.965, max(q.x, q.y));
    float corner = smoothstep(0.62, 0.68, min(q.x, q.y));
    float bracket = edge * (0.25 + 0.75 * corner);

    color += uAccent * gridLine * (0.05 + uHover * 0.08);
    color += uAccent * sharpRings * (0.45 + uHover * 0.65);
    color += uAccent * scanBeam;
    color += uAccent * bracket * (0.35 + uHover * 0.6);

    // Bottom darkening for crisp typography contrast
    color = mix(uObsidian * 0.6, color, smoothstep(0.0, 0.42, vUv.y));

    gl_FragColor = vec4(color, 1.0);
  }
`;

/* ───────────────────────── Single monolith ───────────────────────── */
function SingleMonolith({
  project,
  idx,
  shared,
}: {
  project: ProjectSpec;
  idx: number;
  shared: SharedState;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const liftRef = useRef<THREE.Group>(null);
  const hover = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: shared.uTime,         // shared by reference: one update drives all 4
      uVelocity: shared.uVelocity,
      uHover: { value: 0 },
      uPatternSeed: { value: idx + 1.0 },
      uAccent: { value: new THREE.Color(...project.rgbAccent) },
      // Hex -> linear conversion by THREE.Color (matches the brief's Void / Tungsten palette)
      uObsidian: { value: new THREE.Color('#0A0B10') },
      uTungsten: { value: new THREE.Color('#1A1C25') },
    }),
    [idx, project.rgbAccent, shared]
  );

  useFrame((state, delta) => {
    const root = rootRef.current;
    const lift = liftRef.current;
    if (!root || !lift) return;

    const dt = Math.min(delta, 0.05);
    const store = useSpatialStore.getState();

    // Parent hid the group: release any hover that could otherwise get stuck
    if (!shared.active) {
      if (store.hoveredProjectId === project.id) {
        store.setHoveredProject(null);
        document.body.style.cursor = 'auto';
      }
      return;
    }

    const isHovered =
      store.hoveredProjectId === project.id || store.selectedProjectId === project.id;
    hover.current = THREE.MathUtils.damp(hover.current, isHovered ? 1 : 0, 7, dt);
    const h = hover.current;
    uniforms.uHover.value = h;

    // Zero-gravity levitation (direct: no double smoothing / phase lag)
    root.position.y = project.position[1] + Math.sin(shared.uTime.value * 1.2 + idx * 1.4) * 0.12;

    // Hover: the whole monolith steps forward, lifts and scales as one rigid unit
    lift.position.z = h * 0.22;
    lift.position.y = h * 0.2;
    lift.scale.setScalar(1 + h * 0.06);

    // Tilt toward the cursor (relative to this monolith's position on screen) + lean with scroll
    tmpV.setFromMatrixPosition(root.matrixWorld).project(state.camera);
    const dx = THREE.MathUtils.clamp(store.mouse.x - tmpV.x, -1, 1);
    const dy = THREE.MathUtils.clamp(store.mouse.y - tmpV.y, -1, 1);
    lift.rotation.y = THREE.MathUtils.damp(lift.rotation.y, dx * 0.12 * h, 8, dt);
    lift.rotation.x = THREE.MathUtils.damp(
      lift.rotation.x,
      -dy * 0.08 * h - shared.uVelocity.value * 0.1,
      8,
      dt
    );
  });

  return (
    <group
      ref={rootRef}
      position={project.position}
      rotation={project.rotation}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (isUiTarget(e)) return; // pointer is over a button/card: let the DOM own it
        const s = useSpatialStore.getState();
        if (s.hoveredProjectId !== project.id) {
          s.setHoveredProject(project.id);
          soundEngine.triggerPing(580 + idx * 90);
        }
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        const s = useSpatialStore.getState();
        if (s.hoveredProjectId === project.id) s.setHoveredProject(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (isUiTarget(e)) return;
        useSpatialStore.getState().setSelectedProject(project.id);
        soundEngine.triggerPing(880);
      }}
    >
      <group ref={liftRef}>
        {/* 1. Brushed tungsten slab, set back so the glass floats in front of it */}
        <RoundedBox
          args={[2.55, 3.65, 0.12]}
          radius={0.04}
          smoothness={4}
          position={[0, 0, -0.2]}
          raycast={noRaycast}
        >
          <meshStandardMaterial color="#121318" metalness={0.92} roughness={0.2} />
        </RoundedBox>

        {/* 2. Velocity-bent GLSL schematic plane (the only raycast target) */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[2.38, 3.48, 1, 64]} />
          <shaderMaterial
            vertexShader={MONOLITH_VERTEX_SHADER}
            fragmentShader={MONOLITH_FRAGMENT_SHADER}
            uniforms={uniforms}
          />
        </mesh>

        {/* 3. Spatial typography floating in front of the glass (auto-fit to panel width) */}
        <Text
          position={[-1.02, 1.45, 0.14]}
          fontSize={0.11}
          color={project.accentColor}
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.15}
          raycast={noRaycast}
          onSync={fitText}
        >
          {`[${project.index}] // ${project.codeName}`}
        </Text>

        <Text
          position={[-1.02, -0.95, 0.18]}
          fontSize={0.28}
          color="#F2EFE9"
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.04}
          raycast={noRaycast}
          onSync={fitText}
        >
          {project.title}
        </Text>

        <Text
          position={[-1.02, -1.32, 0.14]}
          fontSize={0.085}
          maxWidth={2.05}
          color="#7E828E"
          anchorX="left"
          anchorY="top"
          raycast={noRaycast}
        >
          {project.techStack.slice(0, 4).join('  •  ')}
        </Text>
      </group>
    </group>
  );
}

/* ───────────────────────── Parent ───────────────────────── */
export default function ArchiveMonoliths() {
  const groupRef = useRef<THREE.Group>(null);

  // One shared clock + velocity for all monoliths (uniform objects are shared by reference)
  const shared = useMemo<SharedState>(
    () => ({ uTime: { value: 0 }, uVelocity: { value: 0 }, active: true }),
    []
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useSpatialStore.getState();

    // const active = store.scrollProgress < HIDE_AFTER_SCROLL;
    // shared.active = active;
    // if (groupRef.current) groupRef.current.visible = active;
        // Monoliths grow out of the singularity as the camera leaves Stage 00, and shrink away after Stage 01
    const cp = store.cameraProgress;
    const presence =
      THREE.MathUtils.smoothstep(cp, 0.03, 0.14) *
      (1 - THREE.MathUtils.smoothstep(cp, HIDE_AFTER_SCROLL - 0.1, HIDE_AFTER_SCROLL));
    const active = presence > 0.002;
    shared.active = active;
    if (groupRef.current) {
      groupRef.current.visible = active;
      groupRef.current.scale.setScalar(Math.max(presence, 0.0001));
    }
    if (!active) return;

    shared.uTime.value += dt;
    shared.uVelocity.value = THREE.MathUtils.damp(
      shared.uVelocity.value,
      Math.tanh(store.scrollVelocity * 0.035), // normalized -1..1 (same as SingularityCore)
      6,
      dt
    );
  });

  // Never leave a pointer cursor behind
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <group ref={groupRef}>
      {PROJECTS_ARCHIVE.map((project, idx) => (
        <SingleMonolith key={project.id} project={project} idx={idx} shared={shared} />
      ))}
    </group>
  );
}