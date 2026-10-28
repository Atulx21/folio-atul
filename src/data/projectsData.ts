export interface ProjectSection {
  title: string;
  items: string[];
}

export interface ProjectSpec {
  id: string;
  index: string;
  codeName: string;
  title: string;
  category: string;
  accentColor: string;
  rgbAccent: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  flagship?: boolean;
  summary: string;
  features: string[];
  architectureLayers: {
    presentation: string;
    service: string;
    data: string;
  };
  engineeringHighlights: string[];
  deepDive: ProjectSection[];
  techStack: string[];
  githubUrl: string;
  demoUrl?: string;
}

/*
  Monolith layout: four panels in a shallow arc, centred on the Stage 01 camera (x = 4.8).
  Spacing 2.75 > panel width 2.55, so panels never overlap; outer panels turn slightly inward.
  Stage 01 camera: position (4.8, -2.5, 3.2) looking at (4.8, -2.8, -4.2) in CameraRig.
*/
export const PROJECTS_ARCHIVE: ProjectSpec[] = [
  {
    id: 'unilink',
    index: '01',
    codeName: 'SYS.ACADEMIC // UNILINK',
    title: 'UNILINK',
    category: 'UNIFIED ACADEMIC & SOCIAL PLATFORM',
    accentColor: '#FF5500',
    rgbAccent: [1.0, 0.333, 0.0],
    position: [0.675, -1.6, -5.7],
    rotation: [0, 0.25, 0],
    flagship: true,
    summary:
      'A cross-platform academic and social network for university students, built with React Native and Expo for iOS, Android and web from a single codebase. Study groups, attendance, assignments, materials, marks, chat and a community feed all sit on a Supabase backend whose Row Level Security decides who can see or change what, inside the database itself.',
    features: [
      'Supabase Auth login and registration, with full profile setup and editing',
      'Academic groups with role-based access: create or join study groups',
      'Attendance with automated and manual marking, plus detailed analytics',
      'Assignments created, distributed and tracked inside each group',
      'Class materials: upload and share documents, images and resources',
      'Real-time group chat for academic discussion',
      'Marks management: record and view grades and performance',
      'Community posts with comments and interactions',
      'Offline-capable core flows with sync, and live updates across devices',
      'Camera capture, push notifications and automatic dark/light theme',
    ],
    architectureLayers: {
      presentation: 'React Native 0.76 + Expo 52 + Expo Router 4 + TypeScript 5.3 + Reanimated',
      service: 'Supabase Auth + Edge Functions + Storage + Push Notifications + Offline Sync',
      data: 'Supabase PostgreSQL + Row Level Security (RLS) + Real-time Subscriptions + SQL Migrations',
    },
    engineeringHighlights: [
      'Engineered a deeply normalized relational PostgreSQL schema with Row Level Security and Role-Based Access Control, so role-specific permissions are enforced at the database layer, independent of application logic.',
      'Designed a dual-method attendance system (automated and manual) with a configurable penalty-threshold engine and session-level duplicate prevention, guaranteeing data integrity through unique constraints enforced directly in the schema.',
      'Implemented real-time group chat and academic posts with live data synchronization across iOS, Android and web clients, with offline-capable core flows.',
      'Built a group-scoped academic workspace (assignments, materials, marks) backed by dedicated Supabase Storage buckets for profile images, class materials and assignment submissions.',
      'Structured the app with Expo Router file-based routing, one route module per domain (academic, attendance, auth, post, profile) and versioned SQL migrations for reproducible database setup.',
    ],
    deepDive: [
      {
        title: 'STORAGE BUCKETS',
        items: [
          'profile-images — user profile pictures',
          'class-materials — academic materials and documents',
          'assignment-files — assignment submissions',
        ],
      },
      {
        title: 'APP MODULES (EXPO ROUTER)',
        items: [
          '(tabs)/ — tab-based navigation',
          'academic/ — group management',
          'attendance/ — session creation, marking and reporting',
          'auth/ — sign-in and registration',
          'post/ — social posts and comments',
          'profile/ — user profiles',
        ],
      },
      {
        title: 'SUPABASE API SURFACE',
        items: [
          'Auth — login, registration, session management',
          'Groups — create, read, update and delete academic groups',
          'Attendance — session creation, marking, reporting',
          'Materials — file upload and management',
          'Chat — real-time messaging inside groups',
        ],
      },
    ],
    techStack: [
      'React Native',
      'Expo',
      'TypeScript',
      'Supabase',
      'PostgreSQL',
      'RLS',
      'Expo Router',
      'Reanimated',
    ],
    githubUrl: 'https://github.com/Atulx21/Unilink-App',
    demoUrl: 'https://drive.google.com/drive/folders/1WM99Gkn04gPIRwyt6w3fU5S_FqOst_Oa?usp=sharing',
  },
  {
    id: 'ai-tutor',
    index: '02',
    codeName: 'SYS.NEURAL // RAG-VECTOR',
    title: 'AI-TUTOR',
    category: 'INTERACTIVE AI LEARNING PLATFORM',
    accentColor: '#A6E1FA',
    rgbAccent: [0.651, 0.882, 0.98],
    position: [3.425, -1.9, -6.3],
    rotation: [0, 0.09, 0],
    summary:
      'An intelligent tutoring system. Upload a PDF, then chat with it, summarize it, generate quizzes or build flashcards from it. A retrieval-augmented pipeline grounds every answer in the uploaded document instead of letting the model guess.',
    features: [
      'AI chat over uploaded PDFs and other study documents',
      'Smart summarization of long texts and documents',
      'Automated, customizable quiz generation from study material',
      'Flashcard creation for efficient memorization',
      'Secure signup and login with profile management',
      'History tracking of every summary, quiz and flashcard set',
      'Responsive, mobile-friendly interface',
    ],
    architectureLayers: {
      presentation: 'React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui (Radix)',
      service: 'Python FastAPI + LangChain + Hugging Face embeddings + OpenAI / Mistral models + JWT Auth',
      data: 'FAISS vector index + MongoDB (users, history) + PyPDF document loading',
    },
    engineeringHighlights: [
      'Engineered a RAG pipeline using FAISS vector search and Hugging Face embeddings with recursive text chunking, extracting contextually grounded answers from dense PDF datasets and favouring semantic retrieval over direct keyword matching.',
      'Orchestrated end-to-end LLM workflows with LangChain across summarization, quiz generation and flashcard creation modules.',
      'Secured the backend with a FastAPI service using JWT authentication, with MongoDB persistence for user sessions and activity history.',
      'Split the ML layer into focused modules (loader, embedder, vector store, chat engine, summarizer, quiz and flashcard generators) so each stage of the pipeline can change independently.',
      'Persisted every summary, quiz and flashcard set per user, with endpoints to list, reopen and delete past sessions.',
    ],
    deepDive: [
      {
        title: 'API SURFACE',
        items: [
          'Auth — POST /signup, POST /login, GET /me, PUT /update-profile',
          'Documents — POST /upload, /summarize, /quiz, /generate_flashcards',
          'Chat — POST /chat/upload, POST /chat',
          'History — GET /history, GET /history/{summarizer|quiz|flashcards}/{id}, DELETE /history/{type}/{id}',
        ],
      },
      {
        title: 'ML PIPELINE MODULES',
        items: [
          'loader — document loading',
          'embedder — text embeddings',
          'vectorstore — FAISS index operations',
          'chat_engine — retrieval-grounded chat',
          'summarizer, quiz_generator, flashcard_generator',
        ],
      },
    ],
    techStack: ['FastAPI', 'LangChain', 'FAISS', 'React', 'MongoDB', 'Hugging Face', 'TypeScript', 'Vite'],
    githubUrl: 'https://github.com/Atulx21/AI-tutor',
  },
  {
    id: 'moodtunes',
    index: '03',
    codeName: 'SYS.VISION // AFFECT-SYNC',
    title: 'MOODTUNES',
    category: 'EMOTION-BASED MUSIC RECOMMENDER',
    accentColor: '#F2EFE9',
    rgbAccent: [0.949, 0.937, 0.914],
    position: [6.175, -2.2, -6.3],
    rotation: [0, -0.09, 0],
    summary:
      'A mood-based music app. Facial emotion recognition reads how you feel and the app curates a matching playlist, while multi-room sessions keep playback in sync for everyone in the room.',
    features: [
      'Real-time mood detection from facial expressions (computer vision)',
      'Personalized music recommendations driven by the detected emotion',
      'Multi-room sessions: the owner changes the song and every participant follows',
      'JWT-based authentication with hashed passwords',
      'Live features over Socket.IO bidirectional channels',
      'Responsive UI for desktop and mobile, with Framer Motion animation',
    ],
    architectureLayers: {
      presentation: 'React + TypeScript + Vite + Tailwind CSS + Shadcn/ui + Framer Motion',
      service: 'Node.js / Express event hub + Python Flask microservice (DeepFace, OpenCV, NumPy)',
      data: 'MongoDB (Mongoose ODM) + Socket.IO real-time channels + JWT & bcrypt',
    },
    engineeringHighlights: [
      'Engineered a real-time multi-room sync system with Socket.IO where owner-triggered song updates are instantly broadcast to all participants, keeping playback state consistent across concurrent sessions.',
      'Integrated a DeepFace-powered Flask microservice for facial emotion recognition into a Node.js / MongoDB backend, delivering personalized mood-based recommendations.',
      'Secured the multi-user platform with JWT authentication and bcrypt password hashing linked to a MongoDB schema.',
      'Separated the system into three services (React frontend, Node/Express backend, Flask model server) so the vision model can be scaled or replaced without touching the app.',
    ],
    deepDive: [
      {
        title: 'SERVICES',
        items: [
          'frontend — React + Vite UI',
          'backend — Express API, Socket.IO hub, MongoDB (Mongoose)',
          'model — Flask server running DeepFace emotion analysis',
        ],
      },
      {
        title: 'USER FLOW',
        items: [
          '01 Register or sign in',
          '02 Grant camera access',
          '03 AI analyzes the facial expression',
          '04 Receive a mood-matched playlist',
          '05 Listen, alone or in a synced room',
        ],
      },
    ],
    techStack: ['React', 'Node.js', 'Flask', 'DeepFace', 'Socket.IO', 'MongoDB', 'TypeScript', 'OpenCV'],
    githubUrl: 'https://github.com/Atulx21/MoodTunes',
    demoUrl: 'https://drive.google.com/file/d/1W3sMLlkGbJxQtFe0gJIwEGQl83M8qprE/view?usp=drive_link',
  },
  {
    id: 'rozgarconnect',
    index: '04',
    codeName: 'SYS.RURAL // MARKET-GRID',
    title: 'ROZGARCONNECT',
    category: 'RURAL LABOUR & EQUIPMENT MARKETPLACE',
    accentColor: '#FF5500',
    rgbAccent: [1.0, 0.333, 0.0],
    position: [8.925, -2.5, -5.7],
    rotation: [0, -0.25, 0],
    summary:
      'A mobile marketplace for rural and agricultural communities that puts daily-wage jobs and heavy-equipment rental on one platform, with messaging, ratings and location-aware search.',
    features: [
      'Job marketplace: farming, construction, cleaning, delivery and cooking',
      'Equipment rental: tractors, threshers, harvesters and more',
      'Profiles with skills, ratings and work history',
      'Real-time messaging between applicants and employers',
      'Geospatial job and equipment listings, with advanced search',
      'Application tracking and equipment booking with availability management',
      'Push notifications, ratings and reviews, a statistics dashboard and a dispute report system',
    ],
    architectureLayers: {
      presentation: 'React Native 0.79 + Expo SDK 53 + Expo Router + React Native Paper + Reanimated',
      service: 'Supabase Auth (JWT) + Geospatial Matching + Real-time Messaging & Notifications',
      data: 'Supabase PostgreSQL + Row Level Security on every table + Real-time Subscriptions + Storage',
    },
    engineeringHighlights: [
      'Unified daily-wage skilled-labour hiring and heavy agricultural machinery rentals under a single relational Supabase schema protected by strict RLS policies.',
      'Implemented a file-based routing architecture with Expo Router to handle complex nested flows for job applications, equipment booking and profile management.',
      'Architected in-app real-time messaging and geospatial job and equipment search.',
      'Modelled eight core tables with relationships that tie messaging to job applications and ratings to completed jobs.',
      'Kept the codebase modular with reusable cards (job, equipment, user), data hooks (auth, jobs, equipment) and shared validation, date and theme utilities.',
    ],
    deepDive: [
      {
        title: 'CORE TABLES',
        items: [
          'profiles — users with skills and ratings',
          'jobs — postings with location and requirements',
          'applications — job applications and status tracking',
          'equipment and bookings — rental listings and booking records',
          'messages and notifications — in-app messaging and push',
          'reports — dispute reporting',
        ],
      },
      {
        title: 'ROUTE MAP (EXPO ROUTER)',
        items: [
          '(tabs) — home, jobs, equipment, search, applications, notifications, profile',
          'auth — login and profile setup',
          'jobs — post, my-jobs, [id] detail',
          'equipment — add, my-equipment, [id] detail',
          'skills, stats, profile, search, notifications',
        ],
      },
    ],
    techStack: [
      'React Native',
      'Expo Router',
      'TypeScript',
      'Supabase',
      'PostgreSQL',
      'RLS',
      'React Native Paper',
    ],
    githubUrl: 'https://github.com/Atulx21/RozgarConnect',
  },
];