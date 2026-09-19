/**
 * Color Adjustment & Photoshop Curves Processing Engine
 * Hỗ trợ: CMYK, RGB, Brightness/Contrast, Color Balance, HSL, Photoshop Curves (Spline LUT)
 */

export interface CurvePoint {
  x: number; // 0..255
  y: number; // 0..255
}

export interface ColorAdjustSettings {
  // Brightness & Contrast
  brightness: number; // -100..100
  contrast: number; // -100..100

  // RGB Channels
  red: number; // -100..100
  green: number; // -100..100
  blue: number; // -100..100

  // CMYK Simulation
  cyan: number; // -100..100
  magenta: number; // -100..100
  yellow: number; // -100..100
  black: number; // -100..100

  // Color Balance
  balanceCyanRed: number; // -100..100 (Cyan <-> Red)
  balanceMagentaGreen: number; // -100..100 (Magenta <-> Green)
  balanceYellowBlue: number; // -100..100 (Yellow <-> Blue)

  // HSL
  hue: number; // -180..180 (degrees)
  saturation: number; // -100..100 (%)
  lightness: number; // -100..100 (%)

  // Photoshop Curves (Points in 0..255)
  curveRGB: CurvePoint[];
  curveRed: CurvePoint[];
  curveGreen: CurvePoint[];
  curveBlue: CurvePoint[];

  // GCR — Gray Component Replacement (0..100%)
  // 0 = không dùng K trừ vùng tối, 100 = tối đa K thay CMY (mặc định ISO)
  gcrLevel: number;
}

export const DEFAULT_COLOR_SETTINGS: ColorAdjustSettings = {
  brightness: 0,
  contrast: 0,
  red: 0,
  green: 0,
  blue: 0,
  cyan: 0,
  magenta: 0,
  yellow: 0,
  black: 0,
  balanceCyanRed: 0,
  balanceMagentaGreen: 0,
  balanceYellowBlue: 0,
  hue: 0,
  saturation: 0,
  lightness: 0,
  curveRGB: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  curveRed: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  curveGreen: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  curveBlue: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  gcrLevel: 100,
};

export const COLOR_PRESETS: { name: string; description: string; settings: Partial<ColorAdjustSettings> }[] = [
  {
    name: 'Mặc định (Reset)',
    description: 'Khôi phục toàn bộ thông số về gốc',
    settings: { ...DEFAULT_COLOR_SETTINGS }
  },
  {
    name: 'Tươi sáng (Vivid)',
    description: 'Tăng tương phản và độ bão hòa màu',
    settings: {
      brightness: 5,
      contrast: 15,
      saturation: 25,
      curveRGB: [{ x: 0, y: 0 }, { x: 64, y: 55 }, { x: 192, y: 205 }, { x: 255, y: 255 }]
    }
  },
  {
    name: 'Bù in Offset (Print Boost)',
    description: 'Tăng sắc nét màu đen K và bù Cyan cho in ấn offset',
    settings: {
      contrast: 10,
      black: 15,
      cyan: 8,
      magenta: 5,
      yellow: 3,
      saturation: 10
    }
  },
  {
    name: 'Tông màu ấm (Warm Print)',
    description: 'Tăng nhẹ sắc vàng và đỏ dịu mắt',
    settings: {
      balanceCyanRed: 12,
      balanceYellowBlue: -15,
      yellow: 10,
      red: 8
    }
  },
  {
    name: 'Tông màu lạnh (Cool Clean)',
    description: 'Tăng tông xanh lam hiện đại cho catalogue và tạp chí',
    settings: {
      balanceCyanRed: -15,
      balanceYellowBlue: 15,
      cyan: 12,
      blue: 10
    }
  },
  {
    name: 'Tương phản cao (High Contrast Curve)',
    description: 'Đường cong chữ S làm nổi khối chi tiết',
    settings: {
      contrast: 20,
      curveRGB: [{ x: 0, y: 0 }, { x: 60, y: 40 }, { x: 195, y: 215 }, { x: 255, y: 255 }]
    }
  }
];

