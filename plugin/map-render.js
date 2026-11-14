// map-render.js
const MapRenderer = {
  render: function(canvas, coreData, options) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;
    const { cellData, hashGrid, width, height } = coreData;
    const seaLevel = options.seaLevel || 0.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx = Math.floor(x / 32);
        const gy = Math.floor(y / 32);

        let minDist = Infinity;
        let secondMinDist = Infinity;
        let closestCell = null;

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${gx + dx},${gy + dy}`;
            const indices = hashGrid[key];
            if (!indices) continue;

            for (let i = 0; i < indices.length; i++) {
              const cell = cellData[indices[i]];
              const dist = (x - cell.x) ** 2 + (y - cell.y) ** 2;
              
              if (dist < minDist) {
                secondMinDist = minDist;
                minDist = dist;
                closestCell = cell;
              } else if (dist < secondMinDist) {
                secondMinDist = dist;
              }
            }
          }
        }

        const idx = (y * width + x) * 4;
        
        if (closestCell) {
          let r = 0, g = 0, b = 0;
          const elev = closestCell.elevation;
          const biome = closestCell.biome;

          // 渲染水体
          if (biome === 'ocean' || biome === 'ice_ocean') {
            const depth = (seaLevel - elev) / seaLevel;
            if (biome === 'ice_ocean') {
              r = 200; g = 220; b = 230;
            } else {
              r = 20 + (1 - depth) * 30;
              g = 60 + (1 - depth) * 50;
              b = 120 + (1 - depth) * 50;
            }
          } else {
            // 渲染陆地
            if (biome === 'ice') { r = 240; g = 245; b = 255; }
            else if (biome === 'mountain') { r = 140; g = 135; b = 125; } // 缩小后的真·高山
            else if (biome === 'highland') { r = 110; g = 130; b = 80; }  // 💡 新增：丘陵/高地
            else if (biome === 'desert') { r = 210; g = 190; b = 140; }
            else if (biome === 'tropical') { r = 45; g = 115; b = 45; }
            else if (biome === 'temperate') { r = 80; g = 140; b = 70; }
            else { r = 100; g = 160; b = 80; }

            // 山体光影 (让高山有立体感，但不发黑)
            if (biome === 'mountain' || biome === 'highland') {
               const lightFactor = Math.max(0.75, 1 - (elev - seaLevel - 0.2) * 1.2);
               r *= lightFactor; g *= lightFactor; b *= lightFactor;
            }
          }

          // 极淡的板块边界
          if (options.showGrid) {
            if (Math.abs(Math.sqrt(minDist) - Math.sqrt(secondMinDist)) < 0.3) {
              r *= 0.9; g *= 0.9; b *= 0.9;
            }
          }

          data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
};