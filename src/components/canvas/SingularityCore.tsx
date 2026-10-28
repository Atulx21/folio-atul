'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useSpatialStore } from '@/store/useSpatialStore';
import { noRaycast } from '@/utils/spatialGuards';

/* ───────────────────────── Tunables ───────────────────────── */
const STAR_COUNT = 70000;
const BULGE_FRACTION = 0.2;       // share of stars in the central bulge
const GALAXY_RADIUS = 7.5;
const DISK_SCALE_LENGTH = 2.6;    // exponential disk: dense core, thinning outward
const ARMS = 4;
const ARM_SPIN = 1.15;            // how tightly the arms wind (radians per unit radius)
const ARM_FRACTION = 0.75;        // share of disk stars on the arms (the rest fill between them)
const TILT_X = 1.0;               // radians: how far the disk is tipped toward us
const TILT_Z = 0.28;
const INTENSITY = 0.75;           // star brightness (raise for hotter, lower for dimmer)
const HERO_OFFSET = 0.17;         // shifts the galaxy right on wide screens (0 = centered)
const HERO_SCALE = 0.8;
const HERO_CAM_DISTANCE = 14.5;   // must match CameraRig's first waypoint
const HERO_FOV = 45;
const CURSOR_PLANE_Z = 1.5;
const SPRING_K = 70;
const SPRING_C = 10;

