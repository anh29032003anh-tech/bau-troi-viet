import * as THREE from 'three';
import { AIRCRAFT, byId } from './aircraft-data.js';
import { Plane, qrot, qinv, euler } from './physics.js';
import { buildAircraft } from './models.js';
import { Terrain } from './terrain.js';
import { World, TIMES } from './world.js';
import { FX } from './fx.js';
import { Controller, pads, MenuNav, rumble, ACTIONS, loadBinds, saveBinds, keys } from './input.js';
import { drawHUD } from './hud.js';
import { Audio } from './audio.js';

const PLACES = [
  { ten: 'Đà Nẵng – bán đảo Sơn Trà', apt: 'VVDN', lat: 16.045, lon: 108.30, alt: 900, hdg: 280 },
  { ten: 'Hà Nội – Hồ Tây', apt: 'VVNB', lat: 21.115, lon: 105.82, alt: 800, hdg: 170 },
  { ten: 'TP. Hồ Chí Minh – sông Sài Gòn', apt: 'VVTS', lat: 10.80, lon: 106.78, alt: 800, hdg: 245 },
  { ten: 'Vịnh Hạ Long', apt: 'VVVD', lat: 20.83, lon: 107.20, alt: 600, hdg: 300 },
  { ten: 'Sa Pa – đỉnh Fansipan', apt: 'VVDB', lat: 22.39, lon: 103.90, alt: 3700, hdg: 230 },
  { ten: 'Đà Lạt – núi Langbiang', apt: 'VVDL', lat: 11.88, lon: 108.45, alt: 2400, hdg: 355 },
  { ten: 'Huế – sông Hương', apt: 'VVPB', lat: 16.53, lon: 107.66, alt: 700, hdg: 220 },
  { ten: 'Vịnh Cam Ranh', apt: 'VVCR', lat: 11.86, lon: 109.24, alt: 900, hdg: 340 },
  { ten: 'Đèo Hải Vân', apt: 'VVDN', lat: 16.13, lon: 108.22, alt: 1000, hdg: 330 },
  { ten: 'Phú Quốc', apt: 'VVPQ', lat: 10.12, lon: 103.92, alt: 800, hdg: 15 }
];
const APT = {
  VVDN: { ten: 'Sân bay Đà Nẵng', rw: '17L', a: [16.057699, 108.197998], b: [16.030399, 108.202003], w: 45 },
  VVNB: { ten: 'Sân bay Nội Bài', rw: '11R', a: [21.224957, 105.785431], b: [21.214323, 105.82222], w: 45 },
  VVTS: { ten: 'Sân bay Tân Sơn Nhất', rw: '07L', a: [10.815, 106.637001], b: [10.8249, 106.663002], w: 45 },
  VVVD: { ten: 'Sân bay Vân Đồn', rw: '03', a: [21.105801, 107.407997], b: [21.135099, 107.422997], w: 45 },
  VVDB: { ten: 'Sân bay Điện Biên Phủ', rw: '35', a: [21.390131, 103.009331], b: [21.405233, 103.002151], w: 30 },
  VVDL: { ten: 'Sân bay Liên Khương', rw: '09', a: [11.752264, 108.346954], b: [11.753844, 108.376723], w: 45 },
  VVPB: { ten: 'Sân bay Phú Bài', rw: '09', a: [16.4022, 107.69], b: [16.4008, 107.715], w: 40 },
  VVCR: { ten: 'Sân bay Cam Ranh', rw: '02L', a: [11.985069, 109.214798], b: [12.011178, 109.223846], w: 45 },
  VVPQ: { ten: 'Sân bay Phú Quốc', rw: '10L', a: [10.174431, 103.97979], b: [10.171461, 104.009758], w: 45 }
};
const MODES = ['Bay tự do', 'Không chiến với máy', 'Đối kháng 2 người'];
const QUAL = [
  { ten: 'Thấp', pr: 0.75, shadow: 0, radius: 2, seg: 32, imgZ: 14 },
  { ten: 'Vừa', pr: 1, shadow: 1024, radius: 3, seg: 48, imgZ: 14 },
  { ten: 'Cao', pr: Math.min(devicePixelRatio, 1.5), shadow: 2048, radius: 3, seg: 64, imgZ: 15 }
];
const DIFF = [{ ten: 'Dễ', sk: 0.55, mcd: 28, acc: 0.6 }, { ten: 'Vừa', sk: 0.8, mcd: 16, acc: 0.8 }, { ten: 'Khó', sk: 1.0, mcd: 9, acc: 1 }];
const DEVS = [{ ten: 'Tự động (tay cầm 1 + bàn phím)', d: ['pad0', 'kb1', 'kb2'] }, { ten: 'Tay cầm 1', d: ['pad0'] }, { ten: 'Tay cầm 2', d: ['pad1'] }, { ten: 'Bàn phím trái', d: ['kb1'] }, { ten: 'Bàn phím phải', d: ['kb2'] }];
const CAMS = ['Sau đuôi', 'Buồng lái', 'Nhìn xa', 'Bám mục tiêu'];
const MIL = AIRCRAFT.filter(a => a.nhom === 'Quân sự');

const cfg = { start: 0, mode: 0, np: 0, place: 0, time: 1, cloud: 1, a1: 0, d1: 0, a2: 2, d2: 2, diff: 1, q: 1 };
try { Object.assign(cfg, JSON.parse(localStorage.getItem('cfg') || '{}')); } catch (e) { }

const canvas = document.getElementById('gl'), hud = document.getElementById('hud'), hg = hud.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const audio = new Audio();
const nav = new MenuNav();

let W = 0, H = 0;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setPixelRatio(QUAL[cfg.q].pr);
  renderer.setSize(W, H, false);
  hud.width = W * devicePixelRatio; hud.height = H * devicePixelRatio; hg.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
addEventListener('resize', resize); resize();

