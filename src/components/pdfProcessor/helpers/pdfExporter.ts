import { PageData } from '../types';
import { RENDER_SCALE } from '../constants';

interface ExportPdfOptions {
  pdfData: ArrayBuffer;
  pagesData: PageData[];
  mode: 'single' | 'all';
  curPageIndex: number | null;
  onProgress?: (progress: number, text: string) => void;
}

export async function exportPdfWithModifications({
  pdfData,
  pagesData,
  mode,
  curPageIndex,
  onProgress
}: ExportPdfOptions): Promise<void> {
  if (!pdfData) {
    throw new Error('Vui lòng tải file PDF lên trước.');
  }

  const { PDFDocument, rgb, degrees, StandardFonts } = window.PDFLib;

  if (typeof window.fontkit !== 'undefined') {
    PDFDocument.prototype.registerFontkit(window.fontkit);
  }

  const srcDoc = await PDFDocument.load(pdfData.slice(0));
  const newDoc = await PDFDocument.create();

  let pagesToSave: PageData[] = [];
  if (mode === 'single') {
    if (curPageIndex === null) {
      throw new Error("Chế độ 'Xuất Trang Này' chỉ hoạt động khi bạn đang mở trình chỉnh sửa.");
    }
    if (pagesData[curPageIndex].deleted) {
      throw new Error("Trang hiện tại đã bị xóa và không thể xuất.");
    }
    pagesToSave = [pagesData[curPageIndex]];
  } else {
    pagesToSave = pagesData.filter(p => !p.deleted);
  }

  if (pagesToSave.length === 0) {
    throw new Error("Không còn trang nào để xuất file.");
  }

  const pageIndices = pagesToSave.map(p => p.num - 1);
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);

  const embeddedFonts: Record<string, any> = {};

  const getFont = async (fontName: string) => {
    const normalizedName = fontName.replace(" (Local)", "").trim();
    if (embeddedFonts[normalizedName]) return embeddedFonts[normalizedName];

    let standardFontName;
    if (normalizedName.includes("Arial") || normalizedName.includes("Helvetica")) {
      standardFontName = StandardFonts.Helvetica;
    } else if (normalizedName.includes("Times")) {
      standardFontName = StandardFonts.TimesNewRoman;
    } else if (normalizedName.includes("Courier")) {
      standardFontName = StandardFonts.Courier;
    }

    if (standardFontName) {
      try {
        const font = await newDoc.embedFont(standardFontName);
        embeddedFonts[normalizedName] = font;
        return font;
      } catch (e) {}
    }

    // Fallback to Helvetica
    const font = await newDoc.embedFont(StandardFonts.Helvetica);
    embeddedFonts[normalizedName] = font;
    return font;
  };

  for (let i = 0; i < copiedPages.length; i++) {
    if (onProgress) {
      const pct = ((i + 1) / copiedPages.length) * 100;
      onProgress(pct, `Đang xử lý trang ${i + 1}/${copiedPages.length}...`);
    }

    const page = newDoc.addPage(copiedPages[i]);
    const { height } = page.getSize();
    const pData = pagesToSave[i];

    if (pData.rotation) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + pData.rotation));
    }

    if (pData.json?.objects?.length > 0) {
      const scale = 1 / RENDER_SCALE;

      for (const obj of pData.json.objects) {
        let r = 0, g = 0, b = 0;
        if (obj.fill && typeof obj.fill === 'string') {
          try {
            const color = new window.fabric.Color(obj.fill).getSource();
            r = color[0] / 255;
            g = color[1] / 255;
            b = color[2] / 255;
          } catch (e) {}
        }

        const objW = obj.width * obj.scaleX * scale;
        const objH = obj.height * obj.scaleY * scale;
        const x = obj.left * scale;
        const y = height - (obj.top * scale) - objH;

        if (obj.type === 'rect') {
          page.drawRectangle({
            x,
            y,
            width: objW,
            height: objH,
            color: rgb(r, g, b),
            borderWidth: 0
          });
        } else if (obj.type === 'i-text') {
          const font = await getFont(obj.fontFamily);
          const fSize = obj.fontSize * obj.scaleY * scale;
          const textY = y + objH - (fSize * 0.8);

          const lines = obj.text.split('\n');
          let currentY = textY;

          for (const line of lines) {
            page.drawText(line, {
              x,
              y: currentY,
              size: fSize,
              font,
              color: rgb(r, g, b)
            });
            currentY -= fSize * (obj.lineHeight || 1.16);
          }
        }
      }
    }
  }

  if (onProgress) {
    onProgress(100, 'Đang tạo file PDF hoàn chỉnh...');
  }

  const pdfBytes = await newDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'PDF_Studio_Export.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
