'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useSpatialStore } from '@/store/useSpatialStore';

/* ───────────────────────── Tunables ───────────────────────── */
const PARTICLE_COUNT = 35000;
const DISK_FRACTION = 0.38;      // share of particles in the accretion disk
const DISK_TILT = 0.42;          // radians (mirrored inside the shader)
const PARTICLE_INTENSITY = 0.6;  // overall particle brightness (raise for hotter, lower for dimmer)
const HERO_OFFSET = 0.2;         // shifts the singularity right on wide screens (0 = centered)
const HERO_CAM_DISTANCE = 14.5;  // must match CameraRig's first waypoint
const HERO_FOV = 45;
const CURSOR_PLANE_Z = 1.5;      // world-space plane the cursor is projected onto
const SPRING_K = 70;             // cursor spring stiffness
const SPRING_C = 10;             // cursor spring damping (underdamped -> slight overshoot)

/* ───────────────────────── Shaders ───────────────────────── */
const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;   // normalized scroll velocity, -1..1
  uniform float uUnfold;     // 0..1 blueprint unfolding
  uniform float uFade;       // 0..1 global fade as we leave Stage 00
  uniform float uWake;       // 0..1 cursor speed
  uniform float uViewportH;  // drawing-buffer height in device pixels
  uniform vec3 uCursor;      // cursor position in local space

  attribute float aScale;
  attribute float aRandomness;
  attribute float aDisk;     // 0 = inner shell, 1 = accretion disk

  varying float vEnergy;
  varying float vDistanceToCore;
  varying float vFade;
  varying float vBeam;

  const float TILT = ${DISK_TILT.toFixed(4)};

  // ── 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) ──
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  vec3 snoiseVec3(vec3 x) {
    return vec3(
      snoise(x),
      snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)),
      snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4))
    );
  }

  // Divergence-free curl noise: fluid, swirling motion without clumping
  vec3 curlNoise(vec3 p) {
    const float e = 0.12;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);

    vec3 px0 = snoiseVec3(p - dx);
    vec3 px1 = snoiseVec3(p + dx);
    vec3 py0 = snoiseVec3(p - dy);
    vec3 py1 = snoiseVec3(p + dy);
    vec3 pz0 = snoiseVec3(p - dz);
    vec3 pz1 = snoiseVec3(p + dz);

    float x = py1.z - py0.z - pz1.y + pz0.y;
    float y = pz1.x - pz0.x - px1.z + px0.z;
    float z = px1.y - px0.y - py1.x + py0.x;

    return vec3(x, y, z) / (2.0 * e);
  }

  vec3 tiltVec(vec3 v) {
    float ct = cos(TILT);
    float st = sin(TILT);
    return vec3(v.x, v.y * ct - v.z * st, v.y * st + v.z * ct);
  }

  void main() {
    vec3 pos = position;

    // 1. Keplerian-style differential rotation about the disk axis (inner = faster)
    float r = length(pos.xz);
    float omega = 1.3 * pow(max(r, 2.0), -1.5) * (1.0 + (aRandomness - 0.5) * 0.3);
    float angle = uTime * omega;
    float s = sin(angle);
    float c = cos(angle);
    pos.xz = mat2(c, -s, s, c) * pos.xz;

    // Orbital tangent (for relativistic beaming) in the same frame as pos
    vec3 tang = normalize(vec3(pos.z, 0.0, -pos.x) + vec3(0.0001, 0.0, 0.0));

    // 2. Tilt the accretion disk as a rigid plane (after rotating about its own axis)
    if (aDisk > 0.5) {
      pos = tiltVec(pos);
      tang = tiltVec(tang);
    }
    vBeam = aDisk * tang.z; // +z points at the camera: approaching side glows brighter

    // 3. Curl-noise turbulence, slowly drifting through the field
    pos += curlNoise(pos * 0.55 + vec3(0.0, uTime * 0.12, uTime * 0.07)) * (0.22 + aRandomness * 0.14);

    // 4. Blueprint unfolding as the user scrolls away from Stage 00
    pos *= (1.0 + uUnfold * 2.4);

    // 5. Velocity-driven Z ripple (uVelocity is already normalized)
    pos.z += sin(pos.x * 2.0 + uTime * 3.0) * (uVelocity * 1.1);

    // 6. Cursor gravitational wake: a spring-driven cursor pushes particles away
    float radius = 3.2 + uWake * 1.6;
    vec3 away = pos - uCursor;
    float dC = length(away);
    float force = max(0.0, 1.0 - dC / radius);
    float push = pow(force, 2.2) * (1.5 + uWake * 1.6);
    pos += (away / max(dC, 0.0001)) * push;

    vEnergy = clamp(force * 1.2 + abs(uVelocity) * 0.45 + aRandomness * 0.12, 0.0, 1.0);
    vDistanceToCore = length(position);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float depth = max(-mv.z, 0.001);

    // Perspective-correct size from the projection: stable across DPR, resolution and FOV warp
    float rawSize = aScale * 0.032 * (1.0 + force * 1.1)
                  * uViewportH * 0.5 * projectionMatrix[1][1] / depth;
    gl_PointSize = clamp(rawSize, 1.6, 0.06 * uViewportH);

    // Sub-pixel points are fattened to 1.6px; compensate alpha so they don't shimmer
    float sub = min(1.0, rawSize / 1.6);
    vFade = sub * sub * smoothstep(0.6, 3.5, depth) * uFade; // also fades near the lens

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorCore;
  uniform vec3 uColorIce;
  uniform vec3 uColorAmber;
  uniform float uIntensity;

  varying float vEnergy;
  varying float vDistanceToCore;
  varying float vFade;
  varying float vBeam;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = pow(1.0 - dist * 2.0, 1.8);

    // Inner core glows warm alabaster, the outer accretion disk glows Cherenkov ice
    float shellMix = clamp((vDistanceToCore - 2.0) / 4.0, 0.0, 1.0);
    vec3 baseColor = mix(uColorCore, uColorIce, shellMix);

    // Cursor interaction / scroll velocity shifts particles to incandescent amber
    vec3 color = mix(baseColor, uColorAmber, vEnergy);

    // Relativistic beaming: approaching side of the disk is brighter
    float beam = 1.0 + 0.55 * vBeam;

    gl_FragColor = vec4(color * (uIntensity + vEnergy * 0.6) * beam, alpha * 0.9 * vFade);
  }