const pv = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(32, 1, 0.5, 2000), model: null, id: null, ang: 0 };
{
  const s = pv.scene;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 d; void main(){ d=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying vec3 d; void main(){ float h=normalize(d).y; vec3 c=mix(vec3(0.85,0.66,0.5), vec3(0.12,0.3,0.6), smoothstep(-0.1,0.6,h)); c=mix(c, vec3(0.2,0.22,0.25), smoothstep(0.0,-0.3,h)); gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }));
  s.add(sky);
  const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(sky.clone()); s.environment = pm.fromScene(es, 0.03).texture;
  const sun = new THREE.DirectionalLight(0xfff0dd, 3); sun.position.set(-60, 80, 40); s.add(sun);
  s.add(new THREE.HemisphereLight(0xbfd8ff, 0x403830, 0.8));
}
function setPreview(spec) {
  if (pv.id === spec.id) return;
  if (pv.model) pv.scene.remove(pv.model.root);
  pv.model = buildAircraft(spec); pv.id = spec.id; pv.scene.add(pv.model.root);
  pv.dummy = { surf: { e: 0, a: 0, r: 0 }, flapPos: 0, gearPos: 1, eng: 0.4, t: { ab: false } };
}
function renderPreview(dt) {
  const spec = pv.model && byId(pv.id); if (!spec) return;
  pv.ang += dt * 0.25;
  const d = Math.max(spec.L, spec.b) * 2.5;
  pv.cam.aspect = W / H; pv.cam.setViewOffset(W, H, W > 900 ? -W * 0.2 : 0, H * 0.06, W, H); pv.cam.updateProjectionMatrix();
  pv.cam.position.set(Math.sin(pv.ang) * d - d * 0.35, d * 0.28, Math.cos(pv.ang) * d);
  pv.cam.lookAt(0, 0, 0);
  pv.dummy.surf.a = Math.sin(pv.ang * 3) * 0.6; pv.dummy.surf.e = Math.sin(pv.ang * 2) * 0.4; pv.dummy.surf.r = Math.sin(pv.ang * 1.5) * 0.5;
  pv.model.update(pv.dummy, dt);
  renderer.setViewport(0, 0, W, H); renderer.setScissorTest(false);
  renderer.render(pv.scene, pv.cam);
}

const $ = id => document.getElementById(id);
const screens = ['menu', 'loading', 'pause', 'help', 'bind'];
let screen = 'menu', prevScreen = 'menu', focus = 0;
function show(id) { for (const s of screens) $(s).classList.toggle('on', s === id); prevScreen = screen; screen = id; focus = 0; refreshFocus(); }

const planesFor = () => cfg.mode === 0 ? AIRCRAFT : MIL;
function rowsDef() {
  const pl = planesFor();
  cfg.a1 = Math.min(cfg.a1, pl.length - 1); cfg.a2 = Math.min(cfg.a2, pl.length - 1);
  const two = cfg.mode === 2 || cfg.np === 1;
  return [
    { k: 'Chế độ', key: 'mode', opts: MODES },
    { k: 'Số người chơi', key: 'np', opts: ['1 người', '2 người · chia đôi màn hình'], dis: cfg.mode === 2 },
    { k: 'Địa điểm', key: 'place', opts: PLACES.map(p => p.ten) },
    { k: 'Xuất phát', key: 'start', opts: ['Trên không', `Đường băng ${APT[PLACES[cfg.place].apt].rw} · ${APT[PLACES[cfg.place].apt].ten}`], dis: cfg.mode === 2 },
    { k: 'Thời điểm', key: 'time', opts: TIMES.map(t => t.ten) },
    { k: 'Mây', key: 'cloud', opts: ['Trời quang', 'Ít mây', 'Nhiều mây'] },
    { k: 'Người 1 · máy bay', key: 'a1', opts: pl.map(a => a.ten) },
    { k: 'Người 1 · điều khiển', key: 'd1', opts: DEVS.map(d => d.ten) },
    { k: 'Người 2 · máy bay', key: 'a2', opts: pl.map(a => a.ten), dis: !two },
    { k: 'Người 2 · điều khiển', key: 'd2', opts: DEVS.map(d => d.ten), dis: !two },
    { k: 'Độ khó đối thủ', key: 'diff', opts: DIFF.map(d => d.ten), dis: cfg.mode !== 1 },
    { k: 'Đồ hoạ', key: 'q', opts: QUAL.map(q => q.ten) }
  ];
}
function renderRows() {
  if (cfg.mode === 2) cfg.np = 1;
  const R = rowsDef();
  $('rows').innerHTML = R.map((r, i) => `<div class="row nav${r.dis ? ' dis' : ''}" data-i="${i}"><div class="k">${r.k}</div><div class="v"><span class="ar" data-d="-1">‹</span><b>${r.opts[cfg[r.key]]}</b><span class="ar" data-d="1">›</span></div></div>`).join('');
  $('rows').querySelectorAll('.row').forEach(el => {
    el.onclick = e => { const d = +(e.target.dataset.d || 1); change(+el.dataset.i, d); };
  });
  const spec = planesFor()[cfg.a1];
  setPreview(spec);
  const mil = spec.nhom === 'Quân sự';
  $('card').innerHTML = `<div class="tag ${mil ? 'm' : ''}">${spec.nhom} · ${spec.nuoc}</div><h2>${spec.ten}</h2><p>${spec.moTa}</p>
    <table><tr><td>Chiều dài · sải cánh</td><td>${fmt(spec.L)} m · ${fmt(spec.b)} m</td></tr>
    <tr><td>Diện tích cánh</td><td>${fmt(spec.S)} m²</td></tr>
    <tr><td>Khối lượng bay</td><td>${(spec.m / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tấn</td></tr>
    <tr><td>Động cơ</td><td>${spec.thongSoDC}</td></tr>
    <tr><td>Tốc độ tối đa thực tế</td><td>${spec.vMaxThuc}</td></tr>
    <tr><td>Điều khiển</td><td>${spec.fbw ? 'Bay bằng điện (fly-by-wire)' : 'Cơ khí – thủy lực'}</td></tr>
    ${spec.guns ? `<tr><td>Vũ khí</td><td>${spec.guns.ten} · ${spec.mis.so} × ${spec.mis.ten}</td></tr>` : ''}</table>`;
  refreshFocus();
  try { localStorage.setItem('cfg', JSON.stringify(cfg)); } catch (e) { }
}
const fmt = v => v.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
function change(i, d) {
  const r = rowsDef()[i]; if (!r || r.dis) return;
  cfg[r.key] = (cfg[r.key] + d + r.opts.length) % r.opts.length;
  if (r.key === 'mode') { cfg.a1 = 0; cfg.a2 = Math.min(2, planesFor().length - 1); }
  if (r.key === 'q') resize();
  renderRows();
}
function navEls() { if (!screen) return []; return [...$(screen).querySelectorAll('.nav')].filter(e => e.offsetParent !== null); }
function refreshFocus() { const els = navEls(); els.forEach((e, i) => e.classList.toggle('f', i === focus)); }
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act); audio.init(); });
document.addEventListener('mousemove', e => { const n = e.target.closest?.('.nav'); if (n) { const i = navEls().indexOf(n); if (i >= 0 && i !== focus) { focus = i; refreshFocus(); } } });