export function isDefaultColorSettings(s: ColorAdjustSettings): boolean {
  if (
    s.brightness !== 0 ||
    s.contrast !== 0 ||
    s.red !== 0 ||
    s.green !== 0 ||
    s.blue !== 0 ||
    s.cyan !== 0 ||
    s.magenta !== 0 ||
    s.yellow !== 0 ||
    s.black !== 0 ||
    s.balanceCyanRed !== 0 ||
    s.balanceMagentaGreen !== 0 ||
    s.balanceYellowBlue !== 0 ||
    s.hue !== 0 ||
    s.saturation !== 0 ||
    s.lightness !== 0
  ) {
    return false;
  }
  const isLinear = (pts: CurvePoint[]) =>
    pts.length === 2 && pts[0].x === 0 && pts[0].y === 0 && pts[1].x === 255 && pts[1].y === 255;
  return isLinear(s.curveRGB) && isLinear(s.curveRed) && isLinear(s.curveGreen) && isLinear(s.curveBlue);
}

/**
 * Thuật toán Monotone Cubic Spline Interpolation cho Curves
 * Sinh bảng Look-Up Table (LUT) 256 giá trị [0..255]
 */
export function generateCurveLUT(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  if (!points || points.length === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  // Sắp xếp các điểm theo trục X
  const pts = [...points].sort((a, b) => a.x - b.x);

  // Đảm bảo có điểm tại x = 0 và x = 255
  if (pts[0].x > 0) pts.unshift({ x: 0, y: pts[0].y });
  if (pts[pts.length - 1].x < 255) pts.push({ x: 255, y: pts[pts.length - 1].y });

  const n = pts.length;
  if (n === 2) {
    // Đoạn thẳng
    const slope = (pts[1].y - pts[0].y) / (pts[1].x - pts[0].x || 1);
    for (let x = 0; x < 256; x++) {
      const y = pts[0].y + slope * (x - pts[0].x);
      lut[x] = Math.max(0, Math.min(255, Math.round(y)));
    }
    return lut;
  }

  // Thuật toán Fritsch-Carlson Monotone Cubic Spline
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dX = pts[i + 1].x - pts[i].x || 1e-6;
    const dY = pts[i + 1].y - pts[i].y;
    dx.push(dX);
    dy.push(dY);
    m.push(dY / dX);
  }

  // Tiếp tuyến tại các điểm neo
  const tangents: number[] = new Array(n);
  tangents[0] = m[0];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (m[i - 1] + m[i]) / 2;
    }
  }
  tangents[n - 1] = m[n - 2];

  // Khử quá độ (monotonicity preservation)
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]) < 1e-6) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / m[i];
      const beta = tangents[i + 1] / m[i];
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        tangents[i] = tau * alpha * m[i];
        tangents[i + 1] = tau * beta * m[i];
      }
    }
  }

  // Nội suy Hermite cho 256 giá trị
  let seg = 0;
  for (let x = 0; x < 256; x++) {
    while (seg < n - 2 && x > pts[seg + 1].x) {
      seg++;
    }
    const x0 = pts[seg].x;
    const x1 = pts[seg + 1].x;
    const y0 = pts[seg].y;
    const y1 = pts[seg + 1].y;
    const h = x1 - x0 || 1e-6;
    const t = Math.max(0, Math.min(1, (x - x0) / h));
    const t2 = t * t;
    const t3 = t2 * t;

    // Các hàm cơ sở Hermite
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const y = h00 * y0 + h10 * h * tangents[seg] + h01 * y1 + h11 * h * tangents[seg + 1];
    lut[x] = Math.max(0, Math.min(255, Math.round(y)));
  }

  return lut;
}

/**
 * Chuyển đổi RGB sang HSL
 * R, G, B: 0..255
 * Output: H (0..360), S (0..1), L (0..1)
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

/**
 * Chuyển đổi HSL sang RGB
 * H: 0..360, S: 0..1, L: 0..1
 * Output: R, G, B: 0..255
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  h /= 360;

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
}

/**
 * Bộ lọc xử lý pixel tối ưu cho Canvas ImageData
 */
