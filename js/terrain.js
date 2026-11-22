import * as THREE from 'three';

const R = 6378137, PI = Math.PI;
const ELEV = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const IMG = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

function loadImg(url) {
  return new Promise(res => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  });
}

class Level {
  constructor(t, z, radius, seg, imgZ, far) { Object.assign(this, { t, z, radius, seg, imgZ, far }); this.tiles = new Map(); }
}

export class Terrain {
  constructor(scene, lat0, lon0, q) {
    this.scene = scene; this.lat0 = lat0; this.lon0 = lon0;
    this.k = Math.cos(lat0 * PI / 180);
    this.ox = R * lon0 * PI / 180;
    this.oy = R * Math.log(Math.tan(PI / 4 + lat0 * PI / 360));
    this.group = new THREE.Group(); scene.add(this.group);
    this.levels = [new Level(this, 13, q.radius, q.seg, q.imgZ, false), new Level(this, 10, 2, 32, 11, true)];
    this.queue = []; this.active = 0; this.maxActive = 10;
    this.inner = [new THREE.Vector4(1, 1, -1, -1), new THREE.Vector4(1, 1, -1, -1)];
    this.maxAniso = q.aniso || 8;
    this.pending = 0;
  }
  fromLatLon(lat, lon) {
    const mx = R * lon * PI / 180, my = R * Math.log(Math.tan(PI / 4 + lat * PI / 360));
    return { x: (mx - this.ox) * this.k, z: -(my - this.oy) * this.k };
  }
  addRunway(a, b, wid) {
    const A = this.fromLatLon(a[0], a[1]), B = this.fromLatLon(b[0], b[1]);
    const dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz);
    const f = { A, B, cx: (A.x + B.x) / 2, cz: (A.z + B.z) / 2, ux: dx / len, uz: dz / len, len, wid: wid + 40, margin: 260, elev: null };
    this.flats = this.flats || []; this.flats.push(f);
    return f;
  }
  snapRunway(f) {
    const L = this.levels[0], scores = new Float32Array(61);
    let n = 0;
    for (let k = 0; k < 8; k++) {
      const al = 150 + k * 120, px = f.A.x + f.ux * al, pz = f.A.z + f.uz * al;
      const [tx, ty] = this.tileOf(px, pz, L.z), t = L.tiles.get(`${tx}_${ty}`);
      const cv = t?.mesh?.material.map?.image; if (!cv || !cv.getContext) continue;
      const g = cv.getContext('2d', { willReadFrequently: true }), S = cv.width;
      for (let j = 0; j <= 60; j++) {
        const off = (j - 30) * 5, x = px - f.uz * off, z = pz + f.ux * off;
        const u = (x - t.rect.x0) / t.rect.w * S, v = (z - t.rect.z0) / t.rect.w * S;
        if (u < 0 || v < 0 || u >= S || v >= S) continue;
        const d = g.getImageData(u | 0, v | 0, 1, 1).data;
        const mx = Math.max(d[0], d[1], d[2]), mn = Math.min(d[0], d[1], d[2]), br = (d[0] + d[1] + d[2]) / 3;
        scores[j] += (mx - mn < 28 ? 1 : 0) * (br > 70 && br < 215 ? 1 : 0) - (d[1] > d[0] + 8 && d[1] > d[2] ? 0.8 : 0);
      }
      n++;
    }
    if (!n) return 0;
    let best = 0, bi = 30;
    for (let j = 4; j <= 56; j++) { let sc = 0; for (let q = -4; q <= 4; q++) sc += scores[j + q]; sc -= Math.abs(j - 30) * 0.02; if (sc > best) { best = sc; bi = j; } }
    return best > n * 4 ? (bi - 30) * 5 : 0;
  }
  flatH(x, z, h) {
    for (const f of this.flats || []) {
      if (f.elev === null) continue;
      const rx = x - f.cx, rz = z - f.cz, a = rx * f.ux + rz * f.uz, b = -rx * f.uz + rz * f.ux;
      const d = Math.hypot(Math.max(0, Math.abs(a) - f.len / 2 - 120), Math.max(0, Math.abs(b) - f.wid / 2));
      if (d < f.margin) { const t = d / f.margin, k = t * t * (3 - 2 * t); h = f.elev * (1 - k) + h * k; }
    }
    return h;
  }
  size(z) { return 2 * PI * R / 2 ** z; }
  toLatLon(x, z) {
    const mx = this.ox + x / this.k, my = this.oy - z / this.k;
    return { lat: (2 * Math.atan(Math.exp(my / R)) - PI / 2) * 180 / PI, lon: mx / R * 180 / PI };
  }
  tileOf(x, z, lv) {
    const s = this.size(lv), mx = this.ox + x / this.k, my = this.oy - z / this.k;
    return [Math.floor((mx + PI * R) / s), Math.floor((PI * R - my) / s)];
  }
  tileRect(tx, ty, lv) {
    const s = this.size(lv), x0 = (tx * s - PI * R - this.ox) * this.k, z0 = -((PI * R - ty * s) - this.oy) * this.k;
    return { x0, z0, w: s * this.k };
  }

  update(points) {
    const want = new Set();
    for (const L of this.levels) {
      const keep = new Set();
      for (const p of points) {
        const [cx, cy] = this.tileOf(p.x, p.z, L.z);
        for (let dy = -L.radius; dy <= L.radius; dy++) for (let dx = -L.radius; dx <= L.radius; dx++) {
          const key = `${cx + dx}_${cy + dy}`; keep.add(key);
          if (!L.tiles.has(key)) {
            const t = { key, tx: cx + dx, ty: cy + dy, L, state: 'queued', d: Math.hypot(dx, dy) + (L.far ? 100 : 0) };
            L.tiles.set(key, t); this.queue.push(t);
          }
        }
      }
      for (const [key, t] of L.tiles) if (!keep.has(key)) this.drop(t);
    }
    points.forEach((p, i) => {
      const L = this.levels[0];
      const [cx, cy] = this.tileOf(p.x, p.z, L.z);
      let all = true;
      for (let dy = -L.radius; dy <= L.radius && all; dy++) for (let dx = -L.radius; dx <= L.radius; dx++) { const t = L.tiles.get(`${cx + dx}_${cy + dy}`); if (!t || t.state !== 'ready') { all = false; break; } }
      if (all) {
        const a = this.tileRect(cx - L.radius, cy - L.radius, L.z), b = this.tileRect(cx + L.radius, cy + L.radius, L.z);
        this.inner[i].set(a.x0, a.z0, b.x0 + b.w, b.z0 + b.w);
      } else this.inner[i].set(1, 1, -1, -1);
    });
    for (let i = points.length; i < 2; i++) this.inner[i].set(1, 1, -1, -1);
    this.queue = this.queue.filter(t => t.state === 'queued');
    this.queue.sort((a, b) => a.d - b.d);
    while (this.active < this.maxActive && this.queue.length) this.load(this.queue.shift());
    this.pending = this.queue.length + this.active;
  }

  readyAround(p) {
    const L = this.levels[0], [cx, cy] = this.tileOf(p.x, p.z, L.z);
    let n = 0, tot = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { tot++; const t = L.tiles.get(`${cx + dx}_${cy + dy}`); if (t && t.state === 'ready') n++; }
    return n / tot;
  }

  drop(t) {
    t.L.tiles.delete(t.key);
    if (t.mesh) { this.group.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.map?.dispose(); t.mesh.material.dispose(); }
    t.state = 'dead';
  }

  async load(t) {
    t.state = 'loading'; this.active++;
    const L = t.L, r0 = this.tileRect(t.tx, t.ty, L.z);
    const nearRw = !L.far && (this.flats || []).some(f => [0, 0.25, 0.5, 0.75, 1].some(k => { const x = f.A.x + (f.B.x - f.A.x) * k, z = f.A.z + (f.B.z - f.A.z) * k; return x > r0.x0 - 300 && x < r0.x0 + r0.w + 300 && z > r0.z0 - 300 && z < r0.z0 + r0.w + 300; }));
    const iz = nearRw ? 16 : L.imgZ, sub = 2 ** (iz - L.z), px = 256 * sub;
    const [el, ...imgs] = await Promise.all([loadImg(ELEV(L.z, t.tx, t.ty)), ...Array.from({ length: sub * sub }, (_, i) => loadImg(IMG(iz, t.tx * sub + i % sub, t.ty * sub + Math.floor(i / sub))))]);
    this.active--;
    if (t.state === 'dead') return;
    const H = new Float32Array(256 * 256);
    if (el) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(el, 0, 0);
      const d = g.getImageData(0, 0, 256, 256).data;
      for (let i = 0; i < 65536; i++) { let h = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768; H[i] = h < 0.3 ? Math.max(Math.min(h, 0), -25) - 3 : h; }
    }
    t.H = H; t.rect = this.tileRect(t.tx, t.ty, L.z);
    for (const f of this.flats || []) if (f.elev === null && !L.far) {
      const hs = [];
      for (let i = 0; i <= 30; i++) {
        const x = f.A.x + (f.B.x - f.A.x) * i / 30, z = f.A.z + (f.B.z - f.A.z) * i / 30;
        const u = (x - t.rect.x0) / t.rect.w, v = (z - t.rect.z0) / t.rect.w;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) hs.push(this.sampleH(H, u, v));
      }
      if (hs.length > 3) { hs.sort((p, q) => p - q); f.elev = Math.max(1, hs[Math.floor(hs.length / 2)]); }
    }
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    const g2 = cv.getContext('2d');
    g2.fillStyle = '#4a5a3a'; g2.fillRect(0, 0, px, px);
    imgs.forEach((im, i) => { if (im) g2.drawImage(im, (i % sub) * 256, Math.floor(i / sub) * 256); });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = this.maxAniso;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const geo = this.buildGeo(t);
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97, metalness: 0, envMapIntensity: 0.35 });
    if (L.far) {
      m.polygonOffset = true; m.polygonOffsetFactor = 6; m.polygonOffsetUnits = 6;
      const inner = this.inner;
      m.onBeforeCompile = sh => {
        sh.uniforms.innerA = { value: inner[0] }; sh.uniforms.innerB = { value: inner[1] };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed,1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform vec4 innerA; uniform vec4 innerB;\nbool inR(vec4 r){ return vWp.x>r.x+30.0 && vWp.x<r.z-30.0 && vWp.z>r.y+30.0 && vWp.z<r.w-30.0; }')
          .replace('void main() {', 'void main() {\n if(inR(innerA)||inR(innerB)) discard;');
      };
    }
    m.onBeforeCompile = (prev => sh => {
      prev && prev(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 c = diffuseColor.rgb; float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, 1.25); diffuseColor.rgb = pow(max(c,0.0), vec3(0.95)) * 1.12; }`);
    })(m.onBeforeCompile);
    const mesh = new THREE.Mesh(geo, m);
    mesh.receiveShadow = !L.far;
    mesh.renderOrder = L.far ? -1 : 0;
    this.group.add(mesh);
    t.mesh = mesh; t.state = 'ready';
  }

  buildGeo(t) {
    const N = t.L.seg, { x0, z0, w } = t.rect, H = t.H;
    const pos = [], uv = [], idx = [], n1 = N + 3;
    const Gd = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) Gd[j * (N + 1) + i] = this.flatH(x0 + i / N * w, z0 + j / N * w, this.sampleH(H, i / N, j / N));
    t.G = Gd;
    for (let j = -1; j <= N + 1; j++) for (let i = -1; i <= N + 1; i++) {
      const ci = Math.min(N, Math.max(0, i)), cj = Math.min(N, Math.max(0, j));
      const u = ci / N, v = cj / N;
      let h = Gd[cj * (N + 1) + ci];
      if (ci !== i || cj !== j) h -= 80;
      pos.push(x0 + u * w, h - (t.L.far ? 150 : 0), z0 + v * w); uv.push(u, 1 - v);
    }
    for (let j = 0; j < N + 2; j++) for (let i = 0; i < N + 2; i++) {
      const a = j * n1 + i, b = a + 1, c = a + n1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }

  sampleH(H, u, v) {
    const fx = Math.min(255, Math.max(0, u * 256 - 0.5)), fy = Math.min(255, Math.max(0, v * 256 - 0.5));
    const x = Math.floor(fx), y = Math.floor(fy), x1 = Math.min(255, x + 1), y1 = Math.min(255, y + 1), ax = fx - x, ay = fy - y;
    return (H[y * 256 + x] * (1 - ax) + H[y * 256 + x1] * ax) * (1 - ay) + (H[y1 * 256 + x] * (1 - ax) + H[y1 * 256 + x1] * ax) * ay;
  }

  ground(x, z) {
    for (const L of this.levels) {
      const [tx, ty] = this.tileOf(x, z, L.z), t = L.tiles.get(`${tx}_${ty}`);
      if (t && t.G) {
        const N = L.seg, u = (x - t.rect.x0) / t.rect.w * N, v = (z - t.rect.z0) / t.rect.w * N;
        const i = Math.min(N - 1, Math.max(0, Math.floor(u))), j = Math.min(N - 1, Math.max(0, Math.floor(v))), a = u - i, b = v - j, G = t.G, r = N + 1;
        const h = a + b < 1 ? G[j * r + i] + (G[j * r + i + 1] - G[j * r + i]) * a + (G[(j + 1) * r + i] - G[j * r + i]) * b
          : G[(j + 1) * r + i + 1] + (G[(j + 1) * r + i] - G[(j + 1) * r + i + 1]) * (1 - a) + (G[j * r + i + 1] - G[(j + 1) * r + i + 1]) * (1 - b);
        return { h: Math.max(h, 0), water: h <= 0.5, raw: h };
      }
    }
    return { h: 0, water: true, raw: 0 };
  }
}