function act(a) {
  audio.init();
  if (a === 'start') startGame();
  else if (a === 'help') show('help');
  else if (a === 'bind') { bindPad = 0; show('bind'); renderBind(); }
  else if (a === 'close') show(game ? 'pause' : 'menu');
  else if (a === 'resume') { show(null); paused = false; }
  else if (a === 'restart') { const c = { ...cfg }; endGame(); startGame(); }
  else if (a === 'quit') { endGame(); show('menu'); renderRows(); }
  else if (a === 'bindReset') { const gp = pads()[bindPad]; if (gp) { try { localStorage.removeItem('bind:' + gp.id); } catch (e) { } } renderBind(); }
  else if (a?.startsWith('b:')) startCapture(a.slice(2));
}

function menuInput(dt) {
  const n = nav.poll(dt);
  const k = { up: keys.has('ArrowUp'), down: keys.has('ArrowDown'), left: keys.has('ArrowLeft'), right: keys.has('ArrowRight'), ok: keys.has('Enter'), back: keys.has('Escape') };
  for (const x in k) { if (k[x] && !menuInput.prev?.[x]) n[x] = true; }
  menuInput.prev = k;
  if (capture) return;
  const els = navEls(); if (!els.length) return;
  if (n.up) { focus = (focus - 1 + els.length) % els.length; refreshFocus(); }
  if (n.down) { focus = (focus + 1) % els.length; refreshFocus(); }
  const el = els[focus];
  if (el?.classList.contains('row') && el.dataset.i !== undefined && screen === 'menu') {
    if (n.left) change(+el.dataset.i, -1);
    if (n.right) change(+el.dataset.i, 1);
  }
  if (n.ok) { audio.init(); if (el?.dataset.act) act(el.dataset.act); else if (el?.dataset.i !== undefined && screen === 'menu') change(+el.dataset.i, 1); }
  if (n.back && screen !== 'menu') act(screen === 'pause' ? 'resume' : 'close');
  if (n.start && screen === 'menu') act('start');
  if (n.start && screen === 'pause') act('resume');
}

let bindPad = 0, capture = null, bindSeen = false;
function bindText(b) {
  if (!b) return '—';
  if (b.t === 'b') return `Nút ${b.i + 1}`;
  if (b.t === 'bb') return `Nút ${b.n + 1} / ${b.p + 1}`;
  if (b.t === 'h') return `Phím hướng ${{ up: 'lên', dn: 'xuống', left: 'trái', right: 'phải' }[b.d]}`;
  if (b.t === 'a') return `Trục ${b.i}${b.s < 0 ? ' (đảo)' : ''}`;
  return '?';
}
function renderBind() {
  const g0 = pads()[bindPad], gp = g0 && g0.active ? g0 : null;
  bindSeen = !!gp;
  $('bindPad').textContent = gp ? `Tay cầm: ${gp.id}${gp.mapping === 'standard' ? ' · bố trí chuẩn' : ' · bố trí riêng (nên gán lại)'}` : 'Chưa thấy tay cầm. Cắm tay cầm rồi bấm một nút bất kỳ.';
  const b = gp ? loadBinds(gp.id, gp.mapping === 'standard') : {};
  $('bindRows').innerHTML = ACTIONS.map(a => `<div class="row nav" data-act="b:${a.id}"><div class="k">${a.ten}</div><div class="v"><b>${bindText(b[a.id])}</b></div></div>`).join('');
  $('bindWait').textContent = capture ? capture.msg : 'Chọn một dòng rồi bấm/gạt nút muốn gán. Esc để huỷ.';
  refreshFocus();
}
function startCapture(id) {
  const gp = pads()[bindPad]; if (!gp || !gp.active) return;
  const a = ACTIONS.find(x => x.id === id);
  capture = { id, kind: a.kind, rest: [...gp.axes], btn0: gp.buttons.map(b => b.pressed), t: 0, msg: `Đang chờ: ${a.hint}…`, stage: 0, wait: 0.35 };
  renderBind();
}
function pollCapture(dt) {
  if (!capture) return;
  const gp = pads()[bindPad]; if (!gp) { capture = null; return; }
  capture.t += dt; capture.wait -= dt;
  if (keys.has('Escape') || capture.t > 10) { capture = null; renderBind(); return; }
  if (capture.wait > 0) { capture.rest = [...gp.axes]; capture.btn0 = gp.buttons.map(b => b.pressed); return; }
  let res = null;
  gp.buttons.forEach((b, i) => { if (b.pressed && !capture.btn0[i] && !res) res = { t: 'b', i }; });
  if (!res) gp.axes.forEach((v, i) => {
    if (res) return; const r = capture.rest[i];
    if (Math.abs(r) > 1.05) { if (Math.abs(v) <= 1.05) { const s = Math.round((v + 1) / 2 * 7); const d = [0, 1, 7].includes(s) ? 'up' : [3, 4, 5].includes(s) ? 'dn' : [5, 6, 7].includes(s) ? 'left' : 'right'; res = { t: 'h', d }; } return; }
    if (Math.abs(v - r) > 0.6) res = { t: 'a', i, s: Math.sign(v - r), r: Math.abs(r) > 0.6 ? Math.sign(r) : 0 };
  });
  if (!res) return;
  const b = loadBinds(gp.id, gp.mapping === 'standard');
  if (capture.kind === 'axis' && res.t === 'b') {
    if (capture.stage === 0) { capture.pos = res.i; capture.stage = 1; capture.msg = 'Giờ bấm nút cho chiều NGƯỢC LẠI…'; capture.btn0 = gp.buttons.map(x => x.pressed); capture.wait = 0.3; renderBind(); return; }
    res = { t: 'bb', p: capture.pos, n: res.i };
  }
  if (capture.kind === 'axis' && res.t === 'a') res.r = 0;
  b[capture.id] = res; saveBinds(gp.id, b);
  capture = null; renderBind();
}

let game = null, paused = false;
const scene = new THREE.Scene();

