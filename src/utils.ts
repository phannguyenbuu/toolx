export const MM_TO_PX = 3.7795; // 96 DPI

export const generateId = () => Math.random().toString(36).substr(2, 9);
export const pxToMm = (px: number) => Math.round((px / MM_TO_PX) * 100) / 100;
export const mmToPx = (mm: number) => mm * MM_TO_PX;

export const parseCSV = (text: string) => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []; 
    const simpleValues = line.split(',');
    const finalValues = values.length >= headers.length ? values : simpleValues;
    const rowData: Record<string, string> = {};
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
  } catch (e) { 
    return null; 
  }
};

export const getQrUrl = (content: string, type: string = 'default') => {
  const encoded = encodeURIComponent(content);
  switch (type) {
    case 'micro': 
      return `https://bwipjs-api.metafloor.com/?bcid=microqrcode&text=${encoded}&scale=2`;
    case 'rmqr': 
      return `https://bwipjs-api.metafloor.com/?bcid=rmqr&text=${encoded}&scale=2`;
    case 'iqr': 
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}&color=000080`; 
    default: 
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}`;
  }
};
