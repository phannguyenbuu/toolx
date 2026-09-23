import { useState, useRef, useEffect, useCallback } from 'react';
import { ElementData, SheetRow, VIETNAM_BANKS } from '../types';
import { generateQRCodeDataUrl, generateBarcodeDataUrl } from '../../../utils/qrBarcodeGenerator';

export function useQrBarcodeImages(
  elements: ElementData[],
  currentRow: SheetRow,
  replaceVariables: (text: string) => string,
  currentRowIndex: number
) {
  const [qrImages, setQrImages] = useState<Map<string, HTMLImageElement>>(new Map());

  const generateVietQRContent = useCallback(
    (el: ElementData): string => {
      if (el.qrTemplate !== 'vietqr' || !el.bankCode) return el.content;
      const bank = VIETNAM_BANKS.find(b => b.code === el.bankCode);
      if (!bank) return el.content;
      const accountNo = replaceVariables(el.accountNo || '');
      const amount = replaceVariables(el.amount || '');
      const memo = replaceVariables(el.memo || '');
      const style = el.vietqrStyle || 'compact';
      const amountStr = amount ? `&amount=${amount}` : '';
      const memoStr = memo ? `&addInfo=${encodeURIComponent(memo)}` : '';
      return `https://img.vietqr.io/image/${bank.bin}-${accountNo}-${style}.png?accountName=${encodeURIComponent(
        el.accountName || ''
      )}${amountStr}${memoStr}`;
    },
    [replaceVariables]
  );

  // Clear QR cache when data row changes so QR re-generates with new variables
  const qrCacheVersion = useRef(0);
  useEffect(() => {
    qrCacheVersion.current += 1;
    setQrImages(new Map());
  }, [currentRowIndex, currentRow]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    elements.forEach(async el => {
      if (el.type === 'qr' && !qrImages.has(el.id)) {
        try {
          if (el.qrTemplate === 'vietqr' && el.bankCode && el.accountNo) {
            const vietQRUrl = generateVietQRContent(el);
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              if (isMounted && !abortController.signal.aborted) {
                setQrImages(prev => new Map(prev).set(el.id, img));
              }
            };
            img.onerror = async () => {
              if (!isMounted || abortController.signal.aborted) return;
              try {
                const content = replaceVariables(el.content || 'VietQR');
                const dataUrl = await generateQRCodeDataUrl(content);
                const fallbackImg = new window.Image();
                fallbackImg.onload = () => {
                  if (isMounted && !abortController.signal.aborted) {
                    setQrImages(prev => new Map(prev).set(el.id, fallbackImg));
                  }
                };
                fallbackImg.src = dataUrl;
              } catch (err) {
                console.error('QR fallback generation error:', err);
              }
            };
            img.src = vietQRUrl;
          } else {
            const content = replaceVariables(el.content);
            const dataUrl = await generateQRCodeDataUrl(content);
            if (!isMounted || abortController.signal.aborted) return;
            const img = new window.Image();
            img.onload = () => {
              if (isMounted && !abortController.signal.aborted) {
                setQrImages(prev => new Map(prev).set(el.id, img));
              }
            };
            img.src = dataUrl;
          }
        } catch (err) {
          console.error('QR generation error:', err);
        }
      }
      if (el.type === 'barcode' && !qrImages.has(el.id)) {
        const content = replaceVariables(el.content);
        const showText = el.barcodeShowText !== false;
        const format = el.barcodeFormat || 'CODE128';
        try {
          const dataUrl = generateBarcodeDataUrl(content, 150, 50, showText, format);
          if (!isMounted || abortController.signal.aborted) return;
          const img = new window.Image();
          img.onload = () => {
            if (isMounted && !abortController.signal.aborted) {
              setQrImages(prev => new Map(prev).set(el.id, img));
            }
          };
          img.onerror = () => {
            console.error('Barcode image load error for:', el.id);
            try {
              const fallbackUrl = generateBarcodeDataUrl(content || '123456', 150, 50, showText, 'CODE128');
              const fallbackImg = new window.Image();
              fallbackImg.onload = () => {
                if (isMounted && !abortController.signal.aborted) {
                  setQrImages(prev => new Map(prev).set(el.id, fallbackImg));
                }
              };
              fallbackImg.src = fallbackUrl;
            } catch (e) {
              console.error('Barcode fallback error:', e);
            }
          };
          img.src = dataUrl;
        } catch (err) {
          console.error('Barcode generation error:', err);
        }
      }
    });

    return () => {
      isMounted = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, currentRow, generateVietQRContent, replaceVariables]);

  return { qrImages };
}
