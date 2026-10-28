'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CHRONOLOGY_MILESTONES } from '@/data/engineAndChronologyData';
import { useSpatialStore } from '@/store/useSpatialStore';
import { soundEngine } from '@/utils/soundEngine';
import { isUiTarget, noRaycast, fitBox } from '@/utils/spatialGuards';

/* ───────────────────────── Tunables ───────────────────────── */
const STAGE_T = 0.75;
const FULL_RANGE = 0.34;
const FADE_RANGE = 0.12;
const ROOT_POS: [number, number, number] = [0, 12, -41.5];
const STRING_HALF = 4.5;      // half-length of each vertical time-string
const STRING_POINTS = 64;
const TESS_SCALE = 1.6;       // size of the 4D hypercube
const TESS_DIST = 3.0;        // 4D camera distance for perspective projection (> sqrt(2))
const TESS_Z = -3.2;          // sits behind the pillars, intersecting them

const fitYear = fitBox(1.65, 0.2);
const fitTitle = fitBox(1.65, 0.52);
const fitOrg = fitBox(1.65, 0.3);

const baseX = (idx: number) => (idx - 2) * 2.45;
const baseZ = (idx: number) => -Math.abs(idx - 2) * 0.65;

/* ───────────────────────── 4D hypercube data ───────────────────────── */
// 16 vertices (+-1,+-1,+-1,+-1); two vertices share an edge when they differ in exactly one coordinate (32 edges)
const TESS_VERTS: number[][] = Array.from({ length: 16 }, (_, i) => [
  i & 1 ? 1 : -1,
  i & 2 ? 1 : -1,
  i & 4 ? 1 : -1,
  i & 8 ? 1 : -1,
]);
const TESS_EDGES: [number, number][] = [];
for (let i = 0; i < 16; i++) {
  for (let b = 0; b < 4; b++) {
    const j = i ^ (1 << b);
    if (j > i) TESS_EDGES.push([i, j]);
  }
}

