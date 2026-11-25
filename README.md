# TESSERACT.OS — 3D Spatial Developer Portfolio

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-atul--folio.vercel.app-FF5500?style=for-the-badge&logo=vercel&logoColor=white)](https://atul-folio.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![React Three Fiber](https://img.shields.io/badge/React_Three_Fiber-R3F-A6E1FA?style=for-the-badge)](https://docs.pmnd.rs/react-three-fiber)

> A persistent WebGL spatial portfolio designed like a sci-fi operating system. Built to demonstrate full-stack engineering, real-time 3D rendering, and low-level UI performance rather than just listing them.

**Live Production:** [https://atul-folio.vercel.app](https://atul-folio.vercel.app/)  
**Repository:** [https://github.com/Atulx21/folio-atul](https://github.com/Atulx21/folio-atul)

---

## Architectural Overview

Most web portfolios rely on static DOM transitions. **TESSERACT.OS** mounts a single persistent WebGL `<Canvas>` behind an OS-style HUD and drives navigation along a continuous 5-stage 3D camera spline synchronized with scroll momentum.

### Spatial Sectors
| Sector | Module | Purpose |
| :--- | :--- | :--- |
| **`[00]`** | **SINGULARITY** | Entry hero featuring the live particle core and ambient spatial telemetry. |
| **`[01]`** | **THE ARCHIVE** | Interactive 3D monoliths showcasing flagship engineering builds (UniLink, AI-Tutor, MoodTunes, RozgarConnect). |
| **`[02]`** | **THE ENGINE** | 3-tier interactive capability matrix (`Code & 3D`, `Web, Mobile & APIs`, `AI, Data & Ops`) with clickable 3D slabs and live diagnostic cards. |
| **`[03]`** | **CHRONOLOGY** | Reverse-chronological engineering timeline covering internships, product builds, and IIIT Guwahati CSE education. |
| **`[04]`** | **EVENT HORIZON** | Direct contact interface backed by a Next.js App Router API route (`/api/contact`). |

---

## Engineering & Performance Decisions

* **Decoupled Render Loop (Zero React Re-Renders on Frame Tick):** High-frequency scroll progress, camera coordinates (`X / Y / Z`), thrust velocity, and FOV telemetry are managed via transient **Zustand** store updates and mutated directly inside `useFrame`, keeping React reconciliation off the 60–120 FPS WebGL loop.
* **Physics-Driven Scroll Spline:** Integrated **Lenis** for damped scroll interpolation, mapping normalized scroll progress to smooth 3D camera interpolation across all five sectors without hard page cuts.
* **Data-Driven Architecture:** Technical capabilities, 3D slab coordinates, node metrics, and career milestones are strictly typed and isolated in `src/data/engineAndChronologyData.ts`, cleanly separating domain data from Three.js scene geometry.
* **Resilient WebGL Mounting:** Wrapped the 3D scene in a dedicated `CanvasGate` boundary to handle client-side hydration and WebGL context lifecycle cleanly inside Next.js App Router.
* **SEO & Observability:** Configured full OpenGraph metadata, Twitter cards, `Person` JSON-LD structured data, and **Vercel Web Analytics** (`@vercel/analytics/next`) in `src/app/layout.tsx`.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework & Language** | Next.js 16 (App Router, Turbopack), React, TypeScript |
| **3D Graphics & Motion** | Three.js, React Three Fiber (R3F), Custom GLSL Shaders, Lenis |
| **State & Styling** | Zustand, Tailwind CSS, Geist & JetBrains Mono (`next/font`) |
| **Backend & Analytics** | Next.js Route Handlers (`/api/contact`), Vercel Web Analytics |
| **Deployment & CI/CD** | Vercel (Automatic production deployments on `main`, preview builds on branches) |

---

## Project Structure

```text
folio-atul/
├── public/                     # Static assets & media
├── src/
│   ├── app/
│   │   ├── api/contact/        # Server-side contact form endpoint
│   │   ├── globals.css         # Global design tokens & HUD styles
│   │   ├── layout.tsx          # Root layout, fonts, SEO metadata, JSON-LD & Analytics
│   │   └── page.tsx            # Main spatial viewport & HUD orchestration
│   ├── components/
│   │   └── canvas/
│   │       ├── CanvasGate.tsx      # Client-safe WebGL mount & fallback boundary
│   │       ├── EngineTopology.tsx  # Interactive 3-tier 3D capability slabs & nodes
│   │       └── ...                 # Stage scenes, shaders & camera rig
│   └── data/
│       └── engineAndChronologyData.ts  # Strongly-typed stack & chronology datasets
├── next.config.ts              # Next.js configuration
├── eslint.config.mjs           # ESLint flat config
└── package.json