export interface SkillGroup {
  title: string;
  items: string[];
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  type: string;
  bullets: string[];
  stack: string[];
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  period: string;
  place: string;
  detail: string;
}

export interface AchievementItem {
  title: string;
  detail: string;
}

export const PROFILE = {
  name: 'Atul Parmar',
  title: 'Full-Stack Software Engineer',
  summary: [
    'Computer Science graduate from IIIT Guwahati and full-stack software engineer. I specialize in architecting dynamic web and cross-platform mobile applications from concept to completion using React, React Native and Node.js.',
    'I care about data integrity and clean architecture: database-level security with PostgreSQL Row Level Security, retrieval-augmented AI pipelines, and real-time systems built on Socket.IO and Supabase Realtime.',
  ],
  stats: [
    { value: '2', label: 'INTERNSHIPS' },
    { value: '4', label: 'PROJECTS BUILT' },
    { value: '500+', label: 'DSA PROBLEMS' },
    { value: '100+', label: 'DAY STREAK' },
  ],
  links: [
    { kind: 'resume', label: 'RESUME', href: 'https://drive.google.com/file/d/1C_2MMx7_-6ZxacXWuX2dqA-kJuSRlTnW/view?usp=drive_link' },
    { kind: 'github', label: 'GITHUB', href: 'https://github.com/Atulx21' },
    { kind: 'linkedin', label: 'LINKEDIN', href: 'https://www.linkedin.com/in/atul-parmar/' },
    { kind: 'leetcode', label: 'LEETCODE', href: 'https://leetcode.com/u/Atul_Parmar_21/' },
    { kind: 'email', label: 'EMAIL', href: 'mailto:atulparmar0021@gmail.com' },
  ],
} as const;

// Shown as one-line chips on the hero
export const HERO_STACK = [
  'React',
  'Next.js',
  'React Native',
  'TypeScript',
  'Node.js',
  'Python',
  'PostgreSQL',
  'MongoDB',
  'Supabase',
  'LangChain',
];

export const SKILL_GROUPS: SkillGroup[] = [
  { title: 'LANGUAGES', items: ['TypeScript', 'JavaScript', 'Python', 'C++', 'C', 'C#', 'SQL', 'GLSL'] },
  { title: 'FRONTEND & WEB', items: ['React', 'Next.js', 'Tailwind CSS', 'Vite', 'Shadcn/ui', 'Framer Motion'] },
  { title: 'MOBILE', items: ['React Native', 'Expo', 'Expo Router', 'Reanimated', 'React Native Paper'] },
  { title: 'BACKEND & APIS', items: ['Node.js', 'Express.js', 'ASP.NET Core MVC', 'FastAPI', 'Flask', 'REST', 'Socket.IO', 'JWT Auth'] },
  { title: 'AI & MACHINE LEARNING', items: ['LangChain', 'RAG pipelines', 'FAISS', 'Hugging Face', 'DeepFace', 'OpenCV'] },
  { title: 'DATABASES', items: ['PostgreSQL', 'Supabase (RLS)', 'MongoDB', 'MySQL', 'FAISS vector index'] },
  { title: '3D & GRAPHICS', items: ['Three.js', 'React Three Fiber', 'GLSL shaders', 'Zustand', 'Lenis'] },
  { title: 'TOOLS', items: ['Git', 'GitHub', 'VS Code', 'Visual Studio', 'Vercel'] },
  { title: 'CS FUNDAMENTALS', items: ['Data Structures & Algorithms', 'OOP', 'Operating Systems', 'DBMS', 'Networking', 'Cloud Computing', 'Machine Learning', 'Low-Level Design'] },
];

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: 'troywings',
    role: 'Software Engineer Intern',
    company: 'Troywings Technologies LLP',
    period: 'JAN 2026 — SEP 2026',
    type: 'REMOTE // INTERNSHIP',
    bullets: [
      'Developed full-stack user management systems with ASP.NET Core MVC and C#, optimizing responsive UI components and backend APIs for seamless profile registration and management.',
      'Engineered secure authentication workflows and real-time profile updates using AJAX and MongoDB, with a reusable component architecture that streamlined feature delivery.',
      'Designed MongoDB indexes across the login, profile and file services, and resolved duplicate-index and missing-profile data issues.',
    ],
    stack: ['C#', 'ASP.NET Core MVC', 'Razor', 'MongoDB', 'AJAX'],
  },
  {
    id: 'caset',
    role: 'Full Stack Developer Intern',
    company: 'CASET',
    period: 'JUL 2024 — AUG 2024',
    type: 'REMOTE // INTERNSHIP',
    bullets: [
      'Built a financial data visualization dashboard for a B2B stock monitoring platform, with interactive React components for stock prices, weekly performance metrics and profit trends.',
      'Built Badge Analytics and Payment pages with tiered (Gold / Silver / Bronze) transaction classification, surfacing structured financial performance insights across brands.',
    ],
    stack: ['React', 'JavaScript', 'Data visualization'],
  },
];

export const EDUCATION: EducationItem[] = [
  {
    id: 'iiitg',
    school: 'Indian Institute of Information Technology, Guwahati',
    degree: 'B.Tech in Computer Science and Engineering',
    period: '2022 — 2026',
    place: 'Guwahati, Assam',
    detail:
      'Coursework: Data Structures & Algorithms, OOP, Operating Systems, DBMS, Networking, Cloud Computing, Machine Learning.',
  },
  {
    id: 'hsc',
    school: 'Gurukul Schools and Junior College, A.Lat',
    degree: 'HSC (Maharashtra State Board)',
    period: '2021',
    place: 'Kolhapur, Maharashtra',
    detail: '94.17%',
  },
];

export const ACHIEVEMENTS: AchievementItem[] = [
  {
    title: '500+ DSA problems solved',
    detail: 'Native C++ across dynamic programming, trees and graphs.',
  },
  {
    title: '100+ day solving streak',
    detail: 'Sustained daily practice on Codeforces and other platforms.',
  },
  {
    title: 'Spring-damper physics simulation',
    detail: 'Custom HTML5 Canvas Bezier-curve simulation driven by Hooke’s Law.',
  },
];