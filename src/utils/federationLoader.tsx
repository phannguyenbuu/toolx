import React, { ComponentType, lazy } from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactRouterDOM from 'react-router-dom';
import * as LucideReact from 'lucide-react';
import toast, * as ReactHotToast from 'react-hot-toast';

declare const __webpack_init_sharing__: (scope: string) => Promise<void>;
declare const __webpack_share_scopes__: { default: any };

interface RemoteConfig {
  scope: string;       // e.g. 'remote_render'
  url: string;         // e.g. '/modules/render/remoteEntry.js'
  module: string;      // e.g. './RenderPdfPage'
}

// Bộ đệm ghi nhớ các script đã được nạp
const loadedScripts = new Map<string, Promise<void>>();
const initializedContainers = new Set<string>();

function loadScript(url: string): Promise<void> {
  const cacheBustUrl = url.includes('remoteEntry.js')
    ? (url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`)
    : url;

  if (loadedScripts.has(cacheBustUrl)) {
    return loadedScripts.get(cacheBustUrl)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    // Kiểm tra xem script đã tồn tại trong DOM chưa
    const existingScript = document.querySelector(`script[src="${cacheBustUrl}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = cacheBustUrl;
    script.type = 'text/javascript';
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => {
      loadedScripts.delete(cacheBustUrl);
      reject(new Error(`[ModuleFederation] Không thể nạp script remote từ ${cacheBustUrl}`));
    };

    document.head.appendChild(script);
  });

  loadedScripts.set(cacheBustUrl, promise);
  return promise;
}

/**
 * Tạo Webpack Share Scope chuẩn kết nối trực tiếp singleton React của Host app
 * để remote module dùng chung 100% React instance, tránh lỗi Cannot read properties of null (reading 'useState')
 */
function getHostSharedScope(): Record<string, any> {
  const globalScope = typeof __webpack_share_scopes__ !== 'undefined' ? __webpack_share_scopes__.default : {};

  const reactVer = (React as any).version || '19.2.0';
  const reactDomVer = (ReactDOM as any).version || reactVer;

  const hostScope: Record<string, any> = {
    ...globalScope,
    react: {
      [reactVer]: {
        get: () => Promise.resolve(() => React),
        loaded: 1,
        from: 'host-app',
        eager: true,
      },
      ...globalScope?.react,
    },
    'react-dom': {
      [reactDomVer]: {
        get: () => Promise.resolve(() => ReactDOM),
        loaded: 1,
        from: 'host-app',
        eager: true,
      },
      ...globalScope?.['react-dom'],
    },
    'react-router-dom': {
      '7.14.0': {
        get: () => Promise.resolve(() => ReactRouterDOM),
        loaded: 1,
        from: 'host-app',
        eager: true,
      },
      ...globalScope?.['react-router-dom'],
    },
    'lucide-react': {
      '0.555.0': {
        get: () => Promise.resolve(() => LucideReact),
        loaded: 1,
        from: 'host-app',
        eager: true,
      },
      ...globalScope?.['lucide-react'],
    },
    'react-hot-toast': {
      '2.6.0': {
        get: () => Promise.resolve(() => ({
          ...ReactHotToast,
          default: toast,
          toast: toast,
          __esModule: true,
        })),
        loaded: 1,
        from: 'host-app',
        eager: true,
      },
      ...globalScope?.['react-hot-toast'],
    },
  };

  return hostScope;
}

/**
 * Nạp động một module từ Remote Container qua Module Federation
 */
export async function loadRemoteModule<T = any>(config: RemoteConfig): Promise<T> {
  // 1. Tải file remoteEntry.js vào DOM
  await loadScript(config.url);

  // 2. Khởi tạo share scope của Webpack nếu có
  if (typeof __webpack_init_sharing__ !== 'undefined') {
    try {
      await __webpack_init_sharing__('default');
    } catch (e) {}
  }

  // 3. Lấy container từ window
  const container = (window as any)[config.scope];
  if (!container) {
    throw new Error(`[ModuleFederation] Không tìm thấy scope "${config.scope}" trên window.`);
  }

  // 4. Khởi tạo container với share scope (đảm bảo chỉ gọi init 1 lần cho mỗi container)
  if (!initializedContainers.has(config.scope)) {
    try {
      const shareScope = getHostSharedScope();
      await container.init(shareScope);
      initializedContainers.add(config.scope);
    } catch (initErr: any) {
      console.warn(`[ModuleFederation] Container "${config.scope}" init warning:`, initErr.message);
      initializedContainers.add(config.scope);
    }
  }

  // 5. Trích xuất module từ container
  const factory = await container.get(config.module);
  const Module = factory();
  return Module;
}

/**
 * Tạo một Lazy Component liên kết với Remote Module qua Module Federation,
 * tự động dự phòng (fallback) về component nội bộ nếu remote chưa được build hoặc lỗi mạng.
 */
export function createFederatedComponent<T extends ComponentType<any>>(
  remoteConfig: RemoteConfig,
  localFallback: () => Promise<{ default: T } | Record<string, T>>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    // Khi đang chạy trong môi trường phát triển (npm run dev / react-scripts start),
    // luôn ưu tiên nạp trực tiếp component nội bộ để hỗ trợ Hot Reload và tránh xung đột React 19 dispatcher giữa dev và prod bundle.
    if (process.env.NODE_ENV === 'development') {
      const local = await localFallback();
      if ('default' in local) {
        return { default: local.default };
      }
      const exportKey = Object.keys(local)[0];
      return { default: (local as any)[exportKey] };
    }

    try {
      // Trong môi trường production, nạp remote module qua Module Federation
      const remoteModule = await loadRemoteModule<any>(remoteConfig);
      if (remoteModule) {
        // Hỗ trợ cả default export hoặc named export trùng tên module
        if (remoteModule.default) {
          return { default: remoteModule.default };
        }
        const exportKey = configModuleNameToExportKey(remoteConfig.module);
        if (remoteModule[exportKey]) {
          return { default: remoteModule[exportKey] };
        }
        // Lấy export đầu tiên có sẵn
        const firstKey = Object.keys(remoteModule)[0];
        if (firstKey && remoteModule[firstKey]) {
          return { default: remoteModule[firstKey] };
        }
      }
    } catch (remoteErr) {
      console.info(
        `[ModuleFederation] Đang chạy với component nội bộ cho "${remoteConfig.scope}" (lý do: chưa nạp remote hoặc môi trường dev).`,
        remoteErr
      );
    }

    // Dự phòng về local component
    const local = await localFallback();
    if ('default' in local) {
      return { default: local.default };
    }
    const exportKey = Object.keys(local)[0];
    return { default: (local as any)[exportKey] };
  });
}

function configModuleNameToExportKey(moduleName: string): string {
  // e.g. './RenderPdfPage' -> 'RenderPdfPage'
  return moduleName.replace(/^\.\//, '');
}

/**
 * Loading Spinner cho các route đang được nạp bất đồng bộ
 */
export const RouteLoadingFallback: React.FC<{ title?: string }> = ({ title = 'Đang nạp phân hệ...' }) => (
  <div className="flex-1 h-full w-full flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 backdrop-blur-xs">
    <div className="w-10 h-10 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin mb-3" />
    <span className="text-xs font-semibold text-slate-300">{title}</span>
  </div>
);
