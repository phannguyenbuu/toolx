import React, { useEffect, useState } from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import TopNavBar from '../components/TopNavBar';
import { ServiceDetachedNotice } from '../components/ServiceDetachedNotice';
import { microservicesManager, useMicroservicesState } from '../services/microservicesConfig';
import { useAuth } from '../components/auth';
import { useAppEditorState } from './useAppEditorState';
import { AppRoutes } from './AppRoutes';
import { AppModals } from './AppModals';
import { mmToPx } from './types';

export const AppLayout: React.FC = () => {
  const { currentPage, setCurrentPage } = useAppNavigation();
  const { wallet, refreshWallet } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  const editor = useAppEditorState();

  const isStandaloneMicroservice = typeof window !== 'undefined' && (
    window.location.hostname.startsWith('admin.') ||
    window.location.hostname.startsWith('render.') ||
    window.location.hostname.startsWith('layout.') ||
    window.location.hostname.startsWith('binhtrang.') ||
    window.location.hostname.startsWith('imposition.') ||
    window.location.hostname.startsWith('package.') ||
    window.location.hostname.startsWith('khuonhop.') ||
    window.location.hostname.startsWith('diecut.') ||
    window.location.hostname.startsWith('tinhgia.') ||
    window.location.hostname.startsWith('pricing.') ||
    window.location.hostname.startsWith('designer.') ||
    window.location.hostname.startsWith('variable.') ||
    window.location.hostname.startsWith('pdf.')
  );

  // Microservices attach/detach state listener
  const { isAttached } = useMicroservicesState();
  const currentMicroservice = microservicesManager.getByPageId(currentPage);
  const isCurrentServiceDetached = Boolean(currentMicroservice && !isAttached(currentMicroservice.id));

  // Dynamic Document Title
  useEffect(() => {
    if (currentPage === 'admin' || (typeof window !== 'undefined' && (window.location.hostname === 'admin.toolx' || window.location.hostname.startsWith('admin.')))) {
      document.title = 'Admin ToolXPrint';
    } else {
      document.title = 'ToolxPrint';
    }
  }, [currentPage]);

  return (
    <div className={`flex flex-row h-screen bg-gray-100 text-gray-800 font-sans select-none overflow-hidden ${editor.isCssFullScreen ? 'fixed inset-0 z-[9999] bg-gray-100' : ''}`}>
      
      {/* LEFT SIDEBAR NAV - Hide on standalone Microservice subdomains or Admin */}
      {!editor.isCssFullScreen && currentPage !== 'admin' && !isStandaloneMicroservice && (
        <TopNavBar 
          logoText="ProEditor v5.0" 
          activeLink={currentPage}
          onNavClick={(linkId) => setCurrentPage(linkId)}
          onOpenAccountPage={(tab) => {
            editor.setAccountTab(tab || 'overview');
            setCurrentPage('account');
          }}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onTopUpClick={() => setIsTopUpModalOpen(true)}
          showRobot={editor.showRobot}
          onToggleRobot={() => editor.setShowRobot(!editor.showRobot)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        {/* DETACHED MICROSERVICE NOTICE */}
        {isCurrentServiceDetached && currentMicroservice && (
          <ServiceDetachedNotice
            service={currentMicroservice}
            onBackToHome={() => setCurrentPage('home')}
            onGoToAdmin={() => setCurrentPage('admin')}
            onAttach={() => {
              microservicesManager.attachService(currentMicroservice.id);
            }}
          />
        )}

        {/* APPLICATION PAGES */}
        <AppRoutes
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          menuId={editor.menuId}
          isCurrentServiceDetached={isCurrentServiceDetached}
          setIsLoginModalOpen={setIsLoginModalOpen}
          accountTab={editor.accountTab}
        />

        {/* OVERLAYS & MODALS */}
        <AppModals
          showCustomerView={editor.showCustomerView}
          setShowCustomerView={editor.setShowCustomerView}
          elements={editor.elements}
          pageConfig={editor.pageConfig}
          dataRows={editor.dataRows}
          headers={editor.headers}
          customerSettings={editor.customerSettings}
          customerNotes={editor.customerNotes}
          setCustomerNotes={editor.setCustomerNotes}
          setDataRows={editor.setDataRows}
          resolveContent={editor.resolveContent}
          resolveImageSrc={editor.resolveImageSrc}
          mmToPx={mmToPx}

          isLoginModalOpen={isLoginModalOpen}
          setIsLoginModalOpen={setIsLoginModalOpen}

          isTopUpModalOpen={isTopUpModalOpen}
          setIsTopUpModalOpen={setIsTopUpModalOpen}
          walletBalance={wallet?.balance || 0}
          refreshWallet={refreshWallet}

          isFilePickerOpen={editor.isFilePickerOpen}
          setIsFilePickerOpen={editor.setIsFilePickerOpen}
          handleFileFromManager={editor.handleFileFromManager}

          isSaveProjectDialogOpen={editor.isSaveProjectDialogOpen}
          setIsSaveProjectDialogOpen={editor.setIsSaveProjectDialogOpen}
          projectName={editor.projectName}
          setProjectName={editor.setProjectName}
          existingProjects={editor.existingProjects}
          selectedProjectId={editor.selectedProjectId}
          setSelectedProjectId={editor.setSelectedProjectId}
          isSavingToFileManager={editor.isSavingToFileManager}
          saveProjectToFileManager={editor.saveProjectToFileManager}

          showRobot={editor.showRobot}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};
