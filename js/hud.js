const D = 180 / Math.PI;
const HUDC = '#8dffb6', CIV = '#cfefff', WARN = '#ff5a4a';

export function drawHUD(g, vp, P, ctx) {
  const { x, y, w, h } = vp, pl = P.phys, t = pl.t, s = pl.s, mil = s.nhom === 'Quân sự';
  const col = mil ? HUDC : CIV, sc = Math.min(w, h) / 800;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.2, 1.6 * sc);
  g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 4;
  const font = (px, b = '600') => g.font = `${b} ${Math.round(px * sc)}px "Be Vietnam Pro", Segoe UI, sans-serif`;
  const cx = w / 2, cy = h / 2;

  if (!P.alive) {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; font(40, '800'); g.textAlign = 'center';
    g.fillText(P.deathMsg || 'MÁY BAY ĐÃ RƠI', cx, cy - 10);
    font(20, '500'); g.fillText(`Xuất kích lại sau ${Math.max(0, P.respawn).toFixed(0)} giây…`, cx, cy + 30);
    g.restore(); return;
  }
  const e = ctx.euler;
  const pxDeg = h / ctx.fov;
  g.save(); g.translate(cx, cy); g.rotate(-e.roll);
  font(14);
  for (let d = -90; d <= 90; d += 5) {
    const dy = (e.pitch * D - d) * pxDeg;
    if (Math.abs(dy) > h * 0.38) continue;
    const big = d % 10 === 0, lw = d === 0 ? w * 0.42 : (big ? 110 : 60) * sc, gap = 40 * sc;
    g.beginPath();
    if (d === 0) { g.moveTo(-lw, dy); g.lineTo(-gap, dy); g.moveTo(gap, dy); g.lineTo(lw, dy); }
    else {
      g.setLineDash(d < 0 ? [8 * sc, 6 * sc] : []);
      g.moveTo(-lw, dy + (d > 0 ? 8 : -8) * sc); g.lineTo(-lw, dy); g.lineTo(-gap, dy);
      g.moveTo(gap, dy); g.lineTo(lw, dy); g.lineTo(lw, dy + (d > 0 ? 8 : -8) * sc);
    }
    g.stroke(); g.setLineDash([]);
    if (d !== 0 && big) { g.textAlign = 'right'; g.fillText(Math.abs(d), -lw - 6 * sc, dy + 5 * sc); g.textAlign = 'left'; g.fillText(Math.abs(d), lw + 6 * sc, dy + 5 * sc); }
  }
  g.restore();

  if (ctx.fpm) {
    const [fx, fy] = ctx.fpm;
    g.beginPath(); g.arc(fx, fy, 9 * sc, 0, 7); g.moveTo(fx - 22 * sc, fy); g.lineTo(fx - 9 * sc, fy); g.moveTo(fx + 9 * sc, fy); g.lineTo(fx + 22 * sc, fy); g.moveTo(fx, fy - 9 * sc); g.lineTo(fx, fy - 18 * sc); g.stroke();
  }
  if (ctx.bore) { const [bx, by] = ctx.bore; g.beginPath(); g.moveTo(bx - 14 * sc, by); g.lineTo(bx - 5 * sc, by); g.moveTo(bx + 5 * sc, by); g.lineTo(bx + 14 * sc, by); g.moveTo(bx, by - 5 * sc); g.lineTo(bx, by - 12 * sc); g.stroke(); }

  const box = (bx, by, bw, label, val, sub, align) => {
    g.strokeRect(bx, by, bw, 40 * sc);
    font(12, '500'); g.textAlign = align; g.fillText(label, align === 'left' ? bx : bx + bw, by - 6 * sc);
    font(24, '700'); g.textAlign = 'center'; g.fillText(val, bx + bw / 2, by + 29 * sc);
    if (sub) { font(13, '500'); g.fillText(sub, bx + bw / 2, by + 60 * sc); }
  };
  const kmh = t.ias * 3.6;
  box(cx - 300 * sc, cy - 20 * sc, 110 * sc, 'TỐC ĐỘ km/h', kmh.toFixed(0), `M ${t.M.toFixed(2)}  ·  thực ${(t.V * 3.6).toFixed(0)}`, 'left');
  const vs = pl.v[1];
  box(cx + 190 * sc, cy - 20 * sc, 110 * sc, 'ĐỘ CAO m', pl.p[1].toFixed(0), `${vs >= 0 ? '▲' : '▼'} ${Math.abs(vs).toFixed(1)} m/s · AGL ${Math.max(0, t.agl ?? 0).toFixed(0)}`, 'right');

  const hd = e.hdg * D;
  g.save(); g.beginPath(); g.rect(cx - 200 * sc, 20 * sc, 400 * sc, 50 * sc); g.clip();
  font(13);
  g.textAlign = 'center';
  for (let a = Math.floor(hd / 5) * 5 - 40; a <= hd + 40; a += 5) {
    const dx = (a - hd) * 5 * sc, aa = ((a % 360) + 360) % 360;
    g.beginPath(); g.moveTo(cx + dx, 46 * sc); g.lineTo(cx + dx, (aa % 10 === 0 ? 36 : 41) * sc); g.stroke();
    if (aa % 10 === 0) { const nm = { 0: 'B', 90: 'Đ', 180: 'N', 270: 'T' }[aa]; g.fillText(nm || String(aa / 10).padStart(2, '0'), cx + dx, 31 * sc); }
  }
  g.restore();
  g.beginPath(); g.moveTo(cx, 48 * sc); g.lineTo(cx - 6 * sc, 58 * sc); g.lineTo(cx + 6 * sc, 58 * sc); g.closePath(); g.fill();
  font(15, '700'); g.textAlign = 'center'; g.fillText(`${Math.round(hd).toString().padStart(3, '0')}°`, cx, 76 * sc);

  font(14, '600'); g.textAlign = 'left';
  const L = [];
  L.push(`G  ${t.n.toFixed(1)}`, `α  ${(t.alpha * D).toFixed(1)}°`);
  L.push(`GA  ${(pl.thr * 100).toFixed(0)}%${t.ab ? '  TĂNG LỰC' : ''}`);
  if (!s.fixedGear) L.push(`CÀNG  ${pl.gear ? (pl.gearPos > 0.98 ? 'ĐÃ HẠ' : 'ĐANG HẠ') : (pl.gearPos < 0.02 ? 'ĐÃ THU' : 'ĐANG THU')}`);
  L.push(`CÁNH TÀ  ${['0', '1', '2'][pl.flap]}`);
  if (!s.fbw) L.push(`TRIM  ${(pl.trim * 100).toFixed(0)}`);
  if (pl.brake > 0) L.push('PHANH');
  L.forEach((l, i) => g.fillText(l, 24 * sc, h - (40 + (L.length - 1 - i) * 21) * sc));

  if (s.guns) {
    g.textAlign = 'right';
    const W = [`PHÁO ${s.guns.ten.split(' ')[0]}  ${P.ammo}`, `TÊN LỬA ${s.mis.ten}  ${P.missiles}`, `MỒI BẪY  ${P.flares}`];
    W.forEach((l, i) => g.fillText(l, w - 24 * sc, h - (40 + (W.length - 1 - i) * 21) * sc));
  }

  const R = 70 * sc, rx = w - R - 22 * sc, ry = R + 95 * sc;
  g.save(); g.fillStyle = 'rgba(0,20,10,0.35)'; g.beginPath(); g.arc(rx, ry, R, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(rx, ry, R / 2, 0, 7); g.globalAlpha = 0.4; g.stroke(); g.globalAlpha = 1;
  const range = 12000;
  for (const o of ctx.others) {
    const dx = o.p[0] - pl.p[0], dz = o.p[2] - pl.p[2];
    const ca = Math.cos(e.hdg), sa = Math.sin(e.hdg);
    const lx = dx * ca + dz * sa, ly = dx * sa - dz * ca;
    const d = Math.hypot(lx, ly); if (d > range) continue;
    g.fillStyle = o.color; g.beginPath(); g.arc(rx + lx / range * R, ry - ly / range * R, (o.kind === 'mis' ? 2.2 : 4) * sc, 0, 7); g.fill();
  }
  g.fillStyle = col; g.beginPath(); g.moveTo(rx, ry - 6 * sc); g.lineTo(rx - 4 * sc, ry + 4 * sc); g.lineTo(rx + 4 * sc, ry + 4 * sc); g.fill();
  g.restore();
  font(12, '500'); g.textAlign = 'right'; g.fillText(ctx.place, w - 22 * sc, ry + R + 20 * sc);

  for (const tg of ctx.targets) {
    if (tg.on) {
      const b = (tg.locked ? 26 : 20) * sc;
      g.strokeStyle = tg.sel ? (tg.locked ? WARN : '#ffd34d') : col;
      g.strokeRect(tg.x - b, tg.y - b, b * 2, b * 2);
      if (tg.locked) { g.beginPath(); g.arc(tg.x, tg.y, b * 1.5, 0, 7); g.stroke(); }
      g.fillStyle = g.strokeStyle; font(12, '600'); g.textAlign = 'center';
      g.fillText(`${tg.name} · ${(tg.d / 1000).toFixed(1)} km`, tg.x, tg.y + b + 15 * sc);
      g.strokeStyle = col; g.fillStyle = col;
    } else if (tg.sel) {
      const a = Math.atan2(tg.y - cy, tg.x - cx), r = Math.min(w, h) * 0.32;
      g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a);
      g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(16 * sc, 0); g.lineTo(-6 * sc, -10 * sc); g.lineTo(-6 * sc, 10 * sc); g.fill(); g.restore();
    }
  }
  if (ctx.pipper) { const [px, py] = ctx.pipper; g.strokeStyle = '#ffd34d'; g.beginPath(); g.arc(px, py, 12 * sc, 0, 7); g.moveTo(px + 2, py); g.arc(px, py, 2, 0, 7); g.stroke(); }
  if (ctx.seeker) { const [sx, sy, lk] = ctx.seeker; g.strokeStyle = lk ? WARN : col; g.beginPath(); g.arc(sx, sy, (lk ? 34 : 50) * sc, 0, 7); g.stroke(); }

  const warns = [];
  if (t.stall) warns.push('THẤT TỐC!');
  if (ctx.pullUp) warns.push('KÉO LÊN! KÉO LÊN!');
  if (ctx.misWarn) warns.push('TÊN LỬA ĐANG BÁM ĐUÔI!');
  if (t.n > (s.fbw ? s.fbw.nMax + 0.5 : (mil ? 9 : 3.8))) warns.push('QUÁ TẢI G');
  if (pl.engHealth < 1) warns.push('ĐỘNG CƠ HƯ HỎNG');
  font(26, '800'); g.textAlign = 'center';
  if (warns.length && (ctx.time * 2.5 % 1) < 0.7) { g.fillStyle = WARN; warns.forEach((m, i) => g.fillText(m, cx, cy + (110 + i * 32) * sc)); }

  font(17, '600'); g.fillStyle = '#ffffff'; g.textAlign = 'center';
  P.msgs.forEach((m, i) => { g.globalAlpha = Math.min(1, m.t); g.fillText(m.s, cx, 112 * sc + i * 24 * sc); });
  g.globalAlpha = 1;
  if (ctx.score) { font(16, '700'); g.textAlign = 'left'; g.fillStyle = col; g.fillText(ctx.score, 24 * sc, 36 * sc); }
  font(12, '500'); g.fillStyle = col; g.textAlign = 'left'; g.fillText(`${P.label} · ${s.ten} · ${ctx.camName}`, 24 * sc, 58 * sc);
  const hp = Math.max(0, P.hp);
  g.strokeRect(24 * sc, 68 * sc, 140 * sc, 8 * sc); g.fillStyle = hp > 50 ? col : WARN; g.fillRect(24 * sc, 68 * sc, 140 * sc * hp / 100, 8 * sc);
  g.restore();
}
