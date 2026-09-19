// Test auto-rotate logic
const testCases = [
  {
    name: "Landscape image (1920x1080) → Portrait item (100x120)",
    image: { w: 1920, h: 1080 },
    item: { w: 100, h: 120 },
    manualRotation: 0
  },
  {
    name: "Portrait image (1080x1920) → Landscape item (120x100)",
    image: { w: 1080, h: 1920 },
    item: { w: 120, h: 100 },
    manualRotation: 0
  },
  {
    name: "Square image (1000x1000) → Portrait item (100x120)",
    image: { w: 1000, h: 1000 },
    item: { w: 100, h: 120 },
    manualRotation: 0
  },
  {
    name: "Landscape (1920x1080) → Portrait (100x120) with manual 90°",
    image: { w: 1920, h: 1080 },
    item: { w: 100, h: 120 },
    manualRotation: 90
  }
];

function calculateBestRotation(p, itemW, itemH) {
  const rotations = [0, 90, -90, 180];
  let bestRotation = 0;
  let minWaste = Infinity;
  
  console.log(`\nImage: ${p.w}x${p.h}, Item: ${itemW}x${itemH}`);
  
  for (const rot of rotations) {
    const rotAbs = Math.abs(rot) % 180;
    const isRotated90 = rotAbs === 90;
    const rotatedW = isRotated90 ? p.h : p.w;
    const rotatedH = isRotated90 ? p.w : p.h;
    
    const scaleW = itemW / rotatedW;
    const scaleH = itemH / rotatedH;
    const scale = Math.min(scaleW, scaleH);
    
    const scaledW = rotatedW * scale;
    const scaledH = rotatedH * scale;
    
    const wasteW = itemW - scaledW;
    const wasteH = itemH - scaledH;
    const totalWaste = wasteW + wasteH;
    
    console.log(`  ${rot}°: rotated=${rotatedW}x${rotatedH}, scale=${scale.toFixed(4)}, waste=${totalWaste.toFixed(2)}`);
    
    if (totalWaste < minWaste) {
      minWaste = totalWaste;
      bestRotation = rot;
    }
  }
  
  console.log(`  → BEST: ${bestRotation}° (waste: ${minWaste.toFixed(2)})`);
  return bestRotation;
}

console.log("=".repeat(70));
console.log("AUTO-ROTATE LOGIC TEST");
console.log("=".repeat(70));

testCases.forEach((test, i) => {
  console.log(`\n[Test ${i+1}] ${test.name}`);
  console.log(`Manual rotation: ${test.manualRotation}° (will be IGNORED by auto-rotate)`);
  const best = calculateBestRotation(test.image, test.item.w, test.item.h);
});

console.log("\n" + "=".repeat(70));