/* ───────────────────────── Star shaders ───────────────────────── */
const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uUnfold;
  uniform float uFade;
  uniform float uWake;
  uniform float uViewportH;
  uniform vec3 uCursor;

  attribute float aScale;
  attribute float aRandomness;
  attribute float aRadius;     // 0 = core, 1 = rim

  varying float vEnergy;
  varying float vRadius;
  varying float vFade;
  varying float vRand;
  varying float vTwinkle;

  const float TILT_X = ${TILT_X.toFixed(4)};
  const float TILT_Z = ${TILT_Z.toFixed(4)};

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
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  vec3 tiltVec(vec3 v) {
    float cx = cos(TILT_X); float sx = sin(TILT_X);
    v = vec3(v.x, v.y * cx - v.z * sx, v.y * sx + v.z * cx);
    float cz = cos(TILT_Z); float sz = sin(TILT_Z);
    return vec3(v.x * cz - v.y * sz, v.x * sz + v.y * cz, v.z);
  }

  void main() {
    vec3 pos = position;

    // 1. Spiral pattern turns nearly rigidly (density-wave style), with slight shear for life
    float r = length(pos.xz);
    float a = uTime * (0.07 + 0.05 / (1.0 + r));
    float c = cos(a);
    float s = sin(a);
    pos.xz = mat2(c, -s, s, c) * pos.xz;

    // 2. Slow noise "breathing" so the disk never looks frozen
    float n = snoise(pos * 0.45 + vec3(0.0, uTime * 0.06, 0.0));
    pos.y += n * 0.18 * (0.4 + aRadius);
    pos.xz += n * 0.12 * normalize(pos.xz + vec2(0.0001));

    // 3. Tip the disk toward the viewer
    pos = tiltVec(pos);

    // 4. Blueprint unfolding as the user scrolls away from Stage 00
    pos *= (1.0 + uUnfold * 2.4);

    // 5. Velocity ripple (uVelocity is normalized -1..1)
    pos.z += sin(pos.x * 2.0 + uTime * 3.0) * (uVelocity * 1.1);

    // 6. Cursor gravitational wake: a spring-driven cursor pushes stars away
    float radius = 3.0 + uWake * 1.6;
    vec3 away = pos - uCursor;
    float dC = length(away);
    float force = max(0.0, 1.0 - dC / radius);
    float push = pow(force, 2.2) * (1.4 + uWake * 1.6);
    pos += (away / max(dC, 0.0001)) * push;

    vEnergy = clamp(force * 1.2 + abs(uVelocity) * 0.35, 0.0, 1.0);
    vRadius = aRadius;
    vRand = aRandomness;
    vTwinkle = 0.8 + 0.2 * sin(uTime * (1.0 + aRandomness * 3.0) + aRandomness * 40.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float depth = max(-mv.z, 0.001);

    // Perspective-correct size from the projection (stable across DPR / FOV warp)
    float rawSize = aScale * 0.024 * (1.0 + force) * uViewportH * 0.5 * projectionMatrix[1][1] / depth;
    gl_PointSize = clamp(rawSize, 1.3, 0.05 * uViewportH);

    float sub = min(1.0, rawSize / 1.3);
    vFade = sub * sub * smoothstep(0.6, 3.5, depth) * uFade;

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorCore;
  uniform vec3 uColorMid;
  uniform vec3 uColorEdge;
  uniform vec3 uColorAmber;
  uniform float uIntensity;

  varying float vEnergy;
  varying float vRadius;
  varying float vFade;
  varying float vRand;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = pow(1.0 - d * 2.0, 1.6);

    // Old warm stars in the core -> alabaster mid-disk -> young blue-ice stars on the rim
    vec3 col = mix(uColorCore, uColorMid, smoothstep(0.0, 0.35, vRadius));
    col = mix(col, uColorEdge, smoothstep(0.3, 1.0, vRadius));

    // A few percent of arm stars glow amber (star-forming regions)
    float hot = step(0.93, vRand) * smoothstep(0.15, 0.6, vRadius);
    col = mix(col, uColorAmber, hot * 0.85);

    // Cursor / scroll energy heats the stars toward amber
    col = mix(col, uColorAmber, vEnergy * 0.8);

    gl_FragColor = vec4(col * (uIntensity + vEnergy * 0.5) * vTwinkle, alpha * 0.85 * vFade);
  }
`;

/* ───────────────────────── Glow sprites (core halo + star nucleus) ───────────────────────── */
const GLOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uSpikes;
  uniform float uFade;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float d = length(p);
    float core = pow(max(1.0 - d, 0.0), uPower);
    // Four-point diffraction spikes: this is what makes it read as a star
    float spike = uSpikes * (exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 2.6)
                           + exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 2.6));
    float a = (core + spike) * uIntensity * uFade;
    gl_FragColor = vec4(uColor, a);
  }
`;

function Glow({
  size,
  color,
  intensity,
  power,
  spikes = 0,
  fade,
}: {
  size: number;
  color: string;
  intensity: number;
  power: number;
  spikes?: number;
  fade: { value: number };
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLOW_VERTEX,
        fragmentShader: GLOW_FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: intensity },
          uPower: { value: power },
          uSpikes: { value: spikes },
          uFade: fade, // shared by reference: the parent writes it once per frame
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color, intensity, power, spikes, fade]
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <Billboard>
      <mesh scale={[size, size, 1]} raycast={noRaycast}>
        <planeGeometry args={[1, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
    </Billboard>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */
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

  const fade = useMemo(() => ({ value: 1 }), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uUnfold: { value: 0 },
      uFade: fade,
      uWake: { value: 0 },
      uViewportH: { value: 1080 },
      uIntensity: { value: INTENSITY },
      uCursor: { value: new THREE.Vector3(0, 0, 50) },
      uColorCore: { value: new THREE.Color('#FFC58A') },  // warm old stars
      uColorMid: { value: new THREE.Color('#F2EFE9') },   // Alabaster
      uColorEdge: { value: new THREE.Color('#A6E1FA') },  // Cherenkov Ice
      uColorAmber: { value: new THREE.Color('#FF5500') }, // Horizon Amber
    }),
    [fade]
  );

  // A real spiral galaxy: gaussian bulge + exponential disk with 4 arms
  const { positions, scales, randomness, radii } = useMemo(() => {
    const rand = mulberry32(0x7e55e12a);
    const gauss = () => {
      const u = Math.max(rand(), 1e-6);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
    };

    const count = STAR_COUNT;
    const bulgeCount = Math.floor(count * BULGE_FRACTION);
    const pos = new Float32Array(count * 3);
    const sc = new Float32Array(count);
    const rnd = new Float32Array(count);
    const rad = new Float32Array(count);
    const expNorm = 1 - Math.exp(-GALAXY_RADIUS / DISK_SCALE_LENGTH);

    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      let z: number;

      if (i < bulgeCount) {
        // Bulge: 3D gaussian ellipsoid
        x = gauss() * 1.0;
        y = gauss() * 0.56;
        z = gauss() * 1.0;
      } else {
        // Disk: exponential radial profile (dense core, thinning outward)
        const r = -DISK_SCALE_LENGTH * Math.log(1 - rand() * expNorm);
        const onArm = rand() < ARM_FRACTION;
        const arm = Math.floor(rand() * ARMS);
        const angle = onArm ? (arm / ARMS) * Math.PI * 2 + r * ARM_SPIN : rand() * Math.PI * 2;

        // Scatter around the arm centreline: cubed random = tight arms with soft fringes
        const spread = 0.55 * (0.4 + r * 0.22);
        const ox = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread;
        const oz = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread;

        x = Math.cos(angle) * r + ox;
        z = Math.sin(angle) * r + oz;
        y = gauss() * 0.22 * (1.05 - 0.6 * Math.min(1, r / GALAXY_RADIUS)); // thinner toward the rim
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      sc[i] = (0.45 + Math.pow(rand(), 7) * 3.6) * (i < bulgeCount ? 0.85 : 1); // few big bright stars
      rnd[i] = rand();
      rad[i] = Math.min(1, Math.hypot(x, z) / GALAXY_RADIUS);
    }

    return { positions: pos, scales: sc, randomness: rnd, radii: rad };
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const store = useSpatialStore.getState();
    const s = sim.current;

    s.scroll = THREE.MathUtils.damp(s.scroll, store.scrollProgress, 8, dt);

    // The camera is long past this stage after ~60%: skip every draw call
    const visible = s.scroll < 0.6;
    group.visible = visible;
    if (!visible) return;

    s.time += dt;
    uniforms.uTime.value = s.time;
    uniforms.uViewportH.value = state.size.height * state.gl.getPixelRatio();

    const vTarget = Math.tanh(store.scrollVelocity * 0.035);
    uniforms.uVelocity.value = THREE.MathUtils.damp(uniforms.uVelocity.value, vTarget, 6, dt);

    uniforms.uUnfold.value = THREE.MathUtils.smoothstep(s.scroll, 0, 0.3);
    fade.value = 1 - THREE.MathUtils.smoothstep(s.scroll, 0.04, 0.4);

    // Hero framing: shift right on wide screens so the headline stays legible
    const aspect = state.size.width / state.size.height;
    const heroOn = 1 - THREE.MathUtils.smoothstep(s.scroll, 0, 0.14);
    const viewW = 2 * Math.tan(THREE.MathUtils.degToRad(HERO_FOV / 2)) * HERO_CAM_DISTANCE * aspect;
    group.position.x = aspect > 1.15 ? viewW * HERO_OFFSET * heroOn : 0;
    group.scale.setScalar(HERO_SCALE * THREE.MathUtils.clamp(aspect / 1.4, 0.5, 1));
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

    s.wake = THREE.MathUtils.damp(s.wake, THREE.MathUtils.clamp(s.vel.length() / 25, 0, 1), 5, dt);
    uniforms.uWake.value = s.wake;

    s.local.copy(s.pos);
    group.worldToLocal(s.local);
    uniforms.uCursor.value.copy(s.local);
  });

  return (
    <group ref={groupRef}>
      {/* 1. The galaxy: bulge, four spiral arms, exponential disk */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
          <bufferAttribute attach="attributes-aRandomness" args={[randomness, 1]} />
          <bufferAttribute attach="attributes-aRadius" args={[radii, 1]} />
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

      {/* 2. Soft atmospheric halo, warm core glow, and a bright star nucleus with diffraction spikes */}
      <Glow size={15} color="#6FB6E6" intensity={0.1} power={1.6} fade={fade} />
      <Glow size={8} color="#FFB36B" intensity={0.5} power={2.2} fade={fade} />
      <Glow size={3.4} color="#FFF1DC" intensity={1.6} power={3} spikes={0.35} fade={fade} />
    </group>
  );
}