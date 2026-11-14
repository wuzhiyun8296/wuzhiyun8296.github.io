// map-core.js
const MapCore = {
  seed: 1234,
  width: 1024,
  height: 1024,
  points: [],
  cellData: [],

  random: function() {
    let x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  },

  generatePoints: function(minDist) {
    this.points = [];
    const k = 30; 
    const grid = [];
    const cellSize = minDist / Math.sqrt(2);
    const gridW = Math.ceil(this.width / cellSize);
    const gridH = Math.ceil(this.height / cellSize);

    for (let i = 0; i < gridW * gridH; i++) grid[i] = null;

    const addPoint = (p) => {
      this.points.push(p);
      const gx = Math.floor(p.x / cellSize);
      const gy = Math.floor(p.y / cellSize);
      grid[gx + gy * gridW] = p;
    };

    addPoint({ x: this.width / 2, y: this.height / 2 });
    const activeList = [0];

    while (activeList.length > 0) {
      const idx = Math.floor(this.random() * activeList.length);
      const current = this.points[activeList[idx]];
      let found = false;

      for (let i = 0; i < k; i++) {
        const angle = this.random() * Math.PI * 2;
        const dist = minDist + this.random() * minDist;
        const nx = current.x + Math.cos(angle) * dist;
        const ny = current.y + Math.sin(angle) * dist;

        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          const gx = Math.floor(nx / cellSize);
          const gy = Math.floor(ny / cellSize);
          let ok = true;

          for (let ix = Math.max(0, gx - 2); ix <= Math.min(gridW - 1, gx + 2); ix++) {
            for (let iy = Math.max(0, gy - 2); iy <= Math.min(gridH - 1, gy + 2); iy++) {
              const neighbor = grid[ix + iy * gridW];
              if (neighbor) {
                const dx = nx - neighbor.x;
                const dy = ny - neighbor.y;
                if (dx * dx + dy * dy < minDist * minDist) ok = false;
              }
            }
          }

          if (ok) {
            addPoint({ x: nx, y: ny });
            activeList.push(this.points.length - 1);
            found = true;
            break;
          }
        }
      }
      if (!found) activeList.splice(idx, 1);
    }
  },

  noise2D: function(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const r = (a, b) => {
      let n = Math.sin(a * 12.9898 + b * 78.233 + this.seed) * 43758.5453123;
      return (n - Math.floor(n)) * 2 - 1; 
    };
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = r(xi, yi), b = r(xi + 1, yi), c = r(xi, yi + 1), d = r(xi + 1, yi + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  },

  calculateTerrain: function(seaLevel) {
    const w = this.width, h = this.height;
    
    const fbm = (x, y) => {
      let v = 0, amp = 1, freq = 0.003, maxAmp = 0;
      for (let i = 0; i < 5; i++) {
        v += this.noise2D(x * freq, y * freq) * amp;
        maxAmp += amp;
        amp *= 0.5; freq *= 2.0;
      }
      return v / maxAmp; 
    };

    this.cellData = this.points.map(p => {
      const nx = p.x / w, ny = p.y / h;
      
      let elevation = (fbm(p.x, p.y) + 1) / 2;
      
      // 边缘衰减
      const edgeY = Math.min(ny, 1.0 - ny);
      if (edgeY < 0.1) {
        elevation *= Math.pow(edgeY / 0.1, 1.5);
      }

      const isLand = elevation > seaLevel;
      const latDist = Math.abs(ny - 0.5) * 2; 
      
      let biome = 'ocean';
      if (isLand) {
        // 💡 核心修复：调高山脉阈值，加入丘陵过渡
        if (elevation > seaLevel + 0.35) biome = 'mountain'; 
        else if (elevation > seaLevel + 0.2) biome = 'highland';
        else if (latDist > 0.8) biome = 'ice';
        else if (latDist < 0.2) biome = 'tropical';
        else if (latDist < 0.4) biome = 'desert';
        else biome = 'temperate';
      } else {
        if (latDist > 0.85) biome = 'ice_ocean';
      }

      return { x: p.x, y: p.y, elevation, biome, isLand };
    });
  },

  buildSpatialHash: function() {
    this.hashGrid = {};
    this.cellData.forEach((p, idx) => {
      const gx = Math.floor(p.x / 32);
      const gy = Math.floor(p.y / 32);
      const key = `${gx},${gy}`;
      if (!this.hashGrid[key]) this.hashGrid[key] = [];
      this.hashGrid[key].push(idx);
    });
  }
};