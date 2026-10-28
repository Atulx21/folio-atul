'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
  Milky Way sky: a star sphere that follows the camera (a true skybox), with a dense band of
  stars and soft haze along one great circle. Stars twinkle; the band is brightest toward the
  "galactic centre". Cost: one draw call, ~15k points.
*/
const STAR_COUNT = 14000;
const HAZE_COUNT = 700;
const SKY_RADIUS = 120;                 // inside the camera far plane (200)
const BAND_TILT: [number, number, number] = [1.05, 0, 0.5];

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aTint;
  attribute float aRand;
  uniform float uTime;
  uniform float uViewportH;
  varying float vAlpha;
  varying float vTint;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (uViewportH / 1080.0);
    float tw = 0.85 + 0.15 * sin(uTime * (0.6 + aRand * 2.0) + aRand * 50.0);
    vAlpha = aAlpha * tw;
    vTint = aTint;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uWhite;
  uniform vec3 uWarm;
  uniform vec3 uIce;
  varying float vAlpha;
  varying float vTint;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = pow(1.0 - d * 2.0, 1.5);
    vec3 col = mix(uWhite, uIce, step(vTint, 0.45));
    col = mix(col, uWarm, step(vTint, 0.15));
    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GalaxyBackdrop() {
  const ref = useRef<THREE.Points>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uViewportH: { value: 1080 },
      uWhite: { value: new THREE.Color('#F2EFE9') },
      uWarm: { value: new THREE.Color('#FFB27A') },
      uIce: { value: new THREE.Color('#A6E1FA') },
    }),
    []
  );

  const geo = useMemo(() => {
    const rand = mulberry32(0x5eed1234);
    const gauss = () => {
      const u = Math.max(rand(), 1e-6);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
    };

    const total = STAR_COUNT + HAZE_COUNT;
    const pos = new Float32Array(total * 3);
    const size = new Float32Array(total);
    const alpha = new Float32Array(total);
    const tint = new Float32Array(total);
    const rnd = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const isHaze = i >= STAR_COUNT;
      const inBand = isHaze || rand() < 0.74;
      let lon: number;
      let lat: number;

      if (inBand) {
        // Denser toward the "galactic centre" at longitude 0
        do {
          lon = rand() * Math.PI * 2;
        } while (rand() > 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(lon)));
        lat = gauss() * (isHaze ? 0.12 : 0.14);
        if (!isHaze && rand() < 0.25) lat *= 2.2; // fuzzy fringe
      } else {
        lon = rand() * Math.PI * 2;
        lat = Math.asin(2 * rand() - 1);
      }

      const cl = Math.cos(lat);
      pos[i * 3] = SKY_RADIUS * cl * Math.cos(lon);
      pos[i * 3 + 1] = SKY_RADIUS * Math.sin(lat);
      pos[i * 3 + 2] = SKY_RADIUS * cl * Math.sin(lon);

      if (isHaze) {
        size[i] = 70 + rand() * 60;       // big soft sprites: they add up to a glowing band
        alpha[i] = 0.012 + rand() * 0.02;
      } else {
        size[i] = 0.9 + Math.pow(rand(), 5) * 2.8;
        alpha[i] = inBand ? 0.3 + rand() * 0.6 : 0.5 + rand() * 0.5;
      }
      tint[i] = rand();
      rnd[i] = rand();
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    return g;
  }, []);

  useFrame((state) => {
    const p = ref.current;
    if (!p) return;
    p.position.copy(state.camera.position); // skybox: always centred on the camera
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uViewportH.value = state.size.height * state.gl.getPixelRatio();
  });

  return (
    <points ref={ref} geometry={geo} rotation={BAND_TILT} frustumCulled={false} renderOrder={-10}>
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}