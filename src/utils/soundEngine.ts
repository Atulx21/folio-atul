'use client';

/* ───────────────────────── Tunables ───────────────────────── */
const DRONE_LEVEL = 0.07;       // ambient pad volume. Set to 0 for pings only.
const STAGE_ROOTS = [55.0, 65.41, 49.0, 73.42, 41.2]; // A1, C2, G1, D2, E1: harmony shifts per stage
const PARTIALS = [
  { mult: 2, gain: 1.0, type: 'sine', cents: 3 },       // root (one octave up: audible on laptop speakers)
  { mult: 3, gain: 0.55, type: 'sine', cents: -4 },     // perfect fifth
  { mult: 4, gain: 0.3, type: 'triangle', cents: 5 },   // octave, a touch of warmth
] as const;
const FILTER_BASE = 380;        // Hz, soft low-pass (no resonance = no whistle)
const FILTER_RANGE = 450;       // Hz the cutoff can open with scroll speed
const MIN_PING_GAP = 0.045;     // seconds: typing fast can't stack hundreds of voices
const MAX_VOICES = 10;
const VELOCITY_UPDATE_GAP = 0.05;

class SpatialSoundEngine {
  private ctx: AudioContext | null = null;
  private filter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private pingBus: GainNode | null = null;
  private oscs: OscillatorNode[] = [];
  private isPlaying = false;
  private stage = 0;
  private lastPing = 0;
  private lastVelocityUpdate = 0;
  private voices = 0;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;

  public init() {
    if (this.ctx || typeof window === 'undefined') return;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor({ latencyHint: 'interactive' });

    // One compressor on the output so layered pings + pad never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);

    // Soft low-pass (Q 0.6 = no resonant peak): scroll speed gently opens it
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = FILTER_BASE;
    filter.Q.value = 0.6;

    // Slow "breathing": a 0.07 Hz LFO gently swells and relaxes the pad volume
    const swell = ctx.createGain();
    swell.gain.value = 0.85;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.15;
    lfo.connect(lfoDepth);
    lfoDepth.connect(swell.gain);

    const master = ctx.createGain();
    master.gain.value = 0;

    const pingBus = ctx.createGain();
    pingBus.gain.value = 1;

    // Three soft partials (root, fifth, octave), each slightly detuned for a warm chorus
    const root = STAGE_ROOTS[this.stage] ?? STAGE_ROOTS[0];
    const oscs = PARTIALS.map((p) => {
      const osc = ctx.createOscillator();
      osc.type = p.type;
      osc.frequency.value = root * p.mult;
      osc.detune.value = p.cents;
      const g = ctx.createGain();
      g.gain.value = p.gain * 0.5;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      return osc;
    });

    filter.connect(swell);
    swell.connect(master);
    master.connect(comp);
    pingBus.connect(comp);
    lfo.start();

    // Never play in a background tab
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx || !this.isPlaying) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });

    this.ctx = ctx;
    this.filter = filter;
    this.masterGain = master;
    this.pingBus = pingBus;
    this.oscs = oscs;
  }

  public toggle(shouldPlay: boolean) {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      if (!shouldPlay) return;
      this.init();
    }
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;

    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
    this.isPlaying = shouldPlay;

    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);

    if (shouldPlay) {
      master.gain.setTargetAtTime(DRONE_LEVEL, now, 0.8); // slow, gentle fade-in
      void ctx.resume().then(() => this.triggerPing(440));
    } else {
      master.gain.setTargetAtTime(0, now, 0.25);
      // Free the audio thread once the fade-out is inaudible
      this.suspendTimer = setTimeout(() => {
        this.suspendTimer = null;
        if (!this.isPlaying) void ctx.suspend();
      }, 1600);
    }
  }

  /** Glides the pad to the current stage's root note (call whenever the active stage changes). */
  public setStage(stage: number) {
    const s = Math.max(0, Math.min(STAGE_ROOTS.length - 1, Math.round(stage)));
    if (s === this.stage) return;
    this.stage = s;

    const ctx = this.ctx;
    if (!ctx || !this.oscs.length) return;

    const root = STAGE_ROOTS[s];
    const now = ctx.currentTime;
    this.oscs.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(root * PARTIALS[i].mult, now, 1.2); // slow glide, no sudden jump
    });
    this.triggerPing(root * 8, 0.05); // soft chime marks the new sector
  }

  /** Called from the HUD loop: scroll speed gently opens the filter and swells the pad. */
  public updateVelocity(velocity: number) {
    const { ctx, filter, masterGain } = this;
    if (!this.isPlaying || !ctx || !filter) return;

    const t = ctx.currentTime;
    if (t - this.lastVelocityUpdate < VELOCITY_UPDATE_GAP) return;
    this.lastVelocityUpdate = t;

    const speed = Math.tanh(Math.abs(velocity) * 0.035); // 0..1, smooth saturation
    filter.frequency.setTargetAtTime(FILTER_BASE + speed * FILTER_RANGE, t, 0.25);
    masterGain?.gain.setTargetAtTime(DRONE_LEVEL * (1 + speed * 0.25), t, 0.3);
  }

  /** Crystalline acoustic tick for clicks, hovers and keystrokes (rate-limited and voice-capped). */
  public triggerPing(freq = 528, level = 0.08) {
    const { ctx, pingBus } = this;
    if (!this.isPlaying || !ctx || !pingBus || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    if (now - this.lastPing < MIN_PING_GAP || this.voices >= MAX_VOICES) return;
    this.lastPing = now;

    const f = Math.min(Math.max(freq, 80), 4000);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.18);

    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(pingBus);

    this.voices++;
    osc.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      osc.disconnect();
      gain.disconnect();
    };

    osc.start(now);
    osc.stop(now + 0.36);
  }
}

export const soundEngine = new SpatialSoundEngine();