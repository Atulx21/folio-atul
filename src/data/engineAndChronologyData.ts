export interface EngineTierSpec {
  id: string;
  tierIndex: string;
  name: string;
  subtitle: string;
  yOffset: number;
  color: string;
  nodes: {
    label: string;
    metric: string;
    detail: string;
  }[];
}

export const ENGINE_TIERS: EngineTierSpec[] = [
  {
    id: 'core-code-3d',
    tierIndex: 'TIER 01 // CODE & 3D',
    name: 'LANGUAGES, SPATIAL 3D & CS CORE',
    subtitle: 'TS / JS / PYTHON / C++ / C / C# / SQL / GLSL // THREE.JS / R3F / DSA & LLD',
    yOffset: 1.5,
    color: '#A6E1FA',
    nodes: [
      {
        label: 'Polyglot Codebase',
        metric: 'TS · PY · C++ · C#',
        detail:
          'Writing expressive TypeScript, JavaScript, Python, C++, C, C#, SQL, and GLSL—picking the right language for low-level logic, fast APIs, or GPU shaders.',
      },
      {
        label: '3D & Motion Engine',
        metric: 'R3F · GLSL · LENIS',
        detail:
          'Crafting living 3D scenes with Three.js, React Three Fiber, custom GLSL shaders, Zustand state, and Lenis smooth motion that make interfaces feel physical.',
      },
      {
        label: 'CS & System Rigor',
        metric: 'DSA · OOP · LLD · OS',
        detail:
          'Grounded in Data Structures & Algorithms, OOP, Low-Level Design, Operating Systems, DBMS, Networking, Cloud Computing, and Machine Learning.',
      },
    ],
  },
  {
    id: 'fullstack-mobile',
    tierIndex: 'TIER 02 // WEB, MOBILE & APIs',
    name: 'FULL-STACK APPS, MOBILE & BACKENDS',
    subtitle: 'REACT / NEXT.JS / RN + EXPO // NODE / ASP.NET CORE / FASTAPI / FLASK',
    yOffset: 0.0,
    color: '#FF5500',
    nodes: [
      {
        label: 'Modern Web UI',
        metric: 'REACT · NEXT · TAILWIND',
        detail:
          'Shipping crisp, responsive interfaces with React, Next.js, Tailwind CSS, Vite, Shadcn/ui, and Framer Motion—from financial dashboards to AI workspaces.',
      },
      {
        label: 'Cross-Platform Mobile',
        metric: 'RN · EXPO · REANIMATED',
        detail:
          'Building smooth iOS, Android, and web apps with React Native, Expo, Expo Router, Reanimated, and React Native Paper—powering UniLink and RozgarConnect.',
      },
      {
        label: 'APIs & Real-Time Sync',
        metric: '.NET · NODE · FASTAPI',
        detail:
          'Architecting REST APIs, JWT Auth, and Socket.IO live channels across Node.js, Express.js, ASP.NET Core MVC, FastAPI, and Flask.',
      },
    ],
  },
  {
    id: 'ai-data-tooling',
    tierIndex: 'TIER 03 // AI, DATA & OPS',
    name: 'APPLIED AI, DATABASES & DEV TOOLING',
    subtitle: 'LANGCHAIN · FAISS · DEEPFACE // POSTGRES · SUPABASE RLS · MONGODB · GIT',
    yOffset: -1.5,
    color: '#CFCABE',
    nodes: [
      {
        label: 'Applied AI & Vision',
        metric: 'RAG · FAISS · OPENCV',
        detail:
          'Building grounded AI workflows with LangChain, RAG pipelines, FAISS, and Hugging Face (AI-Tutor) alongside DeepFace and OpenCV emotion detection (MoodTunes).',
      },
      {
        label: 'Databases & Security',
        metric: 'POSTGRES RLS · MONGO',
        detail:
          'Designing relational and document schemas in PostgreSQL, Supabase (with Row Level Security), MongoDB, MySQL, and FAISS vector indexes for speed and integrity.',
      },
      {
        label: 'Shipping & Tooling',
        metric: 'GIT · VS · VERCEL',
        detail:
          'Moving fast with Git, GitHub, VS Code, Visual Studio, and Vercel—turning prototypes into clean, reliable deployments.',
      },
    ],
  },
];

