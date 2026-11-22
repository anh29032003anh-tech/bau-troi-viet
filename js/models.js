import * as THREE from 'three';

function loft(secs, o = {}) {
  const ns = secs.length, m = secs[0].length, pos = [], uv = [], idx = [];
  const z0 = o.z0 ?? 0, z1 = o.z1 ?? 1;
  for (let i = 0; i < ns; i++) for (let j = 0; j <= m; j++) {
    const p = secs[i][j % m]; pos.push(p[0], p[1], p[2]);
    if (o.uvLen) uv.push((p[2] - z0) / (z1 - z0), j / m); else uv.push(j / m, i / (ns - 1));
  }
  for (let i = 0; i < ns - 1; i++) for (let j = 0; j < m; j++) {
    const a = i * (m + 1) + j, b = a + 1, c = a + m + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  if (o.caps !== false) for (const i of [0, ns - 1]) {
    const s = secs[i]; let cx = 0, cy = 0, cz = 0;
    s.forEach(p => { cx += p[0]; cy += p[1]; cz += p[2]; });
    const ci = pos.length / 3; pos.push(cx / m, cy / m, cz / m); uv.push(0.5, 0.5);
    const base = pos.length / 3; s.forEach(p => { pos.push(p[0], p[1], p[2]); uv.push(0.5, 0.5); });
    for (let j = 0; j < m; j++) { const a = base + j, b = base + (j + 1) % m; if (i === 0) idx.push(ci, b, a); else idx.push(ci, a, b); }
  }
  if (o.flip) for (let k = 0; k < idx.length; k += 3) { const t = idx[k]; idx[k] = idx[k + 1]; idx[k + 1] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function airfoil(n, t, c0 = 0, c1 = 1) {
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const x = c0 + (c1 - c0) * (1 - Math.cos(Math.PI * i / n)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    up.push([x, yt]); lo.push([x, -yt]);
  }
  const loop = [];
  for (let i = n; i >= 0; i--) loop.push(up[i]);
  for (let i = c0 === 0 ? 1 : 0; i <= n; i++) loop.push(lo[i]);
  return loop;
}

function section(st, t, nrm, c0, c1) {
  return airfoil(10, t, c0, c1).map(([x, y]) => [st.x + nrm[0] * y * st.c, st.y + nrm[1] * y * st.c, st.z + x * st.c]);
}

function surf(stations, t, nrm, c0, c1, flip) { return loft(stations.map(s => section(s, t, nrm, c0, c1)), { flip }); }

const HINGE = 0.72;

function catmull(list, steps) {
  const out = [];
  for (let i = 0; i < list.length - 1; i++) {
    const p0 = list[Math.max(0, i - 1)], p1 = list[i], p2 = list[i + 1], p3 = list[Math.min(list.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(list[list.length - 1]);
  return out;
}

function ellipseSecs(list, x = 0, m = 40) {
  return catmull(list, 4).map(([z, rx, ry, yc]) => {
    const s = [];
    for (let j = 0; j < m; j++) { const th = j / m * Math.PI * 2; s.push([x + Math.max(rx, 0.01) * Math.sin(th), yc + Math.max(ry, 0.01) * Math.cos(th), z]); }
    return s;
  });
}

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function roundel(g, kind, r) {
  if (kind === 'vn') {
    g.fillStyle = '#f7d116'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.fillStyle = '#da251d'; g.beginPath(); g.arc(0, 0, r * 0.82, 0, 7); g.fill();
    star(g, r * 0.62, '#f7d116');
  } else {
    g.fillStyle = '#5a6065'; g.fillRect(-r * 1.9, -r * 0.35, r * 3.8, r * 0.7);
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    star(g, r * 0.95, '#c9cdd0');
  }
}
function star(g, r, col) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

function paintFuselage(spec) {
  const W = 2048, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), lv = spec.livery, L = spec.L, md = spec.model;
  const X = z => z / L * W, Y = deg => deg / 360 * H;
  const rAt = z => { const f = md.fus; for (let i = 0; i < f.length - 1; i++) if (z >= f[i][0] && z <= f[i + 1][0]) { const t = (z - f[i][0]) / (f[i + 1][0] - f[i][0]); return (f[i][1] + f[i][2]) / 2 * (1 - t) + (f[i + 1][1] + f[i + 1][2]) / 2 * t; } return 1; };
  const decal = (z, deg, side, fn) => {
    const sx = W / L, sy = H / (2 * Math.PI * rAt(z));
    g.save(); g.translate(X(z), Y(deg)); g.scale(1, sy / sx);
    if (side > 0) g.scale(-1, 1); else g.scale(1, -1);
    fn(sx); g.restore();
  };
  g.fillStyle = lv.base; g.fillRect(0, 0, W, H);
  const R = rng(spec.id.length * 7919 + 13);
  if (lv.type === 'camo' || lv.type === 'two' || lv.type === 'metal') {
    if (lv.type === 'camo') for (let i = 0; i < 70; i++) {
      g.fillStyle = lv.colors[i % lv.colors.length]; g.beginPath();
      const cx = R() * W, cy = R() * H, s = 60 + R() * 160;
      for (let k = 0; k < 5; k++) g.lineTo(cx + (R() - 0.5) * s * 2, cy + (R() - 0.5) * s);
      g.closePath(); g.fill();
    }
    if (lv.type === 'two') { g.fillStyle = lv.colors[0]; g.fillRect(0, 0, W, Y(55)); g.fillRect(0, Y(305), W, Y(55)); }
    if (lv.type === 'metal') for (let i = 0; i < 40; i++) { g.fillStyle = lv.colors[i % 2]; g.globalAlpha = 0.5; g.fillRect(R() * W, R() * H, 40 + R() * 160, 20 + R() * 60); g.globalAlpha = 1; }
    const gr = g.createLinearGradient(0, Y(110), 0, Y(250)); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, lv.belly); gr.addColorStop(0.7, lv.belly); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, Y(110), W, Y(140));
    g.fillStyle = lv.radome; g.fillRect(0, 0, X(L * 0.075), H);
    g.strokeStyle = 'rgba(30,35,40,0.35)'; g.lineWidth = 1.2;
    for (let z = L * 0.1; z < L; z += L * 0.06) { g.beginPath(); g.moveTo(X(z), 0); g.lineTo(X(z), H); g.stroke(); }
    for (const side of [1, -1]) {
      decal(L * 0.74, side > 0 ? 80 : 280, side, s => roundel(g, lv.roundel, 0.42 * s));
      decal(L * 0.2, side > 0 ? 95 : 265, side, s => { g.fillStyle = lv.roundel === 'vn' ? '#c8102e' : '#30353a'; g.font = `bold ${0.42 * s}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lv.num, 0, 0); });
    }
  } else {
    g.fillStyle = lv.belly; g.fillRect(0, Y(118), W, Y(124));
    if (lv.type === 'airline') {
      g.fillStyle = lv.stripe; g.fillRect(0, Y(100), W, Y(7)); g.fillRect(0, Y(253), W, Y(7));
      g.fillStyle = lv.stripe2; g.fillRect(0, Y(108), W, Y(3)); g.fillRect(0, Y(249), W, Y(3));
      const pitch = L > 50 ? 0.6 : 0.53, ww = 0.26, wh = 0.36;
      for (const deg of [72, 288]) {
        g.fillStyle = '#1d2a33';
        for (let z = L * 0.13; z < L * 0.8; z += pitch) {
          const door = [0.12, 0.3, 0.55, 0.79].some(f => Math.abs(z / L - f) < 0.012);
          if (door) continue;
          const sy = H / (2 * Math.PI * rAt(z)), hh = wh * sy, w = ww * W / L;
          g.beginPath(); g.roundRect(X(z) - w / 2, Y(deg) - hh / 2, w, hh, w * 0.4); g.fill();
        }
        g.strokeStyle = 'rgba(60,70,80,0.6)'; g.lineWidth = 2;
        for (const f of [0.115, 0.3, 0.55, 0.79]) { const z = L * f, sy = H / (2 * Math.PI * rAt(z)); g.strokeRect(X(z) - 0.45 * W / L, Y(deg) - 0.9 * sy, 0.9 * W / L, 1.9 * sy); }
      }
      for (const side of [1, -1]) decal(L * 0.86, side > 0 ? 80 : 280, side, s => { g.fillStyle = '#333'; g.font = `bold ${0.45 * s}px Arial`; g.textAlign = 'center'; g.fillText(lv.reg, 0, 0); });
      g.fillStyle = lv.tail; g.fillRect(X(L * 0.9), 0, W, Y(60)); g.fillRect(X(L * 0.9), Y(300), W, Y(60));
    } else {
      g.fillStyle = lv.stripe; g.fillRect(X(L * 0.15), Y(100), W, Y(10)); g.fillRect(X(L * 0.15), Y(250), W, Y(10));
      g.fillStyle = lv.stripe2; g.fillRect(X(L * 0.15), Y(112), W, Y(4)); g.fillRect(X(L * 0.15), Y(244), W, Y(4));
      g.fillStyle = '#20384a';
      g.beginPath(); g.roundRect(X(1.5), Y(30), X(1.6), Y(45), 10); g.fill();
      g.beginPath(); g.roundRect(X(1.5), Y(285), X(1.6), Y(45), 10); g.fill();
      g.beginPath(); g.roundRect(X(3.2), Y(38), X(0.7), Y(32), 8); g.fill();
      g.beginPath(); g.roundRect(X(3.2), Y(290), X(0.7), Y(32), 8); g.fill();
      for (const side of [1, -1]) decal(L * 0.7, side > 0 ? 90 : 270, side, s => { g.fillStyle = '#222'; g.font = `bold ${0.4 * s}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lv.reg, 0, 0); });
    }
    g.fillStyle = '#1b2731';
    const zc = spec.cls === 'light' ? 1.15 : L * 0.045, zl = spec.cls === 'light' ? 0.5 : Math.max(1.0, L * 0.022);
    g.beginPath(); g.moveTo(X(zc), Y(-48 + 360)); g.lineTo(X(zc + zl), Y(-55 + 360)); g.lineTo(X(zc + zl), Y(-12 + 360)); g.lineTo(X(zc - zl * 0.2), Y(-18 + 360)); g.fill();
    g.beginPath(); g.moveTo(X(zc), Y(48)); g.lineTo(X(zc + zl), Y(55)); g.lineTo(X(zc + zl), Y(12)); g.lineTo(X(zc - zl * 0.2), Y(18)); g.fill();
    g.fillRect(X(zc - zl * 0.25), Y(0), X(zl * 0.9), Y(10)); g.fillRect(X(zc - zl * 0.25), Y(350), X(zl * 0.9), Y(10));
  }
  const tex = new THREE.CanvasTexture(cv); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

function paintSkin(spec) {
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), lv = spec.livery, R = rng(spec.id.length * 104729 + 7);
  g.fillStyle = lv.wing || lv.base; g.fillRect(0, 0, N, N);
  if (lv.type === 'camo') for (let i = 0; i < 26; i++) {
    g.fillStyle = lv.colors[i % lv.colors.length]; g.beginPath();
    const cx = R() * N, cy = R() * N, s = 50 + R() * 110;
    for (let k = 0; k < 5; k++) g.lineTo(cx + (R() - 0.5) * s * 2, cy + (R() - 0.5) * s * 2);
    g.closePath(); g.fill();
  }
  if (lv.type === 'metal') for (let i = 0; i < 20; i++) { g.fillStyle = lv.colors[i % 2]; g.globalAlpha = 0.45; g.fillRect(R() * N, R() * N, 30 + R() * 120, 20 + R() * 60); g.globalAlpha = 1; }
  g.strokeStyle = 'rgba(30,35,40,0.25)'; g.lineWidth = 1;
  for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(0, k * N / 4); g.lineTo(N, k * N / 4); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function mat(color, o = {}) { return new THREE.MeshStandardMaterial({ color, metalness: o.metal ?? 0.3, roughness: o.rough ?? 0.5, side: THREE.DoubleSide, map: o.map || null, ...(o.extra || {}) }); }

export function buildAircraft(spec, opts = {}) {
  const md = spec.model, lv = spec.livery, mil = spec.nhom === 'Quân sự';
  const root = new THREE.Group(), body = new THREE.Group();
  body.position.z = -md.cg; root.add(body);
  const movs = [], props = [], flames = [], strobes = [], beacons = [], misMeshes = [];
  const paint = { metal: mil ? 0.25 : 0.35, rough: mil ? 0.62 : 0.38 };
  const fusTex = paintFuselage(spec);
  const mFus = mat(0xffffff, { ...paint, map: fusTex });
  const skin = mil ? paintSkin(spec) : null;
  const mWing = mil ? mat(0xffffff, { ...paint, map: skin }) : mat(lv.wing, paint);
  const mTail = mil ? mWing : mat(lv.tail, paint);
  const mDark = mat(0x15181b, { metal: 0.6, rough: 0.5 });
  const mMetal = mat(0x8c8f92, { metal: 0.9, rough: 0.35 });
  const mGlass = new THREE.MeshStandardMaterial({ color: mil ? 0x6a5a2a : 0x203040, metalness: 0.95, roughness: 0.06, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const mEng = mil ? mDark : mat(lv.engine || '#eeeeee', paint);
  const add = (geo, m, parent = body) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me; };

  const fz = md.fus;
  add(loft(ellipseSecs(fz), { uvLen: true, z0: fz[0][0], z1: fz[fz.length - 1][0] }), mFus);
  const fusAt = z => { for (let i = 0; i < fz.length - 1; i++) if (z >= fz[i][0] && z <= fz[i + 1][0]) { const t = (z - fz[i][0]) / (fz[i + 1][0] - fz[i][0]); return fz[i].map((v, k) => v * (1 - t) + fz[i + 1][k] * t); } return fz[fz.length - 1]; };

  for (const n of md.nac || []) for (const sx of n.x ? [1, -1] : [1]) {
    const secs = n.sec.map(s => [s[0], s[1], s[2], s[3]]);
    add(loft(ellipseSecs(secs, n.x * sx, 28)), mil ? mWing : mFus);
    if (n.dark) { const s0 = n.sec[0]; const d = add(new THREE.CircleGeometry(1, 24), mDark); d.scale.set(s0[1] * 0.92, s0[2] * 0.9, 1); d.position.set(n.x * sx, s0[3], s0[0] + 0.05); }
    if (n.nozzle) addNozzle(n.x * sx, n.sec[n.sec.length - 1][3], n.sec[n.sec.length - 1][0], n.nozzle);
  }

  function addNozzle(x, y, z, r) {
    const g = new THREE.CylinderGeometry(r * 0.88, r, 1.2, 24, 1, true); g.rotateX(Math.PI / 2);
    const nz = add(g, mMetal); nz.position.set(x, y, z + 0.3);
    const inner = add(new THREE.CircleGeometry(r * 0.85, 20), mDark); inner.position.set(x, y, z + 0.2);
    if (spec.eng.type === 'jet' && mil) {
      const fg = new THREE.ConeGeometry(r * 0.8, 1, 20, 1, true); fg.rotateX(-Math.PI / 2); fg.translate(0, 0, 0.5);
      const fm = new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const fl = new THREE.Mesh(fg, fm); fl.position.set(x, y, z + 0.8); body.add(fl);
      const fg2 = new THREE.ConeGeometry(r * 0.5, 1, 16, 1, true); fg2.rotateX(-Math.PI / 2); fg2.translate(0, 0, 0.5);
      const fm2 = new THREE.MeshBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const fl2 = new THREE.Mesh(fg2, fm2); fl2.position.set(x, y, z + 0.8); body.add(fl2);
      flames.push({ outer: fl, inner: fl2, r });
    }
  }
  for (const n of md.nozzle || []) addNozzle(n.x, n.y, n.z, n.r);

  if (md.shock) { const g = new THREE.ConeGeometry(md.shock.r, md.shock.len, 24); g.rotateX(-Math.PI / 2); const c = add(g, mat(lv.radome, paint)); c.position.set(0, 0, md.shock.z - md.shock.len * 0.2); const d = add(new THREE.CircleGeometry(fz[0][1] * 0.95, 24), mDark); d.position.set(0, 0, fz[0][0] + 0.25); }
  if (md.probe) { const [x, y, z, l] = md.probe; const g = new THREE.CylinderGeometry(0.025, 0.04, l, 8); g.rotateX(Math.PI / 2); const p = add(g, mMetal); p.position.set(x, y, z - l / 2); }
  if (md.irst) { const s = add(new THREE.SphereGeometry(0.17, 16, 12), mGlass); s.position.set(md.irst[0], md.irst[1], md.irst[2]); }

  function wingSet(w, kind, tm) {
    const segs = [0];
    if (w.flap) segs.push(w.flap[0], w.flap[1]);
    if (w.ail) segs.push(w.ail[0], w.ail[1]);
    segs.push(1);
    const B = [...new Set(segs)].sort((a, b) => a - b);
    for (const sx of [1, -1]) {
      const st = s => ({ x: sx * ((w.x0 || 0) + w.semi * s), y: w.y + w.semi * s * Math.tan(w.dih || 0) + (w.flex || 0) * s * s, z: w.z + w.sweep * s, c: w.root + (w.tip - w.root) * s });
      const stations = (a, b) => { const out = [], n = Math.max(1, Math.ceil((b - a) / 0.1)); for (let i = 0; i <= n; i++) out.push(st(a + (b - a) * i / n)); return out; };
      for (let i = 0; i < B.length - 1; i++) {
        const a = B[i], b = B[i + 1], mid = (a + b) / 2;
        let mk = null;
        if (w.flap && mid > w.flap[0] && mid < w.flap[1]) mk = 'flap';
        if (w.ail && mid > w.ail[0] && mid < w.ail[1]) mk = 'ail';
        if (w.all) { add(surf(stations(a, b), w.t, [0, 1, 0], 0, 1, sx < 0), tm); continue; }
        if (!mk && kind !== 'elev') { add(surf(stations(a, b), w.t, [0, 1, 0], 0, 1, sx < 0), tm); continue; }
        if (kind === 'elev') mk = 'elev';
        add(surf(stations(a, b), w.t, [0, 1, 0], 0, HINGE, sx < 0), tm);
        const geo = surf(stations(a, b), w.t, [0, 1, 0], HINGE, 1, sx < 0);
        const A = st(a), Bp = st(b);
        const h0 = new THREE.Vector3(A.x, A.y, A.z + A.c * HINGE), h1 = new THREE.Vector3(Bp.x, Bp.y, Bp.z + Bp.c * HINGE);
        geo.translate(-h0.x, -h0.y, -h0.z);
        const pv = new THREE.Object3D(); pv.position.copy(h0); body.add(pv); add(geo, tm, pv);
        const axis = h1.sub(h0).normalize(); if (axis.x < 0) axis.negate();
        movs.push({ obj: pv, axis, kind: mk, side: sx });
      }
      if (w.winglet) {
        const wl = w.winglet, T = st(1);
        const s0 = { x: T.x, y: T.y, z: T.z + 0.1, c: wl.root }, s1 = { x: T.x + sx * Math.sin(wl.cant) * wl.h, y: T.y + Math.cos(wl.cant) * wl.h, z: T.z + 0.1 + wl.sweep, c: wl.tip };
        add(surf([s0, s1], 0.09, [-sx, 0, 0], 0, 1, sx > 0), tm);
      }
      if (kind === 'wing') {
        const T = st(1);
        const col = sx > 0 ? 0x22ff44 : 0xff2222;
        const l = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.08, spec.b * 0.004), 8, 6), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
        l.position.set(T.x, T.y, T.z + 0.2); body.add(l);
        const sb = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.1, spec.b * 0.005), 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true }));
        sb.position.set(T.x, T.y, T.z + T.c * 0.9); body.add(sb); strobes.push(sb);
      }
    }
  }
  wingSet(md.wing, 'wing', mWing);
  if (md.lerx) wingSet({ ...md.lerx, dih: 0 }, 'lerx', mWing);
  if (md.htail) { if (md.htail.all) stabilator(md.htail); else wingSet(md.htail, 'elev', mTail); }

  function stabilator(h) {
    for (const sx of [1, -1]) {
      const st = s => ({ x: sx * (h.x0 + h.semi * s), y: h.y + h.semi * s * Math.tan(h.dih || 0), z: h.z + h.sweep * s, c: h.root + (h.tip - h.root) * s });
      const geo = surf([st(0), st(0.5), st(1)], h.t, [0, 1, 0], 0, 1, sx < 0);
      const p0 = new THREE.Vector3(sx * h.x0, h.y, h.z + h.root * 0.35);
      geo.translate(-p0.x, -p0.y, -p0.z);
      const pv = new THREE.Object3D(); pv.position.copy(p0); body.add(pv); add(geo, mTail, pv);
      const axis = new THREE.Vector3(1, Math.tan(h.dih || 0) * sx, 0).normalize(); if (axis.x < 0) axis.negate();
      movs.push({ obj: pv, axis, kind: 'stab', side: sx });
    }
  }

  for (const v of md.vtail || []) {
    const st = s => ({ x: v.x + (v.cant || 0) * v.h * s, y: v.y + v.h * s, z: v.z + v.sweep * s, c: v.root + (v.tip - v.root) * s });
    add(surf([st(0), st(1)], 0.07, [-1, 0, 0], 0, HINGE, false), mTail);
    const geo = surf([st(0.06), st(0.96)], 0.07, [-1, 0, 0], HINGE, 1, false);
    const A = st(0.06), Bq = st(0.96);
    const h0 = new THREE.Vector3(A.x, A.y, A.z + A.c * HINGE), h1 = new THREE.Vector3(Bq.x, Bq.y, Bq.z + Bq.c * HINGE);
    geo.translate(-h0.x, -h0.y, -h0.z);
    const pv = new THREE.Object3D(); pv.position.copy(h0); body.add(pv); add(geo, mTail, pv);
    movs.push({ obj: pv, axis: h1.sub(h0).normalize(), kind: 'rud', side: 1 });
    add(surf([st(0.96), st(1)], 0.07, [-1, 0, 0], HINGE, 1, false), mTail);
    const top = st(1);
    if (!mil) { const bc = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); bc.position.set(top.x, top.y - 0.3, top.z + top.c); body.add(bc); }
  }
  for (const v of md.ventral || []) {
    const st = s => ({ x: v.x + (v.cant || 0) * Math.abs(v.h) * s, y: v.y + v.h * s, z: v.z + v.sweep * s, c: v.root + (v.tip - v.root) * s });
    add(surf([st(0), st(1)], 0.06, [-1, 0, 0], 0, 1, true), mTail);
  }

  if (md.canopy) {
    const c = md.canopy, g = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const m = add(g, mGlass); m.scale.set(c.w / 2, c.h, c.len / 2); m.position.set(0, c.y - 0.05, c.z);
    const fr = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 24, Math.PI), mDark);
    fr.scale.set(c.w / 2, c.h, 1); fr.position.set(0, c.y - 0.05, c.z - c.len * 0.18); body.add(fr);
  }

  for (const p of md.pods || []) {
    const prof = [[0, .9], [.06, 1], [.4, 1], [.7, .95], [.88, .82], [1, .62]];
    const secs = prof.map(([f, k]) => { const s = [], z = p.z + f * p.len, r = p.r * k; for (let j = 0; j < 32; j++) { const th = j / 32 * Math.PI * 2; s.push([p.x + r * Math.sin(th), p.y + r * Math.cos(th), z]); } return s; });
    add(loft(secs, { caps: false }), mEng);
    const fan = add(new THREE.CircleGeometry(p.r * 0.88, 32), mDark); fan.position.set(p.x, p.y, p.z + p.len * 0.07);
    const sp = new THREE.ConeGeometry(p.r * 0.3, p.r * 0.6, 20); sp.rotateX(-Math.PI / 2);
    const spm = add(sp, mMetal); spm.position.set(p.x, p.y, p.z + p.len * 0.07 - p.r * 0.25);
    const core = new THREE.ConeGeometry(p.r * 0.38, p.r * 1.1, 20); core.rotateX(Math.PI / 2);
    const cm = add(core, mMetal); cm.position.set(p.x, p.y, p.z + p.len + p.r * 0.4);
    const ex = add(new THREE.CircleGeometry(p.r * 0.6, 24), mDark); ex.position.set(p.x, p.y, p.z + p.len - 0.02); ex.rotation.y = Math.PI;
    const wy = md.wing.y + Math.abs(p.x) * Math.tan(md.wing.dih) + (md.wing.flex || 0) * (Math.abs(p.x) / md.wing.semi) ** 2;
    const pyl = add(new THREE.BoxGeometry(p.r * 0.25, Math.max(0.3, wy - p.y - p.r * 0.7), p.len * 0.85), mEng);
    pyl.position.set(p.x, (wy + p.y + p.r * 0.7) / 2, p.z + p.len * 0.5);
  }

  for (const p of md.props || []) {
    if (p.nac) {
      const prof = [[0, .45], [.08, .85], [.25, 1], [.7, .9], [1, .35]];
      const secs = prof.map(([f, k]) => { const s = [], z = p.z + 0.3 + f * p.nac.len, r = p.nac.r * k; for (let j = 0; j < 28; j++) { const th = j / 28 * Math.PI * 2; s.push([p.x + r * Math.sin(th), p.y + r * Math.cos(th) * 1.15, z]); } return s; });
      add(loft(secs), mEng);
    }
    const hub = new THREE.Group(); hub.position.set(p.x, p.y, p.z); body.add(hub);
    const sg = new THREE.SphereGeometry(p.nac ? p.nac.r * 0.5 : 0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); sg.rotateX(-Math.PI / 2);
    add(sg, mat(p.nac ? 0x2a2d30 : 0xd8d8d8, { metal: 0.5, rough: 0.4 }), hub);
    const blades = new THREE.Group(); hub.add(blades);
    const mb = mat(0x1d1f21, { metal: 0.3, rough: 0.6 });
    for (let i = 0; i < p.blades; i++) {
      const bg = new THREE.BoxGeometry(p.r * 0.13, p.r * 0.95, 0.05); bg.translate(0, p.r * 0.52, 0);
      const b = add(bg, mb, blades); b.rotation.z = i / p.blades * Math.PI * 2; b.rotation.y = 0.35;
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(p.r, 40), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    hub.add(disc);
    props.push({ blades, disc, angle: 0 });
  }

  for (const s of md.struts || []) {
    const a = new THREE.Vector3(s[0], s[1], s[2]), b = new THREE.Vector3(s[3], s[4], s[5]);
    const g = new THREE.CylinderGeometry(0.04, 0.04, a.distanceTo(b), 8);
    const m = add(g, mFus); m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }

  const gearG = new THREE.Group(); body.add(gearG);
  for (const gl of md.gear || []) {
    const f = fusAt(gl.z), inFus = Math.abs(gl.x) < f[1] + 0.2;
    const topY = inFus ? f[3] - f[2] * 0.75 : md.wing.y + Math.abs(gl.x) * Math.tan(md.wing.dih || 0) - 0.1;
    const groundY = -spec.gearH;
    const leg = new THREE.Group(); leg.position.set(gl.x, topY, gl.z + md.cg - md.cg); gearG.add(leg);
    leg.position.z = gl.z;
    const len = topY - groundY - gl.r;
    const sg = new THREE.CylinderGeometry(gl.r * 0.2, gl.r * 0.25, len, 10); sg.translate(0, -len / 2, 0);
    add(sg, mMetal, leg);
    const wg = new THREE.CylinderGeometry(gl.r, gl.r, gl.r * 0.6, 20); wg.rotateZ(Math.PI / 2);
    const mw = mat(0x111111, { metal: 0.1, rough: 0.9 });
    const offs = gl.n === 1 ? [[0, 0]] : gl.n === 2 ? [[-gl.r * 0.45, 0], [gl.r * 0.45, 0]] : [[-gl.r * 0.5, -gl.r * 1.15], [gl.r * 0.5, -gl.r * 1.15], [-gl.r * 0.5, gl.r * 1.15], [gl.r * 0.5, gl.r * 1.15]];
    for (const [ox, oz] of offs) { const w = add(wg, mw, leg); w.position.set(ox, -len, oz); }
    if (gl.n === 4) { const bg = new THREE.BoxGeometry(0.2, 0.2, gl.r * 3.2); const bm = add(bg, mMetal, leg); bm.position.set(0, -len, 0); }
  }

  if (spec.mis) {
    for (const hp of md.hard || []) {
      const m = buildMissile(); m.position.set(hp[0], hp[1] - 0.15, hp[2] - 1.2); body.add(m); misMeshes.push(m);
    }
  }

  root.traverse(o => { if (o.isMesh) o.frustumCulled = true; });

  let tAcc = 0;
  function update(pl, dt) {
    tAcc += dt;
    const s = pl.surf;
    for (const mv of movs) {
      let a = 0;
      if (mv.kind === 'ail') a = -s.a * 0.35 * mv.side;
      else if (mv.kind === 'flap') a = pl.flapPos * 0.6;
      else if (mv.kind === 'elev' || mv.kind === 'stab') a = -s.e * (mv.kind === 'stab' ? 0.3 : 0.4) - (mv.kind === 'stab' ? s.a * 0.12 * mv.side : 0);
      else if (mv.kind === 'rud') a = s.r * 0.45;
      mv.obj.quaternion.setFromAxisAngle(mv.axis, a);
    }
    for (const p of props) {
      const rps = 8 + pl.eng * 30;
      p.angle += rps * dt * Math.PI * 2;
      p.blades.rotation.z = p.angle;
      p.disc.material.opacity = Math.min(0.35, pl.eng * 0.5);
      p.blades.visible = pl.eng < 0.25 || (Math.floor(tAcc * 60) % 2 === 0);
    }
    for (const f of flames) {
      const ab = pl.t.ab ? (pl.eng - 0.9) / 0.1 : 0;
      const len = ab > 0 ? 2.5 + ab * 4 : 0.4 + pl.eng * 0.6;
      const fl = 0.9 + Math.random() * 0.2;
      f.outer.scale.set(1, 1, len * fl); f.inner.scale.set(1, 1, len * 0.6 * fl);
      f.outer.material.opacity = ab > 0 ? 0.55 + ab * 0.3 : pl.eng * 0.12;
      f.inner.material.opacity = ab > 0 ? 0.8 : pl.eng * 0.25;
    }
    const gp = spec.fixedGear ? 1 : pl.gearPos;
    gearG.visible = gp > 0.02; gearG.scale.y = Math.max(0.02, gp);
    const blink = (tAcc % 1.2) < 0.06;
    for (const s2 of strobes) s2.material.opacity = blink ? 1 : 0;
    const left = opts.missilesLeft ? opts.missilesLeft() : misMeshes.length;
    misMeshes.forEach((m, i) => { m.visible = i < left; });
  }
  return { root, update, radius: Math.max(spec.b, spec.L) * 0.32 };
}

export function buildMissile() {
  const g = new THREE.Group();
  const mW = new THREE.MeshStandardMaterial({ color: 0xe8e8e4, metalness: 0.3, roughness: 0.5 });
  const mD = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.4 });
  const b = new THREE.CylinderGeometry(0.065, 0.065, 2.9, 12); b.rotateX(Math.PI / 2);
  const me = new THREE.Mesh(b, mW); g.add(me);
  const n = new THREE.ConeGeometry(0.065, 0.3, 12); n.rotateX(-Math.PI / 2);
  const nm = new THREE.Mesh(n, mD); nm.position.z = -1.6; g.add(nm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.25, 0.3), mW);
    f.position.set(0, 0, 1.25); f.rotation.z = i * Math.PI / 2 + Math.PI / 4; f.translateY(0.15); g.add(f);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.14, 0.18), mW);
    c.position.set(0, 0, -1.1); c.rotation.z = i * Math.PI / 2 + Math.PI / 4; c.translateY(0.1); g.add(c);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
