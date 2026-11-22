export const G = 9.80665;
const RHO0 = 1.225;

export function atmos(h) {
  h = Math.max(-500, Math.min(h, 30000));
  let T, p;
  if (h < 11000) { T = 288.15 - 0.0065 * h; p = 101325 * Math.pow(T / 288.15, 5.25588); }
  else { T = 216.65; p = 22632 * Math.exp(-(h - 11000) / 6341.6); }
  return { T, p, rho: p / (287.053 * T), a: Math.sqrt(1.4 * 287.053 * T) };
}

export function qrot(q, v) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
export const qinv = q => [-q[0], -q[1], -q[2], q[3]];
export function qmul(a, b) {
  return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
}
export function qaxis(ax, ang) { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; }
function qnorm(q) { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; q[0] /= l; q[1] /= l; q[2] /= l; q[3] /= l; }
export function qFromEuler(hdg, pitch, roll) {
  return qmul(qmul(qaxis([0, 1, 0], -hdg), qaxis([1, 0, 0], pitch)), qaxis([0, 0, 1], -roll));
}
export function euler(q) {
  const f = qrot(q, [0, 0, -1]), u = qrot(q, [0, 1, 0]), r = qrot(q, [1, 0, 0]);
  const pitch = Math.asin(Math.max(-1, Math.min(1, f[1])));
  let hdg = Math.atan2(f[0], -f[2]); if (hdg < 0) hdg += Math.PI * 2;
  const roll = Math.atan2(-r[1], u[1]);
  return { hdg, pitch, roll };
}
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const len = v => Math.hypot(v[0], v[1], v[2]);

export function derive(s) {
  s.c = s.S / s.b; s.AR = s.b * s.b / s.S;
  s.CLa = 2 * Math.PI * s.AR / (2 + Math.sqrt(s.AR * s.AR + 4));
  s.K = 1 / (Math.PI * s.e * s.AR);
  const d = s.der;
  s.Ix = s.m * (s.kx * s.b) ** 2; s.Iy = s.m * (s.ky * s.L) ** 2; s.Iz = s.Ix + s.Iy;
  d.Clda = d.Clda ?? -d.Clp * d.pb2V;
  d.Cmde = d.Cmde ?? -d.Cma * s.aS * 1.08;
  return s;
}

function waveF(M, Mcr, peak) {
  if (M < Mcr) return 1;
  if (M < 1.05) { const t = (M - Mcr) / (1.05 - Mcr); return 1 + (peak - 1) * t * t; }
  return 1 + (peak - 1) * Math.max(0.5, 1 - (M - 1.05) * 0.45);
}

export class Plane {
  constructor(spec) {
    this.s = spec;
    this.p = [0, 1000, 0]; this.v = [0, 0, -100]; this.q = [0, 0, 0, 1]; this.w = [0, 0, 0];
    this.thr = 0.7; this.eng = 0.7; this.gear = false; this.gearPos = 0; this.flap = 0; this.flapPos = 0;
    this.brake = 0; this.trim = 0; this.ctl = { pitch: 0, roll: 0, yaw: 0 };
    this.surf = { e: 0, a: 0, r: 0 }; this.onGround = false; this.crashed = false; this.engHealth = 1;
    this.t = { V: 0, ias: 0, M: 0, alpha: 0, beta: 0, n: 1, rho: RHO0, stall: false, ab: false, T: 0 };
    this.buffet = 0;
  }

  thrust(rho, M, V) {
    const e = this.s.eng, r = rho / RHO0;
    let T;
    if (e.type === 'jet') {
      const x = this.eng;
      if (e.Tab && x > 0.9) { T = e.Tdry + (e.Tab - e.Tdry) * (x - 0.9) / 0.1; this.t.ab = true; }
      else { T = e.Tdry * Math.max(0.05, Math.min(1, x / (e.Tab ? 0.9 : 1))); this.t.ab = false; }
      T *= e.n * Math.pow(r, 0.72) * (e.Tab ? (1 + 0.32 * M) : Math.max(0.35, 1 - 0.32 * M));
    } else {
      const P = e.P * e.n * Math.max(0.03, this.eng) * Math.pow(r, e.turbo ? 0.8 : 1.05);
      T = 0.8 * P / Math.max(V, e.V0);
      this.t.ab = false;
    }
    return T * this.engHealth;
  }

