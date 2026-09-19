import { useState, useEffect, useMemo } from 'react';

export interface MicroserviceItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  routePath: string;
  routeUrl: string;
  subdomain?: string;
  defaultPath: string;
  backendPort: number | string;
  backendEndpoint: string;
  frontendPageId: string;
  utiCategory: string;
  is_active: boolean;
  is_attached: boolean; // Cờ cốt lõi: true = Đang gắn vào hệ thống, false = Đã tháo rời (Detached)
  attached_at?: string;
  detached_at?: string;
  detached_reason?: string;
  status: 'online' | 'standby' | 'offline';
  techStack: string;
  coreCapabilities: string[];
}

const STORAGE_KEY = 'toolx_microservices_registry_v5';

export const DEFAULT_MICROSERVICES: MicroserviceItem[] = [
  {
    id: 'render',
    name: 'Dịch vụ Render Vector to Raster',
    slug: 'render-service',
    category: 'Xử lý hình ảnh',
    description: 'Kết xuất file PDF/AI sang ảnh bitmap/TIFF không phân mảnh (No-Tiling), tận dụng RAM 128GB & MuPDF nguyên trang.',
    routePath: '/render',
    routeUrl: 'toolxprint.com/render',
    subdomain: 'toolxprint.com/render',
    defaultPath: '/render',
    backendPort: 9173,
    backendEndpoint: 'http://127.0.0.1:9173/render',
    frontendPageId: 'render-pdf',
    utiCategory: '🎨 Render Vector 128GB',
    is_active: true,
    is_attached: true,
    attached_at: '2026-09-01T00:00:00.000Z',
    status: 'online',
    techStack: 'MuPDF / Python / GoAgent PC (128GB RAM)',
    coreCapabilities: ['No-Tiling Engine', 'Xuất TIFF CMYK 400DPI', 'Không nén vỡ điểm', 'Paging 128GB']
  },
  {
    id: 'imposition',
    name: 'Dịch vụ Bình Trang In Ấn',
    slug: 'imposition-service',
    category: 'Chế bản in',
    description: 'Tự động bình trang nhiều trang vào khổ in lớn, tự động bù hao giấy, xếp bon cắt, bon chữ thập và thanh kiểm màu.',
    routePath: '/layout',
    routeUrl: 'toolxprint.com/layout',
    subdomain: 'toolxprint.com/layout',
    defaultPath: '/layout',
    backendPort: 3002,
    backendEndpoint: 'http://127.0.0.1:3002/api/imposition',
    frontendPageId: 'imposition-advanced',
    utiCategory: '📐 Bình Trang & Layout',
    is_active: true,
    is_attached: true,
    attached_at: '2026-09-01T00:00:00.000Z',
    status: 'online',
    techStack: 'PDF-Lib / Canvas / Node Worker',
    coreCapabilities: ['Bình sách tay gập', 'Bình namecard/decal', 'Xếp khổ tự động (N-up)', 'Xuất PDF chuẩn in']
  },
  {
    id: 'die-cutting',
    name: 'Dịch vụ Thiết Kế Bao Bì (Package)',
    slug: 'diecut-service',
    category: 'Bao bì & Gia công',
    description: 'Tạo cấu trúc hộp giấy, sinh đường cắt bế cấn (Dieline DXF/SVG), mô phỏng tương tác 3D mở gấp nắp hộp.',
    routePath: '/package',
    routeUrl: 'toolxprint.com/package',
    subdomain: 'toolxprint.com/package',
    defaultPath: '/package',
    backendPort: 3002,
    backendEndpoint: 'http://127.0.0.1:3002/api/diecut',
    frontendPageId: 'die-cutting',
    utiCategory: '📦 Bao Bì & Khuôn Hộp',
    is_active: true,
    is_attached: true,
    attached_at: '2026-09-01T00:00:00.000Z',
    status: 'online',
    techStack: 'Three.js / SVG Vector CAD / DXF Exporter',
    coreCapabilities: ['Hộp cài đáy/nắp gài', 'Sinh Dieline chuẩn laser', 'Gấp 3D thời gian thực', 'Bù trừ sóng E/B/C']
  },
  {
    id: 'variable-data',
    name: 'Dịch vụ Biến Đổi Dữ Liệu & QR',
    slug: 'vdp-service',
    category: 'In cá nhân hóa',
    description: 'In dữ liệu biến đổi (VDP), trộn dữ liệu bảng tính Excel, sinh mã QR động ngân hàng/truy xuất, số nhảy liên tục.',
    routePath: '/designer',
    routeUrl: 'toolxprint.com/designer',
    subdomain: 'toolxprint.com/designer',
    defaultPath: '/designer',
    backendPort: 3002,
    backendEndpoint: 'http://127.0.0.1:3002/api/vdp',
    frontendPageId: 'label-designer',
    utiCategory: '🏷️ Biến Đổi Dữ Liệu & QR',
    is_active: true,
    is_attached: true,
    attached_at: '2026-09-01T00:00:00.000Z',
    status: 'online',
    techStack: 'Fabric.js / QRCode / Barcode128 / VietQR',
    coreCapabilities: ['Nhập file Excel/CSV', 'Số nhảy tự động', 'VietQR Napas247', 'Batch Export PDF']
  },
  {
    id: 'pricing',
    name: 'Dịch vụ Tính Giá In Ấn',
    slug: 'pricing-service',
    category: 'Kinh doanh & Báo giá',
    description: 'Định mức chi phí in ấn Offset và Kỹ thuật số, liên kết kho giá giấy PostgreSQL, tính tiền công in và hoàn thiện sau in.',
    routePath: '/tinhgia',
    routeUrl: 'toolxprint.com/tinhgia',
    subdomain: 'toolxprint.com/tinhgia',
    defaultPath: '/tinhgia',
    backendPort: 3002,
    backendEndpoint: 'http://127.0.0.1:3002/api/prices',
    frontendPageId: 'price-calc-offset',
    utiCategory: '💰 Tính Giá & Định Mức',
    is_active: true,
    is_attached: true,
    attached_at: '2026-09-01T00:00:00.000Z',
    status: 'online',
    techStack: 'PostgreSQL / React Formula Engine',
    coreCapabilities: ['Giá in Offset nhiều màu', 'In nhanh KTS theo click', 'Kho giá giấy thời gian thực', 'Xuất báo giá PDF']
  },
  {
    id: 'pdf-processor',
    name: 'Dịch vụ Tiền Kiểm & Phân Tích PDF',
    slug: 'preflight-service',
    category: 'Kiểm soát chất lượng',
    description: 'Đọc và trích xuất MediaBox, BleedBox, TrimBox, kiểm tra font nhúng, hệ màu ICC, tách trang và tối ưu hóa tệp PDF.',
    routePath: '/pdf',
    routeUrl: 'toolxprint.com/pdf',
    subdomain: 'toolxprint.com/pdf',
    defaultPath: '/pdf',
    backendPort: 9173,
    backendEndpoint: 'http://127.0.0.1:9173/pdf-info',
    frontendPageId: 'pdf-processor',
    utiCategory: '📄 Tiền Kiểm PDF & ICC',
    is_active: true,
    is_attached: true,
    attached_at: '2026-09-01T00:00:00.000Z',
    status: 'online',
    techStack: 'PDF.js / PyMuPDF / ICC Profile Inspector',
    coreCapabilities: ['MediaBox Inspector', 'Trích xuất kích thước mm/pt', 'Kiểm tra độ phân giải DPI', 'Tách ghép tệp PDF']
  },
  {
    id: 'goagent-core',
    name: 'Dịch vụ GoAgent Core & Quản Trị',
    slug: 'agent-core-service',
    category: 'Hệ thống trạm làm việc',
    description: 'Tiến trình điều khiển cục bộ tại cổng 9173, chịu tải kết xuất nặng, quản lý cấu hình settings.json và luồng log.',
    routePath: '/admin',
    routeUrl: 'toolxprint.com/admin',
    subdomain: 'toolxprint.com/admin',
    defaultPath: '/admin',
    backendPort: 9173,
    backendEndpoint: 'http://127.0.0.1:9173/probe',
    frontendPageId: 'admin',
    utiCategory: '🖥️ GoAgent & Máy Trạm',
    is_active: true,
    is_attached: true,
    attached_at: '2026-09-01T00:00:00.000Z',
    status: 'online',
    techStack: 'Python / printagent.exe (PrintAgent)',
    coreCapabilities: ['PrintAgent Cục bộ (Port 9173)', 'Khởi chạy mã lệnh trực tiếp', 'Đọc stdout/stderr', '128GB Dedicated Heap']
  }
];

