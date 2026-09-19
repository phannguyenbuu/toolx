import { ColorAdjustSettings, CurvePoint } from './colorAdjustment';

export interface ToneBalanceRow {
  cyanRed: number; // -100..100
  magentaGreen: number; // -100..100
  yellowBlue: number; // -100..100
}

export interface ToneBalanceTable {
  shadows: ToneBalanceRow;
  midtones: ToneBalanceRow;
  highlights: ToneBalanceRow;
}

export interface PrintMatchComparisonReport {
  summary: string;
  colorShiftDescription: string;
  toneBalance: ToneBalanceTable;
  curvesRecommendation: string;
  curvesMidtoneLift: number; // e.g. 3..5 (%)
  brightness: number; // -100..100
  contrast: number; // -100..100
  cmyk: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
  };
  actionableSettings: Partial<ColorAdjustSettings>;
  rawAIResponse?: string;
}

export interface ColorInspectionReport {
  timestamp: string;
  score: number; // 0..100
  rating: 'Xuất sắc' | 'Đạt chuẩn in' | 'Cần lưu ý' | 'Nguy cơ lỗi in cao';
  ratingColor: string; // Tailwind class
  
  // Total Area Coverage (TAC / Total Ink Limit)
  tac: {
    max: number; // % e.g. 325%
    average: number;
    over300Percent: number; // % diện tích vượt 300%
    over320Percent: number; // % diện tích vượt 320%
    status: 'safe' | 'warning' | 'danger';
    message: string;
  };

  // Gamut Warning (RGB to CMYK Offset)
  gamut: {
    outOfGamutPercent: number; // % diện tích ngoài dải màu CMYK FOGRA39 / Japan Color
    status: 'safe' | 'warning' | 'danger';
    affectedTones: string[];
    message: string;
  };

  // Dynamic Range & Clipping
  tone: {
    blackCrushPercent: number; // Vùng tối mất chi tiết (Shadow clipping < 5%)
    highlightBlowoutPercent: number; // Vùng sáng cháy nét (Highlight clipping > 95%)
    dynamicRangeStatus: 'good' | 'compressed' | 'clipped';
    message: string;
  };

  // Color Balance / Gray Cast
  balance: {
    detectedCast: 'neutral' | 'warm_red' | 'cool_cyan' | 'green' | 'yellow' | 'magenta';
    castDescription: string;
    deviationScore: number;
  };

  // AI Suggestions & Auto-Fix Parameters
  aiRecommendations: {
    title: string;
    details: string[];
    actionableSettings: Partial<ColorAdjustSettings>;
  };

  aiSummaryText: string;
  toneBalanceTable?: ToneBalanceTable;
  chatGptCritique?: string;
}

// Token ChatGPT do người dùng cung cấp
export const DEFAULT_OPENAI_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';

export const getOpenAIKey = (): string => {
  return localStorage.getItem('openai_api_key') || DEFAULT_OPENAI_KEY;
};

export const setOpenAIKey = (key: string) => {
  localStorage.setItem('openai_api_key', key.trim());
};

/**
 * Thu nhỏ Canvas và chuyển thành chuỗi base64 JPEG chất lượng cao để gửi qua OpenAI Vision API
 */
