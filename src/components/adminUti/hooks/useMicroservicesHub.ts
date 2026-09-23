import { useState, useCallback, useMemo } from 'react';
import { microservicesManager, MicroserviceItem } from '../../../services/microservicesConfig';
import { NodePingResult } from '../types';

export const useMicroservicesHub = (onShowToast?: (msg: string) => void) => {
  const [servicesList, setServicesList] = useState<MicroserviceItem[]>(() => microservicesManager.getAll());
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [servicePings, setServicePings] = useState<Record<string, NodePingResult>>({});
  const [isPinging, setIsPinging] = useState<Record<string, boolean>>({});
  const [attachFilter, setAttachFilter] = useState<'all' | 'attached' | 'detached'>('all');
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Registration Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServiceRoute, setNewServiceRoute] = useState<string>('');
  const [newServicePort, setNewServicePort] = useState<number>(3002);
  const [newServiceCategory, setNewServiceCategory] = useState<string>('Nghiệp vụ mới');
  const [newServiceDesc, setNewServiceDesc] = useState<string>('');
  const [newServiceTech, setNewServiceTech] = useState<string>('React / REST API');
  const [newServiceCaps, setNewServiceCaps] = useState<string>('API Integration, Custom UI');

  const showToast = useCallback((msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      setActionToast(msg);
      setTimeout(() => setActionToast(null), 3500);
    }
  }, [onShowToast]);

  const refreshServices = useCallback(() => {
    setServicesList(microservicesManager.getAll());
  }, []);

  const handleToggleAttachService = useCallback((service: MicroserviceItem) => {
    const isAttaching = !service.is_attached;
    if (isAttaching) {
      microservicesManager.attachService(service.id);
      showToast(`⚡ Đã gắn dịch vụ [${service.name}] vào hệ thống!`);
    } else {
      const confirmDetach = window.confirm(
        `Xác nhận tháo rời (Detach) dịch vụ [${service.name}]?\n\n` +
        `- Đường dẫn toolxprint.com${service.routePath} sẽ tạm ngừng phục vụ.\n` +
        `- Dịch vụ sẽ tự động ẩn khỏi menu điều hướng của người dùng.`
      );
      if (!confirmDetach) return;
      microservicesManager.detachService(service.id, 'Tạm tháo rời qua Admin Console');
      showToast(`🔌 Đã tháo rời [${service.name}] khỏi hệ thống.`);
    }
    refreshServices();
  }, [refreshServices, showToast]);

  const handleRegisterNewService = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServiceRoute.trim()) {
      alert('Vui lòng nhập tên dịch vụ và đường dẫn route!');
      return;
    }
    const cleanRoute = newServiceRoute.startsWith('/') ? newServiceRoute : `/${newServiceRoute}`;
    microservicesManager.registerService({
      name: newServiceName.trim(),
      routePath: cleanRoute,
      category: newServiceCategory.trim(),
      description: newServiceDesc.trim() || `Dịch vụ ${newServiceName.trim()}`,
      backendPort: Number(newServicePort) || 3002,
      techStack: newServiceTech.trim() || 'React / REST API',
      coreCapabilities: newServiceCaps.split(',').map((s) => s.trim()).filter(Boolean)
    });
    setRegisterModalOpen(false);
    setNewServiceName('');
    setNewServiceRoute('');
    setNewServiceDesc('');
    refreshServices();
    showToast(`🎉 Đã đăng ký và gắn mới [${newServiceName.trim()}] vào hệ thống!`);
  }, [newServiceName, newServiceRoute, newServiceCategory, newServiceDesc, newServicePort, newServiceTech, newServiceCaps, refreshServices, showToast]);

  const handleToggleService = useCallback((serviceId: string) => {
    microservicesManager.toggleServiceActive(serviceId);
    refreshServices();
  }, [refreshServices]);

  const handlePingService = useCallback(async (service: MicroserviceItem) => {
    setIsPinging((prev) => ({ ...prev, [service.id]: true }));
    try {
      const res = await microservicesManager.pingBackend(service.backendEndpoint);
      setServicePings((prev) => ({ ...prev, [service.id]: res }));
    } finally {
      setIsPinging((prev) => ({ ...prev, [service.id]: false }));
    }
  }, []);

  const handlePingAllServices = useCallback(async () => {
    for (const s of servicesList) {
      handlePingService(s);
    }
  }, [servicesList, handlePingService]);

  const handleOpenServiceFrontend = useCallback((service: MicroserviceItem) => {
    const route = service.routePath || service.defaultPath;
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        window.open(route, '_blank');
      } else {
        window.open(`https://toolxprint.com${route}`, '_blank');
      }
    }
  }, []);

  const attachedCount = useMemo(() => servicesList.filter((s) => s.is_attached).length, [servicesList]);
  const detachedCount = useMemo(() => servicesList.filter((s) => !s.is_attached).length, [servicesList]);

  const filteredServices = useMemo(() => {
    return servicesList.filter((s) => {
      if (attachFilter === 'attached' && !s.is_attached) return false;
      if (attachFilter === 'detached' && s.is_attached) return false;

      if (!serviceSearch.trim()) return true;
      const q = serviceSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.routeUrl && s.routeUrl.toLowerCase().includes(q)) ||
        (s.routePath && s.routePath.toLowerCase().includes(q)) ||
        (s.subdomain && s.subdomain.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [servicesList, serviceSearch, attachFilter]);

  const resetToDefaults = useCallback(() => {
    if (window.confirm('Khôi phục danh sách Microservices về cấu hình chuẩn ban đầu?')) {
      microservicesManager.resetToDefaults();
      refreshServices();
      showToast('Đã khôi phục cấu hình Microservices chuẩn.');
    }
  }, [refreshServices, showToast]);

  return {
    servicesList,
    serviceSearch,
    setServiceSearch,
    servicePings,
    isPinging,
    attachFilter,
    setAttachFilter,
    actionToast,
    showToast,
    registerModalOpen,
    setRegisterModalOpen,
    newServiceName,
    setNewServiceName,
    newServiceRoute,
    setNewServiceRoute,
    newServicePort,
    setNewServicePort,
    newServiceCategory,
    setNewServiceCategory,
    newServiceDesc,
    setNewServiceDesc,
    newServiceTech,
    setNewServiceTech,
    newServiceCaps,
    setNewServiceCaps,
    refreshServices,
    handleToggleAttachService,
    handleRegisterNewService,
    handleToggleService,
    handlePingService,
    handlePingAllServices,
    handleOpenServiceFrontend,
    resetToDefaults,
    attachedCount,
    detachedCount,
    filteredServices
  };
};
