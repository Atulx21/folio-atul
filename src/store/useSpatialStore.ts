import { create } from 'zustand';

export interface StageConfig {
  id: string;
  index: string;
  name: string;
  subtitle: string;
  targetProgress: number;
}

export const STAGES: StageConfig[] = [
  { id: 'singularity', index: '00', name: 'SINGULARITY', subtitle: 'GENESIS & CORE ARCHITECTURE', targetProgress: 0.0 },
  { id: 'archive', index: '01', name: 'THE ARCHIVE', subtitle: 'SELECTED WORKS & MONOLITHS', targetProgress: 0.25 },
  { id: 'engine', index: '02', name: 'THE ENGINE', subtitle: 'SYSTEM TOPOLOGY & LLD', targetProgress: 0.50 },
  { id: 'chronology', index: '03', name: 'CHRONOLOGY', subtitle: 'TESSERACT TIMELINE', targetProgress: 0.75 },
  { id: 'horizon', index: '04', name: 'EVENT HORIZON', subtitle: 'TRANSMISSION PORTAL', targetProgress: 1.0 },
];

interface SpatialState {
  // High-frequency transient values (read via useSpatialStore.getState() inside useFrame)
  scrollProgress: number;
  scrollVelocity: number;
  mouse: { x: number; y: number; targetX: number; targetY: number };
  cameraCoords: { x: number; y: number; z: number; fov: number };
  keystrokePulse: number;
  cameraProgress: number; // damped progress actually driving the camera (written by CameraRig)

  // Low-frequency UI state
  activeStage: number;
  isAudioMuted: boolean;
  hoveredProjectId: string | null;
  selectedProjectId: string | null;
  activeEngineTier: number;
  activeChronologyIndex: number;
  isTransmitting: boolean;
  transmissionComplete: boolean;
  sceneReady: boolean;
  profileOpen: boolean;

  setActiveStage: (stage: number) => void;
  toggleAudio: () => void;
  setHoveredProject: (id: string | null) => void;
  setSelectedProject: (id: string | null) => void;
  setActiveEngineTier: (tier: number) => void;
  setActiveChronologyIndex: (idx: number) => void;
  triggerKeystrokePulse: () => void;
  triggerTransmission: () => void;
  resetTransmission: () => void;
  setSceneReady: () => void;
  setProfileOpen: (open: boolean) => void;
}

// Module-level so reset/re-trigger can cancel a pending completion
let transmitTimer: ReturnType<typeof setTimeout> | null = null;

export const useSpatialStore = create<SpatialState>((set, get) => ({
  scrollProgress: 0,
  scrollVelocity: 0,
  mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
  cameraCoords: { x: 0, y: 0, z: 14.5, fov: 45 },
  keystrokePulse: 0,
  cameraProgress: 0,

  activeStage: 0,
  isAudioMuted: true,
  hoveredProjectId: null,
  selectedProjectId: null,
  activeEngineTier: 1,
  activeChronologyIndex: 0,
  isTransmitting: false,
  transmissionComplete: false,
  sceneReady: false,
  profileOpen: false,

  setActiveStage: (stage) => set((state) => (state.activeStage !== stage ? { activeStage: stage } : state)),
  setProfileOpen: (open) => set({ profileOpen: open }),
  setSceneReady: () => set((state) => (state.sceneReady ? state : { sceneReady: true })),
  toggleAudio: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),
  setHoveredProject: (id) => set((state) => (state.hoveredProjectId !== id ? { hoveredProjectId: id } : state)),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setActiveEngineTier: (tier) => set({ activeEngineTier: tier }),
  setActiveChronologyIndex: (idx) => set({ activeChronologyIndex: idx }),

  // Mutates transient impulse directly so typing never lags React inputs
  triggerKeystrokePulse: () => {
    const state = get();
    state.keystrokePulse = Math.min(state.keystrokePulse + 0.45, 2.5);
  },

  triggerTransmission: () => {
    const state = get();
    state.keystrokePulse = 3.5;
    if (transmitTimer) clearTimeout(transmitTimer);
    set({ isTransmitting: true, transmissionComplete: false });
    transmitTimer = setTimeout(() => {
      transmitTimer = null;
      set({ isTransmitting: false, transmissionComplete: true });
    }, 1800);
  },

  resetTransmission: () => {
    if (transmitTimer) {
      clearTimeout(transmitTimer);
      transmitTimer = null;
    }
    set({ isTransmitting: false, transmissionComplete: false });
  },
}));