class MicroservicesManager {
  private services: MicroserviceItem[] = [];
  private listeners: Set<(services: MicroserviceItem[]) => void> = new Set();

  constructor() {
    this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.load();
          this.notify(false);
        }
      });
    }
  }

  private load(): void {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        const parsed: MicroserviceItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.services = parsed.map((item) => {
            if (item.id === 'die-cutting' && (item.routePath === '/khuonhop' || item.defaultPath === '/khuonhop')) {
              return {
                ...item,
                name: 'Dịch vụ Thiết Kế Bao Bì (Package)',
                routePath: '/package',
                routeUrl: 'toolxprint.com/package',
                subdomain: 'toolxprint.com/package',
                defaultPath: '/package',
                is_attached: item.is_attached !== false
              };
            }
            return {
              ...item,
              is_attached: item.is_attached !== false
            };
          });
          return;
        }
      }
    } catch (e) {
      console.warn('Cannot load microservices registry, using defaults:', e);
    }
    this.services = DEFAULT_MICROSERVICES.map((s) => ({ ...s }));
  }

  public save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.services));
      }
    } catch (e) {
      console.error('Cannot save microservices registry:', e);
    }
  }

  public subscribe(fn: (services: MicroserviceItem[]) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(triggerSave = true): void {
    if (triggerSave) {
      this.save();
    }
    const current = [...this.services];
    this.listeners.forEach((fn) => {
      try {
        fn(current);
      } catch (err) {
        console.error('Error in microservices listener:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('toolx_microservices_change', {
          detail: current
        })
      );
    }
  }

  public getAll(): MicroserviceItem[] {
    return [...this.services];
  }

  public getAttachedServices(): MicroserviceItem[] {
    return this.services.filter((s) => s.is_attached);
  }

  public getDetachedServices(): MicroserviceItem[] {
    return this.services.filter((s) => !s.is_attached);
  }

  public getById(id: string): MicroserviceItem | undefined {
    return this.services.find((s) => s.id === id);
  }

  public getByPageId(pageId: string): MicroserviceItem | undefined {
    return this.services.find((s) => s.frontendPageId === pageId);
  }

  public getByRoute(route: string): MicroserviceItem | undefined {
    const clean = route.replace(/\/+$/, '');
    return this.services.find((s) => s.routePath === clean || s.defaultPath === clean);
  }

  public isAttached(idOrPageIdOrRoute: string): boolean {
    const s = this.services.find(
      (item) =>
        item.id === idOrPageIdOrRoute ||
        item.frontendPageId === idOrPageIdOrRoute ||
        item.routePath === idOrPageIdOrRoute ||
        item.defaultPath === idOrPageIdOrRoute
    );
    return s ? s.is_attached !== false : true;
  }

  /**
   * Attach Microservice: Gắn dịch vụ vào hệ thống
   */
  public attachService(id: string): MicroserviceItem | null {
    const item = this.services.find((s) => s.id === id);
    if (!item) return null;
    item.is_attached = true;
    item.is_active = true;
    item.attached_at = new Date().toISOString();
    item.detached_at = undefined;
    item.detached_reason = undefined;
    this.notify();
    return { ...item };
  }

  /**
   * Detach Microservice: Tháo rời dịch vụ khỏi hệ thống
   */
  public detachService(id: string, reason?: string): MicroserviceItem | null {
    const item = this.services.find((s) => s.id === id);
    if (!item) return null;
    item.is_attached = false;
    item.detached_at = new Date().toISOString();
    item.detached_reason = reason || 'Tạm tháo rời bởi Quản trị viên để bảo trì';
    this.notify();
    return { ...item };
  }

  /**
   * Toggle Attach / Detach state
   */
  public toggleAttach(id: string, reason?: string): MicroserviceItem | null {
    const item = this.services.find((s) => s.id === id);
    if (!item) return null;
    if (item.is_attached) {
      return this.detachService(id, reason);
    } else {
      return this.attachService(id);
    }
  }

  public toggleServiceActive(id: string): MicroserviceItem | null {
    const item = this.services.find((s) => s.id === id);
    if (!item) return null;
    item.is_active = !item.is_active;
    this.notify();
    return { ...item };
  }

  public registerService(newService: Partial<MicroserviceItem> & { name: string; routePath: string }): MicroserviceItem {
    const baseRoute = newService.routePath.startsWith('/') ? newService.routePath : `/${newService.routePath}`;
    const id = newService.id || `custom-${Date.now().toString(36)}`;
    const fullItem: MicroserviceItem = {
      id,
      name: newService.name,
      slug: newService.slug || `${id}-service`,
      category: newService.category || 'Tùy chỉnh',
      description: newService.description || `Dịch vụ ${newService.name}`,
      routePath: baseRoute,
      routeUrl: `toolxprint.com${baseRoute}`,
      defaultPath: baseRoute,
      backendPort: newService.backendPort || 3002,
      backendEndpoint: newService.backendEndpoint || `http://127.0.0.1:${newService.backendPort || 3002}`,
      frontendPageId: newService.frontendPageId || id,
      utiCategory: newService.utiCategory || '📦 Dịch vụ Tùy Chỉnh',
      is_active: true,
      is_attached: true,
      attached_at: new Date().toISOString(),
      status: 'online',
      techStack: newService.techStack || 'React / REST API',
      coreCapabilities: newService.coreCapabilities || ['Custom Endpoint', 'Pluggable Module']
    };

    const existingIdx = this.services.findIndex((s) => s.id === id);
    if (existingIdx >= 0) {
      this.services[existingIdx] = fullItem;
    } else {
      this.services.push(fullItem);
    }
    this.notify();
    return fullItem;
  }

  public removeService(id: string): boolean {
    const idx = this.services.findIndex((s) => s.id === id);
    if (idx >= 0) {
      this.services.splice(idx, 1);
      this.notify();
      return true;
    }
    return false;
  }

  public updateService(updated: MicroserviceItem): void {
    const idx = this.services.findIndex((s) => s.id === updated.id);
    if (idx >= 0) {
      this.services[idx] = { ...updated };
    } else {
      this.services.push({ ...updated });
    }
    this.notify();
  }

  public resetToDefaults(): MicroserviceItem[] {
    this.services = DEFAULT_MICROSERVICES.map((s) => ({ ...s }));
    this.notify();
    return [...this.services];
  }

  public async pingBackend(endpoint: string): Promise<{ ok: boolean; message: string; ms: number }> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors'
      });
      clearTimeout(timeoutId);
      const ms = Math.round(performance.now() - start);
      return { ok: true, message: `Phản hồi tốt (${ms}ms)`, ms };
    } catch (err: any) {
      const ms = Math.round(performance.now() - start);
      return { ok: false, message: err.message || 'Không phản hồi', ms };
    }
  }
}

export const microservicesManager = new MicroservicesManager();

/**
 * React Hook đồng bộ trạng thái Microservices theo thời gian thực
 */
export function useMicroservicesState() {
  const [services, setServices] = useState<MicroserviceItem[]>(() => microservicesManager.getAll());

  useEffect(() => {
    const unsubscribe = microservicesManager.subscribe((latest) => {
      setServices(latest);
    });
    return unsubscribe;
  }, []);

  const attachedServices = useMemo(() => services.filter((s) => s.is_attached), [services]);
  const detachedServices = useMemo(() => services.filter((s) => !s.is_attached), [services]);

  return {
    services,
    attachedServices,
    detachedServices,
    isAttached: (idOrPage: string) => microservicesManager.isAttached(idOrPage),
    attachService: (id: string) => microservicesManager.attachService(id),
    detachService: (id: string, reason?: string) => microservicesManager.detachService(id, reason),
    toggleAttach: (id: string, reason?: string) => microservicesManager.toggleAttach(id, reason),
    registerService: (item: any) => microservicesManager.registerService(item),
    removeService: (id: string) => microservicesManager.removeService(id),
    resetToDefaults: () => microservicesManager.resetToDefaults()
  };
}