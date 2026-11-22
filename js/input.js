export const ACTIONS = [
  { id: 'roll', ten: 'Nghiêng cánh (lăn)', kind: 'axis', hint: 'Đẩy cần lái sang PHẢI' },
  { id: 'pitch', ten: 'Ngóc / chúc mũi', kind: 'axis', hint: 'KÉO cần lái về phía bạn (ngóc mũi lên)' },
  { id: 'yaw', ten: 'Bánh lái hướng', kind: 'axis', hint: 'Bấm nút hoặc gạt cần cho mũi quay sang PHẢI' },
  { id: 'thrUp', ten: 'Tăng ga', kind: 'btn', hint: 'Bóp cò/nút dùng để TĂNG ga' },
  { id: 'thrDn', ten: 'Giảm ga', kind: 'btn', hint: 'Bóp cò/nút dùng để GIẢM ga' },
  { id: 'gun', ten: 'Bắn pháo', kind: 'btn', hint: 'Nút bắn pháo' },
  { id: 'missile', ten: 'Phóng tên lửa', kind: 'btn', hint: 'Nút phóng tên lửa' },
  { id: 'flare', ten: 'Thả mồi bẫy nhiệt', kind: 'btn', hint: 'Nút thả mồi bẫy' },
  { id: 'target', ten: 'Đổi mục tiêu', kind: 'btn', hint: 'Nút đổi mục tiêu' },
  { id: 'camera', ten: 'Đổi góc nhìn', kind: 'btn', hint: 'Nút đổi camera' },
  { id: 'gear', ten: 'Thu / hạ càng', kind: 'btn', hint: 'Nút thu hạ càng' },
  { id: 'flaps', ten: 'Cánh tà', kind: 'btn', hint: 'Nút cánh tà' },
  { id: 'brake', ten: 'Phanh / phanh khí', kind: 'btn', hint: 'Nút phanh' },
  { id: 'trimUp', ten: 'Cân bằng ngóc mũi', kind: 'btn', hint: 'Nút trim ngóc mũi' },
  { id: 'trimDn', ten: 'Cân bằng chúc mũi', kind: 'btn', hint: 'Nút trim chúc mũi' },
  { id: 'lookX', ten: 'Nhìn ngang', kind: 'axis', hint: 'Gạt cần phải sang PHẢI' },
  { id: 'lookY', ten: 'Nhìn lên xuống', kind: 'axis', hint: 'Gạt cần phải LÊN' },
  { id: 'pause', ten: 'Tạm dừng', kind: 'btn', hint: 'Nút Start / Menu' }
];

const STD = {
  roll: { t: 'a', i: 0, s: 1, r: 0 }, pitch: { t: 'a', i: 1, s: 1, r: 0 }, yaw: { t: 'bb', n: 4, p: 5 },
  thrUp: { t: 'b', i: 7 }, thrDn: { t: 'b', i: 6 }, gun: { t: 'b', i: 0 }, missile: { t: 'b', i: 1 }, flare: { t: 'b', i: 2 },
  camera: { t: 'b', i: 3 }, target: { t: 'b', i: 11 }, gear: { t: 'b', i: 14 }, flaps: { t: 'b', i: 15 }, brake: { t: 'b', i: 10 },
  trimUp: { t: 'b', i: 13 }, trimDn: { t: 'b', i: 12 }, lookX: { t: 'a', i: 2, s: 1, r: 0 }, lookY: { t: 'a', i: 3, s: -1, r: 0 }, pause: { t: 'b', i: 9 }
};
const GENERIC = {
  roll: { t: 'a', i: 0, s: 1, r: 0 }, pitch: { t: 'a', i: 1, s: 1, r: 0 }, yaw: { t: 'bb', n: 4, p: 5 },
  thrUp: { t: 'b', i: 7 }, thrDn: { t: 'b', i: 6 }, gun: { t: 'b', i: 2 }, missile: { t: 'b', i: 1 }, flare: { t: 'b', i: 3 },
  camera: { t: 'b', i: 0 }, target: { t: 'b', i: 11 }, gear: { t: 'b', i: 8 }, flaps: { t: 'b', i: 10 }, brake: { t: 'b', i: 10 },
  trimUp: { t: 'h', d: 'dn' }, trimDn: { t: 'h', d: 'up' }, lookX: { t: 'a', i: 2, s: 1, r: 0 }, lookY: { t: 'a', i: 5, s: -1, r: 0 }, pause: { t: 'b', i: 9 }
};

