import { ColorAdjustSettings } from '../colorAdjustment';
import { ColorInspectionReport, ToneBalanceTable } from './types';
import { getOpenAIKey, canvasToOptimizedBase64 } from './openAiConfig';
import { analyzeCanvasPixels } from './pixelAnalyzer';

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

  const {
    maxTac,
    avgTac,
    over300Ratio,
    over320Ratio,
    outOfGamutRatio,
    affectedTones,
    blackCrushRatio,
    highlightBlowoutRatio,
    detectedCast,
    castDescription,
    deviationScore
  } = analyzeCanvasPixels(ctx, width, height);

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