function startGame() {
  try { localStorage.setItem('cfg', JSON.stringify(cfg)); } catch (e) { }
  audio.init();
  const place0 = PLACES[cfg.place], q = QUAL[cfg.q];
  const rwy = cfg.start === 1 && cfg.mode !== 2 ? APT[place0.apt] : null;
  const place = rwy ? { ...place0, lat: rwy.a[0], lon: rwy.a[1], ten: `${rwy.ten} · đường băng ${rwy.rw}` } : place0;
  resize();
  while (scene.children.length) scene.remove(scene.children[0]);
  const world = new World(renderer, scene, TIMES[cfg.time], cfg.cloud, q);
  const terrain = new Terrain(scene, place.lat, place.lon, { radius: q.radius, seg: q.seg, imgZ: q.imgZ, aniso: renderer.capabilities.getMaxAnisotropy() });
  const fx = new FX(scene);
  const flat = rwy ? terrain.addRunway(rwy.a, rwy.b, rwy.w) : null;
  game = { flat, place, world, terrain, fx, actors: [], players: [], wave: 0, waveT: 3, time: 0, loading: true, loadT: 0, score: [0, 0] };
  const two = cfg.mode === 2 || cfg.np === 1;
  const pl = planesFor();
  game.players.push(makeActor(pl[cfg.a1], { player: 0, devs: DEVS[cfg.d1].d, label: 'Người 1', color: '#47d7ff' }));
  if (two) game.players.push(makeActor(pl[cfg.a2], { player: 1, devs: DEVS[cfg.d2].d, label: 'Người 2', color: '#ffc94a' }));
  if (two && cfg.d1 === 0) game.players[0].ctrl.devs = ['pad0', 'kb1'];
  if (two && cfg.d2 === 0) game.players[1].ctrl.devs = ['pad1', 'kb2'];
  const h = place.hdg * Math.PI / 180;
  game.players.forEach((P, i) => {
    let x = 0, z = 0, hd = h;
    if (cfg.mode === 2) { const s = i ? 1 : -1; x = -Math.sin(h) * 4000 * s; z = Math.cos(h) * 4000 * s; hd = h + (i ? Math.PI : 0); }
    else if (i) { x = Math.cos(h) * 70 - Math.sin(h) * 60; z = Math.sin(h) * 70 + Math.cos(h) * 60; }
    if (flat) { hd = Math.atan2(flat.ux, -flat.uz); const along = 120 + (i ? 60 : 0), side = i ? 10 : -6; x = flat.A.x + flat.ux * along - flat.uz * side; z = flat.A.z + flat.uz * along + flat.ux * side; }
    P.spawn = { x, z, hd };
    P.phys.place(x, place.alt, z, hd, P.spec.start.V);
  });
  for (const P of game.players) game.terrain.update(game.players.map(p => ({ x: p.phys.p[0], z: p.phys.p[2] })));
  show('loading'); $('ldB').style.width = '0%';
  $('ldT').textContent = `Đang tải bản đồ vệ tinh · ${place.ten}`;
  paused = false;
}

function makeActor(spec, o) {
  const model = buildAircraft(spec, { missilesLeft: () => A.missiles });
  const A = {
    spec, model, phys: new Plane(spec), radius: model.radius, alive: true, hp: 100, ammo: spec.guns?.dan || 0, missiles: spec.mis?.so || 0, flares: spec.flares,
    gunCool: 0, misCool: 0, lockT: 0, sel: null, msgs: [], respawn: 0, kills: 0, deaths: 0, label: o.label || spec.ten, color: o.color || '#ff5a4a',
    isAI: !!o.ai, player: o.player ?? -1, team: o.ai ? 1 : (cfg.mode === 2 ? o.player : 0), soundT: 0, trailT: 0, aiT: 0
  };
  if (o.player >= 0) {
    A.ctrl = new Controller(o.devs); A.devs = o.devs;
    A.cam = new THREE.PerspectiveCamera(65, 1, 0.5, 400000); A.camMode = 0; A.camQ = new THREE.Quaternion(); A.look = { x: 0, y: 0 };
    A.cam.layers.enable(0); A.cam.layers.enable(1); A.cam.layers.enable(2); A.cam.layers.enable(3);
    model.root.traverse(ob => ob.layers.set(1 + o.player));
    A.engS = audio.makeEngine(spec.eng.type);
  }
  if (o.ai) A.ai = o.ai;
  scene.add(model.root);
  game?.actors.push(A);
  if (!game) pending.push(A);
  return A;
}
const pending = [];

function endGame() {
  if (!game) return;
  audio.stopAll(); audio.setTone(null, 0);
  game.fx.clear();
  scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); } });
  while (scene.children.length) scene.remove(scene.children[0]);
  game = null; paused = false;
}

function msg(P, s) { if (P && P.msgs) { P.msgs.unshift({ s, t: 4 }); P.msgs.length = Math.min(P.msgs.length, 4); } }
const ground = (x, z) => game.terrain.ground(x, z);
const toWorld = (A, l) => { const r = qrot(A.phys.q, [l[0], l[1], l[2] - A.spec.model.cg]); return [A.phys.p[0] + r[0], A.phys.p[1] + r[1], A.phys.p[2] + r[2]]; };

function spawnWave() {
  game.wave++;
  const n = Math.min(1 + game.wave, 6), P0 = game.players.find(p => p.alive) || game.players[0];
  const d = DIFF[cfg.diff];
  for (let i = 0; i < n; i++) {
    const spec = MIL[Math.floor(Math.random() * MIL.length)];
    const a = Math.random() * Math.PI * 2, r = 6000 + Math.random() * 3000;
    const x = P0.phys.p[0] + Math.sin(a) * r, z = P0.phys.p[2] - Math.cos(a) * r;
    const gh = ground(x, z).h;
    const A = makeActor(spec, { ai: { ...d }, label: spec.ten, color: '#ff5a4a' });
    A.phys.place(x, Math.max(gh + 900, P0.phys.p[1] + (Math.random() - 0.5) * 800), z, a + Math.PI, spec.start.V);
    A.phys.thr = 0.9;
  }
  for (const P of game.players) msg(P, `Đợt ${game.wave}: ${n} máy bay địch xuất hiện!`);
}