const KB = {
  kb1: { pitchUp: 'KeyS', pitchDn: 'KeyW', rollL: 'KeyA', rollR: 'KeyD', yawL: 'KeyQ', yawR: 'KeyE', thrUp: 'ShiftLeft', thrDn: 'ControlLeft', gun: 'Space', missile: 'KeyF', flare: 'KeyR', target: 'KeyT', camera: 'KeyC', gear: 'KeyG', flaps: 'KeyV', brake: 'KeyB', trimUp: 'KeyX', trimDn: 'KeyZ', lookL: 'Digit1', lookR: 'Digit3', lookU: 'Digit2', lookD: 'Digit4' },
  kb2: { pitchUp: 'ArrowDown', pitchDn: 'ArrowUp', rollL: 'ArrowLeft', rollR: 'ArrowRight', yawL: 'KeyN', yawR: 'KeyM', thrUp: 'KeyO', thrDn: 'KeyL', gun: 'Enter', missile: 'ShiftRight', flare: 'ControlRight', target: 'KeyP', camera: 'Slash', gear: 'KeyU', flaps: 'KeyI', brake: 'KeyJ', trimUp: 'BracketRight', trimDn: 'BracketLeft', lookL: 'Numpad4', lookR: 'Numpad6', lookU: 'Numpad8', lookD: 'Numpad2' }
};

export const keys = new Set();
addEventListener('keydown', e => { keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && !e.target.closest?.('input')) e.preventDefault(); });
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

export function pads() { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean); }

export function loadBinds(id, std) {
  try { const b = JSON.parse(localStorage.getItem('bind:' + id)); if (b) return { ...(std ? STD : GENERIC), ...b }; } catch (e) { }
  return { ...(std ? STD : GENERIC) };
}
export function saveBinds(id, b) { try { localStorage.setItem('bind:' + id, JSON.stringify(b)); } catch (e) { } }
export function hasCustom(id) { try { return !!localStorage.getItem('bind:' + id); } catch (e) { return false; } }

function hat(gp) {
  const a = gp.axes[9];
  if (a === undefined || a > 1.1) return {};
  const v = Math.round((a + 1) / 2 * 7);
  return { up: [0, 1, 7].includes(v), right: [1, 2, 3].includes(v), dn: [3, 4, 5].includes(v), left: [5, 6, 7].includes(v) };
}

function readBind(gp, b, uni) {
  if (!b || !gp) return 0;
  if (b.t === 'b') { const x = gp.buttons[b.i]; return x ? Math.max(x.value, x.pressed ? 1 : 0) : 0; }
  if (b.t === 'h') return hat(gp)[b.d] ? 1 : 0;
  if (b.t === 'bb') { const n = gp.buttons[b.n], p = gp.buttons[b.p]; return (p ? (p.pressed ? 1 : p.value) : 0) - (n ? (n.pressed ? 1 : n.value) : 0); }
  if (b.t === 'a') {
    const v = gp.axes[b.i] ?? 0;
    if (uni || Math.abs(b.r) > 0.6) { const range = b.s > 0 ? 1 - b.r : b.r + 1; return Math.max(0, Math.min(1, (v - b.r) * b.s / (range || 1))); }
    return (v - b.r) * b.s;
  }
  return 0;
}

const dz = (v, d = 0.08) => Math.abs(v) < d ? 0 : Math.sign(v) * (Math.abs(v) - d) / (1 - d);
const expo = (v, e = 0.35) => (1 - e) * v + e * v * v * v;