export function canvasToOptimizedBase64(canvas: HTMLCanvasElement, maxDimension = 1024): string {
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(1, maxDimension / Math.max(w, h));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = Math.max(1, Math.round(w * scale));
  thumbCanvas.height = Math.max(1, Math.round(h * scale));
  const tCtx = thumbCanvas.getContext('2d');
  if (tCtx) {
    tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
  return thumbCanvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Đọc File ảnh từ máy người dùng thành chuỗi base64 nén tối ưu
 */
export async function imageFileToOptimizedBase64(file: File, maxDimension = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const scale = Math.min(1, maxDimension / Math.max(w, h));

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * So sánh màu sắc giữa "Bản xem PC" và "Bản in thực tế" bằng ChatGPT Vision API
 * Trả về bảng thông số bù trừ Color Balance, Curves, Brightness/Contrast, CMYK
 */
export async function comparePrintWithPCUsingChatGPT(
  pcCanvas: HTMLCanvasElement,
  printedPhotoBase64: string,
  currentSettings: ColorAdjustSettings
): Promise<PrintMatchComparisonReport> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error('Chưa cấu hình OpenAI API Token');
  }

  const pcImageBase64 = canvasToOptimizedBase64(pcCanvas, 1024);

  const systemPrompt = `Bạn là Chuyên gia Cao cấp về Chế bản In ấn & Quản lý Màu sắc (Prepress Color Management & Print Proofing Match).
Nhiệm vụ của bạn là so sánh 2 hình ảnh:
- Hình 1: "Bản xem PC" (File thiết kế số hiển thị chuẩn trên màn hình).
- Hình 2: "Bản in thực tế" (Ảnh chụp thành phẩm in ra trên giấy/vật liệu).

Bản in thực tế thường bị sai lệch quang học do máy in/mực/giấy (ví dụ: bị lạnh hơn, ám xanh/xám, thiếu sắc ấm, hoặc bị tối hơn so với màn hình).
Bạn hãy phân tích chính xác độ lệch và đưa ra các thông số bù trừ trên file thiết kế (bằng Photoshop Color Balance, Curves, Brightness/Contrast, CMYK) để khi in lại lần sau, sản phẩm in ra sẽ khớp chính xác với bản xem PC.

QUY TẮC BÙ TRỪ:
- Nếu bản in bị lạnh / ám xanh lam (Blue/Cyan): Cần tăng Red (Cyan-Red dương), tăng Yellow (Yellow-Blue âm).
- Nếu bản in bị tối hơn PC: Khuyên dùng Curves nâng nhẹ Midtone (3-5%) và tăng nhẹ Brightness.
- Cung cấp đầy đủ bảng Color Balance (Shadows, Midtones, Highlights).

Bắt buộc trả về định dạng JSON hợp lệ (không chứa markdown thừa):
{
  "summary": "Tóm tắt ngắn gọn tình trạng (ví dụ: Bản in bị lạnh, hơi xanh/xám và thiếu sắc beige ấm, tối hơn bản PC khoảng 4%)...",
  "colorShiftDescription": "Mô tả chi tiết các vùng lệch...",
  "toneBalance": {
    "shadows": { "cyanRed": 4, "magentaGreen": -2, "yellowBlue": -4 },
    "midtones": { "cyanRed": 8, "magentaGreen": -4, "yellowBlue": -8 },
    "highlights": { "cyanRed": 3, "magentaGreen": -1, "yellowBlue": -3 }
  },
  "curvesRecommendation": "Khuyên dùng Curves nâng nhẹ midtone khoảng 3–5% (điểm input 128 -> output 134) để bản in sáng và gần bản PC hơn.",
  "curvesMidtoneLift": 4,
  "brightness": 5,
  "contrast": 2,
  "cmyk": { "cyan": -5, "magenta": 2, "yellow": 6, "black": -4 }
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Dưới đây là 2 hình ảnh. Hình 1 là [Bản xem PC], Hình 2 là [Bản in thực tế]. Hãy so sánh và trả về JSON thông số bù trừ màu sắc:'
            },
            {
              type: 'image_url',
              image_url: { url: pcImageBase64, detail: 'high' }
            },
            {
              type: 'image_url',
              image_url: { url: printedPhotoBase64, detail: 'high' }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `OpenAI API lỗi: ${response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Không nhận được phản hồi phân tích từ ChatGPT Vision');
  }

  const parsed = JSON.parse(content);

  // Tạo các giá trị cài đặt hành động áp dụng vào Color Studio
  const tb = parsed.toneBalance || {
    shadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
    midtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
    highlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 }
  };

  // Tính điểm Curves nếu có midtone lift
  const midtoneLift = Number(parsed.curvesMidtoneLift) || 0;
  const newCurvesRGB: CurvePoint[] = [
    { x: 0, y: 0 },
    { x: 128, y: Math.min(255, Math.max(0, 128 + Math.round(midtoneLift * 2.5))) },
    { x: 255, y: 255 }
  ];

  const actionableSettings: Partial<ColorAdjustSettings> = {
    balanceCyanRed: Math.max(-100, Math.min(100, tb.midtones?.cyanRed ?? 0)),
    balanceMagentaGreen: Math.max(-100, Math.min(100, tb.midtones?.magentaGreen ?? 0)),
    balanceYellowBlue: Math.max(-100, Math.min(100, tb.midtones?.yellowBlue ?? 0)),
    brightness: Math.max(-100, Math.min(100, Number(parsed.brightness) || 0)),
    contrast: Math.max(-100, Math.min(100, Number(parsed.contrast) || 0)),
    cyan: Math.max(-100, Math.min(100, Number(parsed.cmyk?.cyan) || 0)),
    magenta: Math.max(-100, Math.min(100, Number(parsed.cmyk?.magenta) || 0)),
    yellow: Math.max(-100, Math.min(100, Number(parsed.cmyk?.yellow) || 0)),
    black: Math.max(-100, Math.min(100, Number(parsed.cmyk?.black) || 0)),
    curveRGB: midtoneLift !== 0 ? newCurvesRGB : currentSettings.curveRGB
  };

  return {
    summary: parsed.summary || 'Đã phân tích sự sai biệt màu giữa Bản xem PC và Bản in thực tế.',
    colorShiftDescription: parsed.colorShiftDescription || '',
    toneBalance: tb,
    curvesRecommendation: parsed.curvesRecommendation || '',
    curvesMidtoneLift: midtoneLift,
    brightness: Number(parsed.brightness) || 0,
    contrast: Number(parsed.contrast) || 0,
    cmyk: parsed.cmyk || { cyan: 0, magenta: 0, yellow: 0, black: 0 },
    actionableSettings,
    rawAIResponse: content
  };
}