/* ───────────────────────── Component ───────────────────────── */
export default function TesseractChronology() {
  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Group | null)[]>([]);
  const crystalMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const proj = useRef(new Float32Array(16 * 3));
  const sim = useRef({
    time: 0,
    angle: 0,
    prevSel: -1,
    hovered: -1,
    energy: CHRONOLOGY_MILESTONES.map(() => 0),
    sel: CHRONOLOGY_MILESTONES.map(() => 0),
    hov: CHRONOLOGY_MILESTONES.map(() => 0),
  });

  // Plain THREE objects updated in place every frame (no per-frame allocations)
  const { strings, tess } = useMemo(() => {
    const strings = CHRONOLOGY_MILESTONES.map((item) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(STRING_POINTS * 3);
      for (let i = 0; i < STRING_POINTS; i++) {
        pos[i * 3 + 1] = (i / (STRING_POINTS - 1) - 0.5) * 2 * STRING_HALF;
      }
      const attr = new THREE.BufferAttribute(pos, 3);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', attr);
      const mat = new THREE.LineBasicMaterial({
        color: item.accent,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.raycast = () => {};
      return { line, pos, attr, mat, geo };
    });

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(TESS_EDGES.length * 2 * 3);
    const attr = new THREE.BufferAttribute(pos, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    const mat = new THREE.LineBasicMaterial({
      color: '#A6E1FA',
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.LineSegments(geo, mat);
    line.frustumCulled = false;
    line.raycast = () => {};

    return { strings, tess: { line, pos, attr, geo, mat } };
  }, []);

  useEffect(() => {
    return () => {
      strings.forEach((s) => {
        s.geo.dispose();
        s.mat.dispose();
      });
      tess.geo.dispose();
      tess.mat.dispose();
      document.body.style.cursor = 'auto';
    };
  }, [strings, tess]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const store = useSpatialStore.getState();
    const s = sim.current;

    // Presence: fades the stage out (scale) when the camera is far away
    const d = Math.abs(store.cameraProgress - STAGE_T);
    const presence = 1 - THREE.MathUtils.smoothstep(d, FULL_RANGE, FULL_RANGE + FADE_RANGE);
    const visible = presence > 0.002;
    group.visible = visible;
    if (!visible) {
      if (s.hovered !== -1) {
        s.hovered = -1;
        document.body.style.cursor = 'auto';
      }
      return;
    }
    group.scale.setScalar(presence);

    s.time += dt;
    const time = s.time;
    const vAbs = Math.abs(Math.tanh(store.scrollVelocity * 0.035));

    // Mouse parallax inside the rolled corridor
    group.position.x = THREE.MathUtils.damp(group.position.x, store.mouse.x * 0.8, 4, dt);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, store.mouse.x * 0.08, 4, dt);

    // Pluck a string when the selection changes (the first read is not a change)
    const sel = store.activeChronologyIndex;
    if (sel !== s.prevSel) {
      if (s.prevSel !== -1 && s.energy[sel] !== undefined) s.energy[sel] = 1;
      s.prevSel = sel;
    }

    /* ── 4D tesseract: rotate in the XW and ZW planes, then perspective-project 4D -> 3D ── */
    s.angle += dt * (0.22 + vAbs * 1.4); // scrolling fast spins time faster
    const a = s.angle;
    const b = s.angle * 0.63;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cb = Math.cos(b), sb = Math.sin(b);
    const P = proj.current;
    for (let i = 0; i < 16; i++) {
      const v = TESS_VERTS[i];
      const x1 = v[0] * ca - v[3] * sa;       // XW rotation
      const w1 = v[0] * sa + v[3] * ca;
      const z1 = v[2] * cb - w1 * sb;         // ZW rotation
      const w2 = v[2] * sb + w1 * cb;
      const k = (TESS_SCALE * TESS_DIST) / (TESS_DIST - w2); // perspective from 4D
      P[i * 3] = x1 * k;
      P[i * 3 + 1] = v[1] * k;
      P[i * 3 + 2] = z1 * k;
    }
    const T = tess.pos;
    for (let e = 0; e < TESS_EDGES.length; e++) {
      const [i, j] = TESS_EDGES[e];
      const o = e * 6;
      T[o] = P[i * 3];     T[o + 1] = P[i * 3 + 1]; T[o + 2] = P[i * 3 + 2];
      T[o + 3] = P[j * 3]; T[o + 4] = P[j * 3 + 1]; T[o + 5] = P[j * 3 + 2];
    }
    tess.attr.needsUpdate = true;
    tess.mat.opacity = 0.35 + vAbs * 0.4;

    /* ── Time-strings + memory crystals ── */
    CHRONOLOGY_MILESTONES.forEach((_, idx) => {
      const st = strings[idx];

      s.energy[idx] *= Math.exp(-2.4 * dt); // exponential decay = damped harmonic motion
      const E = s.energy[idx];
      s.sel[idx] = THREE.MathUtils.damp(s.sel[idx], sel === idx ? 1 : 0, 6, dt);
      s.hov[idx] = THREE.MathUtils.damp(s.hov[idx], s.hovered === idx ? 1 : 0, 8, dt);

      // Standing wave on the string: fundamental + first harmonic, both decaying with E
      const amp = 0.012 + E * 0.22;
      const w = 16 + idx * 1.7;
      const m1 = Math.sin(w * time);
      const m2 = Math.sin(w * 2.07 * time + 1.3);
      for (let i = 0; i < STRING_POINTS; i++) {
        const u = i / (STRING_POINTS - 1);
        st.pos[i * 3] = amp * (Math.sin(Math.PI * u) * m1 + 0.45 * Math.sin(2 * Math.PI * u) * m2);
      }
      st.attr.needsUpdate = true;
      st.mat.opacity = Math.min(1, 0.3 + s.sel[idx] * 0.4 + s.hov[idx] * 0.2 + E * 0.3);

      const node = nodeRefs.current[idx];
      if (node) {
        node.position.x = baseX(idx) + E * Math.sin(w * time) * 0.03;
        node.position.y = Math.sin(time * 1.5 + idx) * 0.03 + E * Math.sin(w * time) * 0.1;
        node.scale.setScalar(0.94 + s.sel[idx] * 0.18 + s.hov[idx] * 0.04);
      }

      const mat = crystalMats.current[idx];
      if (mat) mat.emissiveIntensity = 0.18 + s.sel[idx] * 0.45 + s.hov[idx] * 0.2 + E * 0.6;
    });
  });

  return (
    <group ref={groupRef} position={ROOT_POS}>
      {/* 4D hypercube behind and through the pillars */}
      <primitive object={tess.line} position={[0, 0, TESS_Z]} />

      {/* 5 time-chord pillars */}
      {CHRONOLOGY_MILESTONES.map((item, idx) => (
        <group
          key={item.id}
          position={[baseX(idx), 0, baseZ(idx)]}
          ref={(el) => {
            nodeRefs.current[idx] = el;
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            const s = sim.current;
            if (isUiTarget(e)) {
              if (s.hovered === idx) {
                s.hovered = -1;
                document.body.style.cursor = 'auto';
              }
              return;
            }
            if (s.hovered !== idx) {
              s.hovered = idx;
              s.energy[idx] = Math.max(s.energy[idx], 0.4); // light pluck on hover
            }
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            if (sim.current.hovered === idx) sim.current.hovered = -1;
            document.body.style.cursor = 'auto';
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isUiTarget(e)) return;
            sim.current.energy[idx] = 1;
            useSpatialStore.getState().setActiveChronologyIndex(idx);
            soundEngine.triggerPing(440 + idx * 110);
          }}
        >
          {/* Vertical gravitational time-string (vibrates when plucked) */}
          <primitive object={strings[idx].line} />

          {/* Milestone memory crystal (the only raycast target) */}
          <RoundedBox args={[1.95, 1.25, 0.16]} radius={0.03} smoothness={4}>
            <meshStandardMaterial
              ref={(m: THREE.MeshStandardMaterial | null) => {
                crystalMats.current[idx] = m;
              }}
              color="#0B0C10"
              emissive={item.accent}
              emissiveIntensity={0.22}
              metalness={0.9}
              roughness={0.15}
            />
          </RoundedBox>

          <Text
            position={[-0.82, 0.38, 0.12]}
            fontSize={0.095}
            color={item.accent}
            anchorX="left"
            anchorY="middle"
            raycast={noRaycast}
            onSync={fitYear}
          >
            {item.year}
          </Text>

          <Text
            position={[-0.82, 0.02, 0.12]}
            fontSize={0.135}
            maxWidth={1.65}
            color="#F2EFE9"
            anchorX="left"
            anchorY="middle"
            raycast={noRaycast}
            onSync={fitTitle}
          >
            {item.title}
          </Text>

          <Text
            position={[-0.82, -0.38, 0.12]}
            fontSize={0.075}
            maxWidth={1.65}
            color="#7E828E"
            anchorX="left"
            anchorY="middle"
            raycast={noRaycast}
            onSync={fitOrg}
          >
            {item.organization}
          </Text>
        </group>
      ))}
    </group>
  );
}