import { derive } from './physics.js';

const FIGHTER = { Cma: -0.45, Cmq: -12, Clp: -0.35, pb2V: 0.13, Clb: -0.06, Cnb: 0.12, Cnr: -0.25, Cndr: 0.06, CYb: -0.9 };
const AIRLINER = { Cma: -1.2, Cmq: -25, Clp: -0.45, pb2V: 0.075, Clb: -0.1, Cnb: 0.15, Cnr: -0.25, Cndr: 0.08, CYb: -0.8 };
const PROP = { Cma: -1.0, Cmq: -14, Clp: -0.45, pb2V: 0.09, Clb: -0.1, Cnb: 0.1, Cnr: -0.15, Cndr: 0.07, CYb: -0.7 };

const list = [
  {
    id: 'su30', ten: 'Sukhoi Su-30MK2', nhom: 'Quân sự', cls: 'fighter', nuoc: 'Nga',
    moTa: 'Tiêm kích đa năng hai chỗ ngồi, hai động cơ AL-31F có buồng đốt tăng lực. Là "hổ mang chúa" của Không quân Nhân dân Việt Nam.',
    L: 21.935, b: 14.7, S: 62, m: 26000, kx: 0.11, ky: 0.17,
    eng: { type: 'jet', n: 2, Tdry: 74.5e3, Tab: 122.6e3, tau: 2.6 }, thongSoDC: '2 × AL-31F, 2 × 122,6 kN (tăng lực)',
    CD0: 0.022, e: 0.8, CL0: 0.04, aS: 0.46, Mcr: 0.9, peak: 2.3,
    flapCL: 0.35, flapCD: 0.03, gearCD: 0.02, gearH: 2.45, vCrash: 4.5, vGearMax: 120,
    fbw: { nMax: 9, nMin: -3, aLim: 0.5, pMax: 4.0 }, der: { ...FIGHTER }, vMaxThuc: 'Mach 2,0 (2.120 km/h)',
    guns: { ten: 'GSh-30-1 (30 mm)', rpm: 1500, dan: 150, v0: 860, dmg: 16 }, mis: { ten: 'R-73', so: 6 }, flares: 32,
    start: { V: 230 },
    livery: { type: 'camo', base: '#9fb3c4', colors: ['#7f97ab', '#b9c8d3', '#6c8296'], belly: '#c9d4dc', roundel: 'vn', num: '8521', radome: '#c8ccce', wing: '#93a8ba', tail: '#8aa0b4' },
    model: {
      cg: 11.0,
      fus: [[0, .02, .02, -.15], [.6, .28, .3, -.12], [1.5, .48, .5, -.06], [2.6, .62, .64, 0], [3.8, .7, .74, .05], [5, .78, .8, .12], [6.2, .85, .82, .15], [7.4, 1.1, .75, .12], [8.6, 1.45, .62, .1], [10.5, 1.65, .55, .12], [13, 1.55, .5, .12], [15.5, 1.0, .45, .1], [17.5, .6, .4, .05], [19.5, .4, .35, 0], [21.9, .22, .22, 0]],
      nac: [{ x: 1.25, sec: [[7.2, .6, .55, -.62], [9, .63, .6, -.58], [16, .6, .58, -.5], [18.5, .55, .55, -.45], [19.7, .5, .5, -.42]], dark: true, nozzle: .5 }],
      wing: { x0: 0, z: 9.3, y: 0, root: 6.4, tip: 1.9, semi: 7.35, sweep: 6.6, dih: -0.02, t: 0.05, flap: [0.15, 0.55], ail: [0.58, 0.95] },
      lerx: { x0: 0, z: 5.6, y: 0.05, root: 4.2, tip: 0.3, semi: 1.9, sweep: 3.6, t: 0.03 },
      htail: { x0: 1.6, z: 17.4, y: -0.15, root: 3.0, tip: 1.1, semi: 3.3, sweep: 2.8, dih: -0.03, t: 0.05, all: true },
      vtail: [{ x: 1.55, z: 15.4, y: 0.35, root: 3.6, tip: 1.3, h: 3.8, sweep: 3.0, cant: 0 }, { x: -1.55, z: 15.4, y: 0.35, root: 3.6, tip: 1.3, h: 3.8, sweep: 3.0, cant: 0 }],
      ventral: [{ x: 1.3, z: 15.8, y: -1.0, root: 1.6, tip: 0.9, h: -0.9, sweep: 0.8 }, { x: -1.3, z: 15.8, y: -1.0, root: 1.6, tip: 0.9, h: -0.9, sweep: 0.8 }],
      canopy: { z: 5.1, len: 3.9, w: 0.84, h: 0.62, y: 0.62 },
      irst: [0.25, 0.72, 3.0],
      gear: [{ x: 0, z: 3.6, r: 0.33, n: 2 }, { x: 2.2, z: 12.0, r: 0.5, n: 1 }, { x: -2.2, z: 12.0, r: 0.5, n: 1 }],
      hard: [[3.6, -0.3, 13.2], [-3.6, -0.3, 13.2], [5.4, -0.25, 14.6], [-5.4, -0.25, 14.6], [7.35, 0, 16.5], [-7.35, 0, 16.5]],
      cockpit: [0, 0.95, 4.2]
    }
  },
  {
    id: 'mig21', ten: 'Mikoyan MiG-21bis', nhom: 'Quân sự', cls: 'fighter', nuoc: 'Liên Xô',
    moTa: 'Tiêm kích đánh chặn cánh tam giác, cửa hút khí ở mũi có nón điều chỉnh. Huyền thoại của bầu trời Việt Nam thời chiến.',
    L: 14.7, b: 7.154, S: 23, m: 8200, kx: 0.11, ky: 0.17,
    eng: { type: 'jet', n: 1, Tdry: 40.2e3, Tab: 69.6e3, tau: 2.2 }, thongSoDC: '1 × R-25-300, 69,6 kN (tăng lực)',
    CD0: 0.0205, e: 0.72, CL0: 0.0, aS: 0.47, Mcr: 0.92, peak: 2.2,
    flapCL: 0.3, flapCD: 0.03, gearCD: 0.02, gearH: 1.75, vCrash: 4, vGearMax: 110,
    fbw: null, der: { ...FIGHTER, Cma: -0.5, Cmq: -10, pb2V: 0.09 }, vMaxThuc: 'Mach 2,05 (2.175 km/h)',
    guns: { ten: 'GSh-23L (23 mm)', rpm: 3400, dan: 200, v0: 715, dmg: 10 }, mis: { ten: 'R-60M', so: 4 }, flares: 16,
    start: { V: 220 },
    livery: { type: 'metal', base: '#b9bec2', colors: ['#a6acb1', '#c8ccd0'], belly: '#c2c6ca', roundel: 'vn', num: '5121', radome: '#3f4a3f', wing: '#b3b8bc', tail: '#adb2b6' },
    model: {
      cg: 7.6,
      fus: [[0, .42, .42, 0], [.8, .55, .55, 0], [2, .62, .64, .02], [3.5, .66, .74, .07], [5, .68, .8, .13], [7, .68, .8, .15], [9, .66, .74, .12], [11, .62, .66, .06], [13, .55, .56, 0], [14.7, .48, .48, 0]],
      shock: { z: 0, r: 0.3, len: 1.1 },
      wing: { x0: 0, z: 5.6, y: -0.15, root: 6.0, tip: 0.6, semi: 3.58, sweep: 5.5, dih: -0.02, t: 0.045, flap: [0.2, 0.5], ail: [0.55, 0.95] },
      htail: { x0: 0.4, z: 11.6, y: -0.05, root: 1.8, tip: 0.5, semi: 1.35, sweep: 1.7, dih: 0, t: 0.05, all: true },
      vtail: [{ x: 0, z: 9.6, y: 0.6, root: 3.4, tip: 0.9, h: 2.0, sweep: 3.0, cant: 0 }],
      ventral: [{ x: 0, z: 12.0, y: -0.6, root: 1.6, tip: 0.8, h: -0.6, sweep: 0.6 }],
      canopy: { z: 4.1, len: 2.0, w: 0.64, h: 0.42, y: 0.62 },
      probe: [0, 0.45, 0.2, 1.6],
      nozzle: [{ x: 0, y: 0, z: 14.7, r: 0.46 }],
      gear: [{ x: 0, z: 2.8, r: 0.3, n: 1 }, { x: 1.35, z: 8.1, r: 0.42, n: 1 }, { x: -1.35, z: 8.1, r: 0.42, n: 1 }],
      hard: [[1.6, -0.35, 8.2], [-1.6, -0.35, 8.2], [2.5, -0.3, 9.4], [-2.5, -0.3, 9.4]],
      cockpit: [0, 0.95, 3.6]
    }
  },
  {
    id: 'f16', ten: 'General Dynamics F-16C', nhom: 'Quân sự', cls: 'fighter', nuoc: 'Mỹ',
    moTa: 'Tiêm kích hạng nhẹ điều khiển bay bằng điện (fly-by-wire), cửa hút khí dưới bụng, buồng lái bong bóng một mảnh.',
    L: 15.06, b: 9.45, S: 27.87, m: 12500, kx: 0.11, ky: 0.17,
    eng: { type: 'jet', n: 1, Tdry: 76.3e3, Tab: 131e3, tau: 2.2 }, thongSoDC: '1 × F110-GE-129, 131 kN (tăng lực)',
    CD0: 0.021, e: 0.8, CL0: 0.04, aS: 0.44, Mcr: 0.9, peak: 3.0,
    flapCL: 0.3, flapCD: 0.03, gearCD: 0.02, gearH: 1.75, vCrash: 4, vGearMax: 115,
    fbw: { nMax: 9, nMin: -3, aLim: 0.44, pMax: 5.3 }, der: { ...FIGHTER, Cma: -0.2 }, vMaxThuc: 'Mach 2,05 (2.120 km/h)',
    guns: { ten: 'M61A1 Vulcan (20 mm)', rpm: 6000, dan: 511, v0: 1050, dmg: 6 }, mis: { ten: 'AIM-9X', so: 4 }, flares: 30,
    start: { V: 230 },
    livery: { type: 'two', base: '#8f9599', colors: ['#7b8186', '#a2a8ac'], belly: '#a4aaae', roundel: 'star', num: '90-0821', radome: '#7c8286', wing: '#8a9094', tail: '#868c90' },
    model: {
      cg: 8.1,
      fus: [[0, .02, .02, 0], [.7, .25, .26, 0], [1.6, .42, .44, .03], [2.6, .52, .56, .08], [3.6, .58, .62, .14], [4.6, .62, .62, .12], [5.6, .75, .6, .1], [6.6, 1.0, .6, .08], [8.5, 1.05, .62, .06], [10.5, .95, .6, .05], [12.5, .7, .58, .05], [14.2, .55, .55, .05], [15.06, .5, .5, .05]],
      nac: [{ x: 0, sec: [[4.5, .56, .36, -.78], [5.5, .58, .4, -.72], [7.5, .6, .45, -.6], [9.5, .55, .4, -.45], [11, .4, .3, -.3]], dark: true }],
      wing: { x0: 0, z: 6.4, y: -0.05, root: 4.9, tip: 1.0, semi: 4.72, sweep: 3.96, dih: 0, t: 0.04, flap: [0.15, 0.6], ail: [0.6, 0.95] },
      lerx: { x0: 0, z: 3.6, y: 0.0, root: 2.9, tip: 0.2, semi: 1.0, sweep: 2.6, t: 0.03 },
      htail: { x0: 0.9, z: 12.0, y: -0.05, root: 2.3, tip: 0.85, semi: 2.75, sweep: 1.9, dih: -0.17, t: 0.05, all: true },
      vtail: [{ x: 0, z: 10.4, y: 0.55, root: 3.2, tip: 1.15, h: 3.1, sweep: 2.9, cant: 0 }],
      ventral: [{ x: 0.65, z: 11.6, y: -0.5, root: 1.1, tip: 0.6, h: -0.55, sweep: 0.5, cant: 0.35 }, { x: -0.65, z: 11.6, y: -0.5, root: 1.1, tip: 0.6, h: -0.55, sweep: 0.5, cant: -0.35 }],
      canopy: { z: 3.5, len: 3.0, w: 0.78, h: 0.62, y: 0.55 },
      nozzle: [{ x: 0, y: 0.05, z: 15.06, r: 0.55 }],
      gear: [{ x: 0, z: 5.0, r: 0.3, n: 1 }, { x: 1.2, z: 8.8, r: 0.4, n: 1 }, { x: -1.2, z: 8.8, r: 0.4, n: 1 }],
      hard: [[4.78, 0, 10.8], [-4.78, 0, 10.8], [3.7, -0.32, 10.0], [-3.7, -0.32, 10.0]],
      cockpit: [0, 0.98, 2.9]
    }
  },
  {
    id: 'yak130', ten: 'Yakovlev Yak-130', nhom: 'Quân sự', cls: 'fighter', nuoc: 'Nga',
    moTa: 'Máy bay huấn luyện chiến đấu cận âm, buồng lái hai chỗ bậc thang, điều khiển bay bằng điện. Việt Nam đang khai thác.',
    L: 11.49, b: 9.84, S: 23.5, m: 7250, kx: 0.11, ky: 0.17,
    eng: { type: 'jet', n: 2, Tdry: 24.5e3, tau: 2.5 }, thongSoDC: '2 × AI-222-25, 2 × 24,5 kN',
    CD0: 0.024, e: 0.82, CL0: 0.05, aS: 0.5, Mcr: 0.82, peak: 3.2,
    flapCL: 0.4, flapCD: 0.035, gearCD: 0.02, gearH: 1.55, vCrash: 4, vGearMax: 100,
    fbw: { nMax: 8, nMin: -3, aLim: 0.5, pMax: 4.0 }, der: { ...FIGHTER, Cma: -0.5 }, vMaxThuc: '1.060 km/h',
    guns: { ten: 'Pháo treo GSh-23 (23 mm)', rpm: 3400, dan: 200, v0: 715, dmg: 10 }, mis: { ten: 'R-73', so: 2 }, flares: 16,
    start: { V: 180 },
    livery: { type: 'camo', base: '#a8b5a0', colors: ['#7f8f78', '#c4ccbb', '#5f6f5a'], belly: '#c7d2da', roundel: 'vn', num: '2501', radome: '#5d6a58', wing: '#97a58f', tail: '#8d9b86' },
    model: {
      cg: 6.1,
      fus: [[0, .02, .02, 0], [.5, .22, .24, .02], [1.4, .42, .44, .05], [2.4, .52, .6, .1], [3.6, .56, .68, .16], [4.8, .58, .7, .18], [6, .6, .64, .14], [7.5, .58, .58, .1], [9, .5, .5, .1], [10.5, .38, .38, .1], [11.49, .3, .3, .1]],
      nac: [{ x: 0.85, sec: [[4.2, .32, .42, -.25], [5.5, .38, .45, -.25], [9.0, .36, .4, -.15], [10.8, .3, .32, -.05]], dark: true, nozzle: 0.28 }],
      wing: { x0: 0, z: 5.0, y: -0.1, root: 3.6, tip: 1.3, semi: 4.92, sweep: 2.6, dih: -0.03, t: 0.06, flap: [0.15, 0.6], ail: [0.6, 0.95] },
      lerx: { x0: 0, z: 2.6, y: 0.0, root: 2.6, tip: 0.2, semi: 0.95, sweep: 2.4, t: 0.03 },
      htail: { x0: 0.45, z: 9.3, y: 0.0, root: 1.7, tip: 0.7, semi: 2.2, sweep: 1.3, dih: 0, t: 0.05, all: true },
      vtail: [{ x: 0, z: 8.0, y: 0.5, root: 2.6, tip: 0.9, h: 2.2, sweep: 2.0, cant: 0 }],
      canopy: { z: 3.5, len: 3.4, w: 0.7, h: 0.6, y: 0.6 },
      gear: [{ x: 0, z: 2.2, r: 0.28, n: 1 }, { x: 1.3, z: 6.6, r: 0.36, n: 1 }, { x: -1.3, z: 6.6, r: 0.36, n: 1 }],
      hard: [[4.95, 0, 7.9], [-4.95, 0, 7.9]],
      cockpit: [0, 1.0, 2.6]
    }
  },
  {
    id: 'b789', ten: 'Boeing 787-9 Dreamliner', nhom: 'Dân dụng', cls: 'airliner', nuoc: 'Mỹ',
    moTa: 'Máy bay thân rộng tầm xa, thân và cánh bằng vật liệu composite, cánh dài cong lên khi bay, vỏ động cơ có mép răng cưa giảm ồn.',
    L: 62.8, b: 60.12, S: 377, m: 205000, kx: 0.16, ky: 0.17,
    eng: { type: 'jet', n: 2, Tdry: 320e3, tau: 4.5 }, thongSoDC: '2 × GEnx-1B / Trent 1000, 2 × 320 kN',
    CD0: 0.0185, e: 0.86, CL0: 0.2, aS: 0.24, Mcr: 0.86, peak: 4.5,
    flapCL: 0.95, flapCD: 0.05, gearCD: 0.018, gearH: 5.2, vCrash: 3.2, vGearMax: 95,
    fbw: { nMax: 2.5, nMin: -1, aLim: 0.24, pMax: 0.26, bank: true }, der: { ...AIRLINER }, vMaxThuc: 'Mach 0,90 (bay bằng Mach 0,85)',
    guns: null, mis: null, flares: 0,
    start: { V: 150 },
    livery: { type: 'airline', base: '#f4f6f7', belly: '#d9dee2', stripe: '#0b6b78', stripe2: '#d6b25e', tail: '#0b6b78', reg: 'VN-A868', wing: '#c7ccd1', engine: '#e9ecee' },
    model: {
      cg: 29.5,
      fus: [[0, .05, .05, .2], [.6, .9, .95, .15], [1.8, 1.75, 1.9, .12], [3.5, 2.4, 2.6, .08], [5.5, 2.82, 2.95, .02], [8, 2.89, 2.98, 0], [46, 2.89, 2.98, 0], [50, 2.6, 2.7, .25], [54, 2.0, 2.1, .7], [58, 1.2, 1.3, 1.2], [61, .6, .6, 1.5], [62.8, .2, .2, 1.6]],
      wing: { x0: 0, z: 25.0, y: -1.7, root: 10.5, tip: 2.0, semi: 30.06, sweep: 18.9, dih: 0.1, t: 0.11, flap: [0.1, 0.6], ail: [0.65, 0.92], flex: 1.6 },
      pods: [{ x: 9.9, y: -3.3, z: 26.0, r: 1.5, len: 7.2, chevron: true }, { x: -9.9, y: -3.3, z: 26.0, r: 1.5, len: 7.2, chevron: true }],
      htail: { x0: 0, z: 54.5, y: 0.9, root: 6.2, tip: 2.2, semi: 9.9, sweep: 7.6, dih: 0.12, t: 0.09 },
      vtail: [{ x: 0, z: 50.5, y: 2.4, root: 9.5, tip: 3.6, h: 9.4, sweep: 8.6, cant: 0 }],
      gear: [{ x: 0, z: 6.5, r: 0.6, n: 2 }, { x: 4.8, z: 31, r: 0.68, n: 4 }, { x: -4.8, z: 31, r: 0.68, n: 4 }],
      cockpit: [0, 1.9, 3.2]
    }
  },
  {
    id: 'a321', ten: 'Airbus A321neo', nhom: 'Dân dụng', cls: 'airliner', nuoc: 'Châu Âu',
    moTa: 'Máy bay thân hẹp phổ biến nhất ở các hãng Việt Nam, cánh có đầu sharklet, điều khiển bằng cần lái bên (sidestick) và luật bay bảo vệ.',
    L: 44.51, b: 35.8, S: 122.4, m: 76000, kx: 0.16, ky: 0.17,
    eng: { type: 'jet', n: 2, Tdry: 147e3, tau: 4.0 }, thongSoDC: '2 × CFM LEAP-1A / PW1100G, 2 × 147 kN',
    CD0: 0.0215, e: 0.84, CL0: 0.2, aS: 0.25, Mcr: 0.8, peak: 4.5,
    flapCL: 1.0, flapCD: 0.055, gearCD: 0.02, gearH: 3.75, vCrash: 3.2, vGearMax: 90,
    fbw: { nMax: 2.5, nMin: -1, aLim: 0.25, pMax: 0.26, bank: true }, der: { ...AIRLINER }, vMaxThuc: 'Mach 0,82 (871 km/h)',
    guns: null, mis: null, flares: 0,
    start: { V: 140 },
    livery: { type: 'airline', base: '#f6f6f6', belly: '#e2262b', stripe: '#e2262b', stripe2: '#f8c21a', tail: '#e2262b', reg: 'VN-A651', wing: '#c9ccd0', engine: '#f8c21a' },
    model: {
      cg: 19.8,
      fus: [[0, .05, .05, .2], [.5, .7, .75, .12], [1.5, 1.3, 1.42, .08], [3, 1.78, 1.9, .03], [4.8, 1.97, 2.05, 0], [33, 1.97, 2.05, 0], [36, 1.75, 1.85, .2], [39, 1.25, 1.35, .55], [42, .7, .75, .95], [44.51, .22, .22, 1.15]],
      wing: { x0: 0, z: 16.5, y: -1.25, root: 6.2, tip: 1.5, semi: 17.9, sweep: 9.2, dih: 0.09, t: 0.11, flap: [0.1, 0.62], ail: [0.68, 0.95], winglet: { h: 2.4, root: 1.5, tip: 0.45, sweep: 1.5, cant: 0.25 } },
      pods: [{ x: 5.75, y: -2.6, z: 15.4, r: 1.06, len: 4.4 }, { x: -5.75, y: -2.6, z: 15.4, r: 1.06, len: 4.4 }],
      htail: { x0: 0, z: 38.6, y: 0.6, root: 3.9, tip: 1.4, semi: 6.2, sweep: 3.7, dih: 0.1, t: 0.09 },
      vtail: [{ x: 0, z: 35.0, y: 1.9, root: 5.9, tip: 2.1, h: 6.0, sweep: 5.6, cant: 0 }],
      gear: [{ x: 0, z: 5.0, r: 0.4, n: 2 }, { x: 3.8, z: 20.8, r: 0.6, n: 2 }, { x: -3.8, z: 20.8, r: 0.6, n: 2 }],
      cockpit: [0, 1.35, 2.6]
    }
  },
  {
    id: 'atr72', ten: 'ATR 72-600', nhom: 'Dân dụng', cls: 'prop', nuoc: 'Pháp – Ý',
    moTa: 'Máy bay cánh quạt tầm ngắn, cánh trên cao, đuôi chữ T, hai động cơ tua-bin cánh quạt sáu lá. Hay bay các chặng Côn Đảo, Điện Biên.',
    L: 27.17, b: 27.05, S: 61, m: 21500, kx: 0.15, ky: 0.17,
    eng: { type: 'prop', n: 2, P: 2051e3, V0: 50, turbo: true, tau: 1.2, blades: 6 }, thongSoDC: '2 × PW127M, 2 × 2.051 kW',
    CD0: 0.027, e: 0.85, CL0: 0.25, aS: 0.26, Mcr: 0.62, peak: 4,
    flapCL: 0.8, flapCD: 0.05, gearCD: 0.02, gearH: 2.35, vCrash: 3.3, vGearMax: 80,
    fbw: null, der: { ...PROP }, vMaxThuc: '510 km/h',
    guns: null, mis: null, flares: 0,
    start: { V: 110 },
    livery: { type: 'airline', base: '#f5f7f8', belly: '#dfe4e8', stripe: '#1f5ba8', stripe2: '#4fb2e6', tail: '#1f5ba8', reg: 'VN-B218', wing: '#d0d5da', engine: '#f5f7f8' },
    model: {
      cg: 11.6,
      fus: [[0, .05, .05, .05], [.5, .55, .6, .02], [1.4, 1.0, 1.1, 0], [2.8, 1.3, 1.38, 0], [4, 1.42, 1.42, 0], [20, 1.42, 1.42, 0], [22, 1.25, 1.25, .15], [24.5, .8, .85, .5], [27.17, .25, .3, .85]],
      nac: [{ x: 1.2, sec: [[10.0, .2, .2, -1.05], [11, .5, .55, -1.0], [14, .5, .55, -1.0], [15.5, .2, .25, -0.95]] }],
      wing: { x0: 0, z: 10.5, y: 1.35, root: 2.6, tip: 1.45, semi: 13.52, sweep: 0.5, dih: 0.0, t: 0.15, flap: [0.08, 0.55], ail: [0.62, 0.95] },
      props: [{ x: 4.1, y: 1.0, z: 7.8, r: 1.98, blades: 6, nac: { r: 0.58, len: 6.0 } }, { x: -4.1, y: 1.0, z: 7.8, r: 1.98, blades: 6, nac: { r: 0.58, len: 6.0 } }],
      vtail: [{ x: 0, z: 21.0, y: 1.2, root: 4.6, tip: 2.6, h: 4.4, sweep: 2.8, cant: 0 }],
      htail: { x0: 0, z: 23.6, y: 5.55, root: 2.0, tip: 1.2, semi: 3.7, sweep: 0.9, dih: 0, t: 0.1 },
      gear: [{ x: 0, z: 2.6, r: 0.33, n: 2 }, { x: 1.25, z: 12.6, r: 0.45, n: 2 }, { x: -1.25, z: 12.6, r: 0.45, n: 2 }],
      cockpit: [0, 1.0, 2.0]
    }
  },
  {
    id: 'c172', ten: 'Cessna 172S Skyhawk', nhom: 'Dân dụng', cls: 'light', nuoc: 'Mỹ',
    moTa: 'Máy bay huấn luyện phi công phổ biến nhất thế giới, một động cơ piston 180 mã lực, cánh trên có thanh chống, càng cố định.',
    L: 8.28, b: 11.0, S: 16.2, m: 1100, kx: 0.1, ky: 0.16,
    eng: { type: 'prop', n: 1, P: 134e3, V0: 40, turbo: false, tau: 0.6, blades: 2 }, thongSoDC: 'Lycoming IO-360, 134 kW (180 mã lực)',
    CD0: 0.031, e: 0.75, CL0: 0.3, aS: 0.27, Mcr: 0.5, peak: 4,
    flapCL: 0.7, flapCD: 0.06, gearCD: 0.0, gearH: 1.05, vCrash: 3, vGearMax: 60, fixedGear: true,
    fbw: null, der: { ...PROP }, vMaxThuc: '302 km/h',
    guns: null, mis: null, flares: 0,
    start: { V: 55 },
    livery: { type: 'light', base: '#f7f7f5', belly: '#f7f7f5', stripe: '#b5122b', stripe2: '#e8b32a', tail: '#f7f7f5', reg: 'VN-1172', wing: '#f2f2f0', engine: '#f7f7f5' },
    model: {
      cg: 2.3,
      fus: [[0, .2, .2, 0], [.4, .45, .42, 0], [1.2, .52, .55, .05], [2.0, .56, .7, .15], [2.8, .55, .68, .14], [3.6, .5, .6, .1], [5, .32, .42, .12], [6.6, .18, .28, .18], [8.28, .1, .18, .2]],
      wing: { x0: 0, z: 1.75, y: 0.85, root: 1.63, tip: 1.12, semi: 5.5, sweep: 0.2, dih: 0.03, t: 0.13, flap: [0.08, 0.5], ail: [0.55, 0.95] },
      struts: [[0.55, -0.25, 2.2, 2.6, 0.82, 2.2], [-0.55, -0.25, 2.2, -2.6, 0.82, 2.2]],
      props: [{ x: 0, y: 0, z: -0.15, r: 0.95, blades: 2 }],
      htail: { x0: 0, z: 7.0, y: 0.05, root: 1.35, tip: 0.9, semi: 1.7, sweep: 0.35, dih: 0, t: 0.09 },
      vtail: [{ x: 0, z: 6.2, y: 0.35, root: 1.6, tip: 0.75, h: 1.45, sweep: 1.1, cant: 0 }],
      gear: [{ x: 0, z: 0.6, r: 0.2, n: 1 }, { x: 1.25, z: 2.6, r: 0.25, n: 1 }, { x: -1.25, z: 2.6, r: 0.25, n: 1 }],
      cockpit: [-0.3, 0.55, 1.6]
    }
  }
];

export const AIRCRAFT = list.map(derive);
export const byId = id => AIRCRAFT.find(a => a.id === id);
