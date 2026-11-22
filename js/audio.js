export class Audio {
  constructor() { this.ctx = null; this.engines = []; }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.5 + b * 2; }
    this.noise = buf;
    this.tone = this.makeTone();
  }
  makeEngine(kind) {
    if (!this.ctx) return null;
    const ctx = this.ctx, out = ctx.createGain(); out.gain.value = 0; out.connect(this.master);
    const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7; n.connect(bp); bp.connect(out);
    const osc = ctx.createOscillator(); osc.type = kind === 'jet' ? 'sine' : 'sawtooth';
    const og = ctx.createGain(); og.gain.value = kind === 'jet' ? 0.05 : 0.18; osc.connect(og); og.connect(out);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
    const wn = ctx.createBufferSource(); wn.buffer = this.noise; wn.loop = true; const wg = ctx.createGain(); wg.gain.value = 0;
    wn.connect(lp); lp.connect(wg); wg.connect(this.master);
    n.start(); osc.start(); wn.start();
    const e = { out, bp, osc, wg, kind };
    this.engines.push(e); return e;
  }
  setEngine(e, eng, ab, V, vol) {
    if (!e) return; const t = this.ctx.currentTime;
    if (e.kind === 'jet') { e.bp.frequency.setTargetAtTime(300 + eng * 1600 + (ab ? 300 : 0), t, 0.1); e.osc.frequency.setTargetAtTime(1800 + eng * 4200, t, 0.2); e.out.gain.setTargetAtTime(vol * (0.12 + eng * 0.35 + (ab ? 0.3 : 0)), t, 0.1); }
    else { e.bp.frequency.setTargetAtTime(120 + eng * 500, t, 0.1); e.osc.frequency.setTargetAtTime(40 + eng * 70, t, 0.1); e.out.gain.setTargetAtTime(vol * (0.15 + eng * 0.35), t, 0.1); }
    e.wg.gain.setTargetAtTime(vol * Math.min(0.5, V * V / 200000), t, 0.2);
  }
  stopAll() { for (const e of this.engines) { try { e.out.disconnect(); e.wg.disconnect(); } catch (x) { } } this.engines = []; }
  burst(dur, freq, gain, q = 1, type = 'bandpass') {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  gun(cal) { this.burst(0.07, cal > 25 ? 260 : 520, 0.35, 0.8); }
  boom(dist) { const v = Math.max(0.05, 1.2 / (1 + dist / 600)); this.burst(2.2, 90, v, 0.5, 'lowpass'); this.burst(0.5, 400, v * 0.6, 0.6); }
  launch() { this.burst(1.6, 900, 0.4, 0.4); }
  hit() { this.burst(0.12, 1500, 0.3, 2); }
  makeTone() {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 900; g.gain.value = 0; o.connect(g); g.connect(this.master); o.start();
    return { o, g };
  }
  setTone(mode, time) {
    if (!this.ctx) return; const t = this.ctx.currentTime, { o, g } = this.tone;
    let v = 0;
    if (mode === 'seek') { o.frequency.value = 700; v = (time * 4 % 1) < 0.5 ? 0.04 : 0; }
    if (mode === 'lock') { o.frequency.value = 1300; v = 0.05; }
    if (mode === 'warn') { o.frequency.value = 1050; v = (time * 8 % 1) < 0.5 ? 0.06 : 0; }
    if (mode === 'stall') { o.frequency.value = 420; v = (time * 12 % 1) < 0.5 ? 0.05 : 0; }
    g.gain.setTargetAtTime(v, t, 0.01);
  }
}
