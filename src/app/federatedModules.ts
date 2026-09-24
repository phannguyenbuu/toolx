import { createFederatedComponent } from '../utils/federationLoader';

// ============================================================================
// MICRO-FRONTEND MODULE FEDERATION (Option B)
// Các phân hệ được tách thành Remote Modules độc lập, có thể build và deploy
// riêng lẻ từng phân hệ mà không làm gián đoạn người dùng ở các phân hệ khác.
// Tự động dự phòng (fallback) về local component khi dev hoặc khi remote lỗi.
// ============================================================================

// 1. Phân hệ Render Prepress & Color Studio (remote_render)
export const RenderPdfPage = createFederatedComponent(
  {
    scope: 'remote_render',
    url: '/modules/render/remoteEntry.js',
    module: './RenderPdfPage',
  },
  () => import('../components/RenderPdfPage')
);

// 2. Phân hệ Tính Giá Offset & Digital (remote_calc)
export const PriceCalculatorOffset = createFederatedComponent(
  {
    scope: 'remote_calc',
    url: '/modules/calc/remoteEntry.js',
    module: './PriceCalculatorOffset',
  },
  () => import('../components/PriceCalculatorOffset')
);

export const PriceCalculatorDigital = createFederatedComponent(
  {
    scope: 'remote_calc',
    url: '/modules/calc/remoteEntry.js',
    module: './PriceCalculatorDigital',
  },
  () => import('../components/PriceCalculatorDigital')
);

export const PaperPriceManager = createFederatedComponent(
  {
    scope: 'remote_calc',
    url: '/modules/calc/remoteEntry.js',
    module: './PaperPriceManager',
  },
  () => import('../components/PaperPriceManager')
);

// 3. Phân hệ Quản trị Kinh doanh & CRM (remote_crm)
export const CustomersPage = createFederatedComponent(
  {
    scope: 'remote_crm',
    url: '/modules/crm/remoteEntry.js',
    module: './CustomersPage',
  },
  () => import('../components/business/CustomersPage')
);

export const QuotesPage = createFederatedComponent(
  {
    scope: 'remote_crm',
    url: '/modules/crm/remoteEntry.js',
    module: './QuotesPage',
  },
  () => import('../components/business/QuotesPage')
);

export const InvoicesPage = createFederatedComponent(
  {
    scope: 'remote_crm',
    url: '/modules/crm/remoteEntry.js',
    module: './InvoicesPage',
  },
  () => import('../components/business/InvoicesPage')
);

export const OrdersPage = createFederatedComponent(
  {
    scope: 'remote_crm',
    url: '/modules/crm/remoteEntry.js',
    module: './OrdersPage',
  },
  () => import('../components/business/OrdersPage')
);

// 4. Phân hệ Bình Trang & Khuôn Hộp Bao Bì (remote_imposition)
export const ImpositionPage = createFederatedComponent(
  {
    scope: 'remote_imposition',
    url: '/modules/imposition/remoteEntry.js',
    module: './ImpositionPage',
  },
  () => import('../components/ImpositionPage')
);

export const ImpositionAdvancedPage = createFederatedComponent(
  {
    scope: 'remote_imposition',
    url: '/modules/imposition/remoteEntry.js',
    module: './ImpositionAdvancedPage',
  },
  () => import('../components/ImpositionAdvancedPage')
);

export const DieCuttingPage = createFederatedComponent(
  {
    scope: 'remote_imposition',
    url: '/modules/imposition/remoteEntry.js',
    module: './DieCuttingPage',
  },
  () => import('../components/DieCuttingPage')
);

// 5. Phân hệ Label & VDP Designer (remote_designer)
export const LabelDesignerPage = createFederatedComponent(
  {
    scope: 'remote_designer',
    url: '/modules/designer/remoteEntry.js',
    module: './LabelDesignerPage',
  },
  () => import('../components/LabelDesignerPage')
);

// 6. Phân hệ Quản trị Hệ thống Admin (remote_admin)
export const AdminPage = createFederatedComponent(
  {
    scope: 'remote_admin',
    url: '/modules/admin/remoteEntry.js',
    module: './AdminPage',
  },
  () => import('../components/AdminPage')
);

// 7. Phân hệ AI Image Suite (remote_ai)
export const AIImageProcessor = createFederatedComponent(
  {
    scope: 'remote_ai',
    url: '/modules/ai/remoteEntry.js',
    module: './AIImageProcessor',
  },
  () => import('../components/ai/AIImageProcessor')
);
