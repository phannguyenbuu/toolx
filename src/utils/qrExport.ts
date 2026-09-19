import { jsPDF } from 'jspdf';

export const exportQRtoEPS = async (svgString: string, name: string = 'qr-code') => {
  // Convert SVG to PostScript commands
  const eps = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 240 240
%%Creator: QR Code Generator
%%Title: ${name}
%%Pages: 1
%%EndComments
${svgString
  .replace(/<svg[^>]*>/, '')
  .replace('</svg>', '')
  .replace(/<rect/g, 'newpath')
  .replace(/x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)"/g, 
    (_, x, y, w, h) => `${x} ${240-y-Number(h)} moveto ${w} ${h} rlineto`)
  .replace(/fill="([^"]*)"/g, 'fill')
}
showpage
%%EOF`;

  // Create download link
  const blob = new Blob([eps], { type: 'application/postscript' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.eps`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportQRtoPDF = async (svgString: string, name: string = 'qr-code') => {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [85, 85] // Standard QR code size
  });

  // Convert SVG to data URL
  const svg = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svg);
  
  // Create temporary image to get dimensions
  const img = new Image();
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = url;
  });

  // Add QR code to PDF
  doc.addImage(url, 'SVG', 10, 10, 65, 65); // Add 10mm margins
  
  // Save PDF
  doc.save(`${name}.pdf`);
  URL.revokeObjectURL(url);
};
