import * as THREE from 'three';
import { buildMissile } from './models.js';
import { atmos } from './physics.js';

const PV = `attribute float size; attribute vec4 col; varying vec4 vC; uniform float scale;
  #include <common>
  #include <fog_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  void main(){ vC = col; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_PointSize = min(size * scale / -mvPosition.z, 900.0); gl_Position = projectionMatrix * mvPosition;
  #include <logdepthbuf_vertex>
  #include <fog_vertex>
  }`;
const PF = `varying vec4 vC; uniform sampler2D map;
  #include <common>
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  void main(){
  #include <logdepthbuf_fragment>
  vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a); if(gl_FragColor.a < 0.01) discard;
  #include <fog_fragment>
  }`;

function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 64 + (Math.random() - .5) * 40, y = 64 + (Math.random() - .5) * 40, r = 22 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); return t;
}

class Particles {
  constructor(scene, n, additive, tex) {
    this.n = n; this.i = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.sz = new Float32Array(n); this.c = new Float32Array(n * 4);
    this.life = new Float32Array(n); this.max = new Float32Array(n); this.grow = new Float32Array(n); this.a0 = new Float32Array(n); this.drag = new Float32Array(n); this.rgb0 = new Float32Array(n * 3); this.rgb1 = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.sz, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('col', new THREE.BufferAttribute(this.c, 4).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { scale: { value: 500 }, map: { value: tex } }]),
      vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false, fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 3 : 2;
    scene.add(this.pts); this.geo = g;
  }
  emit(p, v, size, grow, life, rgb0, rgb1, a0, drag = 0.5) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.p.set(p, i * 3); this.v.set(v, i * 3); this.sz[i] = size; this.grow[i] = grow; this.life[i] = life; this.max[i] = life; this.a0[i] = a0; this.drag[i] = drag;
    this.rgb0.set(rgb0, i * 3); this.rgb1.set(rgb1, i * 3);
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.c[i * 4 + 3] = 0; continue; }
      this.life[i] -= dt;
      const t = 1 - this.life[i] / this.max[i], k = Math.max(0, 1 - this.drag[i] * dt);
      for (let j = 0; j < 3; j++) { this.v[i * 3 + j] *= k; this.p[i * 3 + j] += this.v[i * 3 + j] * dt; }
      this.v[i * 3 + 1] += 1.5 * dt * (this.drag[i] > 0.3 ? 1 : 0);
      this.sz[i] += this.grow[i] * dt;
      for (let j = 0; j < 3; j++) this.c[i * 4 + j] = this.rgb0[i * 3 + j] * (1 - t) + this.rgb1[i * 3 + j] * t;
      this.c[i * 4 + 3] = this.a0[i] * (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.size.needsUpdate = true; this.geo.attributes.col.needsUpdate = true;
  }
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    const tex = puffTex();
    this.smoke = new Particles(scene, 3500, false, tex);
    this.fire = new Particles(scene, 1800, true, tex);
    this.bullets = [];
    const bg = new THREE.BoxGeometry(0.12, 0.12, 1); bg.translate(0, 0, -0.5);
    this.tracer = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false }), 1500);
    this.tracer.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.tracer.frustumCulled = false; this.tracer.count = 0;
    scene.add(this.tracer);
    this.missiles = []; this.flares = [];
    this.flareMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0, toneMapped: false }), 400);
    this.flareMesh.frustumCulled = false; this.flareMesh.count = 0; scene.add(this.flareMesh);
    this.flashes = [];
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(1, 1, 1);
  }
  setScale(h, fov) { const s = h / (2 * Math.tan(fov * Math.PI / 360)); this.smoke.mat.uniforms.scale.value = s; this.fire.mat.uniforms.scale.value = s; }

  explosion(p, big = 1) {
    for (let i = 0; i < 40 * big; i++) {
      const d = [Math.random() - .5, Math.random() - .5, Math.random() - .5], sp = (10 + Math.random() * 45) * big;
      this.fire.emit(p, d.map(x => x * sp), 8 * big + Math.random() * 10, 22 * big, 0.6 + Math.random() * 0.8, [1, 0.85, 0.5], [0.9, 0.25, 0.05], 1, 1.6);
    }
    for (let i = 0; i < 30 * big; i++) {
      const d = [Math.random() - .5, Math.random() * 0.6, Math.random() - .5], sp = (5 + Math.random() * 25) * big;
      this.smoke.emit(p, d.map(x => x * sp), 12 * big, 14 * big, 4 + Math.random() * 5, [0.25, 0.22, 0.2], [0.45, 0.44, 0.43], 0.75, 0.8);
    }
  }
  impact(p, water) {
    for (let i = 0; i < 4; i++) this.smoke.emit(p, [(Math.random() - .5) * 6, 4 + Math.random() * 6, (Math.random() - .5) * 6], 3, 8, 1.4, water ? [0.9, 0.95, 1] : [0.55, 0.48, 0.38], water ? [0.8, 0.85, 0.9] : [0.6, 0.55, 0.48], 0.6, 1.5);
  }
  trail(p, v, kind, k = 1) {
    if (kind === 'smoke') this.smoke.emit(p, [v[0] * 0.05, v[1] * 0.05, v[2] * 0.05], 2.5, 6 * k, 3.5, [0.12, 0.12, 0.12], [0.35, 0.35, 0.36], 0.55 * k);
    else if (kind === 'fire') this.fire.emit(p, [0, 0, 0], 2.5, 3, 0.3, [1, 0.7, 0.3], [0.9, 0.2, 0], 0.9);
    else if (kind === 'missile') { this.smoke.emit(p, [0, 0, 0], 1.0, 3.5, 3.5, [0.92, 0.92, 0.92], [0.75, 0.76, 0.78], 0.6, 0.2); this.fire.emit(p, [0, 0, 0], 1.6, 0, 0.06, [1, 0.8, 0.5], [1, 0.5, 0.2], 1, 0); }
    else if (kind === 'vapor') this.smoke.emit(p, [0, 0, 0], 0.6, 1.5, 0.4, [1, 1, 1], [1, 1, 1], 0.25 * k, 0);
    else if (kind === 'contrail') this.smoke.emit(p, [0, 0, 0], 1.6, 3, 12, [1, 1, 1], [0.95, 0.96, 1], 0.45, 0);
    else if (kind === 'dust') this.smoke.emit(p, [(Math.random() - .5) * 4, 1 + Math.random() * 2, (Math.random() - .5) * 4], 2, 5, 2, [0.75, 0.7, 0.6], [0.7, 0.68, 0.62], 0.4, 1);
  }

  fireBullet(owner, p, v, dmg) { this.bullets.push({ owner, p: [...p], v: [...v], life: 3.2, dmg }); }

  fireMissile(owner, p, v, q, target) {
    const mesh = buildMissile(); mesh.position.set(...p); mesh.quaternion.set(...q); this.scene.add(mesh);
    this.missiles.push({ owner, p: [...p], v: [...v], target, life: 22, burn: 5.5, mesh, armed: 0.6, decoy: null });
  }
  dropFlare(p, v) { for (let i = 0; i < 2; i++) this.flares.push({ p: [...p], v: [v[0] * 0.8 + (Math.random() - .5) * 30, v[1] * 0.8 - 10 - Math.random() * 10, v[2] * 0.8 + (Math.random() - .5) * 30], life: 3.5 }); }

  update(dt, planes, ground, cb) {
    this.smoke.update(dt); this.fire.update(dt);
    let n = 0;
    const v3 = this.v, m4 = this.m4, q = this.q, s = this.s;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt; const p0 = [...b.p];
      const kd = Math.max(0, 1 - 0.18 * dt);
      b.v[0] *= kd; b.v[1] = b.v[1] * kd - 9.81 * dt; b.v[2] *= kd;
      b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; b.p[2] += b.v[2] * dt;
      let dead = b.life <= 0;
      if (!dead) for (const pl of planes) {
        if (pl === b.owner || !pl.alive) continue;
        if (segHit(p0, b.p, pl.phys.p, pl.radius)) { cb.hit(pl, b.dmg, b.owner, b.p); dead = true; break; }
      }
      if (!dead) { const g = ground(b.p[0], b.p[2]); if (b.p[1] < (g.water ? 0 : g.h)) { this.impact(b.p, g.water); dead = true; } }
      if (dead) { this.bullets.splice(i, 1); continue; }
      if (n < 1500) {
        const sp = Math.hypot(...b.v); v3.set(b.v[0] / sp, b.v[1] / sp, b.v[2] / sp);
        q.setFromUnitVectors(new THREE.Vector3(0, 0, -1), v3);
        s.set(1, 1, Math.min(14, sp * 0.012));
        m4.compose(new THREE.Vector3(...b.p), q, s); this.tracer.setMatrixAt(n++, m4);
      }
    }
    this.tracer.count = n; this.tracer.instanceMatrix.needsUpdate = true;

    let fn = 0;
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i]; f.life -= dt;
      f.v[1] -= 9.81 * dt; const k = Math.max(0, 1 - 1.2 * dt); f.v[0] *= k; f.v[1] *= k; f.v[2] *= k;
      f.p[0] += f.v[0] * dt; f.p[1] += f.v[1] * dt; f.p[2] += f.v[2] * dt;
      if (f.life <= 0) { this.flares.splice(i, 1); continue; }
      this.fire.emit(f.p, [0, 0, 0], 3, 2, 0.25, [1, 0.95, 0.75], [1, 0.6, 0.2], 1, 0);
      if (Math.random() < 0.5) this.smoke.emit(f.p, [0, 0, 0], 1.5, 4, 3, [0.9, 0.9, 0.9], [0.8, 0.8, 0.8], 0.45, 0);
      m4.makeTranslation(...f.p); this.flareMesh.setMatrixAt(fn++, m4);
    }
    this.flareMesh.count = fn; this.flareMesh.instanceMatrix.needsUpdate = true;

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt; m.armed -= dt;
      const sp = Math.hypot(...m.v), at = atmos(m.p[1]);
      const fwd = m.v.map(x => x / sp);
      const thrust = m.burn > 0 ? 220 : 0; m.burn -= dt;
      const drag = 0.5 * at.rho * sp * sp * 0.012 / 90;
      let acc = fwd.map(x => x * (thrust - drag));
      acc[1] -= 9.81;
      let tgt = null;
      if (m.decoy && m.decoy.life > 0) tgt = m.decoy.p;
      else if (m.target && m.target.alive) {
        tgt = m.target.phys.p;
        for (const f of this.flares) {
          if (f.tried?.has(m)) continue;
          (f.tried ||= new Set()).add(m);
          const d = [f.p[0] - m.p[0], f.p[1] - m.p[1], f.p[2] - m.p[2]], dl = Math.hypot(...d);
          if (dl < 3000 && (d[0] * fwd[0] + d[1] * fwd[1] + d[2] * fwd[2]) / dl > 0.85 && Math.random() < 0.3) { m.decoy = f; break; }
        }
      }
      if (tgt && m.armed < 0.3) {
        const tv = m.decoy ? m.decoy.v : m.target.phys.v;
        const r = [tgt[0] - m.p[0], tgt[1] - m.p[1], tgt[2] - m.p[2]], rl = Math.hypot(...r);
        const vr = [tv[0] - m.v[0], tv[1] - m.v[1], tv[2] - m.v[2]];
        const cos = (r[0] * fwd[0] + r[1] * fwd[1] + r[2] * fwd[2]) / rl;
        if (cos > 0.2) {
          const om = cross(r, vr).map(x => x / (rl * rl));
          let a = cross(om, m.v).map(x => x * 4);
          a = cross(fwd, cross(a, fwd));
          const al = Math.hypot(...a), lim = 40 * 9.81 * Math.min(1, at.rho / 0.5 + 0.3);
          if (al > lim) a = a.map(x => x * lim / al);
          acc = acc.map((x, k) => x + a[k] + (k === 1 ? 9.81 * 0.9 : 0));
        } else m.target = null;
        if (!m.decoy && m.target && rl < 14) { cb.missileHit(m, m.target); this.killMissile(i); continue; }
        if (m.decoy && rl < 10) { this.explosion(m.p, 0.4); this.killMissile(i); continue; }
      }
      for (let k = 0; k < 3; k++) { m.v[k] += acc[k] * dt; m.p[k] += m.v[k] * dt; }
      if (m.burn > 0) { this.trail(m.p, m.v, 'missile'); }
      const g = ground(m.p[0], m.p[2]);
      if (m.life <= 0 || m.p[1] < (g.water ? 0 : g.h)) { this.explosion(m.p, 0.5); this.killMissile(i); continue; }
      m.mesh.position.set(...m.p);
      v3.set(...m.v).normalize(); m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), v3);
    }
  }
  killMissile(i) { const m = this.missiles[i]; this.scene.remove(m.mesh); this.missiles.splice(i, 1); }
  clear() { this.bullets.length = 0; this.flares.length = 0; while (this.missiles.length) this.killMissile(0); }
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function segHit(a, b, c, r) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], f = [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
  const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1;
  const t = Math.max(0, Math.min(1, -(f[0] * d[0] + f[1] * d[1] + f[2] * d[2]) / dd));
  const x = f[0] + d[0] * t, y = f[1] + d[1] * t, z = f[2] + d[2] * t;
  return x * x + y * y + z * z < r * r;
}