/**
 * Phân tích chuyên sâu màu sắc bản in trên Canvas bằng AI Computer Vision & ChatGPT Vision API
 */
export async function runAIColorInspection(
  canvas: HTMLCanvasElement,
  currentSettings: ColorAdjustSettings
): Promise<ColorInspectionReport> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể khởi tạo Canvas 2D Context');
  }

  const width = canvas.width;
  const height = canvas.height;
  const totalPixels = width * height;

  // Lấy dữ liệu pixel để phân tích prepress client-side
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const targetSamples = 160000;
  const step = Math.max(1, Math.floor(Math.sqrt(totalPixels / targetSamples)));

  let sampledCount = 0;
  let maxTac = 0;
  let sumTac = 0;
  let tacOver300Count = 0;
  let tacOver320Count = 0;

  let outOfGamutCount = 0;
  const gamutTonesSet = new Set<string>();

  let blackCrushCount = 0;
  let highlightBlowoutCount = 0;

  let neutralCount = 0;
  let sumRedVsGreen = 0;
  let sumBlueVsGreen = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 20) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      sampledCount++;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const rN = r / 255;
      const gN = g / 255;
      const bN = b / 255;
      const maxVal = Math.max(rN, gN, bN);
      const k = 1 - maxVal;

      let c = 0, m = 0, yC = 0;
      if (k < 0.999) {
        c = (1 - rN - k) / (1 - k);
        m = (1 - gN - k) / (1 - k);
        yC = (1 - bN - k) / (1 - k);
      }
      const tacPercent = Math.round((c + m + yC + k) * 100);
      if (tacPercent > maxTac) maxTac = tacPercent;
      sumTac += tacPercent;

      if (tacPercent > 320) {
        tacOver320Count++;
        tacOver300Count++;
      } else if (tacPercent > 300) {
        tacOver300Count++;
      }

      const minVal = Math.min(rN, gN, bN);
      const chroma = maxVal - minVal;
      const saturation = maxVal > 0.001 ? chroma / maxVal : 0;

      if (saturation > 0.82 && maxVal > 0.4) {
        if (bN > 0.75 && gN < 0.35 && rN < 0.35) {
          outOfGamutCount++;
          gamutTonesSet.add('Xanh lam quang học (Electric Blue)');
        } else if (gN > 0.8 && rN < 0.35 && bN < 0.35) {
          outOfGamutCount++;
          gamutTonesSet.add('Xanh lục huỳnh quang (Neon Green)');
        } else if (rN > 0.85 && bN > 0.6 && gN < 0.2) {
          outOfGamutCount++;
          gamutTonesSet.add('Tím Magenta rực');
        } else if (rN > 0.9 && gN > 0.85 && bN < 0.15) {
          outOfGamutCount++;
          gamutTonesSet.add('Vàng tươi quang học');
        } else if (chroma > 0.85) {
          outOfGamutCount++;
          gamutTonesSet.add('Vùng bão hòa cực hạn');
        }
      }

      if (lum < 10) {
        blackCrushCount++;
      } else if (lum > 248) {
        highlightBlowoutCount++;
      }

      if (Math.abs(r - g) < 28 && Math.abs(b - g) < 28 && lum > 40 && lum < 220) {
        neutralCount++;
        sumRedVsGreen += (r - g);
        sumBlueVsGreen += (b - g);
      }
    }
  }

  if (sampledCount === 0) sampledCount = 1;

  const avgTac = Math.round(sumTac / sampledCount);
  const over300Ratio = (tacOver300Count / sampledCount) * 100;
  const over320Ratio = (tacOver320Count / sampledCount) * 100;
  const outOfGamutRatio = (outOfGamutCount / sampledCount) * 100;
  const blackCrushRatio = (blackCrushCount / sampledCount) * 100;
  const highlightBlowoutRatio = (highlightBlowoutCount / sampledCount) * 100;

  let detectedCast: ColorInspectionReport['balance']['detectedCast'] = 'neutral';
  let castDescription = 'Cân bằng xám rất chuẩn (Neutral Gray), không bị ám sắc.';
  let deviationScore = 0;

  if (neutralCount > 50) {
    const avgRG = sumRedVsGreen / neutralCount;
    const avgBG = sumBlueVsGreen / neutralCount;
    deviationScore = Math.round(Math.hypot(avgRG, avgBG));

    if (avgRG > 8 && avgBG < -4) {
      detectedCast = 'warm_red';
      castDescription = `Bản in có xu hướng hơi ám đỏ/ấm (+${Math.round(avgRG)} đơn vị).`;
    } else if (avgBG > 8 && avgRG < -4) {
      detectedCast = 'cool_cyan';
      castDescription = `Bản in có xu hướng hơi ám xanh lam/lạnh (+${Math.round(avgBG)} đơn vị).`;
    } else if (avgRG > 6 && avgBG > 6) {
      detectedCast = 'yellow';
      castDescription = `Bản in có xu hướng ám vàng nhẹ (+${Math.round((avgRG + avgBG) / 2)} đơn vị).`;
    } else if (avgRG < -7 && avgBG < -7) {
      detectedCast = 'green';
      castDescription = `Bản in có xu hướng ám xanh lục (+${Math.round(Math.abs(avgRG))} đơn vị).`;
    } else if (avgRG > 7 && avgBG > 7) {
      detectedCast = 'magenta';
      castDescription = 'Bản in có sắc tố tím/cánh sen nhẹ.';
    }
  }

  let tacStatus: 'safe' | 'warning' | 'danger' = 'safe';
  let tacMessage = `Tổng lượng mực tối đa ${maxTac}% (Trung bình ${avgTac}%). Đạt chuẩn an toàn cho máy in Offset và Kỹ thuật số.`;

  if (maxTac > 320 && over320Ratio > 1.5) {
    tacStatus = 'danger';
    tacMessage = `CẢNH BÁO MỰC ĐẬM: Đỉnh TAC đạt ${maxTac}%, có ${over320Ratio.toFixed(1)}% diện tích vượt ngưỡng 320%. Nguy cơ lem mực, dính trang và lâu khô rất cao khi in giấy Couche/Ivory.`;
  } else if (maxTac > 300 && over300Ratio > 2.0) {
    tacStatus = 'warning';
    tacMessage = `LƯU Ý LƯỢNG MỰC: Đỉnh TAC đạt ${maxTac}%, có ${over300Ratio.toFixed(1)}% diện tích trên 300%. Nên hạ nhẹ kênh Key (K) để tiết kiệm mực và tăng độ sắc nét.`;
  }

  let gamutStatus: 'safe' | 'warning' | 'danger' = 'safe';
  let gamutMessage = 'Phần lớn màu sắc nằm gọn trong dải màu CMYK Offset chuẩn quốc tế (ISO Coated v2 / FOGRA39).';
  const affectedTones = Array.from(gamutTonesSet);

  if (outOfGamutRatio > 8.0) {
    gamutStatus = 'danger';
    gamutMessage = `Có ${outOfGamutRatio.toFixed(1)}% diện tích vượt dải màu in. Các màu này sẽ bị bệt xỉn đáng kể khi in thực tế nếu không bù trừ dải sắc.`;
  } else if (outOfGamutRatio > 2.5) {
    gamutStatus = 'warning';
    gamutMessage = `Có ${outOfGamutRatio.toFixed(1)}% diện tích nằm gần biên dải màu in. Nên kiểm tra kỹ các vùng màu tươi sáng.`;
  }

  let toneStatus: 'good' | 'compressed' | 'clipped' = 'good';
  let toneMessage = 'Độ tương phản và dải sắc độ phân bổ hài hòa, chi tiết bóng tối và vùng sáng rõ nét.';

  if (blackCrushRatio > 6.0 && highlightBlowoutRatio > 6.0) {
    toneStatus = 'clipped';
    toneMessage = `Bản in bị clipping cả 2 đầu: Bệt vùng tối (${blackCrushRatio.toFixed(1)}%) và cháy vùng sáng (${highlightBlowoutRatio.toFixed(1)}%). Nên giảm tương phản (Contrast).`;
  } else if (blackCrushRatio > 8.0) {
    toneStatus = 'clipped';
    toneMessage = `Vùng tối chiếm ${blackCrushRatio.toFixed(1)}% bị bệt hoàn toàn. Nên nâng nhẹ Brightness hoặc kéo Curves vùng Shadow lên.`;
  } else if (highlightBlowoutRatio > 10.0) {
    toneStatus = 'clipped';
    toneMessage = `Vùng sáng chói chiếm ${highlightBlowoutRatio.toFixed(1)}% bị mất chi tiết. Nên hạ Brightness để bảo toàn chi tiết dập nổi/nền.`;
  } else if (blackCrushRatio < 0.5 && highlightBlowoutRatio < 0.5) {
    toneStatus = 'compressed';
    toneMessage = 'Dải tương phản hơi hẹp (ảnh có thể hơi phẳng/thiếu độ sâu). Khuyên dùng S-Curve hoặc tăng nhẹ Contrast.';
  }

  let score = 98;
  if (tacStatus === 'danger') score -= 22;
  else if (tacStatus === 'warning') score -= 10;

  if (gamutStatus === 'danger') score -= 18;
  else if (gamutStatus === 'warning') score -= 8;

  if (toneStatus === 'clipped') score -= 12;
  else if (toneStatus === 'compressed') score -= 4;

  if (detectedCast !== 'neutral' && deviationScore > 10) {
    score -= Math.min(10, Math.round(deviationScore / 2));
  }
  score = Math.max(20, Math.min(100, score));

  let rating: ColorInspectionReport['rating'] = 'Xuất sắc';
  let ratingColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  if (score >= 90) {
    rating = 'Xuất sắc';
    ratingColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  } else if (score >= 78) {
    rating = 'Đạt chuẩn in';
    ratingColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  } else if (score >= 60) {
    rating = 'Cần lưu ý';
    ratingColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  } else {
    rating = 'Nguy cơ lỗi in cao';
    ratingColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  }

  const recommendations: string[] = [];
  const actionableSettings: Partial<ColorAdjustSettings> = { ...currentSettings };

  if (tacStatus === 'danger') {
    recommendations.push('Giảm độ sâu mực đen Key (K) từ -10 đến -15 để ép TAC tối đa xuống dưới 300%.');
    actionableSettings.black = Math.max(-30, (currentSettings.black || 0) - 14);
    actionableSettings.contrast = Math.max(-20, (currentSettings.contrast || 0) - 5);
  } else if (tacStatus === 'warning') {
    recommendations.push('Hạ nhẹ kênh Key (K) -6 để tối ưu tốc độ sấy khô mực và chống dính mặt sau.');
    actionableSettings.black = Math.max(-20, (currentSettings.black || 0) - 6);
  }

  if (gamutStatus !== 'safe') {
    recommendations.push('Giảm nhẹ Saturation (-6%) hoặc tinh chỉnh kênh Cyan/Magenta để các dải màu tươi không bị bệt khi in.');
    actionableSettings.saturation = Math.max(-25, (currentSettings.saturation || 0) - 7);
  }

  if (detectedCast === 'warm_red') {
    recommendations.push('Kéo nhẹ thanh cân bằng Cyan ↔ Red về phía Cyan (-6) để lấy lại sắc xám chuẩn.');
    actionableSettings.balanceCyanRed = Math.max(-25, (currentSettings.balanceCyanRed || 0) - 6);
  } else if (detectedCast === 'cool_cyan') {
    recommendations.push('Kéo nhẹ thanh cân bằng Cyan ↔ Red về phía Red (+6) để bản in ấm áp, tươi tắn hơn.');
    actionableSettings.balanceCyanRed = Math.min(25, (currentSettings.balanceCyanRed || 0) + 6);
  } else if (detectedCast === 'yellow') {
    recommendations.push('Kéo thanh Yellow ↔ Blue về phía Blue (+5) để trung hòa ám vàng.');
    actionableSettings.balanceYellowBlue = Math.min(25, (currentSettings.balanceYellowBlue || 0) + 5);
  }

  if (toneStatus === 'compressed') {
    recommendations.push('Tăng Contrast (+8) để bản in có chiều sâu và phân khối tách bạch.');
    actionableSettings.contrast = Math.min(30, (currentSettings.contrast || 0) + 8);
  } else if (toneStatus === 'clipped') {
    recommendations.push('Tăng nhẹ Brightness (+5) để cứu chi tiết vùng tối (Shadow recovery).');
    actionableSettings.brightness = Math.min(25, (currentSettings.brightness || 0) + 5);
  }

  if (recommendations.length === 0) {
    recommendations.push('Bản in đã đạt thông số quang học và kỹ thuật in ấn hoàn hảo. Sẵn sàng xuất kẽm/CTP hoặc in trực tiếp!');
  }

  let aiSummaryText = `Đánh giá tổng thể: Bản in đạt ${score}/100 điểm (${rating}). Tổng lượng mực đỉnh ${maxTac}%, độ phủ mực bình quân ${avgTac}%. ${gamutMessage} ${castDescription}`;
  let chatGptCritique = '';
  let toneBalanceTable: ToneBalanceTable | undefined;

  // Gửi hình ảnh qua ChatGPT Vision API để nhận xét chuyên sâu bằng AI
  try {
    const apiKey = getOpenAIKey();
    if (apiKey) {
      const optimizedBase64 = canvasToOptimizedBase64(canvas, 1024);
      const prompt = `Bạn là Chuyên gia Prepress & Kỹ thuật In ấn cao cấp.
Hãy phân tích hình ảnh này cho in ấn thương mại (Offset/Kỹ thuật số).
Các thông số đo lường thực tế:
- Điểm chuẩn in: ${score}/100 (${rating})
- Đỉnh TAC: ${maxTac}% (Ngưỡng an toàn <= 300%)
- Gamut clipping: ${outOfGamutRatio.toFixed(1)}%
- Độ lệch sắc: ${castDescription}
- Dải sắc độ: ${toneMessage}

Hãy đưa ra nhận xét ngắn gọn và cung cấp thông số Color Balance (Shadows, Midtones, Highlights) nếu cần chỉnh màu.
Trả về định dạng JSON:
{
  "critique": "Nhận xét 2-3 câu ngắn gọn chuyên sâu...",
  "toneBalance": {
    "shadows": { "cyanRed": 0, "magentaGreen": 0, "yellowBlue": 0 },
    "midtones": { "cyanRed": 0, "magentaGreen": 0, "yellowBlue": 0 },
    "highlights": { "cyanRed": 0, "magentaGreen": 0, "yellowBlue": 0 }
  }
}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: optimizedBase64, detail: 'low' } }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
          max_tokens: 300
        })
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.critique) {
            chatGptCritique = parsed.critique;
            aiSummaryText = parsed.critique;
          }
          if (parsed.toneBalance) {
            toneBalanceTable = parsed.toneBalance;
          }
        }
      }
    }
  } catch (err) {
    // Heuristic offline fallback
  }

  return {
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    score,
    rating,
    ratingColor,
    tac: {
      max: maxTac,
      average: avgTac,
      over300Percent: Math.round(over300Ratio * 10) / 10,
      over320Percent: Math.round(over320Ratio * 10) / 10,
      status: tacStatus,
      message: tacMessage
    },
    gamut: {
      outOfGamutPercent: Math.round(outOfGamutRatio * 10) / 10,
      status: gamutStatus,
      affectedTones,
      message: gamutMessage
    },
    tone: {
      blackCrushPercent: Math.round(blackCrushRatio * 10) / 10,
      highlightBlowoutPercent: Math.round(highlightBlowoutRatio * 10) / 10,
      dynamicRangeStatus: toneStatus,
      message: toneMessage
    },
    balance: {
      detectedCast,
      castDescription,
      deviationScore
    },
    aiRecommendations: {
      title: score >= 90 ? 'Bản in rất tối ưu' : 'Khuyến nghị tinh chỉnh từ AI',
      details: recommendations,
      actionableSettings
    },
    aiSummaryText,
    chatGptCritique,
    toneBalanceTable
  };
}

/**
 * Sinh lớp phủ Heatmap (Overlay Mask) tô màu trực quan các vùng bị lỗi mực hoặc lệch màu
 */
export function generateInspectionHeatmapOverlay(
  sourceCanvas: HTMLCanvasElement,
  mode: 'tac' | 'gamut' | 'tone'
): HTMLCanvasElement {
  const overlay = document.createElement('canvas');
  overlay.width = sourceCanvas.width;
  overlay.height = sourceCanvas.height;
  const ctx = overlay.getContext('2d');
  if (!ctx) return overlay;

  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return overlay;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const srcImgData = srcCtx.getImageData(0, 0, width, height);
  const srcData = srcImgData.data;

  const outImgData = ctx.createImageData(width, height);
  const outData = outImgData.data;

  for (let i = 0; i < srcData.length; i += 4) {
    const a = srcData[i + 3];
    if (a < 15) continue;

    const r = srcData[i];
    const g = srcData[i + 1];
    const b = srcData[i + 2];

    if (mode === 'tac') {
      const rN = r / 255;
      const gN = g / 255;
      const bN = b / 255;
      const maxVal = Math.max(rN, gN, bN);
      const k = 1 - maxVal;
      let c = 0, m = 0, y = 0;
      if (k < 0.999) {
        c = (1 - rN - k) / (1 - k);
        m = (1 - gN - k) / (1 - k);
        y = (1 - bN - k) / (1 - k);
      }
      const tac = Math.round((c + m + y + k) * 100);

      if (tac > 320) {
        outData[i] = 236;
        outData[i + 1] = 72;
        outData[i + 2] = 153;
        outData[i + 3] = 220; // Neon pink/purple
      } else if (tac > 300) {
        outData[i] = 239;
        outData[i + 1] = 68;
        outData[i + 2] = 68;
        outData[i + 3] = 200; // Red
      }
    } else if (mode === 'gamut') {
      const rN = r / 255;
      const gN = g / 255;
      const bN = b / 255;
      const maxVal = Math.max(rN, gN, bN);
      const minVal = Math.min(rN, gN, bN);
      const chroma = maxVal - minVal;
      const sat = maxVal > 0.001 ? chroma / maxVal : 0;

      if (sat > 0.82 && maxVal > 0.4) {
        outData[i] = 6;
        outData[i + 1] = 182;
        outData[i + 2] = 212;
        outData[i + 3] = 220; // Cyan dạ quang
      }
    } else if (mode === 'tone') {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 10) {
        outData[i] = 59;
        outData[i + 1] = 130;
        outData[i + 2] = 246;
        outData[i + 3] = 220; // Blue
      } else if (lum > 248) {
        outData[i] = 245;
        outData[i + 1] = 158;
        outData[i + 2] = 11;
        outData[i + 3] = 220; // Yellow-amber
      }
    }
  }

  ctx.putImageData(outImgData, 0, 0);
  return overlay;
}
