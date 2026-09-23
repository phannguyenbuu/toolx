import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RenderDocItem, DiagData } from './types';

export interface UseRenderHistoryProps {
  apiBase?: string;
}

export function useRenderHistory(param: UseRenderHistoryProps | string = {}) {
  const apiBase = typeof param === 'string' ? param : (param?.apiBase || '/render-agent');
  // Queue state
  const [documents, setDocuments] = useState<RenderDocItem[]>([]);
  const documentsRef = useRef<RenderDocItem[]>([]);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [totalPagesNum, setTotalPagesNum] = useState<number>(1);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);

  const [diagData, setDiagData] = useState<DiagData>({
    is_online: true,
    hostname: 'Toolx-RenderServer',
    os: 'Windows Server 2022',
    cpu_usage: 12.5,
    ram_used_gb: 24.8,
    ram_total_gb: 128.0
  });

  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/agent/logs`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setDiagData((prev) => ({
            ...prev,
            is_online: true
          }));
        }
      }
    } catch (e) {}
  }, [apiBase]);

  // Right Sidebar (Task Queue & History) state
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('toolx_render_history_autohide') === 'true';
    }
    return true;
  });
  const [isRightSidebarHovered, setIsRightSidebarHovered] = useState<boolean>(false);
  const rightSidebarHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isRightSidebarVisible = !isRightSidebarCollapsed || isRightSidebarHovered;

  const handleRightSidebarHoverEnter = useCallback(() => {
    if (rightSidebarHoverTimeoutRef.current) {
      clearTimeout(rightSidebarHoverTimeoutRef.current);
      rightSidebarHoverTimeoutRef.current = null;
    }
    if (isRightSidebarCollapsed) {
      setIsRightSidebarHovered(true);
    }
  }, [isRightSidebarCollapsed]);

  const handleRightSidebarHoverLeave = useCallback(() => {
    if (rightSidebarHoverTimeoutRef.current) {
      clearTimeout(rightSidebarHoverTimeoutRef.current);
    }
    if (isRightSidebarCollapsed) {
      rightSidebarHoverTimeoutRef.current = setTimeout(() => {
        setIsRightSidebarHovered(false);
      }, 350);
    }
  }, [isRightSidebarCollapsed]);

  const toggleRightSidebar = useCallback(() => {
    if (rightSidebarHoverTimeoutRef.current) {
      clearTimeout(rightSidebarHoverTimeoutRef.current);
      rightSidebarHoverTimeoutRef.current = null;
    }
    if (isRightSidebarHovered) {
      setIsRightSidebarHovered(false);
      setIsRightSidebarCollapsed(false);
      try {
        localStorage.setItem('toolx_render_history_autohide', 'false');
      } catch (e) {}
      return;
    }
    setIsRightSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('toolx_render_history_autohide', String(next));
      } catch (e) {}
      return next;
    });
  }, [isRightSidebarHovered]);

  useEffect(() => {
    return () => {
      if (rightSidebarHoverTimeoutRef.current) {
        clearTimeout(rightSidebarHoverTimeoutRef.current);
      }
    };
  }, []);

  // Diagnostics and Log Modal state
  const [diagDropdownOpen, setDiagDropdownOpen] = useState<boolean>(false);
  const [logModalOpen, setLogModalOpen] = useState<boolean>(false);
  const [logModalTitle, setLogModalTitle] = useState<string>('');
  const [logModalContent, setLogModalContent] = useState<string>('');
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  const getTimestampSuffix = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  const triggerFileDownload = async (url: string, rawFilename: string, isPdf: boolean, extOverride?: string) => {
    const baseName = rawFilename.replace(/\.[^/.]+$/, '');
    const ext = extOverride || (isPdf ? 'pdf' : 'tif');
    const timestamp = getTimestampSuffix();
    const downloadFileName = `${baseName}_rendered_${timestamp}.${ext}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      }
    } catch (e) {
      console.warn('Lỗi khi fetch blob tải tệp, fallback trực tiếp:', e);
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadRenderedDoc = async (doc: RenderDocItem) => {
    if (!doc.download_url) {
      toast.error('Tệp này không có liên kết tải trực tiếp hoặc phiên làm việc đã đóng. Vui lòng bấm kết xuất lại.');
      return;
    }

    const isPdf = Boolean(doc.convert_to_pdf || doc.filename.toLowerCase().endsWith('.pdf') || doc.compression?.toLowerCase().includes('pdf'));
    const ext = isPdf ? 'pdf' : (doc.compression?.toLowerCase().includes('png') ? 'png' : 'tif');
    await triggerFileDownload(doc.download_url, doc.filename, isPdf, ext);
  };

  const fetchDocuments = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoadingDocs(true);
    }

    let localCached: RenderDocItem[] = [];
    try {
      localCached = JSON.parse(localStorage.getItem('goagent_rendered_docs') || '[]');
    } catch {}

    try {
      const res = await fetch(`${apiBase}/api/documents?page=${currentPageNum}&per_page=${perPage}`, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`Mã lỗi HTTP: ${res.status}`);
      }

      const data = await res.json();
      if (data && data.ok && Array.isArray(data.documents)) {
        const docsList: RenderDocItem[] = data.documents;

        setDocuments((prev) => {
          const memoryItems = prev.filter((d) => d.id.startsWith('goagent_'));
          const mergedLocal = [...memoryItems];
          localCached.forEach((lc) => {
            if (!mergedLocal.some((m) => m.id === lc.id)) {
              mergedLocal.push(lc);
            }
          });
          const nextDocs = [...mergedLocal, ...docsList];

          if (
            prev.length === nextDocs.length &&
            prev.every((d, i) => {
              const n = nextDocs[i];
              return (
                n &&
                d.id === n.id &&
                d.status === n.status &&
                d.duration === n.duration &&
                d.error_message === n.error_message &&
                d.preview_url === n.preview_url &&
                d.download_url === n.download_url
              );
            })
          ) {
            return prev;
          }
          return nextDocs;
        });

        const count = (data.total_count || 0) + localCached.length;
        setTotalCount(count);
        setTotalPagesNum(data.total_pages || Math.max(1, Math.ceil(count / perPage)));
      }
    } catch (err: any) {
      console.warn('Lỗi kết nối tới Toolx Render Backend:', err);
      setDocuments((prev) => {
        const memoryItems = prev.filter((d) => d.id.startsWith('goagent_'));
        const mergedLocal = [...memoryItems];
        localCached.forEach((lc) => {
          if (!mergedLocal.some((m) => m.id === lc.id)) {
            mergedLocal.push(lc);
          }
        });
        if (
          prev.length === mergedLocal.length &&
          prev.every((d, i) => d.id === mergedLocal[i]?.id)
        ) {
          return prev;
        }
        return mergedLocal;
      });
      setTotalCount((c) => Math.max(c, localCached.length));
    } finally {
      if (!isSilent) {
        setIsLoadingDocs(false);
      }
    }
  }, [apiBase, currentPageNum, perPage]);

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tác vụ này?')) return;
    try {
      if (docId.startsWith('goagent_')) {
        const localCached: RenderDocItem[] = JSON.parse(localStorage.getItem('goagent_rendered_docs') || '[]');
        const updated = localCached.filter((d) => d.id !== docId);
        localStorage.setItem('goagent_rendered_docs', JSON.stringify(updated));
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setTotalCount((c) => Math.max(0, c - 1));
        return;
      }
      await fetch(`${apiBase}/delete/${docId}`, { method: 'POST' });
      await fetchDocuments();
      toast.success('Đã xóa tác vụ thành công!');
    } catch (err) {
      toast.error('Không thể xóa tác vụ: ' + err);
    }
  };

  const handleClearAllDocs = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả tác vụ trong lịch sử?')) {
      return;
    }
    try {
      localStorage.removeItem('goagent_rendered_docs');
      await fetch(`${apiBase}/clear_all`, { method: 'POST' });
      await fetchDocuments();
      toast.success('Đã xóa toàn bộ tác vụ thành công!');
    } catch (err) {
      toast.error('Không thể xóa tất cả tác vụ: ' + err);
    }
  };

  const handleViewAgentLog = async (filename: 'setting.json' | 'stdout.txt' | 'sterror.txt') => {
    setDiagDropdownOpen(false);
    setLogModalTitle(`Đang tải ${filename}...`);
    setLogModalContent('Đang tải dữ liệu từ máy chủ Toolx Render...');
    setLogLoading(true);
    setLogModalOpen(true);

    try {
      const res = await fetch(`${apiBase}/api/agent/logs`);
      const data = await res.json();
      if (!data.ok) {
        setLogModalTitle(`Lỗi tải ${filename}`);
        setLogModalContent(`Lỗi: ${data.error}`);
        return;
      }

      let title = '';
      let content = '';

      if (filename === 'setting.json') {
        title = 'Cấu hình hệ thống (setting.json)';
        try {
          const parsed = JSON.parse(data.settings_json);
          content = JSON.stringify(parsed, null, 2);
        } catch (e) {
          content = data.settings_json || '{}';
        }
      } else if (filename === 'stdout.txt') {
        title = 'Nhật ký hoạt động Agent (stdout.txt)';
        content = data.stout_logs || 'Chưa có log từ Agent.';
      } else if (filename === 'sterror.txt') {
        title = 'Nhật ký lỗi Agent (sterror.txt)';
        content = data.sterror_logs || 'Chưa có log lỗi từ Agent.';
      }

      setLogModalTitle(title);
      setLogModalContent(content);
    } catch (err) {
      setLogModalTitle(`Lỗi tải ${filename}`);
      setLogModalContent(`Không thể kết nối tới máy chủ: ${err}`);
    } finally {
      setLogLoading(false);
    }
  };

  const handleMaximizePagefile = useCallback(async () => {
    if (!window.confirm('Bạn có muốn gửi lệnh Tối đa hóa Virtual Memory (Pagefile) tới máy chủ?')) return;
    try {
      const res = await fetch(`${apiBase}/api/agent/pagefile/maximize`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success('Đã kích hoạt lệnh tối đa hóa Pagefile thành công! Agent sẽ tự động cấu hình.', { duration: 4500 });
      } else {
        toast.error('Lỗi: ' + data.error);
      }
    } catch (e: any) {
      toast.error('Không thể gửi lệnh: ' + e.message);
    }
  }, [apiBase]);

  const handleRestartAgent = useCallback(async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khởi động lại ToolxAgent trên máy chủ?')) return;
    try {
      const res = await fetch(`${apiBase}/api/agent/restart`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success('Đã gửi lệnh khởi động lại Agent. Vui lòng chờ 10-15 giây để Agent kết nối lại.', { duration: 5000 });
      } else {
        toast.error('Lỗi: ' + data.error);
      }
    } catch (e: any) {
      toast.error('Không thể gửi lệnh: ' + e.message);
    }
  }, [apiBase]);

  const handleCopyLogContent = () => {
    navigator.clipboard.writeText(logModalContent).then(() => {
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    });
  };

  useEffect(() => {
    fetchDocuments(false);

    const interval = setInterval(() => {
      const hasActive = documentsRef.current.some((d) => d.status === 'pending' || d.status === 'rendering');
      if (hasActive) {
        fetchDocuments(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDocuments]);

  return {
    documents,
    setDocuments,
    documentsRef,
    totalCount,
    setTotalCount,
    currentPageNum,
    setCurrentPageNum,
    perPage,
    setPerPage,
    totalPagesNum,
    isLoadingDocs,
    fetchDocuments,
    handleDeleteDoc,
    handleClearAllDocs,
    triggerFileDownload,
    handleDownloadRenderedDoc,
    getTimestampSuffix,
    isRightSidebarCollapsed,
    setIsRightSidebarCollapsed,
    isRightSidebarHovered,
    isRightSidebarVisible,
    handleRightSidebarHoverEnter,
    handleRightSidebarHoverLeave,
    toggleRightSidebar,
    diagDropdownOpen,
    setDiagDropdownOpen,
    logModalOpen,
    setLogModalOpen,
    logModalTitle,
    logModalContent,
    logLoading,
    copiedLog,
    handleViewAgentLog,
    handleCopyLogContent,
    handleMaximizePagefile,
    handleRestartAgent,
    diagData,
    setDiagData,
    fetchDiagnostics
  };
}