function kill(A, by, how) {
  if (!A.alive) return;
  A.alive = false; A.deaths++;
  game.fx.explosion(A.phys.p, Math.max(1, A.spec.b / 12));
  A.model.root.visible = false;
  for (const P of game.players) { const d = dist(P.phys.p, A.phys.p); audio.boom(d); if (d < 1500) rumble(P.devs?.[0], 0.8, 0.8, 500); }
  if (by && by !== A) {
    by.kills++;
    if (by.player >= 0) { msg(by, `Bắn hạ ${A.spec.ten}!`); if (cfg.mode === 2) game.score[by.player]++; }
  }
  if (A.player >= 0) {
    A.respawn = 5; A.deathMsg = how === 'crash' ? 'MÁY BAY ĐÃ RƠI' : 'BẠN ĐÃ BỊ BẮN HẠ';
    if (A.engS) audio.setEngine(A.engS, 0, false, 0, 0);
  }
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function respawn(P) {
  const other = game.players.find(p => p !== P && p.alive);
  let x, z, y, hd;
  if (other && cfg.mode !== 2) { const e = euler(other.phys.q); hd = e.hdg; x = other.phys.p[0] + Math.cos(hd) * 80; z = other.phys.p[2] + Math.sin(hd) * 80; y = other.phys.p[1]; }
  else { x = P.spawn.x; z = P.spawn.z; hd = P.spawn.hd; y = Math.max(game.place.alt, ground(x, z).h + 800); }
  P.phys.place(x, y, z, hd, P.spec.start.V);
  P.alive = true; P.hp = 100; P.ammo = P.spec.guns?.dan || 0; P.missiles = P.spec.mis?.so || 0; P.flares = P.spec.flares;
  P.model.root.visible = true;
}

const cb = {
  hit(A, dmg, by, p) {
    if (!A.alive || (by && by.team === A.team && cfg.mode !== 2 && by !== A)) return;
    A.hp -= dmg; game.fx.explosion(p, 0.12);
    if (A.hp < 45) A.phys.engHealth = 0.6;
    if (by?.player >= 0) { audio.hit(); rumble(by.devs?.[0], 0.1, 0.3, 40); }
    if (A.player >= 0) rumble(A.devs?.[0], 0.5, 0.5, 120);
    if (A.hp <= 0) kill(A, by, 'shot');
  },
  missileHit(m, A) {
    game.fx.explosion(m.p, 0.7);
    if (m.owner?.team === A.team && cfg.mode !== 2) return;
    A.hp -= 70 + Math.random() * 45;
    if (A.player >= 0) rumble(A.devs?.[0], 1, 1, 400);
    if (A.hp <= 0) kill(A, m.owner, 'shot'); else A.phys.engHealth = 0.5;
  }
};

function enemiesOf(A) { return game.actors.filter(o => o !== A && o.alive && (cfg.mode === 2 ? o.player >= 0 && o.player !== A.player : o.team !== A.team)); }

function aiControl(A, dt) {
  const pl = A.phys, c = pl.ctl, ai = A.ai;
  const foes = enemiesOf(A);
  let T = null, bd = 1e9;
  for (const f of foes) { const d = dist(f.phys.p, pl.p); if (d < bd) { bd = d; T = f; } }
  const sp = Math.hypot(...pl.v);
  let dir;
  if (T) {
    const tl = bd / ((A.spec.guns?.v0 || 800) + sp);
    const lead = [T.phys.p[0] + T.phys.v[0] * tl, T.phys.p[1] + T.phys.v[1] * tl, T.phys.p[2] + T.phys.v[2] * tl];
    dir = [lead[0] - pl.p[0], lead[1] - pl.p[1], lead[2] - pl.p[2]];
  } else dir = qrot(pl.q, [0, 0, -1]).map((x, i) => i === 1 ? 0 : x);
  let dl = Math.hypot(...dir); dir = dir.map(x => x / dl);
  const threat = game.fx.missiles.find(m => m.target === A && dist(m.p, pl.p) < 3500);
  if (threat) {
    const r = [pl.p[0] - threat.p[0], 0, pl.p[2] - threat.p[2]], rl = Math.hypot(...r) || 1;
    dir = [-r[2] / rl, -0.2, r[0] / rl];
    if (A.flares > 0 && Math.random() < dt * 2.5 * ai.sk) { A.flares -= 2; game.fx.dropFlare(pl.p, pl.v); }
  }
  const g = ground(pl.p[0], pl.p[2]).h, agl = pl.p[1] - g, fy = pl.p[1] + pl.v[1] * 7 - ground(pl.p[0] + pl.v[0] * 7, pl.p[2] + pl.v[2] * 7).h;
  if (agl < 600 || fy < 450) { dir = [dir[0] * 0.3, 1, dir[2] * 0.3]; dl = Math.hypot(...dir); dir = dir.map(x => x / dl); }
  const db = qrot(qinv(pl.q), dir);
  const ang = Math.acos(Math.max(-1, Math.min(1, -db[2])));
  const rollErr = Math.atan2(db[0], db[1]);
  c.roll = Math.max(-1, Math.min(1, rollErr * 1.8 * Math.min(1, ang / 0.08))) * ai.sk;
  let pitch = Math.atan2(db[1], -db[2]) * 3;
  if (Math.abs(rollErr) > 1.4 && ang > 0.3) pitch = Math.min(pitch, 0.15);
  pitch = Math.max(-0.4, Math.min(pl.s.fbw ? 1 : 0.7, pitch));
  if (pl.t.ias < 120) pitch = Math.min(pitch, 0.35);
  c.pitch = pitch * (0.6 + 0.4 * ai.sk);
  c.yaw = Math.max(-1, Math.min(1, db[0] * 3)) * 0.4;
  pl.thr = bd > 1800 ? 1 : 0.88;
  A.wantGun = T && ang < 0.04 / ai.acc && bd < 1100;
  A.target = T;
  if (T && A.missiles > 0 && bd > 900 && bd < 5500 && ang < 0.2) { A.lockT += dt; } else A.lockT = 0;
  A.misCool -= dt;
  if (A.lockT > 1.6 && A.misCool <= 0 && A.missiles > 0) { fireMissile(A, T); A.misCool = ai.mcd * (0.7 + Math.random() * 0.6); }
}

function fireMissile(A, T) {
  A.missiles--;
  const hp = A.spec.model.hard?.[A.missiles] || [0, -0.8, A.spec.model.cg];
  const p = toWorld(A, hp), dn = qrot(A.phys.q, [0, -6, 0]);
  game.fx.fireMissile(A, p, [A.phys.v[0] + dn[0], A.phys.v[1] + dn[1], A.phys.v[2] + dn[2]], A.phys.q, T);
  if (A.player >= 0 || (T && T.player >= 0)) audio.launch();
  if (T?.player >= 0) msg(T, 'CẢNH BÁO: địch phóng tên lửa!');
}

function weapons(A, dt, st) {
  if (!A.spec.guns) return;
  const pl = A.phys, wantGun = A.isAI ? A.wantGun : st.held.gun;
  A.gunCool -= dt;
  if (wantGun && A.ammo > 0) {
    const g = A.spec.guns, f = qrot(pl.q, [0, 0, -1]);
    let fired = 0;
    while (A.gunCool <= 0 && A.ammo > 0) {
      A.gunCool += 60 / g.rpm; A.ammo--; fired++;
      const sp = 0.004 + (A.isAI ? 0.006 / A.ai.acc : 0);
      const d = qrot(pl.q, [(Math.random() - .5) * sp, (Math.random() - .5) * sp + 0.01, -1]);
      const mz = toWorld(A, [0.9, 0.3, A.spec.L * 0.25]);
      game.fx.fireBullet(A, mz, [pl.v[0] + d[0] * g.v0, pl.v[1] + d[1] * g.v0, pl.v[2] + d[2] * g.v0], g.dmg);
    }
    A.soundT -= dt;
    if (fired && A.soundT <= 0 && (A.player >= 0 || game.players.some(P => dist(P.phys.p, pl.p) < 2000))) { audio.gun(parseInt(g.ten.match(/(\d+) mm/)?.[1] || 20)); A.soundT = 0.06; if (A.player >= 0) rumble(A.devs?.[0], 0.25, 0.6, 70); }
  } else A.gunCool = Math.max(A.gunCool, 0);
  if (A.isAI) return;
  const foes = enemiesOf(A);
  if (st.pressed.target && foes.length) { const i = foes.indexOf(A.sel); A.sel = foes[(i + 1) % foes.length]; A.lockT = 0; }
  if (!A.sel || !A.sel.alive) {
    let best = null, bs = -1;
    const f = qrot(pl.q, [0, 0, -1]);
    for (const o of foes) { const d = o.phys.p.map((x, i) => x - pl.p[i]), dl = Math.hypot(...d), c = (d[0] * f[0] + d[1] * f[1] + d[2] * f[2]) / dl; const sc = c - dl / 20000; if (sc > bs) { bs = sc; best = o; } }
    A.sel = best; A.lockT = 0;
  }
  A.locked = false;
  if (A.sel && A.missiles > 0) {
    const f = qrot(pl.q, [0, 0, -1]), d = A.sel.phys.p.map((x, i) => x - pl.p[i]), dl = Math.hypot(...d), c = (d[0] * f[0] + d[1] * f[1] + d[2] * f[2]) / dl;
    if (c > 0.976 && dl < 7000 && dl > 300) { A.lockT += dt; A.locked = A.lockT > 1.1; } else A.lockT = Math.max(0, A.lockT - dt * 2);
  }
  A.misCool -= dt;
  if (st.pressed.missile && A.missiles > 0 && A.misCool <= 0) { fireMissile(A, A.locked ? A.sel : null); A.misCool = 0.6; msg(A, A.locked ? `Phóng ${A.spec.mis.ten}!` : 'Phóng tên lửa khi chưa khoá mục tiêu'); }
  if (st.pressed.flare && A.flares > 0) { A.flares -= 2; game.fx.dropFlare(pl.p, pl.v); }
}

function playerControl(P, dt) {
  const st = P.ctrl.poll(dt), pl = P.phys;
  if (st.pressed.pause) { paused = true; show('pause'); }
  if (!P.alive) return st;
  pl.ctl.roll = st.roll; pl.ctl.pitch = st.pitch; pl.ctl.yaw = st.yaw;
  const dth = (st.thrUp - st.thrDn) * dt * 0.55;
  pl.thr = Math.max(0, Math.min(1, pl.thr + dth));
  pl.brake = st.held.brake || (pl.onGround && st.thrDn > 0.3 && pl.thr <= 0.01) ? 1 : 0;
  if (st.pressed.gear && !P.spec.fixedGear && !pl.onGround) { pl.gear = !pl.gear; msg(P, pl.gear ? 'Hạ càng' : 'Thu càng'); }
  if (st.pressed.flaps) { pl.flap = (pl.flap + 1) % 3; msg(P, `Cánh tà nấc ${pl.flap}`); }
  if (!P.spec.fbw) { if (st.held.trimUp) pl.trim = Math.min(0.6, pl.trim + dt * 0.08); if (st.held.trimDn) pl.trim = Math.max(-0.6, pl.trim - dt * 0.08); }
  if (st.pressed.camera) { P.camMode = (P.camMode + 1) % CAMS.length; }
  return st;
}

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _u = new THREE.Vector3();
function updateCamera(P, dt, st) {
  const pl = P.phys, cam = P.cam, spec = P.spec;
  const q = _q.set(...pl.q);
  const lx = st?.lookX || 0, ly = st?.lookY || 0;
  P.look.x += ((lx * Math.PI * 0.9) - P.look.x) * Math.min(1, dt * 6);
  P.look.y += ((ly * Math.PI * 0.4) - P.look.y) * Math.min(1, dt * 6);
  const pos = _v.set(...pl.p);
  P.camQ.slerp(q, 1 - Math.exp(-dt * (P.camMode === 0 ? 4.5 : 8)));
  if (!P.alive) { cam.position.lerp(_u.copy(pos).add(new THREE.Vector3(60, 40, 60)), dt); cam.lookAt(pos); return; }
  for (let i = 1; i <= 2; i++) cam.layers.enable(i);
  if (P.camMode === 1) {
    cam.layers.disable(1 + P.player);
    const c = spec.model.cockpit, w = toWorld(P, c);
    cam.position.set(...w);
    _e.set(P.look.y, -P.look.x, 0, 'YXZ');
    cam.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(_e));
    if (pl.buffet > 0) cam.position.add(new THREE.Vector3((Math.random() - .5), (Math.random() - .5), 0).multiplyScalar(pl.buffet * 0.04));
  } else if (P.camMode === 2) {
    const d = spec.L * 4 + 40;
    const off = new THREE.Vector3(Math.sin(P.look.x + 2.3) * d, d * 0.35 + P.look.y * d, Math.cos(P.look.x + 2.3) * d);
    cam.position.copy(pos).add(off); cam.up.set(0, 1, 0); cam.lookAt(pos);
  } else if (P.camMode === 3 && P.sel?.alive) {
    const t = new THREE.Vector3(...P.sel.phys.p), d = spec.L * 1.8 + 12;
    const back = pos.clone().sub(t).normalize();
    cam.position.copy(pos).addScaledVector(back, d).add(new THREE.Vector3(0, spec.L * 0.35 + 3, 0));
    cam.up.set(0, 1, 0); cam.lookAt(t);
  } else {
    const d = spec.L * 1.35 + 9, hgt = spec.L * 0.22 + 2.5;
    _e.set(-P.look.y * 0.8, -P.look.x, 0, 'YXZ');
    const off = new THREE.Vector3(0, hgt, d).applyEuler(_e).applyQuaternion(P.camQ);
    cam.position.copy(pos).add(off);
    cam.up.set(0, 1, 0).applyQuaternion(P.camQ);
    const tgt = new THREE.Vector3(0, hgt * 0.4, -spec.L * 0.6).applyQuaternion(P.camQ).add(pos);
    cam.lookAt(tgt);
    if (pl.buffet > 0) cam.position.add(new THREE.Vector3((Math.random() - .5), (Math.random() - .5), 0).multiplyScalar(pl.buffet * 0.25));
  }
  const g = ground(cam.position.x, cam.position.z);
  const minY = (g.water ? 0 : g.h) + 1.5; if (cam.position.y < minY) cam.position.y = minY;
}

