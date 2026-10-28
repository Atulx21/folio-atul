'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ENGINE_TIERS } from '@/data/engineAndChronologyData';
import { useSpatialStore } from '@/store/useSpatialStore';
import { soundEngine } from '@/utils/soundEngine';
import { isUiTarget, noRaycast, fitBox } from '@/utils/spatialGuards';

/* ───────────────────────── Tunables ───────────────────────── */
const STAGE_T = 0.5;                  // camera progress at Stage 02
const FULL_RANGE = 0.34;              // fully present within this distance of the stage
const FADE_RANGE = 0.12;              // then shrinks away over this extra distance
const ROOT_POS: [number, number, number] = [-1.2, 2.0, -20.0];
const SCAN_PERIOD = 5.5;              // seconds per scanner sweep
const SPAN = Math.max(...ENGINE_TIERS.map((t) => Math.abs(t.yOffset)), 1.5) * 1.1 + 0.8;
const CONDUITS: [number, number][] = [[-2.1, -1.2], [2.1, -1.2], [-2.1, 1.2], [2.1, 1.2]];
const PULSE_COUNT = CONDUITS.length * 2;
const PULSE_COLOR = new THREE.Color('#A6E1FA').multiplyScalar(3); // HDR so bloom picks it up

const fitMetric = fitBox(1.4);
const fitLabel = fitBox(3.2);

/* ───────────────────────── Scanner overlay shader ───────────────────────── */
const SCAN_VERTEX = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormalL;
  varying vec2 vUv;
  varying float vWorldY;

  void main() {
    vLocal = position;
    vNormalL = normal;
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldY = wp.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SCAN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uIce;
  uniform float uScanY;     // world-space scanner height
  uniform float uHover;
  uniform float uSelected;

  varying vec3 vLocal;
  varying vec3 vNormalL;
  varying vec2 vUv;
  varying float vWorldY;

  void main() {
    // Surface grid on whichever two axes lie in the face's plane
    vec3 an = abs(vNormalL);
    vec2 p = an.y > 0.5 ? vLocal.xz : (an.x > 0.5 ? vLocal.zy : vLocal.xy);
    vec2 q = p / 0.4;
    vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-4));
    float grid = 1.0 - min(min(g.x, g.y), 1.0);

    // Crisp ~1.5px edges around every face
    vec2 e = min(vUv, 1.0 - vUv) / max(fwidth(vUv), vec2(1e-4));
    float edge = 1.0 - smoothstep(0.0, 1.6, min(e.x, e.y));

    // World-space scan: bright line + a wireframe trail that lingers below it
    float d = vWorldY - uScanY;
    float band = exp(-d * d * 28.0);
    float trail = d < 0.0 ? exp(d * 0.9) : 0.0;
    float scan = max(band, trail * 0.75);

    float base = 0.22 + uSelected * 0.35 + uHover * 0.25;
    float lines = grid * 0.5 + edge;
    float intensity = lines * (base + scan * 1.1);

    vec3 col = mix(uColor, uIce, clamp(band + trail * 0.5, 0.0, 1.0));
    col *= 1.0 + band * 1.6;

    gl_FragColor = vec4(col, clamp(intensity, 0.0, 1.0));
  }
