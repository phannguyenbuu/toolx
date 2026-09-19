import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

// Map page IDs to URL paths
const PAGE_TO_PATH: Record<string, string> = {
  'home': '/',
  'render-pdf': '/render',
  'label-designer': '/designer',
  'menu-view': '/menu',
  'pdf-processor': '/pdf',
  'price-calc-offset': '/tinhgia',
  'price-calc-fast': '/price/digital',
  'paper-price': '/paper-price',
  'customers': '/customers',
  'quotes': '/quotes',
  'invoices': '/invoices',
  'orders': '/orders',
  'admin': '/admin',
  'imposition': '/basic',
  'imposition-basic': '/basic',
  'imposition-advanced': '/layout',
  'die-cutting': '/package',
  'file-manager': '/files',
  'supabase-demo': '/demo',
  'account': '/account',
  'ai-inpaint': '/ai/inpaint',
  'ai-outpaint': '/ai/outpaint',
  'ai-remove-bg': '/ai/remove-bg',
  'ai-upscale': '/ai/upscale',
  'ai-color': '/ai/color',
};

// Aliases for friendly or alternate paths
const PATH_ALIASES: Record<string, string> = {
  // Render
  '/render': 'render-pdf',
  '/render-pdf': 'render-pdf',
  // Bình trang Cơ bản / Basic Imposition
  '/basic': 'imposition-basic',
  '/layout/basic': 'imposition-basic',
  '/binhtrang/basic': 'imposition-basic',
  '/imposition/basic': 'imposition-basic',
  '/imposition-basic': 'imposition-basic',
  // Bình trang Cao cấp / Layout
  '/layout': 'imposition-advanced',
  '/layout/advanced': 'imposition-advanced',
  '/binhtrang': 'imposition-advanced',
  '/binh-trang': 'imposition-advanced',
  '/imposition-advanced': 'imposition-advanced',
  '/imposition/advanced': 'imposition-advanced',
  // Khuôn hộp / Package
  '/package': 'die-cutting',
  '/packages': 'die-cutting',
  '/khuonhop': 'die-cutting',
  '/khuon-hop': 'die-cutting',
  '/diecut': 'die-cutting',
  '/die-cutting': 'die-cutting',
  '/box': 'die-cutting',
  // Designer / VDP
  '/designer': 'label-designer',
  '/label-designer': 'label-designer',
  '/vdp': 'label-designer',
  // Tính giá
  '/tinhgia': 'price-calc-offset',
  '/tinh-gia': 'price-calc-offset',
  '/pricing': 'price-calc-offset',
  '/price': 'price-calc-offset',
  '/price/offset': 'price-calc-offset',
  '/price-calc-offset': 'price-calc-offset',
  '/price-calc-fast': 'price-calc-fast',
  '/price/digital': 'price-calc-fast',
  '/price/fast': 'price-calc-fast',
  // PDF
  '/pdf': 'pdf-processor',
  '/pdf-processor': 'pdf-processor',
  // Admin & Jobs
  '/admin': 'admin',
  '/admin/job': 'admin',
  '/admin/jobs': 'admin',
  '/job': 'admin',
  '/jobs': 'admin',
  '/agent/job': 'admin',
  // Others
  '/paper': 'paper-price',
  '/paper-price': 'paper-price',
  '/paper-prices': 'paper-price',
  '/file-manager': 'file-manager',
  '/data': 'file-manager',
  '/files': 'file-manager',
};

const PATH_TO_PAGE: Record<string, string> = { ...PATH_ALIASES };
Object.entries(PAGE_TO_PATH).forEach(([page, path]) => { PATH_TO_PAGE[path] = page; });

export function useAppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = useMemo(() => {
    // Check hostname for subdomains as fallback
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      if (host === 'admin.toolxprint.com' || host.startsWith('admin.')) return 'admin';
      if (host === 'render.toolxprint.com' || host.startsWith('render.')) return 'render-pdf';
      if (host === 'layout.toolxprint.com' || host.startsWith('layout.') || host === 'binhtrang.toolxprint.com' || host.startsWith('binhtrang.') || host.startsWith('imposition.')) return 'imposition-advanced';
      if (host === 'package.toolxprint.com' || host.startsWith('package.') || host === 'khuonhop.toolxprint.com' || host.startsWith('khuonhop.') || host.startsWith('diecut.')) return 'die-cutting';
      if (host === 'tinhgia.toolxprint.com' || host.startsWith('tinhgia.') || host.startsWith('pricing.')) return 'price-calc-offset';
      if (host === 'designer.toolxprint.com' || host.startsWith('designer.') || host.startsWith('variable.')) return 'label-designer';
      if (host === 'pdf.toolxprint.com' || host.startsWith('pdf.')) return 'pdf-processor';
    }

    // Normalize path by stripping trailing slash
    const cleanPath = location.pathname.length > 1
      ? location.pathname.replace(/\/+$/, '')
      : location.pathname;

    // Direct match or alias match
    if (PATH_TO_PAGE[cleanPath]) {
      return PATH_TO_PAGE[cleanPath];
    }

    // Prefix matches for sub-routes
    if (cleanPath.startsWith('/admin') || cleanPath.startsWith('/job') || cleanPath.startsWith('/jobs')) return 'admin';
    if (cleanPath.startsWith('/render')) return 'render-pdf';
    if (cleanPath.startsWith('/layout') || cleanPath.startsWith('/binhtrang') || cleanPath.startsWith('/binh-trang') || cleanPath.startsWith('/imposition')) return 'imposition-advanced';
    if (cleanPath.startsWith('/package') || cleanPath.startsWith('/khuonhop') || cleanPath.startsWith('/khuon-hop') || cleanPath.startsWith('/diecut') || cleanPath.startsWith('/die-cutting') || cleanPath.startsWith('/box')) return 'die-cutting';
    if (cleanPath.startsWith('/designer') || cleanPath.startsWith('/vdp') || cleanPath.startsWith('/label-designer')) return 'label-designer';
    if (cleanPath.startsWith('/tinhgia') || cleanPath.startsWith('/tinh-gia') || cleanPath.startsWith('/price')) return 'price-calc-offset';
    if (cleanPath.startsWith('/pdf')) return 'pdf-processor';
    if (cleanPath.startsWith('/menu')) return 'menu-view';
    if (cleanPath.startsWith('/account')) return 'account';
    if (cleanPath.startsWith('/files')) return 'file-manager';
    if (cleanPath.startsWith('/customers')) return 'customers';
    if (cleanPath.startsWith('/quotes')) return 'quotes';
    if (cleanPath.startsWith('/invoices')) return 'invoices';
    if (cleanPath.startsWith('/orders')) return 'orders';

    return 'home';
  }, [location.pathname]);

  const setCurrentPage = useCallback((pageId: string) => {
    const path = PAGE_TO_PATH[pageId] || '/';
    navigate(path);
  }, [navigate]);

  return { currentPage, setCurrentPage };
}

export { PAGE_TO_PATH, PATH_TO_PAGE };