`;

/* ───────────────────────── Helpers ───────────────────────── */
// Deterministic PRNG so the particle layout is identical on every load
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────────────────── Component ───────────────────────── */
export default function SingularityCore() {
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  // Mutable per-frame simulation state (no React renders involved)
  const sim = useRef({
    time: 0,
    scroll: 0,
    wake: 0,
    ready: false,
    touched: false,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    target: new THREE.Vector3(),
    local: new THREE.Vector3(),
    ndc: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    tmp: new THREE.Vector3(),
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uUnfold: { value: 0 },
      uFade: { value: 1 },
      uWake: { value: 0 },
      uViewportH: { value: 1080 },
      uIntensity: { value: PARTICLE_INTENSITY },
      uCursor: { value: new THREE.Vector3(0, 0, 50) },
      // THREE.Color converts sRGB hex -> linear working space (correct for the composer pipeline)
      uColorCore: { value: new THREE.Color('#F2EFE9') },
      uColorIce: { value: new THREE.Color('#A6E1FA') },
      uColorAmber: { value: new THREE.Color('#FF5500') },
    }),
    []
  );

  // Inner singularity shell + flat accretion disk (the disk is tilted inside the shader)
  const { positions, scales, randomness, diskFlags } = useMemo(() => {
    const rand = mulberry32(0x7e55e12a);
    const count = PARTICLE_COUNT;
    const pos = new Float32Array(count * 3);
    const sc = new Float32Array(count);
    const rnd = new Float32Array(count);
    const disk = new Float32Array(count);
    const diskStart = Math.floor(count * (1 - DISK_FRACTION));

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      if (i < diskStart) {
        // Uniform spherical shell, density biased toward the inner radius
        const theta = rand() * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * rand() - 1.0);
        const r = 2.0 + Math.pow(rand(), 1.5) * 1.6;

        pos[i3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i3 + 2] = r * Math.cos(phi);
        disk[i] = 0;
      } else {
        // Flat relativistic accretion ring in the XZ plane
        const angle = rand() * Math.PI * 2;
        const radius = 3.2 + Math.pow(rand(), 1.2) * 4.5;
        const thickness = (rand() - 0.5) * 0.35 * (1.0 - (radius - 3.2) / 5.5);

        pos[i3] = Math.cos(angle) * radius;
        pos[i3 + 1] = thickness;
        pos[i3 + 2] = Math.sin(angle) * radius;
        disk[i] = 1;
      }

      sc[i] = 0.6 + rand() * 1.8;
      rnd[i] = rand();
    }

    return { positions: pos, scales: sc, randomness: rnd, diskFlags: disk };
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const store = useSpatialStore.getState();
    const s = sim.current;

    // Same smoothing constant as CameraRig so visuals stay in sync with the camera
    s.scroll = THREE.MathUtils.damp(s.scroll, store.scrollProgress, 8, dt);

    // The camera is long past this stage after ~60%: skip every draw call
    const visible = s.scroll < 0.6;
    group.visible = visible;
    if (!visible) return;

    s.time += dt;
    uniforms.uTime.value = s.time;
    uniforms.uViewportH.value = state.size.height * state.gl.getPixelRatio();

    // Normalized, smoothed scroll velocity (-1..1)
    const vTarget = Math.tanh(store.scrollVelocity * 0.035);
    uniforms.uVelocity.value = THREE.MathUtils.damp(uniforms.uVelocity.value, vTarget, 6, dt);
    const vAbs = Math.abs(uniforms.uVelocity.value);

    uniforms.uUnfold.value = THREE.MathUtils.smoothstep(s.scroll, 0, 0.3);
    uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(s.scroll, 0.04, 0.4);

    // Hero framing: shift right on wide screens so the headline stays legible, scale on narrow ones
    const aspect = state.size.width / state.size.height;
    const heroOn = 1 - THREE.MathUtils.smoothstep(s.scroll, 0, 0.14);
    const viewW = 2 * Math.tan(THREE.MathUtils.degToRad(HERO_FOV / 2)) * HERO_CAM_DISTANCE * aspect;
    group.position.x = aspect > 1.15 ? viewW * HERO_OFFSET * heroOn : 0;
    group.scale.setScalar(0.92 * THREE.MathUtils.clamp(aspect / 1.4, 0.5, 1));
    group.updateMatrixWorld();

    // ── Cursor: unproject the real pointer onto a world plane ──
    const cam = state.camera;
    if (store.mouse.targetX !== 0 || store.mouse.targetY !== 0) s.touched = true;

    if (s.touched) {
      s.ndc.set(store.mouse.targetX, store.mouse.targetY, 0.5).unproject(cam);
      s.dir.copy(s.ndc).sub(cam.position).normalize();
      if (Math.abs(s.dir.z) > 1e-3) {
        const dist = (CURSOR_PLANE_Z - cam.position.z) / s.dir.z;
        if (dist > 0) s.target.copy(cam.position).addScaledVector(s.dir, dist);
      }
    } else {
      s.target.set(0, 0, 80); // parked far away until the mouse first moves
    }
    if (!s.ready) {
      s.pos.copy(s.target);
      s.ready = true;
    }

    // Underdamped spring (Hooke's law): slight overshoot gives the wake its elastic feel
    const sdt = Math.min(dt, 1 / 30);
    s.tmp.copy(s.pos).sub(s.target).multiplyScalar(-SPRING_K);
    s.tmp.addScaledVector(s.vel, -SPRING_C);
    s.vel.addScaledVector(s.tmp, sdt);
    s.pos.addScaledVector(s.vel, sdt);

    // Fast cursor movement widens and strengthens the wake
    s.wake = THREE.MathUtils.damp(s.wake, THREE.MathUtils.clamp(s.vel.length() / 25, 0, 1), 5, dt);
    uniforms.uWake.value = s.wake;

    s.local.copy(s.pos);
    group.worldToLocal(s.local);
    uniforms.uCursor.value.copy(s.local);

    // Gyroscopic rings
    const speedBoost = 1 + vAbs * 1.5;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += dt * 0.25 * speedBoost;
      ring1Ref.current.rotation.y += dt * 0.18 * speedBoost;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= dt * 0.32 * speedBoost;
      ring2Ref.current.rotation.z += dt * 0.15 * speedBoost;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x -= dt * 0.12 * speedBoost;
      ring3Ref.current.rotation.z -= dt * 0.28 * speedBoost;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Curl-noise accretion particles */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
          <bufferAttribute attach="attributes-aRandomness" args={[randomness, 1]} />
          <bufferAttribute attach="attributes-aDisk" args={[diskFlags, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 2. The liquid ferrofluid event horizon core */}
      <mesh>
        <icosahedronGeometry args={[1.45, 12]} />
        <MeshDistortMaterial
          color="#08090C"
          emissive="#FF5500"
          emissiveIntensity={0.22}
          metalness={0.95}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.1}
          distort={0.38}
          speed={2.2}
        />
      </mesh>

      {/* 3. Triple gyroscopic containment rings (thicker tubes: no MSAA means 1px lines crawl) */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.55, 0.02, 8, 180]} />
        <meshBasicMaterial color="#FF5500" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      <mesh ref={ring2Ref}>
        <torusGeometry args={[3.15, 0.016, 8, 180]} />
        <meshBasicMaterial color="#A6E1FA" transparent opacity={0.3} depthWrite={false} />
      </mesh>

      <mesh ref={ring3Ref}>
        <torusGeometry args={[4.1, 0.012, 8, 200]} />
        <meshBasicMaterial color="#F2EFE9" transparent opacity={0.15} depthWrite={false} />
      </mesh>
    </group>
  );
}