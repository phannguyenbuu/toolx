/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Receipt,
  FileSpreadsheet,
  LayoutGrid,
  Calculator,
  Printer,
  Zap,
  Database,
  LucideIcon,
  Wallet,
  Crown,
  Star,
  Gift,
  Sparkles,
  Settings,
  Wand2,
  Eraser,
  ImagePlus,
  Palette,
  ScanLine,
  Layers,
  LogIn,
  LogOut,
  User,
  FolderOpen,
  History,
  Clock,
  Download,
  Plus,
  Edit3,
  Trash2,
  Package,
  Users,
  ChevronRight,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "./auth";
import ToolXPrintLogo from "./ToolXPrintLogo";
import { useMicroservicesState } from "../services/microservicesConfig";

// Account Plan Types
type AccountPlan = "free" | "basic" | "pro" | "enterprise";

interface AccountPlanInfo {
  id: AccountPlan;
  name: string;
  price: number;
  features: string[];
  color: string;
  icon: LucideIcon;
}

interface TopNavBarProps {
  logoText?: string;
  onSearch?: (term: string) => void;
  onNavClick?: (linkId: string) => void;
  activeLink?: string;
  onOpenAccountPage?: (tab?: string) => void;
  onLoginClick?: () => void;
  onTopUpClick?: () => void;
  showRobot?: boolean;
  onToggleRobot?: () => void;
}

interface SubMenuItem {
  id: string;
  name: string;
  icon: LucideIcon;
  desc?: string;
  badge?: string;
}

interface MenuItemDef {
  id: string;
  name: string;
  icon: LucideIcon;
  category: string;
  description: string;
  color?: "indigo" | "purple" | "emerald" | "blue" | "amber";
  subItems?: SubMenuItem[];
}

