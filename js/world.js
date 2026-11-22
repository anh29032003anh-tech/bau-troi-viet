import * as THREE from 'three';

export const TIMES = [
  { ten: 'Bình minh', elev: 6, az: 95, sun: [1.0, 0.62, 0.38], zen: [0.22, 0.33, 0.55], hor: [0.95, 0.68, 0.52], int: 2.2, hemi: 0.7 },
  { ten: 'Buổi sáng', elev: 30, az: 110, sun: [1.0, 0.93, 0.84], zen: [0.16, 0.36, 0.72], hor: [0.68, 0.8, 0.92], int: 3.2, hemi: 1.0 },
  { ten: 'Giữa trưa', elev: 70, az: 160, sun: [1.0, 0.98, 0.94], zen: [0.12, 0.33, 0.72], hor: [0.7, 0.82, 0.94], int: 3.6, hemi: 1.1 },
  { ten: 'Hoàng hôn', elev: 4, az: 265, sun: [1.0, 0.5, 0.25], zen: [0.2, 0.25, 0.48], hor: [1.0, 0.58, 0.38], int: 2.0, hemi: 0.6 }
];

export class World {
  constructor(renderer, scene, time, clouds, quality) {
    this.scene = scene; this.time = time;
    const el = time.elev * Math.PI / 180, az = time.az * Math.PI / 180;
    this.sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    const zen = new THREE.Color(...time.zen), hor = new THREE.Color(...time.hor), sunC = new THREE.Color(...time.sun);
    this.hor = hor;

    const skyMat = new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: this.sunDir }, zen: { value: zen }, hor: { value: hor }, sunC: { value: sunC } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: `varying vec3 vD; uniform vec3 sunDir, zen, hor, sunC;
        void main(){ vec3 d = normalize(vD); float h = d.y;
          vec3 c = mix(hor, zen, pow(clamp(h,0.0,1.0), 0.45));
          c = mix(c, hor*0.82, smoothstep(0.0,-0.25,h));
          float s = max(dot(d, sunDir), 0.0);
          c += sunC * (pow(s, 1400.0)*30.0 + pow(s, 64.0)*0.45 + pow(s, 6.0)*0.18);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), skyMat);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    scene.add(this.sky);

    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), skyMat.clone()));
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: 0x4a5540 }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.y = -50; envScene.add(gnd);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(envScene, 0.02).texture;

    scene.fog = new THREE.FogExp2(hor.clone().multiplyScalar(0.92), 1.4e-5);
    scene.background = null;

    this.sun = new THREE.DirectionalLight(sunC, time.int);
    this.sun.castShadow = quality.shadow > 0;
    if (this.sun.castShadow) {
      this.sun.shadow.mapSize.set(quality.shadow, quality.shadow);
      const c = this.sun.shadow.camera; c.left = -90; c.right = 90; c.top = 90; c.bottom = -90; c.near = 1; c.far = 2000;
      this.sun.shadow.camera.layers.enableAll(); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.05;
    }
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(zen.clone().lerp(new THREE.Color(1, 1, 1), 0.4), new THREE.Color(0.32, 0.3, 0.24), time.hemi);
    scene.add(this.hemi);

    this.water = new THREE.Mesh(new THREE.PlaneGeometry(800000, 800000, 1, 1), new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, sunDir: { value: this.sunDir }, skyC: { value: hor.clone().lerp(zen, 0.5) }, deep: { value: new THREE.Color(0.02, 0.09, 0.14) }, sunC: { value: sunC }, camP: { value: new THREE.Vector3() } }]),
      vertexShader: `#include <common>
        #include <fog_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        varying vec3 vW;
        void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
        #include <fog_vertex>
        }`,
      fragmentShader: `#include <common>
        #include <fog_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        uniform float time; uniform vec3 sunDir, skyC, deep, sunC, camP; varying vec3 vW;
        vec2 wv(vec2 p, vec2 d, float f, float sp){ float ph = dot(p,d)*f + time*sp; return d * cos(ph) * f; }
        void main(){
          #include <logdepthbuf_fragment>
          vec2 p = vW.xz; float dist = length(camP - vW);
          float f1 = 1.0 - smoothstep(4000.0, 14000.0, dist), f2 = 1.0 - smoothstep(1200.0, 4000.0, dist), f3 = 1.0 - smoothstep(300.0, 1200.0, dist);
          vec2 g = wv(p, normalize(vec2(1.0,0.3)), 0.021, 1.1)*0.6*f1 + wv(p, normalize(vec2(-0.4,1.0)), 0.037, 1.5)*0.4*f1 + wv(p, normalize(vec2(0.7,-0.8)), 0.11, 2.3)*0.12*f2 + wv(p, normalize(vec2(-0.9,-0.2)), 0.29, 3.1)*0.05*f3;
          vec3 n = normalize(vec3(-g.x*2.5, 1.0, -g.y*2.5));
          vec3 v = normalize(camP - vW);
          float fr = 0.02 + 0.98*pow(1.0 - max(dot(n,v),0.0), 5.0);
          vec3 r = reflect(-v, n);
          vec3 refl = mix(skyC*0.85, skyC*1.1, clamp(r.y,0.0,1.0));
          float sp = pow(max(dot(r, sunDir),0.0), 350.0)*4.0*(0.3+0.7*f2) + pow(max(dot(r, sunDir),0.0), 40.0)*0.15;
          vec3 c = mix(deep, refl, fr) + sunC*sp;
          float alpha = max(clamp(0.5 + fr*0.6 + sp, 0.5, 1.0), smoothstep(15000.0, 45000.0, dist));
          gl_FragColor = vec4(c, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
      fog: true, transparent: true
    }));
    this.water.rotation.x = -Math.PI / 2; this.water.renderOrder = -2;
    scene.add(this.water);

    this.clouds = [];
    const n = [0, 45, 110][clouds];
    if (n) {
      const tex = cloudTexture();
      const tint = sunC.clone().lerp(new THREE.Color(1, 1, 1), 0.5);
      for (let i = 0; i < n; i++) {
        const cl = new THREE.Group();
        const puffs = 6 + Math.floor(Math.random() * 8);
        for (let k = 0; k < puffs; k++) {
          const m = new THREE.SpriteMaterial({ map: tex, color: tint.clone().multiplyScalar(0.92 + Math.random() * 0.1), transparent: true, opacity: 0.85, depthWrite: false, fog: true, rotation: Math.random() * 6 });
          const s = new THREE.Sprite(m), sz = 250 + Math.random() * 500;
          s.scale.set(sz, sz * 0.62, 1);
          s.position.set((Math.random() - 0.5) * 900, Math.random() * 180 + (k < 3 ? 0 : 60), (Math.random() - 0.5) * 900);
          cl.add(s);
        }
        cl.userData.base = 1400 + Math.random() * 1400;
        this.clouds.push(cl); scene.add(cl);
        this.placeCloud(cl, new THREE.Vector3(), true);
      }
    }
  }
  placeCloud(cl, c, any) {
    const R = 45000, a = Math.random() * Math.PI * 2, d = any ? Math.sqrt(Math.random()) * R : R * (0.8 + Math.random() * 0.2);
    cl.position.set(c.x + Math.cos(a) * d, cl.userData.base, c.z + Math.sin(a) * d);
  }
  update(dt, cams, focus) {
    this.water.material.uniforms.time.value += dt;
    const f = focus[0];
    this.water.position.set(Math.round(f.x / 1000) * 1000, 0, Math.round(f.z / 1000) * 1000);
    this.sun.position.copy(f).addScaledVector(this.sunDir, 800);
    this.sun.target.position.copy(f);
    for (const cl of this.clouds) {
      let near = false;
      for (const p of focus) if (Math.hypot(cl.position.x - p.x, cl.position.z - p.z) < 50000) near = true;
      if (!near) this.placeCloud(cl, focus[Math.floor(Math.random() * focus.length)], false);
    }
    const alt = Math.max(0, f.y);
    this.scene.fog.density = 1.6e-5 * Math.exp(-alt / 6000) + 3e-6;
  }
  beforeRender(cam) {
    this.sky.position.copy(cam.position);
    this.water.material.uniforms.camP.value.copy(cam.position);
  }
}

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 128 + (Math.random() - 0.5) * 120, y = 140 + (Math.random() - 0.5) * 60, r = 30 + Math.random() * 55;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const sh = 0.82 + (y - 110) / 400;
    gr.addColorStop(0, `rgba(255,255,255,0.5)`); gr.addColorStop(0.6, `rgba(${240 * sh | 0},${244 * sh | 0},${250 * sh | 0},0.25)`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
