import { ColorAdjustSettings, CurvePoint } from '../colorAdjustment';
import { PrintMatchComparisonReport } from './types';
import { getOpenAIKey, canvasToOptimizedBase64 } from './openAiConfig';

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
