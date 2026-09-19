/**
 * Document Templates - Headers & Footers
 */

export interface Template {
  id: string;
  name: string;
  category: 'header' | 'footer';
  html: string;
  preview?: string;
}

// ==================== HEADER TEMPLATES ====================

export const HEADER_TEMPLATES: Template[] = [
  {
    id: 'header-simple',
    name: 'Đơn giản',
    category: 'header',
    html: `<div style="text-align: center;">
  <h2 style="margin: 0; color: #333;">{{companyName}}</h2>
  <p style="margin: 5px 0; font-size: 12px;">{{companyAddress}}</p>
  <p style="margin: 5px 0; font-size: 12px;">ĐT: {{companyPhone}} | Email: {{companyEmail}}</p>
</div>`,
  },
  {
    id: 'header-professional',
    name: 'Chuyên nghiệp',
    category: 'header',
    html: `<table style="width: 100%; border-collapse: collapse;">
  <tr>
    <td style="width: 70%;">
      <h2 style="margin: 0; color: #1e40af;">{{companyName}}</h2>
      <p style="margin: 5px 0; font-size: 11px;">{{companyAddress}}</p>
      <p style="margin: 5px 0; font-size: 11px;">ĐT: {{companyPhone}}</p>
    </td>
    <td style="width: 30%; text-align: right; vertical-align: top;">
      <p style="font-size: 10px; color: #666;">Website: {{companyWebsite}}</p>
      <p style="font-size: 10px; color: #666;">Email: {{companyEmail}}</p>
      <p style="font-size: 10px; color: #666;">MST: {{companyTaxCode}}</p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'header-modern',
    name: 'Hiện đại',
    category: 'header',
    html: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; border-radius: 8px;">
  <h1 style="margin: 0; font-size: 24px;">{{companyName}}</h1>
  <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.9;">{{companyAddress}} | {{companyPhone}}</p>
</div>`,
  },
  {
    id: 'header-minimal',
    name: 'Tối giản',
    category: 'header',
    html: `<div style="border-bottom: 3px solid #333; padding-bottom: 10px;">
  <h3 style="margin: 0; font-weight: 600;">{{companyName}}</h3>
  <p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">{{companyPhone}} • {{companyEmail}}</p>
</div>`,
  },
  {
    id: 'header-elegant',
    name: 'Thanh lịch',
    category: 'header',
    html: `<div style="text-align: center; border: 2px solid #d4af37; padding: 15px; border-radius: 4px;">
  <h2 style="margin: 0; color: #d4af37; font-family: serif;">{{companyName}}</h2>
  <p style="margin: 8px 0 0 0; font-size: 11px; font-style: italic;">{{companyAddress}}</p>
  <p style="margin: 5px 0 0 0; font-size: 11px;">☎ {{companyPhone}} ✉ {{companyEmail}}</p>
</div>`,
  },
];

// ==================== FOOTER TEMPLATES ====================

export const FOOTER_TEMPLATES: Template[] = [
  {
    id: 'footer-simple',
    name: 'Đơn giản',
    category: 'footer',
    html: `<div style="text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px;">
  <p>Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ của chúng tôi!</p>
</div>`,
  },
  {
    id: 'footer-signature',
    name: 'Có chữ ký',
    category: 'footer',
    html: `<div style="margin-top: 30px;">
  <table style="width: 100%;">
    <tr>
      <td style="width: 50%; text-align: center;">
        <p style="font-weight: bold; margin: 0;">Người lập</p>
        <p style="margin-top: 60px; font-size: 11px;">(Ký, ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; text-align: center;">
        <p style="font-weight: bold; margin: 0;">Khách hàng</p>
        <p style="margin-top: 60px; font-size: 11px;">(Ký, ghi rõ họ tên)</p>
      </td>
    </tr>
  </table>
</div>`,
  },
  {
    id: 'footer-terms',
    name: 'Điều khoản',
    category: 'footer',
    html: `<div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 4px;">
  <p style="font-weight: bold; margin: 0 0 8px 0; font-size: 12px;">Điều khoản & Điều kiện:</p>
  <ul style="margin: 0; padding-left: 20px; font-size: 11px; color: #666;">
    <li>Báo giá có hiệu lực trong 15 ngày kể từ ngày lập</li>
    <li>Giá đã bao gồm VAT 10%</li>
    <li>Thanh toán 50% trước khi sản xuất, 50% khi giao hàng</li>
  </ul>
</div>`,
  },
  {
    id: 'footer-contact',
    name: 'Thông tin liên hệ',
    category: 'footer',
    html: `<div style="margin-top: 20px; border-top: 2px solid #333; padding-top: 15px;">
  <table style="width: 100%; font-size: 11px;">
    <tr>
      <td style="width: 33%;">
        <strong>Địa chỉ:</strong><br>
        {{companyAddress}}
      </td>
      <td style="width: 33%;">
        <strong>Liên hệ:</strong><br>
        ☎ {{companyPhone}}<br>
        ✉ {{companyEmail}}
      </td>
      <td style="width: 33%;">
        <strong>Website:</strong><br>
        {{companyWebsite}}
      </td>
    </tr>
  </table>
</div>`,
  },
  {
    id: 'footer-payment',
    name: 'Thông tin thanh toán',
    category: 'footer',
    html: `<div style="margin-top: 20px; padding: 12px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;">
  <p style="font-weight: bold; margin: 0 0 8px 0; font-size: 12px; color: #065f46;">Thông tin thanh toán:</p>
  <p style="margin: 0; font-size: 11px; color: #047857;">
    <strong>Ngân hàng:</strong> Vietcombank<br>
    <strong>Số tài khoản:</strong> 1234567890<br>
    <strong>Chủ tài khoản:</strong> {{companyName}}
  </p>
</div>`,
  },
];

export const ALL_TEMPLATES = [...HEADER_TEMPLATES, ...FOOTER_TEMPLATES];

export default {
  HEADER_TEMPLATES,
  FOOTER_TEMPLATES,
  ALL_TEMPLATES,
};
