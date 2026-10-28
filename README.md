# TESSERACT.OS // Non-Linear Spatial Engine

![Three.js](https://img.shields.io/badge/Three.js-050507?style=for-the-badge&logo=three.js&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-050507?style=for-the-badge&logo=webgl&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/R3F-050507?style=for-the-badge&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js_14-050507?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-050507?style=for-the-badge&logo=typescript&logoColor=3178C6)

A 60-120 FPS non-linear spatial portfolio engine engineered by [Atul Parmar](https://github.com/Atulx21). 
Built to break the static DOM paradigm, this architecture relies on a persistent single-canvas WebGL context, a 5-dimensional Catmull-Rom camera spline, and custom GLSL shaders to render physical web experiences.

## ⚙️ Core Architecture & Physics
- **Singularity Core:** 35,000+ GPGPU-computed particles running via custom GLSL Curl-Noise shaders.
- **Relativistic Velocity:** Camera FOV and 3D architectural monoliths physically bend and stretch against `lenis.velocity` scroll thrust.
- **Diegetic Spatial Audio:** Procedural Hans Zimmer-style 55Hz sub-bass drone generated via the native Web Audio API (BiquadFilterNode), mapped to user momentum.
- **State Management:** Transient `Zustand` updates piped directly into the `useFrame` render loop, guaranteeing zero React re-renders during physical movement.

## 🚀 Local Ignition

```bash
# 1. Clone the repository
git clone [https://github.com/Atulx21/tesseract-spatial-engine.git](https://github.com/Atulx21/tesseract-spatial-engine.git)

# 2. Install dependencies
npm install

# 3. Ignite the WebGL engine
npm run dev