  trimFor(V, h) {
    const s = this.s, at = atmos(h), qb = 0.5 * at.rho * V * V;
    const CL = s.m * G / (qb * s.S), a = (CL - s.CL0) / s.CLa;
    const D = qb * s.S * (s.CD0 * waveF(V / at.a, s.Mcr, s.peak) + s.K * CL * CL);
    this.trim = s.fbw ? 0 : -s.der.Cma * a / s.der.Cmde;
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; this.eng = m; if (this.thrust(at.rho, V / at.a, V) < D) lo = m; else hi = m; }
    this.thr = this.eng = (lo + hi) / 2;
    return a;
  }

  place(x, y, z, hdg, V) {
    this.p = [x, y, z];
    const a = this.trimFor(V, y);
    this.q = qFromEuler(hdg, a, 0);
    const f = qrot(qFromEuler(hdg, 0, 0), [0, 0, -1]);
    this.v = [f[0] * V, 0, f[2] * V]; this.w = [0, 0, 0];
    this.crashed = false; this.onGround = false; this.engHealth = 1;
    this.gear = false; this.gearPos = 0; this.flap = 0; this.flapPos = 0;
    if (this.s.fixedGear) { this.gear = true; this.gearPos = 1; }
  }

  placeGround(x, y, z, hdg) {
    const s = this.s;
    this.p = [x, y, z]; this.v = [0, 0, 0]; this.w = [0, 0, 0];
    this.q = qFromEuler(hdg, 0, 0);
    this.crashed = false; this.onGround = true; this.engHealth = 1;
    this.gear = true; this.gearPos = 1; this.flap = 1; this.flapPos = 0.5;
    this.thr = 0; this.eng = 0.05; this.brake = 0;
    const clm = s.CL0 + s.flapCL * 0.5 + s.CLa * (s.aS - 0.015);
    const a = (clm / 1.56 - s.CL0 - s.flapCL * 0.5) / s.CLa;
    this.trim = s.fbw ? 0 : Math.max(0, -s.der.Cma * a / s.der.Cmde);
    this.surf = { e: 0, a: 0, r: 0 };
  }

  vRotate() {
    const s = this.s, clm = s.CL0 + s.flapCL * 0.5 + s.CLa * (s.aS - 0.015);
    return 1.15 * Math.sqrt(2 * s.m * G / (RHO0 * s.S * clm));
  }

  step(dt, ground) {
    if (this.crashed) return;
    const s = this.s, d = s.der, t = this.t;
    const at = atmos(this.p[1]);
    const vb = qrot(qinv(this.q), this.v);
    const V = Math.max(len(vb), 0.01);
    const M = V / at.a, qb = 0.5 * at.rho * V * V;
    const alpha = Math.atan2(-vb[1], -vb[2]);
    const beta = Math.asin(cl(vb[0] / V, -1, 1));
    const Vd = Math.max(V, 8);

    const eTau = s.eng.tau;
    this.eng += (this.thr - this.eng) * Math.min(1, dt / eTau);
    this.gearPos += cl((this.gear ? 1 : 0) - this.gearPos, -dt / 6, dt / 6);
    this.flapPos += cl(this.flap / 2 - this.flapPos, -dt / 8, dt / 8);

    const CL0 = s.CL0 + this.flapPos * s.flapCL;
    const aS = s.aS - this.flapPos * 0.03;
    let CLa = s.CLa; if (M > 1) CLa /= 1 + 0.6 * (M - 1);
    const pkPos = CL0 + CLa * aS, pkNeg = CL0 - CLa * aS * 0.8;
    let CL, stallAmt = 0;
    if (alpha > aS) {
      const dd = alpha - aS; stallAmt = Math.min(1, dd / 0.1);
      const fp = 1.15 * Math.sin(2 * alpha), tt = cl((dd - 0.1) / 0.35, 0, 1);
      CL = pkPos * (1 - 0.35 * stallAmt) * (1 - tt) + fp * tt;
    } else if (alpha < -aS * 0.8) {
      const dd = -aS * 0.8 - alpha; stallAmt = Math.min(1, dd / 0.1);
      const fp = 1.15 * Math.sin(2 * alpha), tt = cl((dd - 0.1) / 0.35, 0, 1);
      CL = pkNeg * (1 - 0.35 * stallAmt) * (1 - tt) + fp * tt;
    } else CL = CL0 + CLa * alpha;
    const sa = Math.sin(alpha);
    const CD = s.CD0 * waveF(M, s.Mcr, s.peak) + s.K * Math.min(CL * CL, pkPos * pkPos) + stallAmt * 1.3 * sa * sa
      + this.flapPos * s.flapCD + this.gearPos * s.gearCD + (this.brake > 0 && s.cls === 'fighter' && !this.onGround ? 0.05 * this.brake : 0);
    t.stall = stallAmt > 0.3 && !this.onGround;

    const vh = [vb[0] / V, vb[1] / V, vb[2] / V];
    let Ld = [0, -vh[2], vh[1]]; const ll = len(Ld) || 1; Ld = [0, Ld[1] / ll, Ld[2] / ll];
    const QS = qb * s.S, CY = d.CYb * beta;
    const T = this.thrust(at.rho, M, V);
    const Fb = [QS * (CL * Ld[0] - CD * vh[0] + CY), QS * (CL * Ld[1] - CD * vh[1]), QS * (CL * Ld[2] - CD * vh[2]) - T];

    const c = this.ctl, fb = s.fbw;
    let de, da, dr;
    const pR = -this.w[2], qP = this.w[0], rR = -this.w[1];
    const eu = euler(this.q);
    if (fb && !this.onGround && V > 30) {
      const QSm = Math.max(QS, 1);
      const n1 = Math.cos(eu.pitch) / Math.max(Math.cos(eu.roll), 0.5);
      const ncmd = c.pitch >= 0 ? n1 + c.pitch * (fb.nMax - n1) : n1 + c.pitch * (n1 - fb.nMin);
      let ac = (ncmd * s.m * G / QSm - CL0) / CLa;
      ac = cl(ac, -fb.aLim * 0.6, fb.aLim);
      de = -d.Cma * ac / d.Cmde + 2.2 * (ac - alpha) + 0.3 * qP * s.c / (2 * Vd) * d.Cmq / d.Cmde;
      let pt = c.roll * fb.pMax;
      if (fb.bank) {
        const bk = eu.roll, lim = Math.abs(c.roll) < 0.05 ? 0.576 : 1.17;
        if (Math.abs(bk) > lim) pt = Math.min(Math.abs(pt), 0.25) * Math.sign(pt) - Math.sign(bk) * Math.min(0.15, (Math.abs(bk) - lim) * 0.8);
        if (Math.abs(c.roll) < 0.05 && Math.abs(bk) <= lim) pt = 0;
      }
      da = -pt * d.Clp * s.b / (d.Clda * 2 * Vd) + 0.6 * (pt - pR) * (s.b / (2 * Vd)) * (-d.Clp) / d.Clda;
      dr = c.yaw + (s.cls === 'airliner' ? -1.2 * rR * s.b / (2 * Vd) * (-d.Cnr) / d.Cndr * 0.5 : 0);
    } else {
      de = c.pitch + this.trim; da = c.roll; dr = c.yaw;
      if (s.cls === 'airliner') dr += -0.6 * rR * s.b / (2 * Vd) * (-d.Cnr) / d.Cndr;
    }
    const rate = dt * 3.5;
    this.surf.e += cl(cl(de, -1, 1) - this.surf.e, -rate, rate);
    this.surf.a += cl(cl(da, -1, 1) - this.surf.a, -rate, rate);
    this.surf.r += cl(cl(dr, -1, 1) - this.surf.r, -rate, rate);
    const se = this.surf;

    const ae = Math.min(Math.abs(alpha), 0.7) * Math.sign(alpha);
    const Cm = d.Cma * ae + d.Cmq * qP * s.c / (2 * Vd) + d.Cmde * se.e * (1 - 0.4 * stallAmt);
    let Cl = d.Clda * se.a * (1 - 0.5 * stallAmt) + d.Clp * pR * s.b / (2 * Vd) + d.Clb * beta;
    if (stallAmt > 0.5 && !fb) Cl += (Math.sin(performance.now() * 0.0013 + this.p[0]) * 0.02) * stallAmt;
    const Cn = d.Cnb * beta + d.Cnr * rR * s.b / (2 * Vd) + d.Cndr * se.r - 0.1 * d.Clda * se.a * CL;
    const qbb = Math.max(qb, 0.5 * at.rho * 25);
    let dq = qbb * s.S * s.c * Cm / s.Iy, dp = qbb * s.S * s.b * Cl / s.Ix, drr = qbb * s.S * s.b * Cn / s.Iz;
    if (qb < 0.5 * at.rho * 25) { const k = qb / (0.5 * at.rho * 25); dq *= k; dp *= k; drr *= k; }

    const Fw = qrot(this.q, Fb);
    const acc = [Fw[0] / s.m, Fw[1] / s.m - G, Fw[2] / s.m];
    t.n = (Fb[1]) / (s.m * G);

    this.w[0] += dq * dt; this.w[2] -= dp * dt; this.w[1] -= drr * dt;
    this.v[0] += acc[0] * dt; this.v[1] += acc[1] * dt; this.v[2] += acc[2] * dt;

    const gr = ground(this.p[0], this.p[2]);
    const gh = gr.h;
    const clr = this.gearPos > 0.95 ? s.gearH : s.gearH * 0.45;
    if (this.p[1] + this.v[1] * dt - gh < clr + (this.onGround ? 0.05 : 0)) {
      const vs = this.v[1];
      const eu2 = euler(this.q);
      const bad = gr.water || this.gearPos < 0.95 || vs < -s.vCrash || Math.abs(eu2.roll) > 0.22 || eu2.pitch < -0.09 || len(this.v) > s.vGearMax;
      if (bad && !this.onGround) { this.crash(); return; }
      if (bad && this.onGround && (gr.water || len(this.v) > s.vGearMax * 1.6)) { this.crash(); return; }
      this.groundRoll(dt, gh, eu2, Fb);
    } else this.onGround = false;

    this.p[0] += this.v[0] * dt; this.p[1] += this.v[1] * dt; this.p[2] += this.v[2] * dt;
    const w = this.w, q = this.q;
    const nq = [
      q[0] + 0.5 * dt * (q[3] * w[0] + q[1] * w[2] - q[2] * w[1]),
      q[1] + 0.5 * dt * (q[3] * w[1] + q[2] * w[0] - q[0] * w[2]),
      q[2] + 0.5 * dt * (q[3] * w[2] + q[0] * w[1] - q[1] * w[0]),
      q[3] + 0.5 * dt * (-q[0] * w[0] - q[1] * w[1] - q[2] * w[2])];
    qnorm(nq); this.q = nq;

    t.V = V; t.M = M; t.alpha = alpha; t.beta = beta; t.rho = at.rho; t.T = T;
    t.ias = V * Math.sqrt(at.rho / RHO0); t.agl = this.p[1] - gh;
    this.buffet = Math.max(stallAmt, cl((Math.abs(t.n) - 6) / 4, 0, 1) * 0.5);
  }

  groundRoll(dt, gh, eu, Fb) {
    const s = this.s;
    this.onGround = true;
    this.p[1] = gh + (this.gearPos > 0.95 ? s.gearH : s.gearH * 0.45);
    if (this.v[1] < 0) this.v[1] = 0;
    const hd = eu.hdg;
    const fw = [Math.sin(hd), 0, -Math.cos(hd)], rt = [Math.cos(hd), 0, Math.sin(hd)];
    let vf = this.v[0] * fw[0] + this.v[2] * fw[2], vl = this.v[0] * rt[0] + this.v[2] * rt[2];
    const lift = Math.max(0, qrot(this.q, Fb)[1]);
    const N = Math.max(0, s.m * G - lift);
    const mu = 0.018 + this.brake * 0.45;
    const dec = mu * N / s.m * dt;
    vf = Math.abs(vf) <= dec ? 0 : vf - Math.sign(vf) * dec;
    vl *= Math.max(0, 1 - 8 * dt);
    this.v[0] = fw[0] * vf + rt[0] * vl; this.v[2] = fw[2] * vf + rt[2] * vl;
    const steer = this.ctl.yaw * 0.6 / (1 + Math.abs(vf) / 15);
    const yawRate = vf * Math.tan(steer) / (s.L * 0.4);
    let pitch = eu.pitch + this.w[0] * dt;
    if (pitch <= 0 && this.w[0] < 0) this.w[0] = 0;
    if (pitch >= 0.24 && this.w[0] > 0) this.w[0] = 0;
    pitch = cl(pitch, 0, 0.24);
    const roll = eu.roll * Math.max(0, 1 - 6 * dt);
    this.q = qFromEuler(hd + yawRate * dt, pitch, roll);
    this.w[1] = 0; this.w[2] = 0;
  }

  crash() { this.crashed = true; this.v = [0, 0, 0]; this.w = [0, 0, 0]; }
}
