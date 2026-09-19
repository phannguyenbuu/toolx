import React from 'react';
import { ElementData } from '../App';

export interface RenderOptions {
  mmToPx: (mm: number) => number;
  resolveContent: (content: string, row?: Record<string, string>) => string;
  resolveImageSrc: (el: ElementData, row?: Record<string, string>) => string;
  rowData?: Record<string, string>;
  isExport?: boolean; 
  isCanvas?: boolean; 
  isSelected?: boolean;
  isMultiSelected?: boolean;
  isLocked?: boolean;
  onMouseDown?: (e: React.MouseEvent, id?: string, action?: string) => void;
  elId?: string;
}

export const renderElement = (el: ElementData, options: RenderOptions) => {
  const { mmToPx, resolveContent, resolveImageSrc, rowData, isExport, isCanvas, isSelected, isMultiSelected, isLocked, onMouseDown } = options;
  
  const content = resolveContent(el.content, rowData);
  const resolvedImgSrc = (el.type === 'image' || el.type === 'img-data') ? resolveImageSrc(el, rowData) : '';
  
  const unit = isExport ? 'mm' : 'px';
  const val = (v: number) => isExport ? v : mmToPx(v);
  
  const borderValue = el.style.border ? String(el.style.border) : 'none';

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${val(el.x)}${unit}`,
    top: `${val(el.y)}${unit}`,
    width: `${val(el.width)}${unit}`,
    height: `${val(el.height)}${unit}`,
    zIndex: el.style.zIndex,
    borderRadius: el.borderRadius || '0px',
    backgroundColor: el.style.backgroundColor || 'transparent',
    border: borderValue,
    overflow: (el.textFitMode === 'fill' || el.textFitMode === 'stretch') ? 'hidden' : el.style.overflow || 'visible',
    boxSizing: 'border-box',
    transform: `rotate(${el.rotate || 0}deg)`,
    transformOrigin: 'center center',
    cursor: isCanvas ? (isLocked ? 'default' : 'move') : 'default',
    outline: isCanvas && isMultiSelected && !isSelected ? '2px dashed #6366f1' : 'none'
  };

  const renderTextContent = () => {
    const fontSizeVal = isExport ? el.style.fontSize : `${parseInt(el.style.fontSize as string) || 12}px`;
    
    const textStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: el.textAlignV || 'center',
      alignItems: el.textAlignH || 'center',
      whiteSpace: el.textWrap ? 'normal' : 'nowrap',
      fontFamily: el.style.fontFamily ? `"${el.style.fontFamily}"` : 'Arial',
      fontSize: fontSizeVal,
      fontWeight: el.style.fontWeight || 'normal',
      fontStyle: el.style.fontStyle || 'normal',
      textDecoration: el.style.textDecoration || 'none',
      color: el.style.color || '#000000',
      letterSpacing: el.style.letterSpacing,
      lineHeight: el.style.lineHeight,
      WebkitTextStroke: el.strokeWidth ? `${el.strokeWidth}px ${el.strokeColor || '#000'}` : 'none',
      textShadow: el.shadowColor ? `${el.shadowOffsetX || 2}px ${el.shadowOffsetY || 2}px ${el.shadowBlur || 0}px ${el.shadowColor}` : 'none'
    };

    if (el.textFitMode === 'stretch') {
      return (
        <div style={textStyle}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{display:'block', overflow: 'visible'}}>
            <text 
              x="50" y="50" 
              dominantBaseline="middle" 
              textAnchor="middle" 
              fontSize="80" 
              fill={el.style.color as string || '#000000'} 
              fontFamily={el.style.fontFamily ? `"${el.style.fontFamily}"` : 'Arial'} 
              fontWeight={el.style.fontWeight as string || 'normal'} 
              fontStyle={el.style.fontStyle as string || 'normal'} 
              stroke={el.strokeColor || 'none'} 
              strokeWidth={(el.strokeWidth || 0) * (100 / val(el.height))}
            >
              {content}
            </text>
          </svg>
        </div>
      );
    } else if (el.textFitMode === 'fit') {
      return (
        <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'}}>
          <span style={{
             ...textStyle, 
             display:'inline', 
             width: 'auto', 
             height: 'auto',
             fontSize: isExport ? 
               `${Math.min(el.width/(content.length * 0.6), el.height)}mm` : 
               `${Math.min(mmToPx(el.width)/(content.length * 0.6), mmToPx(el.height))}px`
          }}>{content}</span>
        </div>
      );
    } else if (el.textFitMode === 'fill') {
       return (
          <div style={{width:'100%',height:'100%',display:'flex',justifyContent:'center',alignItems:'center'}}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <text x="50" y="50" dominantBaseline="middle" textAnchor="middle" 
                style={{
                    fontFamily: el.style.fontFamily ? `"${el.style.fontFamily}"` : 'Arial', 
                    fontSize:'80px', 
                    fontWeight: el.style.fontWeight || 'normal', 
                    fill: el.style.color || '#000000',
                    fontStyle: el.style.fontStyle || 'normal'
                }}
              >{content}</text>
            </svg>
          </div>
       );
    } else {
      return <div style={textStyle}>{content}</div>;
    }
  };

  const renderImage = () => {
    if (!resolvedImgSrc) return null;
    const imgStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: el.objectFit || 'contain',
      objectPosition: el.objectPosition || '50% 50%'
    };
    return <img src={resolvedImgSrc} style={imgStyle} alt="" />;
  };

  const renderQR = () => {
    const getQrUrl = (content: string, qrType: string = 'default') => {
      const encoded = encodeURIComponent(content);
      switch (qrType) {
        case 'micro': return `https://bwipjs-api.metafloor.com/?bcid=microqrcode&text=${encoded}&scale=2`;
        case 'rmqr': return `https://bwipjs-api.metafloor.com/?bcid=rmqr&text=${encoded}&scale=2`;
        case 'iqr': return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}&color=000080`;
        default: return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}`;
      }
    };
    return <img src={getQrUrl(content, el.qrType)} style={{width:'100%', height:'100%', objectFit:'contain'}} alt="" />;
  };

  const renderBarcode = () => {
    return <img src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(content)}&scale=2&height=50`} style={{width:'100%', height:'100%'}} alt="" />;
  };

  const renderContent = () => {
    switch (el.type) {
      case 'text': return renderTextContent();
      case 'image':
      case 'img-data': return renderImage();
      case 'qr': return renderQR();
      case 'barcode': return renderBarcode();
      case 'box': return null;
      default: return null;
    }
  };

  return (
    <div key={el.id} style={baseStyle} 
      className={isCanvas ? `absolute group ${isSelected || isMultiSelected ? 'z-10' : ''}` : ''}
      onMouseDown={isCanvas ? (e) => onMouseDown?.(e, el.id) : undefined}
    >
      {renderContent()}
    </div>
  );
};

export const shouldElementBeVisible = (el: ElementData, mode: 'preview' | 'export' = 'preview') => {
  return el.isPrintVisible !== false; 
};
