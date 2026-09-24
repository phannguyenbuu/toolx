/* eslint-disable */
import React from 'react';

// --- CONSTANTS ---
export const MM_TO_PX = 3.7795; // 96 DPI

// Uses proxy - relative URLs
export const API_BASE = '/api';

// --- TYPES ---
export type ElementType = 'text' | 'box' | 'qr' | 'barcode' | 'image' | 'img-data';
export type ObjectFitType = 'fill' | 'contain' | 'cover' | 'none';
export type ImgDataType = 'filename' | 'number';
export type TextFitMode = 'actual' | 'fit' | 'stretch' | 'fill';
export type AlignMode = 'content' | 'page'; 
export type QrCodeType = 'default' | 'micro' | 'iqr' | 'rmqr';
export type QrBankTemplate = 'compact2' | 'compact' | 'qr_only' | 'print';

export interface BankInfo {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

export interface QrBankConfig {
  enabled: boolean;
  bankBin: string;
  accountNoField: string;
  accountNameField: string;
  addInfoField: string;
  amountField: string;
  template: QrBankTemplate;
}

export interface ElementData {
  id: string;
  type: ElementType;
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  content: string;
  style: React.CSSProperties;
  src?: string; 
  // Common Props
  isLocked?: boolean;
  isPrintVisible?: boolean; 
  borderRadius?: string; 
  
  // Image/ImgData Props
  objectFit?: ObjectFitType;
  objectPosition?: string; // e.g. "50% 50%"
  dataType?: ImgDataType;

  // Text Advanced Props
  textFitMode?: TextFitMode; 
  textAlignH?: 'flex-start' | 'center' | 'flex-end'; 
  textAlignV?: 'flex-start' | 'center' | 'flex-end'; 
  textWrap?: boolean; 
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  isCurved?: boolean; 
  qrType?: QrCodeType;
  isStretched?: boolean;
  rotate?: number; // degrees
  // QR Bank Props
  qrBankConfig?: QrBankConfig;
}

export interface SheetRow {
  [key: string]: string;
}

export interface UploadedImage {
  id: string;
  name: string;
  src: string;
}

export interface PageConfig {
  format: 'A3' | 'A4' | 'A5' | 'Custom';
  orientation: 'portrait' | 'landscape';
  width: number; // mm
  height: number; // mm
}

export type InteractionMode = 'IDLE' | 'DRAGGING' | 'RESIZING' | 'ROTATING';
export type SidebarTab = 'properties' | 'layers';
export type DataTab = 'table' | 'google' | 'upload';

// --- UTILS ---
export const generateId = () => Math.random().toString(36).substr(2, 9);
export const pxToMm = (px: number) => Math.round((px / MM_TO_PX) * 100) / 100;
export const mmToPx = (mm: number) => mm * MM_TO_PX;

export const parseCSV = (text: string) => {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []; 
    const simpleValues = line.split(',');
    const finalValues = values.length >= headers.length ? values : simpleValues;
    const rowData: SheetRow = {};
    headers.forEach((h, i) => {
      rowData[h] = (finalValues[i] || '').replace(/^"|"$/g, '').trim();
    });
    return rowData;
  });
  return { headers, rows };
};

export const processGoogleSheetUrl = (url: string) => {
  try {
    if (url.includes('output=csv') || url.endsWith('.csv')) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
    return null;
  } catch (e) { return null; }
};

export const getQrUrl = (content: string, type: string = 'default') => {
    const encoded = encodeURIComponent(content);
    switch (type) {
        case 'micro': return `https://bwipjs-api.metafloor.com/?bcid=microqrcode&text=${encoded}&scale=2`;
        case 'rmqr': return `https://bwipjs-api.metafloor.com/?bcid=rmqr&text=${encoded}&scale=2`;
        case 'iqr': return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}&color=000080`; 
        default: return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}`;
    }
};
