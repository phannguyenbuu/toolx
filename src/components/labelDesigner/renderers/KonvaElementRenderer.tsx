import React from 'react';
import { Text, Rect, Image as KonvaImage, Group } from 'react-konva';
import Konva from 'konva';
import { ElementData, UploadedImage, mmToPx } from '../types';

export interface KonvaElementRendererProps {
  element: ElementData;
  isSelected: boolean;
  replaceVariables: (text: string) => string;
  uploadedImages: UploadedImage[];
  loadedImages: Map<string, HTMLImageElement>;
  qrImages: Map<string, HTMLImageElement>;
  onSelect: (id: string, shiftKey: boolean) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>, id: string) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>, id: string) => void;
}

export const KonvaElementRenderer: React.FC<KonvaElementRendererProps> = ({
  element: el,
  replaceVariables,
  uploadedImages,
  loadedImages,
  qrImages,
  onSelect,
  onDragEnd,
  onTransformEnd
}) => {
  if (!el.isVisible) return null;

  const x = mmToPx(el.x);
  const y = mmToPx(el.y);
  const width = mmToPx(el.width);
  const height = mmToPx(el.height);

  const commonProps = {
    id: el.id,
    x,
    y,
    width,
    height,
    rotation: el.rotate || 0,
    draggable: !el.isLocked,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e, el.id),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => onTransformEnd(e, el.id),
    opacity: el.opacity ?? 1,
    perfectDrawEnabled: false,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(el.id, e.evt.shiftKey);
    }
  };

  switch (el.type) {
    case 'text': {
      const displayText = replaceVariables(el.content);
      return (
        <Text
          key={el.id}
          {...commonProps}
          text={displayText}
          fontSize={el.fontSize || 16}
          fontFamily={el.fontFamily || 'Arial'}
          fontStyle={
            `${el.fontWeight === 'bold' ? 'bold' : ''} ${
              el.fontStyle === 'italic' ? 'italic' : ''
            }`.trim() || 'normal'
          }
          textDecoration={el.textDecoration}
          fill={el.color || '#000000'}
          align={el.textAlignH || 'left'}
          verticalAlign={el.textAlignV || 'top'}
          stroke={el.stroke || undefined}
          strokeWidth={el.strokeWidth || 0}
          shadowColor={el.shadowColor || undefined}
          shadowBlur={el.shadowBlur || 0}
          shadowOffsetX={el.shadowOffsetX || 0}
          shadowOffsetY={el.shadowOffsetY || 0}
          shadowEnabled={
            Boolean(el.shadowColor && (el.shadowBlur || el.shadowOffsetX || el.shadowOffsetY))
          }
        />
      );
    }
    case 'box':
      return (
        <Rect
          key={el.id}
          {...commonProps}
          fill={el.backgroundColor || '#e5e7eb'}
          stroke={el.borderColor || '#000000'}
          strokeWidth={el.borderWidth || 0}
          cornerRadius={el.borderRadius || 0}
        />
      );
    case 'image':
    case 'img-data': {
      let imgSrc = el.src;
      if (el.type === 'img-data' && el.content) {
        const value = replaceVariables(el.content);
        if (value && !value.includes('{') && !value.includes('}')) {
          let found: UploadedImage | undefined;
          const dataType = el.dataType || 'filename';

          if (dataType === 'number') {
            const idx = parseInt(value, 10) - 1;
            if (!isNaN(idx) && idx >= 0 && idx < uploadedImages.length) {
              found = uploadedImages[idx];
            }
          } else {
            const matchMode = el.matchMode || 'contains';
            const ignoreExt = el.ignoreExtension || false;
            const isBidirectional = el.bidirectional || false;

            found = uploadedImages.find(img => {
              let imgName = img.name;
              let searchValue = value;

              if (ignoreExt) {
                imgName = imgName.replace(/\.[^.]+$/, '');
                searchValue = searchValue.replace(/\.[^.]+$/, '');
              }

              const nameLower = imgName.toLowerCase();
              const valueLower = searchValue.toLowerCase();

              if (matchMode === 'exact') return imgName === searchValue;
              if (matchMode === 'startsWith') {
                if (isBidirectional) {
                  return nameLower.startsWith(valueLower) || valueLower.startsWith(nameLower);
                }
                return nameLower.startsWith(valueLower);
              }
              if (matchMode === 'endsWith') {
                if (isBidirectional) {
                  return nameLower.endsWith(valueLower) || valueLower.endsWith(nameLower);
                }
                return nameLower.endsWith(valueLower);
              }
              return nameLower.includes(valueLower);
            });
          }

          if (found) imgSrc = found.src;
        }

        if ((el.dataType || 'filename') === 'url') {
          const urlVal = replaceVariables(el.content);
          if (urlVal && !urlVal.includes('{')) imgSrc = urlVal;
        }
      }

      const img = imgSrc ? loadedImages.get(imgSrc) : null;
      if (!img) return <Rect key={el.id} {...commonProps} fill="#f3f4f6" stroke="#d1d5db" />;

      const fit = el.objectFit || 'fill';
      let cropX = 0,
        cropY = 0,
        cropW = img.width,
        cropH = img.height;

      if (fit === 'contain') {
        const s = Math.min(width / img.width, height / img.height);
        const sw = img.width * s;
        const sh = img.height * s;
        return (
          <Group key={el.id} {...commonProps}>
            <KonvaImage
              image={img}
              x={(width - sw) / 2}
              y={(height - sh) / 2}
              width={sw}
              height={sh}
            />
          </Group>
        );
      }

      if (fit === 'cover') {
        const s = Math.max(width / img.width, height / img.height);
        cropW = width / s;
        cropH = height / s;
        cropX = (img.width - cropW) / 2;
        cropY = (img.height - cropH) / 2;
      }

      return (
        <KonvaImage
          key={el.id}
          {...commonProps}
          image={img}
          crop={fit === 'cover' ? { x: cropX, y: cropY, width: cropW, height: cropH } : undefined}
        />
      );
    }
    case 'qr':
    case 'barcode': {
      const codeImg = qrImages.get(el.id);
      if (!codeImg) return <Rect key={el.id} {...commonProps} fill="#f3f4f6" stroke="#d1d5db" />;
      return <KonvaImage key={el.id} {...commonProps} image={codeImg} />;
    }
    default:
      return null;
  }
};