function visuals(A, dt) {
  const pl = A.phys, r = A.model.root;
  r.position.set(...pl.p); r.quaternion.set(...pl.q);
  A.model.update(pl, dt);
  A.trailT -= dt; if (A.trailT > 0) return; A.trailT = 0.03;
  const fx = game.fx, s = A.spec, md = s.model;
  if (A.hp < 55) fx.trail(toWorld(A, [0, 0, s.L * 0.9]), pl.v, 'smoke', A.hp < 30 ? 1.6 : 0.8);
  if (A.hp < 30) fx.trail(toWorld(A, [0, 0, s.L * 0.85]), pl.v, 'fire');
  const tipZ = md.wing.z + md.wing.sweep + md.wing.tip;
  if ((pl.t.n > 4.5 && pl.t.V > 120) || (Math.abs(pl.t.alpha) > 0.18 && pl.t.V > 70 && s.nhom !== 'Quân sự')) {
    for (const sx of [1, -1]) fx.trail(toWorld(A, [sx * (md.wing.semi + (md.wing.x0 || 0)), md.wing.y, tipZ]), pl.v, 'vapor', Math.min(1, (pl.t.n - 3) / 4));
  }
  if (pl.p[1] > 8500 && s.eng.type === 'jet') {
    for (const e of md.pods || []) fx.trail(toWorld(A, [e.x, e.y, e.z + e.len + 6]), pl.v, 'contrail');
    for (const e of md.nozzle || []) fx.trail(toWorld(A, [e.x, e.y, e.z + 4]), pl.v, 'contrail');
    for (const e of md.nac || []) if (e.nozzle) for (const sx of [1, -1]) fx.trail(toWorld(A, [e.x * sx, e.sec[e.sec.length - 1][3], e.sec[e.sec.length - 1][0] + 4]), pl.v, 'contrail');
  }
  if (pl.onGround && pl.t.V > 15) fx.trail([pl.p[0], pl.p[1] - s.gearH, pl.p[2]], pl.v, 'dust');
}