export function applyColorAdjustments(
  srcData: ImageData,
  destCtx: CanvasRenderingContext2D,
  settings: ColorAdjustSettings
): void {
  const width = srcData.width;
  const height = srcData.height;
  const src = srcData.data;

  // Tạo ImageData đích
  const output = destCtx.createImageData(width, height);
  const dst = output.data;

  // Nếu là cài đặt mặc định, sao chép nguyên bản
  if (isDefaultColorSettings(settings)) {
    dst.set(src);
    destCtx.putImageData(output, 0, 0);
    return;
  }

  // 1. Dựng sẵn bảng Curves LUT (256 bytes mỗi kênh)
  const lutRGB = generateCurveLUT(settings.curveRGB);
  const lutR = generateCurveLUT(settings.curveRed);
  const lutG = generateCurveLUT(settings.curveGreen);
  const lutB = generateCurveLUT(settings.curveBlue);

  // 2. Tiền tính hệ số Brightness & Contrast
  const brightnessOffset = settings.brightness * 2.55; // -255..255
  const contrastFactor =
    settings.contrast !== 0
      ? (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))
      : 1.0;

  // 3. Hệ số bù RGB
  const redOffset = settings.red * 1.28;
  const greenOffset = settings.green * 1.28;
  const blueOffset = settings.blue * 1.28;

  // 4. Hệ số Color Balance
  const cbRed = settings.balanceCyanRed * 1.28; // Red dương, Cyan âm
  const cbGreen = settings.balanceMagentaGreen * 1.28; // Green dương, Magenta âm
  const cbBlue = settings.balanceYellowBlue * 1.28; // Blue dương, Yellow âm

  // 5. Kiểm tra các hiệu ứng nâng cao (để bỏ qua nếu = 0 giúp đạt 60 FPS)
  const hasHsl = settings.hue !== 0 || settings.saturation !== 0 || settings.lightness !== 0;
  const hueShift = settings.hue;
  const satScale = 1 + settings.saturation / 100;
  const lightShift = settings.lightness / 200;

  const hasCmyk =
    settings.cyan !== 0 || settings.magenta !== 0 || settings.yellow !== 0 || settings.black !== 0;
  const cOffset = settings.cyan / 100;
  const mOffset = settings.magenta / 100;
  const yOffset = settings.yellow / 100;
  const kOffset = settings.black / 100;
  const gcrRatio = (settings.gcrLevel ?? 100) / 100; // 0..1

  const len = src.length;
  for (let i = 0; i < len; i += 4) {
    let r = src[i];
    let g = src[i + 1];
    let b = src[i + 2];
    const a = src[i + 3];

    if (a === 0) {
      dst[i] = 0;
      dst[i + 1] = 0;
      dst[i + 2] = 0;
      dst[i + 3] = 0;
      continue;
    }

    // A. Áp dụng Curves (Photoshop Curves LUT)
    r = lutR[lutRGB[r]];
    g = lutG[lutRGB[g]];
    b = lutB[lutRGB[b]];

    // B. Brightness & Contrast
    if (contrastFactor !== 1.0 || brightnessOffset !== 0) {
      r = contrastFactor * (r + brightnessOffset - 128) + 128;
      g = contrastFactor * (g + brightnessOffset - 128) + 128;
      b = contrastFactor * (b + brightnessOffset - 128) + 128;
    }

    // C. RGB Channel Offsets & Color Balance
    r += redOffset + cbRed;
    g += greenOffset + cbGreen;
    b += blueOffset + cbBlue;

    // Giới hạn an toàn [0, 255]
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    // D. CMYK Simulation với GCR tùy chỉnh
    if (hasCmyk) {
      // Bước 1: tính CMY không GCR (no-GCR base)
      const c0 = 1 - r / 255;
      const m0 = 1 - g / 255;
      const y0 = 1 - b / 255;

      // Bước 2: GCR — lấy phần xám tối thiểu × gcrRatio sang K
      const kGray = Math.min(c0, m0, y0) * gcrRatio;

      // Bước 3: trừ phần K ra khỏi CMY
      const denom = 1 - kGray || 1;
      let c = kGray < 1 ? (c0 - kGray) / denom : 0;
      let m = kGray < 1 ? (m0 - kGray) / denom : 0;
      let y = kGray < 1 ? (y0 - kGray) / denom : 0;
      let k = kGray;

      // Bước 4: áp dụng offset người dùng
      c = Math.max(0, Math.min(1, c + cOffset));
      m = Math.max(0, Math.min(1, m + mOffset));
      y = Math.max(0, Math.min(1, y + yOffset));
      k = Math.max(0, Math.min(1, k + kOffset));

      r = 255 * (1 - c) * (1 - k);
      g = 255 * (1 - m) * (1 - k);
      b = 255 * (1 - y) * (1 - k);
    }

    // E. HSL Adjustment
    if (hasHsl) {
      let [h, s, l] = rgbToHsl(r, g, b);
      h += hueShift;
      s = Math.max(0, Math.min(1, s * satScale));
      l = Math.max(0, Math.min(1, l + lightShift));
      [r, g, b] = hslToRgb(h, s, l);
    }

    dst[i] = Math.max(0, Math.min(255, Math.round(r)));
    dst[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    dst[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    dst[i + 3] = a;
  }

  destCtx.putImageData(output, 0, 0);
}
