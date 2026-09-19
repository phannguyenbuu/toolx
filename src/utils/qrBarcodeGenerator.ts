import QRCodeStyling from 'qr-code-styling';
import JsBarcode from 'jsbarcode';

export async function generateQRCodeDataUrl(
  data: string,
  width: number = 100,
  height: number = 100
): Promise<string> {
  const qrCode = new QRCodeStyling({
    width,
    height,
    data: data || '123456',
    type: 'canvas',
    dotsOptions: {
      color: '#000000',
      type: 'square'
    },
    backgroundOptions: {
      color: '#ffffff'
    },
    cornersSquareOptions: {
      type: 'square'
    },
    cornersDotOptions: {
      type: 'square'
    }
  });

  const blob = await qrCode.getRawData('png');
  if (!blob) throw new Error('Failed to generate QR code');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob as Blob);
  });
}

export function generateBarcodeDataUrl(
  data: string,
  width: number = 150,
  height: number = 50,
  displayValue: boolean = true,
  format: string = 'CODE128'
): string {
  const canvas = document.createElement('canvas');
  
  try {
    JsBarcode(canvas, data || '123456', {
      format: format as any,
      width: 2,
      height: displayValue ? Math.max(30, height - 20) : Math.max(30, height),
      displayValue: displayValue,
      fontSize: 12,
      margin: 5,
      background: '#ffffff',
      lineColor: '#000000',
      textMargin: 2
    });
  } catch (err) {
    // Fallback to CODE128 if format fails
    try {
      JsBarcode(canvas, data || '123456', {
        format: 'CODE128',
        width: 2,
        height: displayValue ? Math.max(30, height - 20) : Math.max(30, height),
        displayValue: displayValue,
        fontSize: 12,
        margin: 5,
        textMargin: 2
      });
    } catch (err2) {
      // Last resort: simple barcode
      JsBarcode(canvas, '123456', {
        format: 'CODE128',
        width: 2,
        height: displayValue ? Math.max(30, height - 20) : Math.max(30, height),
        displayValue: displayValue,
        fontSize: 12,
        margin: 5,
        textMargin: 2
      });
    }
  }
  
  return canvas.toDataURL('image/png');
}
