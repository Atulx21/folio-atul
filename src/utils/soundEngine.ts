'use client';

/** Drone root per stage (A1, C2, G1, D2, E1): the harmony shifts as you travel through the Tesseract. */
const STAGE_ROOTS = [55.0, 65.41, 49.0, 73.42, 41.2];
const DRONE_GAIN = 0.14;
const DETUNE_RATIO = 2.00454;   // osc2 = one octave up, slightly detuned for analog phasing (was 110.25 / 55)
const MIN_PING_GAP = 0.045;     // seconds: typing fast can't stack hundreds of voices
const MAX_VOICES = 10;
const VELOCITY_UPDATE_GAP = 0.05; // ~20 Hz: avoids flooding the audio automation timeline

class SpatialSoundEngine {
  private ctx: AudioContext | null = null;
  private filter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private pingBus: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
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

    // One compressor on the output so layered pings + drone never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);

    // Low-pass filter that opens up as scroll velocity increases
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    filter.Q.value = 4.5;

    const master = ctx.createGain();
    master.gain.value = 0;

    const pingBus = ctx.createGain();
    pingBus.gain.value = 1;

    // Dual detuned sub-bass oscillators
    const root = STAGE_ROOTS[this.stage] ?? STAGE_ROOTS[0];
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.value = root;
    osc2.frequency.value = root * DETUNE_RATIO;

    // Slow LFO: the filter cutoff "breathes" even when you're not scrolling
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(master);
    master.connect(comp);
    pingBus.connect(comp);

    osc1.start();
    osc2.start();
    lfo.start();

    // Never drone in a background tab
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx || !this.isPlaying) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });

    this.ctx = ctx;
    this.filter = filter;
    this.masterGain = master;
    this.pingBus = pingBus;
    this.osc1 = osc1;
    this.osc2 = osc2;
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
      master.gain.setTargetAtTime(DRONE_GAIN, now, 0.4);
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

  /** Moves the drone to the current stage's root note (call whenever the active stage changes). */
  public setStage(stage: number) {
    const s = Math.max(0, Math.min(STAGE_ROOTS.length - 1, Math.round(stage)));
    if (s === this.stage) return;
    this.stage = s;

    const { ctx, osc1, osc2 } = this;
    if (!ctx || !osc1 || !osc2) return;

    const root = STAGE_ROOTS[s];
    const now = ctx.currentTime;
    osc1.frequency.setTargetAtTime(root, now, 0.6);
    osc2.frequency.setTargetAtTime(root * DETUNE_RATIO, now, 0.6);
    this.triggerPing(root * 8, 0.05); // soft chime marks the new sector
  }

  /** Called from the HUD loop: scroll velocity opens the filter and swells the drone. */
  public updateVelocity(velocity: number) {
    const { ctx, filter, masterGain } = this;
    if (!this.isPlaying || !ctx || !filter) return;

    const t = ctx.currentTime;
    if (t - this.lastVelocityUpdate < VELOCITY_UPDATE_GAP) return;
    this.lastVelocityUpdate = t;

    const speed = Math.tanh(Math.abs(velocity) * 0.035); // 0..1, smooth saturation
    filter.frequency.setTargetAtTime(110 + speed * 820, t, 0.12);
    masterGain?.gain.setTargetAtTime(DRONE_GAIN * (1 + speed * 0.35), t, 0.2);
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