export interface ChronologyNode {
  id: string;
  year: string;
  code: string;
  title: string;
  organization: string;
  category: 'CAREER' | 'EDUCATION' | 'ACHIEVEMENT';
  accent: string;
  description: string;
}

// Newest first (index 0 is what a visitor sees by default)
export const CHRONOLOGY_MILESTONES: ChronologyNode[] = [
  {
    id: 'unilink-2026',
    year: '2026 // PRESENT',
    code: 'NODE.01 // FLAGSHIP BUILD',
    title: 'UNILINK — ACADEMIC NETWORK',
    organization: 'EXPO + SUPABASE RLS // PRODUCT BUILD',
    category: 'CAREER',
    accent: '#FF5500',
    description:
      'Rebuilding UniLink as an open platform for every college: anyone can create a group, only the owner can write attendance, marks and materials, and connected students can chat directly. Built on Expo, Supabase RLS and TanStack Query, alongside C++ DSA and GATE CS/DA prep.',
  },
  {
    id: 'troywings-2026',
    year: 'JAN — SEP 2026',
    code: 'NODE.02 // SOFTWARE ENGINEER INTERN',
    title: 'TROYWINGS TECHNOLOGIES LLP',
    organization: 'FULL-STACK .NET & MONGODB // REMOTE',
    category: 'CAREER',
    accent: '#A6E1FA',
    description:
      'Built full-stack user management for a talent platform on ASP.NET Core MVC and C#: responsive Razor UI, backend APIs, secure authentication workflows and real-time profile updates with AJAX and MongoDB. Designed MongoDB indexes across the login, profile and file services, and traced duplicate-index and missing-profile data issues to their root cause.',
  },
  {
    id: 'dsa-ongoing',
    year: 'ONGOING',
    code: 'NODE.03 // PROBLEM SOLVING',
    title: '500+ DSA // 100+ DAY STREAK',
    organization: 'CODEFORCES, LEETCODE & MORE',
    category: 'ACHIEVEMENT',
    accent: '#FF5500',
    description:
      'Solved 400+ DSA problems in native C++ across dynamic programming, trees and graphs, and kept a 100+ day solving streak on Codeforces and other platforms. Also built a custom HTML5 Canvas Bezier-curve spring-damper simulation driven by Hooke’s Law.',
  },
  {
    id: 'caset-2024',
    year: 'JUL — AUG 2024',
    code: 'NODE.04 // FULL STACK DEVELOPER INTERN',
    title: 'CASET',
    organization: 'REACT DASHBOARDS & FINANCIAL ANALYTICS // REMOTE',
    category: 'CAREER',
    accent: '#A6E1FA',
    description:
      'Built a financial data visualization dashboard for a B2B stock monitoring platform, with interactive React components tracking stock prices, weekly performance and profit trends. Also built Badge Analytics and Payment pages with tiered (Gold/Silver/Bronze) transaction classification.',
  },
  {
    id: 'iiitg-2026',
    year: '2022 — 2026',
    code: 'NODE.05 // B.TECH COMPUTER SCIENCE',
    title: 'IIIT GUWAHATI',
    organization: 'B.TECH IN COMPUTER SCIENCE & ENGINEERING',
    category: 'EDUCATION',
    accent: '#F2EFE9',
    description:
      'B.Tech in Computer Science and Engineering at the Indian Institute of Information Technology, Guwahati. Coursework in data structures and algorithms, OOP, operating systems, DBMS, networking, cloud computing and machine learning. Built UniLink, AI-Tutor, MoodTunes and RozgarConnect along the way. Prior HSC (Maharashtra State Board), 94.17%, 2021.',
  },
];