function project(cam, p, vp) {
  _v.set(...p).project(cam);
  const on = _v.z < 1 && Math.abs(_v.x) < 1 && Math.abs(_v.y) < 1;
  let x = (_v.x + 1) / 2 * vp.w, y = (1 - _v.y) / 2 * vp.h;
  if (_v.z > 1) { x = vp.w - x; y = vp.h - y; }
  return { x, y, on };
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const P0 = pads()[0];
  const pe = $('pad');
  if (screen === 'menu') { const ok = P0 && P0.active; pe.textContent = ok ? `Tay cầm: ${P0.id.slice(0, 48)}` : 'Bấm một nút hoặc gạt cần trên tay cầm để game nhận'; pe.classList.toggle('ok', !!ok); }
  if (screen && screen !== 'loading') { menuInput(dt); pollCapture(dt); if (screen === 'bind' && !capture && bindSeen !== !!pads()[bindPad]?.active) renderBind(); }
  if (!game) { hg.clearRect(0, 0, W, H); renderPreview(dt); return; }
  if (game.loading) { loadingStep(dt); renderGame(dt); return; }
  if (!paused) {
    const steps = Math.ceil(dt / (1 / 120)), h = dt / steps;
    const sts = game.players.map(P => playerControl(P, dt));
    game.lastSt = sts;
    game.time += dt;
    for (const A of game.actors) if (A.isAI && A.alive) aiControl(A, dt);
    for (let i = 0; i < steps; i++) for (const A of game.actors) if (A.alive) {
      A.phys.step(h, ground);
      if (A.phys.crashed) { kill(A, null, 'crash'); if (A.player < 0) { } else msg(A, 'Máy bay đã đâm xuống!'); break; }
    }
    game.players.forEach((P, i) => { if (P.alive) weapons(P, dt, sts[i]); else { P.respawn -= dt; if (P.respawn <= 0) respawn(P); } });
    for (const A of game.actors) if (A.isAI && A.alive) weapons(A, dt, null);
    game.fx.update(dt, game.actors, ground, cb);
    for (const A of game.actors) if (A.alive) visuals(A, dt);
    for (let i = game.actors.length - 1; i >= 0; i--) { const A = game.actors[i]; if (!A.alive && A.player < 0) { scene.remove(A.model.root); game.actors.splice(i, 1); } }
    if (cfg.mode === 1 && !game.actors.some(a => a.isAI) && game.players.every(p => !p.alive || (p.phys.t.agl ?? 0) > 300)) { game.waveT -= dt; if (game.waveT <= 0) { spawnWave(); game.waveT = 5; } }
    for (const P of game.players) { P.msgs.forEach(m => m.t -= dt); P.msgs = P.msgs.filter(m => m.t > 0); }
    sounds(dt);
    game.terrainT = (game.terrainT || 0) - dt;
    if (game.terrainT <= 0) { game.terrain.update(game.players.map(p => ({ x: p.phys.p[0], z: p.phys.p[2] }))); game.terrainT = 0.5; }
  }
  game.players.forEach((P, i) => updateCamera(P, dt, game.lastSt?.[i]));
  renderGame(dt);
}

function sounds(dt) {
  let mode = null;
  for (const P of game.players) {
    const pl = P.phys;
    if (P.engS) audio.setEngine(P.engS, P.alive ? pl.eng : 0, pl.t.ab, P.alive ? pl.t.V : 0, game.players.length > 1 ? 0.6 : 1);
    if (!P.alive) continue;
    if (game.fx.missiles.some(m => m.target === P)) mode = 'warn';
    else if (pl.t.stall) mode = 'stall';
    else if (P.locked) mode = mode || 'lock';
    else if (P.lockT > 0) mode = mode || 'seek';
  }
  audio.setTone(mode, game.time);
}