// Account Plans Data
const accountPlans: AccountPlanInfo[] = [
  {
    id: "free",
    name: "Miễn phí",
    price: 0,
    features: ["5 phiên làm việc", "100 lượt xuất PDF/tháng", "Hỗ trợ cơ bản"],
    color: "gray",
    icon: Star,
  },
  {
    id: "basic",
    name: "Cơ bản",
    price: 99000,
    features: [
      "20 phiên làm việc",
      "500 lượt xuất PDF/tháng",
      "Hỗ trợ email",
      "Không quảng cáo",
    ],
    color: "blue",
    icon: Gift,
  },
  {
    id: "pro",
    name: "Chuyên nghiệp",
    price: 299000,
    features: [
      "Không giới hạn phiên",
      "Không giới hạn xuất PDF",
      "Hỗ trợ ưu tiên",
      "API truy cập",
      "Tính năng AI",
    ],
    color: "purple",
    icon: Crown,
  },
  {
    id: "enterprise",
    name: "Doanh nghiệp",
    price: 999000,
    features: [
      "Tất cả tính năng Pro",
      "Hỗ trợ 24/7",
      "Tùy chỉnh thương hiệu",
      "Đào tạo nhân viên",
      "SLA cam kết",
    ],
    color: "amber",
    icon: Sparkles,
  },
];

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const TopNavBar: React.FC<TopNavBarProps> = ({
  logoText = "ToolxPrint",
  onSearch,
  onNavClick,
  activeLink = "label-designer",
  onOpenAccountPage,
  onLoginClick,
  onTopUpClick,
  showRobot,
  onToggleRobot,
}) => {
  const { user, isAuthenticated, logout, wallet } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<{
    item: MenuItemDef;
    top: number;
  } | null>(null);

  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hook listening to microservice attach/detach
  const { isAttached } = useMicroservicesState();

  // Master menu definitions
  const menuDefinitions: MenuItemDef[] = [
    {
      id: "pdf-processor",
      name: "Thông tin PDF",
      icon: FileText,
      category: "Tiện ích PDF",
      description: "Phân tích, trích xuất trang & kiểm tra thông số file in ấn",
      color: "blue",
    },
    {
      id: "render-pdf",
      name: "Render PDF",
      icon: Printer,
      category: "Prepress Studio",
      description: "Tách màu CMYK Prepress, Color Bar & Rasterize độ phân giải cao",
      color: "indigo",
    },
    {
      id: "die-cutting",
      name: "Thiết kế bao bì",
      icon: Package,
      category: "Bao bì & Hộp",
      description: "Thiết kế khuôn bế hộp carton, gấp 3D & bình khuôn tự động",
      color: "indigo",
    },
    {
      id: "imposition-group",
      name: "Bình trang & VDP",
      icon: LayoutGrid,
      category: "Chế bản in ấn",
      description: "Bình trang offset nhiều tầng & in ấn dữ liệu biến đổi",
      color: "indigo",
      subItems: [
        {
          id: "label-designer",
          name: "Biến đổi dữ liệu",
          icon: FileSpreadsheet,
          desc: "Thiết kế nhãn mác, barcode & in dữ liệu biến đổi (VDP)",
        },
        {
          id: "imposition-basic",
          name: "Bình trang cơ bản",
          icon: LayoutGrid,
          desc: "Bình trang đơn file nhanh, xuất PDF & SVG khuôn bế",
        },
        {
          id: "imposition-advanced",
          name: "Bình trang cao cấp",
          icon: LayoutGrid,
          desc: "Bình layout offset tự động, xếp đa tầng & tối ưu khổ in",
        },
      ],
    },
    {
      id: "price-group",
      name: "Tính giá in ấn",
      icon: Calculator,
      category: "Dự toán chi phí",
      description: "Công cụ tính giá in ấn tự động & quản lý vật tư giấy",
      color: "indigo",
      subItems: [
        {
          id: "price-calc-offset",
          name: "Tính giá in Offset",
          icon: Printer,
          desc: "Báo giá bài in thương mại, số lượng lớn & tối ưu chi phí",
        },
        {
          id: "price-calc-fast",
          name: "Tính giá in nhanh",
          icon: Zap,
          desc: "Tính giá in kỹ thuật số theo trang, số lượng nhỏ",
        },
        {
          id: "paper-price",
          name: "Bảng giá Giấy",
          icon: Database,
          desc: "Quản lý danh mục & bảng giá giấy nguyên liệu",
        },
      ],
    },
    {
      id: "ai-group",
      name: "AI Tools Studio",
      icon: Wand2,
      category: "Trí tuệ nhân tạo",
      description: "Bộ công cụ AI xử lý ảnh đồ họa & phục chế in ấn",
      color: "purple",
      subItems: [
        {
          id: "ai-inpaint",
          name: "Xóa vùng ảnh (Inpaint)",
          icon: Eraser,
          desc: "Xóa chi tiết thừa và tái tạo nền ảnh liền mạch",
        },
        {
          id: "ai-outpaint",
          name: "Mở rộng ảnh (Outpaint)",
          icon: ImagePlus,
          desc: "Mở rộng góc nhìn và bố cục khung hình bằng AI",
        },
        {
          id: "ai-remove-bg",
          name: "Xóa nền ảnh",
          icon: Layers,
          desc: "Tách nền ảnh tự động với độ sắc nét cao",
        },
        {
          id: "ai-upscale",
          name: "Nâng cấp chất lượng",
          icon: ScanLine,
          desc: "Tăng độ phân giải 2x/4x cho file in khổ lớn",
        },
        {
          id: "ai-color",
          name: "Chuyển đổi màu",
          icon: Palette,
          desc: "Hiệu chỉnh và đồng bộ hệ màu thiết kế tự động",
        },
      ],
    },
    {
      id: "file-manager",
      name: "Tệp & Dữ liệu",
      icon: FolderOpen,
      category: "Cloud Storage",
      description: "Quản lý và đồng bộ file dự án trên Supabase Cloud",
      color: "blue",
    },
    {
      id: "business-group",
      name: "Kinh doanh & CRM",
      icon: Users,
      category: "Quản trị xưởng in",
      description: "Quản trị khách hàng, đơn hàng sản xuất & hóa đơn báo giá",
      color: "indigo",
      subItems: [
        {
          id: "orders",
          name: "Đơn hàng",
          icon: Package,
          desc: "Theo dõi tiến độ đơn hàng sản xuất",
        },
        {
          id: "customers",
          name: "Khách hàng",
          icon: Users,
          desc: "Danh bạ & lịch sử giao dịch khách hàng",
        },
        {
          id: "quotes",
          name: "Báo giá",
          icon: FileText,
          desc: "Lập & xuất báo giá in ấn chuyên nghiệp",
        },
        {
          id: "invoices",
          name: "Hóa đơn",
          icon: Receipt,
          desc: "Quản lý hóa đơn chứng từ & thanh toán",
        },
      ],
    },
  ];

  // Filter out detached microservices
  const activeMenuDefinitions = menuDefinitions
    .map((item) => {
      if (!item.subItems) {
        return isAttached(item.id) ? item : null;
      }
      const filteredSubs = item.subItems.filter((sub) => isAttached(sub.id));
      if (filteredSubs.length === 0) return null;
      return { ...item, subItems: filteredSubs };
    })
    .filter(Boolean) as MenuItemDef[];

  // Helper to check if a menu item (single or group) is active
  const isItemActive = (item: MenuItemDef) => {
    if (!item.subItems) {
      return activeLink === item.id;
    }
    return item.subItems.some((sub) => sub.id === activeLink);
  };

  // Hover handlers for menu items
  const handleItemMouseEnter = (
    item: MenuItemDef,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const approxToastHeight = item.subItems
      ? item.subItems.length * 56 + 80
      : 130;
    let targetTop = rect.top - 8;
    if (targetTop + approxToastHeight > window.innerHeight - 16) {
      targetTop = Math.max(16, window.innerHeight - approxToastHeight - 16);
    }
    setHoveredMenu({
      item,
      top: Math.max(12, targetTop),
    });
  };

  const handleItemMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 180);
  };

  const handleToastMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleToastMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 180);
  };

  const handleSubItemClick = (subId: string) => {
    setHoveredMenu(null);
    if (onNavClick) {
      onNavClick(subId);
    }
  };

  const handleItemDirectClick = (item: MenuItemDef) => {
    if (item.subItems && item.subItems.length > 0) {
      const targetSub =
        item.subItems.find((s) => s.id === activeLink) || item.subItems[0];
      setHoveredMenu(null);
      if (onNavClick) {
        onNavClick(targetSub.id);
      }
    } else {
      setHoveredMenu(null);
      if (onNavClick) {
        onNavClick(item.id);
      }
    }
  };

  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      description: string;
      date: string;
    }>
  >([]);

  // Wallet & Account State
  const balance = wallet?.balance || 0;
  const [currentPlan, setCurrentPlan] = useState<AccountPlan>("free");

  useEffect(() => {
    const savedWallet = localStorage.getItem("userWallet");
    if (savedWallet) {
      try {
        const data = JSON.parse(savedWallet);
        setCurrentPlan(data.plan || "free");
      } catch (e) {
        console.error("Error loading wallet:", e);
      }
    }
  }, []);

  useEffect(() => {
    const loadNotifications = () => {
      const savedActivities = localStorage.getItem("userActivities");
      if (savedActivities) {
        try {
          const activities = JSON.parse(savedActivities);
          setNotifications(activities.slice(0, 10));
        } catch (e) {
          console.error("Error loading notifications:", e);
        }
      }
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentPlanInfo =
    accountPlans.find((p) => p.id === currentPlan) || accountPlans[0];

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "login":
        return <User size={14} className="text-green-600" />;
      case "export":
        return <Download size={14} className="text-blue-600" />;
      case "create":
        return <Plus size={14} className="text-purple-600" />;
      case "edit":
        return <Edit3 size={14} className="text-yellow-600" />;
      case "delete":
        return <Trash2 size={14} className="text-red-600" />;
      case "share":
        return <Users size={14} className="text-orange-600" />;
      case "upgrade":
        return <Crown size={14} className="text-pink-600" />;
      default:
        return <History size={14} className="text-gray-600" />;
    }
  };

  const getNotifBg = (type: string) => {
    switch (type) {
      case "login":
        return "bg-green-100";
      case "export":
        return "bg-blue-100";
      case "create":
        return "bg-purple-100";
      case "edit":
        return "bg-yellow-100";
      case "delete":
        return "bg-red-100";
      case "share":
        return "bg-orange-100";
      case "upgrade":
        return "bg-pink-100";
      default:
        return "bg-gray-100";
    }
  };

  const formatNotifDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <>
      {/* 80PX FIXED WIDTH LEFT PANEL */}
      <aside className="w-[80px] min-w-[80px] max-w-[80px] h-screen bg-white border-r border-gray-200 flex flex-col justify-between select-none z-40 relative shadow-sm flex-shrink-0">
        {/* --- TOP: COMPACT ANIMATED LOGO --- */}
        <div className="h-16 border-b border-gray-100 flex items-center justify-center p-2 flex-shrink-0">
          <ToolXPrintLogo
            compact={true}
            onClick={() => onNavClick && onNavClick("home")}
          />
        </div>

        {/* --- MIDDLE: VERTICAL ICON NAVIGATION --- */}
        <div className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden space-y-2 flex flex-col items-center custom-scrollbar">
          {activeMenuDefinitions.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            const isHovered = hoveredMenu?.item.id === item.id;
            const isAITool = item.id === "ai-group";

            return (
              <div key={item.id} className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleItemDirectClick(item)}
                  onMouseEnter={(e) => handleItemMouseEnter(item, e)}
                  onMouseLeave={handleItemMouseLeave}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative ${
                    active
                      ? isAITool
                        ? "bg-purple-100/80 text-purple-700 shadow-sm border border-purple-200/80 font-bold"
                        : "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80 font-bold"
                      : isHovered
                        ? "bg-gray-100 text-indigo-600 scale-105"
                        : "text-gray-500 hover:text-indigo-600 hover:bg-gray-100/80"
                  }`}
                  aria-label={item.name}
                >
                  {/* Left active vertical indicator bar */}
                  {active && (
                    <span
                      className={`absolute -left-2 top-2.5 bottom-2.5 w-1 rounded-r-full ${
                        isAITool
                          ? "bg-gradient-to-b from-purple-500 to-pink-500"
                          : "bg-indigo-600"
                      }`}
                    />
                  )}

                  <Icon
                    size={21}
                    strokeWidth={active ? 2.2 : 1.9}
                    className={`transition-transform duration-200 ${
                      active ? "scale-105" : "group-hover:scale-110"
                    } ${
                      isAITool && active
                        ? "text-purple-600"
                        : active
                          ? "text-indigo-600"
                          : "text-gray-500 group-hover:text-indigo-600"
                    }`}
                  />

                  {/* Tiny dot indicator for groups with multiple submenus */}
                  {item.subItems && item.subItems.length > 0 && (
                    <span
                      className={`absolute right-1.5 bottom-1.5 w-1.5 h-1.5 rounded-full ${
                        active
                          ? isAITool
                            ? "bg-purple-500"
                            : "bg-indigo-500"
                          : "bg-gray-300 group-hover:bg-indigo-400"
                      }`}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* --- BOTTOM: UTILITIES, NOTIFICATIONS & PROFILE --- */}
        <div className="p-2 border-t border-gray-100 bg-gray-50/50 flex flex-col items-center space-y-2 relative flex-shrink-0">
          {/* AI Robot Assistant Button */}
          {onToggleRobot && (
            <button
              onClick={onToggleRobot}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                showRobot
                  ? "bg-purple-100 text-purple-700 shadow-sm border border-purple-200"
                  : "bg-white text-gray-500 hover:text-purple-600 hover:bg-purple-50 border border-gray-200/60"
              }`}
              title={showRobot ? "Ẩn AI Assistant" : "Hiện Trợ lý AI"}
            >
              <Sparkles size={18} className="text-purple-600" />
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative w-full flex justify-center">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              title="Thông báo hoạt động"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all relative ${
                isNotificationOpen
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60"
              }`}
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {/* Notification Popover Toast */}
            {isNotificationOpen && (
              <div className="fixed left-[84px] bottom-4 w-84 rounded-2xl shadow-2xl bg-white border border-gray-100 z-50 max-h-96 overflow-hidden animate-fadeIn">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <History size={16} className="text-indigo-500" />
                    Lịch sử hoạt động
                  </h3>
                  <button
                    onClick={() => {
                      onOpenAccountPage?.("activity");
                      setIsNotificationOpen(false);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Xem tất cả
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Chưa có hoạt động nào</p>
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getNotifBg(notif.type)}`}>
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 font-medium truncate">
                              {notif.description}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock size={10} />
                              {formatNotifDate(notif.date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile / Login */}
          <div className="relative w-full flex justify-center">
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-11 h-11 rounded-full p-0.5 hover:ring-2 hover:ring-indigo-400 transition-all flex items-center justify-center relative"
                  title={user.fullName || user.email}
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                    {user.fullName
                      ? user.fullName.charAt(0).toUpperCase()
                      : user.email.charAt(0).toUpperCase()}
                  </div>
                </button>

                {/* Profile Toast Popover */}
                {isProfileOpen && (
                  <div className="fixed left-[84px] bottom-3 w-64 rounded-2xl shadow-2xl py-2 bg-white border border-gray-100 z-50 animate-fadeIn">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {user.fullName || "Người dùng"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            currentPlan === "free"
                              ? "bg-gray-100 text-gray-600"
                              : currentPlan === "basic"
                                ? "bg-blue-100 text-blue-700"
                                : currentPlan === "pro"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {currentPlanInfo.name}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onTopUpClick?.();
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                    >
                      <Wallet size={14} className="text-emerald-500" /> Nạp tiền vào ví
                    </button>
                    <button
                      onClick={() => {
                        onOpenAccountPage?.("plans");
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                    >
                      <Crown size={14} className="text-purple-500" /> Nâng cấp gói Pro
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          onOpenAccountPage?.("overview");
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <User size={14} className="text-gray-400" /> Tổng quan tài khoản
                      </button>
                      <button
                        onClick={() => {
                          onOpenAccountPage?.("wallet");
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Wallet size={14} className="text-gray-400" /> Lịch sử giao dịch
                      </button>
                      <button
                        onClick={() => {
                          onOpenAccountPage?.("settings");
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Settings size={14} className="text-gray-400" /> Cài đặt hệ thống
                      </button>
                    </div>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                      >
                        <LogOut size={14} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={onLoginClick}
                title="Đăng nhập tài khoản"
                className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xs hover:shadow-md"
              >
                <LogIn size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* --- FLOATING FLYOUT TOAST / TOOLTIP MODAL ON HOVER --- */}
      {hoveredMenu && (
        <div
          onMouseEnter={handleToastMouseEnter}
          onMouseLeave={handleToastMouseLeave}
          style={{ top: `${hoveredMenu.top}px` }}
          className="fixed left-[84px] z-[9999] w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 py-3 px-3 animate-fadeIn select-none pointer-events-auto"
        >
          {/* Invisible hover bridge connecting sidebar icon to this flyout */}
          <div className="absolute -left-3 top-0 bottom-0 w-3 pointer-events-auto" />

          {/* Toast Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100/80">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  hoveredMenu.item.id === "ai-group"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-indigo-50 text-indigo-600"
                }`}
              >
                <hoveredMenu.item.icon size={16} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-gray-900 truncate leading-tight">
                  {hoveredMenu.item.name}
                </h4>
                <span className="text-[10px] text-gray-400 font-medium">
                  {hoveredMenu.item.category}
                </span>
              </div>
            </div>
          </div>

          {/* Submenu List or Direct Description */}
          {hoveredMenu.item.subItems && hoveredMenu.item.subItems.length > 0 ? (
            <div className="space-y-1">
              {hoveredMenu.item.subItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = activeLink === sub.id;
                const isAIGroup = hoveredMenu.item.id === "ai-group";

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubItemClick(sub.id)}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 group cursor-pointer ${
                      isSubActive
                        ? isAIGroup
                          ? "bg-purple-50 text-purple-800 border border-purple-100 shadow-xs"
                          : "bg-indigo-50 text-indigo-800 border border-indigo-100 shadow-xs"
                        : isAIGroup
                          ? "hover:bg-purple-50/60 text-gray-700"
                          : "hover:bg-indigo-50/60 text-gray-700"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSubActive
                          ? isAIGroup
                            ? "bg-purple-200/80 text-purple-700"
                            : "bg-indigo-200/80 text-indigo-700"
                          : isAIGroup
                            ? "bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600"
                            : "bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                      }`}
                    >
                      <SubIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900 truncate">
                          {sub.name}
                        </span>
                        {isSubActive && (
                          <CheckCircle2
                            size={13}
                            className={
                              isAIGroup ? "text-purple-600" : "text-indigo-600"
                            }
                          />
                        )}
                      </div>
                      {sub.desc && (
                        <p className="text-[10px] text-gray-500 leading-snug mt-0.5 line-clamp-2">
                          {sub.desc}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              onClick={() => handleItemDirectClick(hoveredMenu.item)}
              className="cursor-pointer group"
            >
              <p className="text-xs text-gray-600 leading-relaxed">
                {hoveredMenu.item.description}
              </p>
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700">
                <span>Mở công cụ ngay</span>
                <ChevronRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TopNavBar;
