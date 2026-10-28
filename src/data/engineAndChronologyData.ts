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
    id: 'presentation',
    tierIndex: 'TIER 01 // TOP',
    name: 'PRESENTATION & SPATIAL UI LAYER',
    subtitle: 'REACT / NEXT.JS / REACT NATIVE / EXPO / WEBGL SHADERS',
    yOffset: 2.3,
    color: '#A6E1FA',
    nodes: [
      {
        label: 'Declarative 3D & Shaders',
        metric: '60-120 FPS',
        detail:
          'Three.js, React Three Fiber, custom GLSL shaders and transient Zustand render loops. This portfolio is the proof.',
      },
      {
        label: 'Cross-Platform Mobile',
        metric: 'EXPO + RN',
        detail:
          'UniLink and RozgarConnect: React Native with Expo Router file-based navigation, TypeScript and Reanimated, one codebase for iOS, Android and web.',
      },
      {
        label: 'Enterprise Web Views',
        metric: 'MVC + SPA',
        detail:
          'React, TypeScript and Tailwind single-page apps, plus ASP.NET Core MVC with Razor views and AJAX-driven profile flows at Troywings.',
      },
    ],
  },
  {
    id: 'service',
    tierIndex: 'TIER 02 // CORE',
    name: 'SERVICE, AI & ALGORITHMIC ENGINE',
    subtitle: 'C# ASP.NET CORE / NODE.JS / PYTHON FASTAPI + FLASK / C++ DSA',
    yOffset: 0.0,
    color: '#FF5500',
    nodes: [
      {
        label: 'Full-Stack API Orchestration',
        metric: 'REST + WS',
        detail:
          'ASP.NET Core MVC, Node.js/Express and Python FastAPI/Flask services with JWT authentication and Socket.IO real-time channels.',
      },
      {
        label: 'RAG & Computer Vision',
        metric: 'LANGCHAIN',
        detail:
          'LangChain RAG pipelines over FAISS with Hugging Face embeddings (AI-Tutor) and a DeepFace/OpenCV emotion service (MoodTunes).',
      },
      {
        label: 'Algorithmic & LLD Rigor',
        metric: '500+ SOLVED',
        detail:
          'Native C++ competitive programming (Global Rank 138, CodeChef Starters 196), dynamic programming, trees, and OOP low-level design.',
      },
    ],
  },
  {
    id: 'data',
    tierIndex: 'TIER 03 // BASE',
    name: 'PERSISTENCE, INDEXING & VECTOR STORAGE',
    subtitle: 'POSTGRESQL RLS / MONGODB / FAISS VECTOR INDEX / MYSQL',
    yOffset: -2.3,
    color: '#F2EFE9',
    nodes: [
      {
        label: 'Query & Index Optimization',
        metric: 'B-TREE + PROJ',
        detail:
          'MongoDB indexes designed per collection, with compound keys and field projections, to avoid collection scans (Troywings).',
      },
      {
        label: 'Zero-Trust Relational RLS',
        metric: 'SUPABASE SQL',
        detail:
          'Normalized PostgreSQL schemas where Row Level Security and role-based access enforce permissions in the database, with unique constraints guarding integrity (UniLink, RozgarConnect).',
      },
      {
        label: 'High-Dimensional Vectors',
        metric: 'FAISS INDEX',
        detail:
          'Dense vector similarity search over recursively chunked PDFs, so answers come from meaning, not keyword matching (AI-Tutor).',
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
      'Rebuilding UniLink as an open platform for every college: anyone can create a group, only the group owner can write attendance, marks and materials, and connected students can chat directly. A phased rebuild on Expo, Supabase RLS and TanStack Query with proper HLD and LLD, alongside deepening C++ algorithms and GATE CS & Data Science/AI preparation.',
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
    id: 'codechef-2025',
    year: 'SEP 2025',
    code: 'NODE.03 // COMPETITIVE PROGRAMMING',
    title: 'GLOBAL RANK 138 // CODECHEF',
    organization: '500+ PROBLEMS ACROSS LEETCODE, CODECHEF & GFG',
    category: 'ACHIEVEMENT',
    accent: '#FF5500',
    description:
      'Secured Global Rank 138 in CodeChef Starters 196, writing native C++ across dynamic programming, trees and graphs. Also built a custom HTML5 Canvas Bezier-curve spring-damper physics simulation driven by Hooke’s Law.',
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
    organization: 'BACHELOR OF TECHNOLOGY IN CSE',
    category: 'EDUCATION',
    accent: '#F2EFE9',
    description:
      'B.Tech in Computer Science and Engineering at the Indian Institute of Information Technology, Guwahati. Coursework in data structures and algorithms, OOP, operating systems, DBMS, networking, cloud computing and machine learning. Built UniLink, AI-Tutor, MoodTunes and RozgarConnect along the way. Before that: HSC (Maharashtra State Board), 94.17%, 2021.',
  },
];