function loadingStep(dt) {
  game.loadT += dt;
  game.terrain.update(game.players.map(p => ({ x: p.phys.p[0], z: p.phys.p[2] })));
  const r = Math.min(...game.players.map(P => game.terrain.readyAround({ x: P.phys.p[0], z: P.phys.p[2] })));
  $('ldB').style.width = `${(r * 100).toFixed(0)}%`;
  $('ldS').textContent = game.loadT > 12 && r < 0.2 ? 'Mạng chậm hoặc không có Internet · game cần mạng để tải bản đồ thật' : 'Địa hình thật từ dữ liệu độ cao toàn cầu, ảnh vệ tinh độ phân giải cao';
  game.players.forEach(P => { P.model.root.position.set(...P.phys.p); P.model.root.quaternion.set(...P.phys.q); updateCamera(P, 0.016, null); });
  if (r >= 1 || game.loadT > 30) {
    game.loading = false;
    const shift = game.flat ? game.terrain.snapRunway(game.flat) : 0;
    for (const P of game.players) {
      if (game.flat) {
        P.spawn.x -= game.flat.uz * shift; P.spawn.z += game.flat.ux * shift;
        P.phys.placeGround(P.spawn.x, ground(P.spawn.x, P.spawn.z).h + P.spec.gearH, P.spawn.z, P.spawn.hd);
        P.camQ.set(...P.phys.q);
        msg(P, `${game.place.ten} · ${P.spec.ten}`);
        msg(P, `Tăng ga hết cỡ, tới ${(P.phys.vRotate() * 3.6).toFixed(0)} km/h thì kéo cần ngóc mũi, bay lên rồi thu càng`);
        continue;
      }
      const g = ground(P.phys.p[0], P.phys.p[2]).h;
      let y = Math.max(game.place.alt, g + 700);
      for (let k = 1; k <= 3; k++) { const f = qrot(P.phys.q, [0, 0, -1]); y = Math.max(y, ground(P.phys.p[0] + f[0] * 2500 * k, P.phys.p[2] + f[2] * 2500 * k).h + 600); }
      P.phys.place(P.phys.p[0], y, P.phys.p[2], P.spawn.hd, P.spec.start.V);
      P.camQ.set(...P.phys.q);
      msg(P, `${game.place.ten} · ${P.spec.ten}`);
      if (cfg.mode === 1) msg(P, 'Chuẩn bị: máy bay địch sắp xuất hiện');
      if (cfg.mode === 2) msg(P, 'Đối kháng: bắn hạ đối thủ!');
    }
    show(null);
  }
}

function renderGame(dt) {
  const n = game.players.length;
  const focusPts = game.players.map(P => P.cam.position.clone());
  game.world.update(dt, null, focusPts.length ? [new THREE.Vector3(...game.players[0].phys.p), ...game.players.slice(1).map(P => new THREE.Vector3(...P.phys.p))] : focusPts);
  hg.clearRect(0, 0, W, H);
  renderer.setScissorTest(n > 1);
  game.players.forEach((P, i) => {
    const vp = n > 1 ? { x: i * W / 2, y: 0, w: W / 2, h: H } : { x: 0, y: 0, w: W, h: H };
    P.cam.aspect = vp.w / vp.h; P.cam.fov = n > 1 ? 58 : 62; P.cam.updateProjectionMatrix();
    game.world.beforeRender(P.cam);
    game.fx.setScale(vp.h * Math.min(devicePixelRatio, 1.5), P.cam.fov);
    renderer.setViewport(vp.x, 0, vp.w, vp.h); renderer.setScissor(vp.x, 0, vp.w, vp.h);
    renderer.render(scene, P.cam);
    if (!game.loading) drawHUD(hg, vp, P, hudCtx(P, vp));
  });
  if (n > 1) { hg.fillStyle = 'rgba(0,0,0,0.7)'; hg.fillRect(W / 2 - 1.5, 0, 3, H); }
}

function hudCtx(P, vp) {
  const pl = P.phys, cam = P.cam, e = euler(pl.q);
  const vel = pl.p.map((x, i) => x + pl.v[i] * 10);
  const fp = project(cam, vel, vp), bore = project(cam, toWorld(P, [0, 0, -2000]), vp);
  const others = [];
  for (const A of game.actors) if (A !== P && A.alive) others.push({ p: A.phys.p, color: A.player >= 0 ? (cfg.mode === 2 ? '#ff5a4a' : '#47d7ff') : '#ff5a4a' });
  for (const m of game.fx.missiles) others.push({ p: m.p, color: '#ffffff', kind: 'mis' });
  const targets = [];
  let pipper = null, seeker = null;
  const foes = enemiesOf(P);
  for (const A of foes) {
    const s = project(cam, A.phys.p, vp), d = dist(A.phys.p, pl.p);
    targets.push({ ...s, d, name: A.player >= 0 ? A.label : A.spec.ten.split(' ').slice(-1)[0], sel: A === P.sel, locked: A === P.sel && P.locked });
  }
  if (P.sel && P.spec.guns) {
    const d = dist(P.sel.phys.p, pl.p);
    if (d < 1600) {
      const tf = d / (P.spec.guns.v0 + pl.t.V);
      const lead = P.sel.phys.p.map((x, i) => x + (P.sel.phys.v[i] - pl.v[i]) * tf * 0 + P.sel.phys.v[i] * tf - pl.v[i] * tf);
      lead[1] += 0.5 * 9.81 * tf * tf;
      const rel = lead.map((x, i) => x - pl.p[i]);
      const aim = [pl.p[0] + rel[0], pl.p[1] + rel[1], pl.p[2] + rel[2]];
      const pr = project(cam, aim, vp); if (pr.on) pipper = [pr.x, pr.y];
    }
    if (P.lockT > 0 && P.missiles > 0) { const s = project(cam, P.sel.phys.p, vp); if (s.on) seeker = [s.x, s.y, P.locked]; }
  }
  const gh = ground(pl.p[0], pl.p[2]);
  const fy = pl.p[1] + pl.v[1] * 8 - Math.max(ground(pl.p[0] + pl.v[0] * 8, pl.p[2] + pl.v[2] * 8).h, gh.h);
  const pullUp = !pl.onGround && pl.v[1] < -8 && fy < 120 && !(pl.gearPos > 0.9 && pl.v[1] > -12 && (pl.t.agl ?? 0) < 200);
  const ll = game.terrain.toLatLon(pl.p[0], pl.p[2]);
  let score = '';
  if (cfg.mode === 1) score = `Đợt ${game.wave} · Hạ ${P.kills} · Rơi ${P.deaths}`;
  if (cfg.mode === 2) score = `Tỉ số  ${game.score[0]} : ${game.score[1]}`;
  return {
    euler: e, fov: cam.fov, fpm: fp.on ? [fp.x, fp.y] : null, bore: P.camMode === 1 && bore.on ? [bore.x, bore.y] : null, others, targets, pipper, seeker,
    misWarn: game.fx.missiles.some(m => m.target === P), pullUp, time: game.time, score,
    place: `${ll.lat.toFixed(4)}° B  ${ll.lon.toFixed(4)}° Đ`, camName: CAMS[P.camMode]
  };
}

renderRows();
show('menu');
requestAnimationFrame(frame);
window.__game = () => game;
