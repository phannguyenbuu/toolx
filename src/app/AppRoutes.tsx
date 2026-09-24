import React from 'react';
import { RouteLoadingFallback } from '../utils/federationLoader';
import { AuthGuard } from '../components/auth';
import { HomePage } from '../components/HomePage';
import { MenuView } from '../components/MenuView';
import { PdfProcessor } from '../components/PdfProcessor';
import { AccountDashboard } from '../components/account';
import { SupabaseFileManager } from '../components/SupabaseFileManager';
import { SupabaseDemo } from '../components/SupabaseDemo';
import {
  RenderPdfPage,
  PriceCalculatorOffset,
  PriceCalculatorDigital,
  PaperPriceManager,
  CustomersPage,
  QuotesPage,
  InvoicesPage,
  OrdersPage,
  AdminPage,
  ImpositionPage,
  ImpositionAdvancedPage,
  DieCuttingPage,
  LabelDesignerPage,
  AIImageProcessor
} from './federatedModules';

export interface AppRoutesProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  menuId: string | null;
  isCurrentServiceDetached: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  accountTab: string;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  currentPage,
  setCurrentPage,
  menuId,
  isCurrentServiceDetached,
  setIsLoginModalOpen,
  accountTab,
}) => {
  return (
    <>
      {/* HOME PAGE - No auth required */}
      {currentPage === 'home' && (
        <div className="flex-1 overflow-auto">
          <HomePage onNavigate={(pageId) => setCurrentPage(pageId)} />
        </div>
      )}

      {/* MENU VIEW PAGE - No auth required */}
      {currentPage === 'menu-view' && (
        <div className="flex-1 overflow-auto bg-gray-900">
          <MenuView menuId={menuId} />
        </div>
      )}

      {/* PDF PROCESSOR PAGE - No auth required */}
      {currentPage === 'pdf-processor' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <PdfProcessor onClose={() => setCurrentPage('home')} />
        </div>
      )}

      {/* RENDER PDF PAGE - No auth required */}
      {currentPage === 'render-pdf' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp phân hệ Render Prepress..." />}>
            <RenderPdfPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* PRICE CALCULATOR OFFSET PAGE - Auth required */}
      {currentPage === 'price-calc-offset' && !isCurrentServiceDetached && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp công cụ Tính giá Offset..." />}>
              <PriceCalculatorOffset onClose={() => setCurrentPage('home')} initialTab="calc" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* PAPER PRICE PAGE - Auth required */}
      {currentPage === 'paper-price' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý giá giấy..." />}>
              <PaperPriceManager />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* PRICE CALCULATOR DIGITAL/FAST PAGE - Auth required */}
      {currentPage === 'price-calc-fast' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp công cụ Tính giá Kỹ thuật số..." />}>
              <PriceCalculatorDigital onClose={() => setCurrentPage('home')} initialTab="calc" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* CUSTOMERS PAGE - Auth required */}
      {currentPage === 'customers' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý Khách hàng..." />}>
              <CustomersPage onClose={() => setCurrentPage('home')} />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* QUOTES PAGE - Auth required */}
      {currentPage === 'quotes' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý Báo giá..." />}>
              <QuotesPage onClose={() => setCurrentPage('home')} />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* INVOICES PAGE - Auth required */}
      {currentPage === 'invoices' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý Hóa đơn..." />}>
              <InvoicesPage onClose={() => setCurrentPage('home')} />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* ORDERS PAGE */}
      {currentPage === 'orders' && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý Đơn hàng..." />}>
            <OrdersPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* ADMIN PAGE */}
      {currentPage === 'admin' && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Trung tâm Quản trị Admin..." />}>
            <AdminPage
              onClose={() => setCurrentPage('home')}
              onNavigateToClient={() => setCurrentPage('home')}
            />
          </React.Suspense>
        </div>
      )}

      {/* IMPOSITION PAGE (Bình trang cơ bản) - No auth required */}
      {(currentPage === 'imposition' || currentPage === 'imposition-basic') && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp phân hệ Bình trang cơ bản..." />}>
            <ImpositionPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* IMPOSITION ADVANCED PAGE - No auth required */}
      {currentPage === 'imposition-advanced' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp phân hệ Bình trang nâng cao..." />}>
            <ImpositionAdvancedPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* DIE CUTTING PAGE - No auth required */}
      {currentPage === 'die-cutting' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Thiết kế Khuôn hộp..." />}>
            <DieCuttingPage />
          </React.Suspense>
        </div>
      )}

      {/* FILE MANAGER PAGE - Cloud Storage with Supabase */}
      {currentPage === 'file-manager' && (
        <div className="flex-1 overflow-hidden">
          <SupabaseFileManager />
        </div>
      )}

      {/* SUPABASE DEMO PAGE - No auth required */}
      {currentPage === 'supabase-demo' && (
        <div className="flex-1 overflow-auto">
          <SupabaseDemo />
        </div>
      )}

      {/* ACCOUNT PAGE - Auth required */}
      {currentPage === 'account' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <AccountDashboard 
              onClose={() => setCurrentPage('home')} 
              initialTab={accountTab}
            />
          </div>
        </AuthGuard>
      )}

      {/* AI IMAGE PROCESSING PAGES - Auth required */}
      {currentPage === 'ai-inpaint' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Inpaint)..." />}>
              <AIImageProcessor initialTool="inpaint" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}
      {currentPage === 'ai-outpaint' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Outpaint)..." />}>
              <AIImageProcessor initialTool="outpaint" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}
      {currentPage === 'ai-remove-bg' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Remove BG)..." />}>
              <AIImageProcessor initialTool="remove-bg" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}
      {currentPage === 'ai-upscale' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Upscale)..." />}>
              <AIImageProcessor initialTool="upscale" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}
      {currentPage === 'ai-color' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Color)..." />}>
              <AIImageProcessor initialTool="color" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* LABEL DESIGNER PAGE - Konva.js Canvas-based */}
      {currentPage === 'label-designer' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Label & VDP Designer..." />}>
            <LabelDesignerPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}
    </>
  );
};