`;

/* ───────────────────────── Component ───────────────────────── */
export default function EngineTopology() {
  const outerRef = useRef<THREE.Group>(null);     // fixed frame: position + presence scale
  const rootRef = useRef<THREE.Group>(null);      // rotating stack
  const scannerRef = useRef<THREE.Group>(null);   // world-aligned scanner (NOT rotated with the stack)
  const scannerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const pulsesRef = useRef<THREE.InstancedMesh>(null);
  const tierRefs = useRef<(THREE.Group | null)[]>([]);
  const slabMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const hovered = useRef(-1);
  const sim = useRef({
    time: 0,
    sel: ENGINE_TIERS.map(() => 0),
    hov: ENGINE_TIERS.map(() => 0),
  });
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { scan, tierUniforms } = useMemo(() => {
    const scanUniform = { value: -999 };
    const ice = { value: new THREE.Color('#A6E1FA') };
    return {
      scan: scanUniform,
      tierUniforms: ENGINE_TIERS.map((tier) => ({
        uColor: { value: new THREE.Color(tier.color) },
        uIce: ice,
        uScanY: scanUniform, // shared by reference: one write drives every tier
        uHover: { value: 0 },
        uSelected: { value: 0 },
      })),
    };
  }, []);

  useFrame((_, delta) => {
    const outer = outerRef.current;
    const root = rootRef.current;
    if (!outer || !root) return;

    const dt = Math.min(delta, 0.05);
    const store = useSpatialStore.getState();

    // Presence: fades the whole stage out (scale) when the camera is far away
    const d = Math.abs(store.cameraProgress - STAGE_T);
    const presence = 1 - THREE.MathUtils.smoothstep(d, FULL_RANGE, FULL_RANGE + FADE_RANGE);
    const visible = presence > 0.002;
    outer.visible = visible;
    if (!visible) {
      if (hovered.current !== -1) {
        hovered.current = -1;
        document.body.style.cursor = 'auto';
      }
      return;
    }
    outer.scale.setScalar(presence);

    const s = sim.current;
    s.time += dt;
    const time = s.time;

    // Tiers explode apart as the camera approaches Stage 02
    const explode = THREE.MathUtils.smoothstep(1.0 - d * 4.5, 0.2, 1.0);

    // Gentle stack orientation with mouse parallax
    root.rotation.y = THREE.MathUtils.damp(
      root.rotation.y,
      -0.35 + store.mouse.x * 0.35 + Math.sin(time * 0.4) * 0.1,
      4,
      dt
    );
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, 0.18 - store.mouse.y * 0.2, 4, dt);
    root.position.y = Math.sin(time * 0.6) * 0.08;

    // World-space scanner: sawtooth sweep bottom -> top
    const phase = (time / SCAN_PERIOD) % 1;
    const scanLocal = THREE.MathUtils.lerp(-SPAN, SPAN, phase);
    const scanWorld = outer.position.y + scanLocal * outer.scale.y;
    scan.value = scanWorld;
    if (scannerRef.current) {
      scannerRef.current.position.y = scanLocal;
      scannerRef.current.visible = phase > 0.015 && phase < 0.985;
    }
    if (scannerMatRef.current) scannerMatRef.current.opacity = 0.1 * Math.sin(Math.PI * phase);

    // Per-tier animation
    ENGINE_TIERS.forEach((tier, idx) => {
      const g = tierRefs.current[idx];
      if (!g) return;

      s.sel[idx] = THREE.MathUtils.damp(s.sel[idx], store.activeEngineTier === idx ? 1 : 0, 6, dt);
      s.hov[idx] = THREE.MathUtils.damp(s.hov[idx], hovered.current === idx ? 1 : 0, 8, dt);

      g.position.y = THREE.MathUtils.damp(g.position.y, tier.yOffset * (0.45 + explode * 0.65), 5, dt);
      g.position.z = s.hov[idx] * 0.3;
      g.scale.setScalar(0.96 + s.sel[idx] * 0.12 + s.hov[idx] * 0.03);

      // The slab lights up as the scanner passes through it
      const tierWorldY = outer.position.y + g.position.y * outer.scale.y;
      const glow = Math.exp(-Math.pow((tierWorldY - scanWorld) / 0.9, 2));
      const mat = slabMats.current[idx];
      if (mat) mat.emissiveIntensity = 0.12 + s.sel[idx] * 0.28 + s.hov[idx] * 0.3 + glow * 0.8;

      tierUniforms[idx].uHover.value = s.hov[idx];
      tierUniforms[idx].uSelected.value = s.sel[idx];
    });

    // Microservice nodes: slow spin + breathing
    nodeRefs.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.y += dt * 0.8;
      m.rotation.x += dt * 0.4;
      m.scale.setScalar(1 + Math.sin(time * 2.0 + i * 1.3) * 0.08);
    });

    // Data pulses travelling the conduits (set 1 flows down = requests, set 2 flows up = responses)
    const inst = pulsesRef.current;
    if (inst) {
      for (let i = 0; i < PULSE_COUNT; i++) {
        const [cx, cz] = CONDUITS[i % CONDUITS.length];
        const down = i < CONDUITS.length;
        const p = (time * 0.32 + i * 0.173) % 1;
        const y = down ? THREE.MathUtils.lerp(SPAN, -SPAN, p) : THREE.MathUtils.lerp(-SPAN, SPAN, p);
        dummy.position.set(cx, y, cz);
        dummy.scale.setScalar(Math.max(Math.sin(Math.PI * p) * (0.6 + explode * 0.6), 0.0001));
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }
  });

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <group ref={outerRef} position={ROOT_POS}>
      <group ref={rootRef}>
        {/* Vertical data-bus conduits */}
        {CONDUITS.map(([x, z], i) => (
          <Line
            key={i}
            points={[[x, -SPAN, z], [x, SPAN, z]]}
            color="#A6E1FA"
            lineWidth={1}
            transparent
            opacity={0.28}
            raycast={noRaycast}
          />
        ))}

        {/* Data pulses (one instanced mesh = one draw call) */}
        <instancedMesh
          ref={pulsesRef}
          args={[undefined, undefined, PULSE_COUNT]}
          frustumCulled={false}
          raycast={noRaycast}
        >
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshBasicMaterial color={PULSE_COLOR} toneMapped={false} />
        </instancedMesh>

        {/* The 3 exploded architectural tiers */}
        {ENGINE_TIERS.map((tier, idx) => (
          <group
            key={tier.id}
            ref={(el) => {
              tierRefs.current[idx] = el;
            }}
            position={[0, tier.yOffset, 0]}
            onPointerMove={(e) => {
              e.stopPropagation();
              if (isUiTarget(e)) {
                if (hovered.current === idx) {
                  hovered.current = -1;
                  document.body.style.cursor = 'auto';
                }
                return;
              }
              hovered.current = idx;
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              if (hovered.current === idx) hovered.current = -1;
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (isUiTarget(e)) return;
              useSpatialStore.getState().setActiveEngineTier(idx);
              soundEngine.triggerPing(520 + idx * 140);
            }}
          >
            {/* Structural slab (the only raycast target of the tier) */}
            <RoundedBox args={[5.2, 0.28, 3.4]} radius={0.04} smoothness={4}>
              <meshStandardMaterial
                ref={(m: THREE.MeshStandardMaterial | null) => {
                  slabMats.current[idx] = m;
                }}
                color="#121318"
                emissive={tier.color}
                emissiveIntensity={0.18}
                metalness={0.9}
                roughness={0.2}
              />
            </RoundedBox>

            {/* Scanner / wireframe overlay (grid + edges revealed by the world-space scan) */}
            <mesh raycast={noRaycast}>
              <boxGeometry args={[5.26, 0.31, 3.46]} />
              <shaderMaterial
                vertexShader={SCAN_VERTEX}
                fragmentShader={SCAN_FRAGMENT}
                uniforms={tierUniforms[idx]}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* Microservice nodes */}
            {tier.nodes.map((node, nIdx) => (
              <group key={node.label} position={[(nIdx - 1) * 1.55, 0.34, 0]}>
                <mesh
                  ref={(m) => {
                    nodeRefs.current[idx * 8 + nIdx] = m;
                  }}
                  raycast={noRaycast}
                >
                  <octahedronGeometry args={[0.24, 0]} />
                  <meshStandardMaterial
                    color={tier.color}
                    emissive={tier.color}
                    emissiveIntensity={0.9}
                    wireframe
                  />
                </mesh>
                <Text
                  position={[0, 0.4, 0]}
                  fontSize={0.11}
                  color="#F2EFE9"
                  anchorX="center"
                  anchorY="middle"
                  raycast={noRaycast}
                  onSync={fitMetric}
                >
                  {node.metric}
                </Text>
              </group>
            ))}

            {/* Front bevel label */}
            <Text
              position={[-2.4, 0, 1.78]}
              fontSize={0.13}
              color={tier.color}
              anchorX="left"
              anchorY="middle"
              letterSpacing={0.12}
              raycast={noRaycast}
              onSync={fitLabel}
            >
              {`${tier.tierIndex} — ${tier.name}`}
            </Text>
          </group>
        ))}
      </group>

      {/* World-aligned X-ray scanner (a sibling of the rotating stack, so it stays truly horizontal) */}
      <group ref={scannerRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[6.4, 4.4]} />
          <meshBasicMaterial
            ref={scannerMatRef}
            color="#FF5500"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <Line
          points={[
            [-3.2, 0, -2.2],
            [3.2, 0, -2.2],
            [3.2, 0, 2.2],
            [-3.2, 0, 2.2],
            [-3.2, 0, -2.2],
          ]}
          color="#FF5500"
          lineWidth={1.2}
          transparent
          opacity={0.7}
          raycast={noRaycast}
        />
      </group>
    </group>
  );
}