/**
 * Analyzes rendered page canvas content to determine if it is color, black & white, or blank.
 */
export function analyzePageColor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pageNumber?: number
): 'color' | 'bw' | 'blank' {
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  const totalPixels = width * height;

  let inkPixels = 0;              // Pixels that are not white/near-white
  let colorPixels = 0;            // Pixels that have chromatic color (not grayscale)
  let significantColorPixels = 0; // Strong chromatic pixels

  // Sample every 4th pixel for performance (still very accurate)
  const sampleStep = 4;
  const sampledPixels = Math.floor(totalPixels / sampleStep);

  for (let px = 0; px < d.length; px += 4 * sampleStep) {
    const r = d[px];
    const g = d[px + 1];
    const b = d[px + 2];

    // Check if pixel is not white/near-white (has ink)
    // Consider white threshold as brightness > 245
    const brightness = (r + g + b) / 3;
    if (brightness < 245) {
      inkPixels++;
    }

    // Check if pixel is chromatic (has color, not grayscale)
    // Grayscale pixels have R ≈ G ≈ B
    const maxRGB = Math.max(r, g, b);
    const minRGB = Math.min(r, g, b);
    const chromaDiff = maxRGB - minRGB;

    // Saturation-based detection
    const chromaThreshold = 25;       // Threshold for detecting chromatic colors
    const strongChromaThreshold = 50; // Threshold for strong/vivid colors

    if (chromaDiff > chromaThreshold && brightness < 240) {
      colorPixels++;

      // Also check for strong colors (like red stamps, colored text)
      if (chromaDiff > strongChromaThreshold) {
        significantColorPixels++;
      }
    }
  }

  // Calculate percentages
  const inkPercentage = (inkPixels / sampledPixels) * 100;
  const colorPercentage = (colorPixels / sampledPixels) * 100;
  const significantColorPercentage = (significantColorPixels / sampledPixels) * 100;

  // Classification logic:
  // - Blank: Less than 1% ink coverage
  // - Color: More than 2% chromatic pixels OR more than 0.5% significant color pixels
  // - B&W: Has ink but not enough color
  let type: 'color' | 'bw' | 'blank';

  if (inkPercentage < 1) {
    type = 'blank';
  } else if (colorPercentage > 2 || significantColorPercentage > 0.5) {
    type = 'color';
  } else {
    type = 'bw';
  }

  if (pageNumber !== undefined) {
    console.log(
      `Page ${pageNumber}: ink=${inkPercentage.toFixed(2)}%, color=${colorPercentage.toFixed(2)}%, significant=${significantColorPercentage.toFixed(2)}% => ${type}`
    );
  }

  return type;
}
