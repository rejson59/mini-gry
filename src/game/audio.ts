// Prosty syntezator efektów i spokojnej muzyki (WebAudio, bez plików).

const CHORDS = [
  [261.63, 329.63, 392.0, 523.25], // C
  [220.0, 261.63, 329.63, 440.0], // Am
  [174.61, 220.0, 261.63, 349.23], // F
  [196.0, 246.94, 293.66, 392.0], // G
];
const PATTERN = [0, 2, 1, 2, 3, 2, 1, 2];

export class Sfx {
  sound = true;
  music = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private lastCoin = 0;
  private lastTick = 0;
  private step = 0;
  private nextNote = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Musi być wywołane po geście użytkownika. */
  unlock() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        const AC: typeof AudioContext | undefined =
          window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.music ? 0.5 : 0;
        this.musicGain.connect(this.ctx.destination);
        this.nextNote = this.ctx.currentTime + 0.2;
        this.timer = setInterval(() => this.tickMusic(), 120);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMusic(on: boolean) {
    this.music = on;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.2);
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) void this.ctx.close().catch(() => undefined);
    this.ctx = null;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0,
    slide = 0,
    dest: AudioNode | null = this.master,
    at?: number,
  ) {
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const t0 = (at ?? ctx.currentTime) + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  private fx(fn: () => void) {
    if (this.sound && this.ctx) fn();
  }

  coin() {
    this.fx(() => {
      const now = this.ctx!.currentTime;
      if (now - this.lastCoin < 0.07) return;
      this.lastCoin = now;
      const f = 990 + Math.random() * 240;
      this.tone(f, 0.09, 'triangle', 0.12);
      this.tone(f * 1.5, 0.12, 'sine', 0.07, 0.04);
    });
  }

  tick() {
    this.fx(() => {
      const now = this.ctx!.currentTime;
      if (now - this.lastTick < 0.06) return;
      this.lastTick = now;
      this.tone(620 + Math.random() * 120, 0.06, 'square', 0.035);
    });
  }

  pickup() {
    this.fx(() => this.tone(520, 0.1, 'sine', 0.14, 0, 260));
  }

  drop() {
    this.fx(() => this.tone(420, 0.11, 'sine', 0.14, 0, -160));
  }

  pop() {
    this.fx(() => this.tone(300, 0.12, 'sine', 0.16, 0, 420));
  }

  ticket() {
    this.fx(() => {
      this.tone(784, 0.09, 'triangle', 0.14);
      this.tone(1046, 0.14, 'triangle', 0.12, 0.08);
    });
  }

  ready() {
    this.fx(() => {
      this.tone(523, 0.1, 'triangle', 0.12);
      this.tone(659, 0.1, 'triangle', 0.12, 0.09);
      this.tone(784, 0.18, 'triangle', 0.12, 0.18);
    });
  }

  whoosh() {
    this.fx(() => {
      const ctx = this.ctx!;
      const len = Math.floor(ctx.sampleRate * 0.9);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(300, ctx.currentTime);
      f.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
      src.connect(f);
      f.connect(g);
      g.connect(this.master!);
      src.start();
    });
  }

  unlockFanfare() {
    this.fx(() => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, i * 0.09));
      this.tone(1318.5, 0.5, 'sine', 0.12, 0.38);
    });
  }

  levelUp() {
    this.fx(() => {
      [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.15, i * 0.07));
    });
  }

  rumble() {
    this.fx(() => {
      this.tone(70, 2.2, 'sawtooth', 0.12, 0, 40);
      this.tone(52, 2.2, 'sine', 0.2, 0, 30);
    });
  }

  deny() {
    this.fx(() => this.tone(180, 0.16, 'square', 0.06, 0, -60));
  }

  private tickMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    if (ctx.state !== 'running') return;
    if (this.nextNote < ctx.currentTime) this.nextNote = ctx.currentTime + 0.05;
    while (this.nextNote < ctx.currentTime + 0.35) {
      const bar = Math.floor(this.step / 8) % CHORDS.length;
      const chord = CHORDS[bar];
      const i = this.step % 8;
      this.tone(chord[PATTERN[i]], 0.5, 'triangle', 0.05, 0, 0, this.musicGain, this.nextNote);
      if (i === 0) this.tone(chord[0] / 2, 1.5, 'sine', 0.09, 0, 0, this.musicGain, this.nextNote);
      if (i === 4 && bar % 2 === 1) this.tone(chord[3] * 2, 0.8, 'sine', 0.025, 0, 0, this.musicGain, this.nextNote);
      this.nextNote += 0.27;
      this.step++;
    }
  }
}