export class Controller {
  constructor(devs) { this.devs = devs; this.prev = {}; this.kbAxis = { pitch: 0, roll: 0, yaw: 0 }; this.state = {}; }
  poll(dt) {
    const st = { roll: 0, pitch: 0, yaw: 0, thrUp: 0, thrDn: 0, lookX: 0, lookY: 0 };
    const btn = {};
    const P = pads();
    for (const d of this.devs) {
      if (d.startsWith('pad')) {
        const gp = P[+d.slice(3)]; if (!gp) continue;
        const b = loadBinds(gp.id, gp.mapping === 'standard');
        for (const k of ['roll', 'pitch', 'yaw', 'lookX', 'lookY']) { const v = dz(readBind(gp, b[k])); if (Math.abs(v) > Math.abs(st[k])) st[k] = v; }
        st.thrUp = Math.max(st.thrUp, readBind(gp, b.thrUp, true)); st.thrDn = Math.max(st.thrDn, readBind(gp, b.thrDn, true));
        for (const k of ['gun', 'missile', 'flare', 'target', 'camera', 'gear', 'flaps', 'brake', 'trimUp', 'trimDn', 'pause']) if (readBind(gp, b[k], true) > 0.5) btn[k] = true;
      } else {
        const K = KB[d]; if (!K) continue;
        const kv = (a, b) => (keys.has(K[b]) ? 1 : 0) - (keys.has(K[a]) ? 1 : 0);
        const tgt = { pitch: kv('pitchDn', 'pitchUp'), roll: kv('rollL', 'rollR'), yaw: kv('yawL', 'yawR') };
        for (const k in tgt) {
          const cur = this.kbAxis[k], t = tgt[k], r = t === 0 ? 5 : 2.2;
          this.kbAxis[k] = cur + Math.max(-r * dt, Math.min(r * dt, t - cur));
          if (Math.abs(this.kbAxis[k]) > Math.abs(st[k])) st[k] = this.kbAxis[k];
        }
        if (keys.has(K.thrUp)) st.thrUp = 1; if (keys.has(K.thrDn)) st.thrDn = 1;
        const lx = kv('lookL', 'lookR'), ly = kv('lookD', 'lookU');
        if (lx) st.lookX = lx; if (ly) st.lookY = ly;
        for (const k of ['gun', 'missile', 'flare', 'target', 'camera', 'gear', 'flaps', 'brake', 'trimUp', 'trimDn']) if (keys.has(K[k])) btn[k] = true;
      }
    }
    st.roll = expo(st.roll); st.pitch = expo(st.pitch); st.yaw = expo(st.yaw, 0.2);
    st.held = btn;
    st.pressed = {};
    for (const k in btn) if (!this.prev[k]) st.pressed[k] = true;
    this.prev = btn;
    this.state = st;
    return st;
  }
}

export function rumble(dev, strong, weak, ms) {
  if (!dev || !dev.startsWith('pad')) return;
  const gp = pads()[+dev.slice(3)];
  try { gp?.vibrationActuator?.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (e) { }
}

export class MenuNav {
  constructor() { this.prev = {}; this.rep = {}; }
  poll(dt) {
    const out = {}, P = pads(), cur = {};
    for (const gp of P) {
      const std = gp.mapping === 'standard', h = hat(gp), ax = gp.axes;
      if ((ax[1] ?? 0) < -0.6 || gp.buttons[12]?.pressed && std || h.up) cur.up = 1;
      if ((ax[1] ?? 0) > 0.6 || gp.buttons[13]?.pressed && std || h.dn) cur.down = 1;
      if ((ax[0] ?? 0) < -0.6 || gp.buttons[14]?.pressed && std || h.left) cur.left = 1;
      if ((ax[0] ?? 0) > 0.6 || gp.buttons[15]?.pressed && std || h.right) cur.right = 1;
      if (std ? gp.buttons[0]?.pressed : [0, 1, 2, 3].some(i => gp.buttons[i]?.pressed && i !== 1)) cur.ok = 1;
      if (std ? gp.buttons[1]?.pressed : gp.buttons[1]?.pressed) cur.back = 1;
      if (gp.buttons[9]?.pressed) cur.start = 1;
    }
    for (const k in cur) {
      if (!this.prev[k]) { out[k] = true; this.rep[k] = 0.4; }
      else if (['up', 'down', 'left', 'right'].includes(k)) { this.rep[k] -= dt; if (this.rep[k] <= 0) { out[k] = true; this.rep[k] = 0.12; } }
    }
    this.prev = cur;
    return out;
  }
}
