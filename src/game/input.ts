// Sterowanie: WASD / strzałki oraz „przeciągnij gdziekolwiek” (mysz lub dotyk).

const KEYMAP: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export class Input {
  enabled = false;
  /** Nadpisanie sterowania (testy automatyczne). */
  bot: { x: number; z: number } | null = null;

  private keys = new Set<string>();
  private jx = 0;
  private jz = 0;
  private pid = -1;
  private ox = 0;
  private oy = 0;
  private el: HTMLElement | null;
  private base: HTMLDivElement | null = null;
  private knob: HTMLDivElement | null = null;

  constructor(el: HTMLElement | null) {
    this.el = el;
    if (!el) return;
    const base = document.createElement('div');
    base.style.cssText =
      'position:absolute;width:132px;height:132px;margin:-66px 0 0 -66px;border-radius:50%;' +
      'background:rgba(255,255,255,0.22);border:3px solid rgba(255,255,255,0.65);' +
      'box-shadow:0 6px 24px rgba(40,80,140,0.25);pointer-events:none;display:none;z-index:5;backdrop-filter:blur(2px)';
    const knob = document.createElement('div');
    knob.style.cssText =
      'position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;' +
      'background:#ffffff;box-shadow:0 4px 12px rgba(40,80,140,0.35)';
    base.appendChild(knob);
    el.appendChild(base);
    this.base = base;
    this.knob = knob;
    el.addEventListener('pointerdown', this.down);
    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', this.blur);
  }

  dispose() {
    if (!this.el) return;
    this.el.removeEventListener('pointerdown', this.down);
    window.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.up);
    window.removeEventListener('pointercancel', this.up);
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
    window.removeEventListener('blur', this.blur);
    this.base?.remove();
  }

  get vec(): { x: number; z: number } {
    if (this.bot) return this.bot;
    if (!this.enabled) return { x: 0, z: 0 };
    let x = this.jx;
    let z = this.jz;
    if (Math.hypot(x, z) < 0.14) {
      x = 0;
      z = 0;
    }
    for (const k of this.keys) {
      const v = KEYMAP[k];
      if (v) {
        x += v[0];
        z += v[1];
      }
    }
    const l = Math.hypot(x, z);
    if (l > 1) {
      x /= l;
      z /= l;
    }
    return { x, z };
  }

  private down = (e: PointerEvent) => {
    if (!this.enabled || this.pid !== -1 || !this.el) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.pid = e.pointerId;
    this.ox = e.clientX;
    this.oy = e.clientY;
    const r = this.el.getBoundingClientRect();
    if (this.base && this.knob) {
      this.base.style.left = `${e.clientX - r.left}px`;
      this.base.style.top = `${e.clientY - r.top}px`;
      this.base.style.display = 'block';
      this.knob.style.transform = 'translate(0px,0px)';
    }
  };

  private move = (e: PointerEvent) => {
    if (e.pointerId !== this.pid) return;
    const R = 52;
    let dx = e.clientX - this.ox;
    let dy = e.clientY - this.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx *= R / d;
      dy *= R / d;
    }
    this.jx = dx / R;
    this.jz = dy / R;
    if (this.knob) this.knob.style.transform = `translate(${dx}px,${dy}px)`;
  };

  private up = (e: PointerEvent) => {
    if (e.pointerId !== this.pid) return;
    this.pid = -1;
    this.jx = 0;
    this.jz = 0;
    if (this.base) this.base.style.display = 'none';
  };

  private keydown = (e: KeyboardEvent) => {
    if (KEYMAP[e.code]) {
      this.keys.add(e.code);
      if (this.enabled) e.preventDefault();
    }
  };

  private keyup = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private blur = () => {
    this.keys.clear();
    this.pid = -1;
    this.jx = 0;
    this.jz = 0;
    if (this.base) this.base.style.display = 'none';
  };
}
