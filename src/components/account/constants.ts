import { Star, Gift, Crown, Sparkles } from 'lucide-react';
import { AccountPlanInfo, Transaction, ActivityLog, TeamMember, BusinessInfo } from './types';

export const accountPlans: AccountPlanInfo[] = [
  {
    id: 'free',
    name: 'Miễn phí',
    price: 0,
    features: ['5 phiên làm việc', '100 lượt xuất PDF/tháng', 'Hỗ trợ cơ bản', '100MB lưu trữ'],
    color: 'gray',
    icon: Star,
    limits: { sessions: 5, exports: 100, storage: '100MB', teamMembers: 1 }
  },
  {
    id: 'basic',
    name: 'Cơ bản',
    price: 99000,
    features: ['20 phiên làm việc', '500 lượt xuất PDF/tháng', 'Hỗ trợ email', 'Không quảng cáo', '1GB lưu trữ', '3 thành viên'],
    color: 'blue',
    icon: Gift,
    limits: { sessions: 20, exports: 500, storage: '1GB', teamMembers: 3 }
  },
  {
    id: 'pro',
    name: 'Chuyên nghiệp',
    price: 299000,
    features: ['Không giới hạn phiên', 'Không giới hạn xuất PDF', 'Hỗ trợ ưu tiên', 'API truy cập', 'Tính năng AI', '10GB lưu trữ', '10 thành viên'],
    color: 'purple',
    icon: Crown,
    limits: { sessions: 'unlimited', exports: 'unlimited', storage: '10GB', teamMembers: 10 }
  },
  {
    id: 'enterprise',
    name: 'Doanh nghiệp',
    price: 999000,
    features: ['Tất cả tính năng Pro', 'Hỗ trợ 24/7', 'Tùy chỉnh thương hiệu', 'Đào tạo nhân viên', 'SLA cam kết', '100GB lưu trữ', 'Không giới hạn thành viên'],
    color: 'amber',
    icon: Sparkles,
    limits: { sessions: 'unlimited', exports: 'unlimited', storage: '100GB', teamMembers: 'unlimited' }
  }
];

export const defaultTransactions: Transaction[] = [
  { 
    id: '1', 
    userId: 'demo-user',
    type: 'topup', 
    amount: 500000, 
    balanceBefore: 0,
    balanceAfter: 500000,
    description: 'Nạp tiền qua chuyển khoản', 
    metadata: {},
    date: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed', 
    method: 'bank_transfer' 
  },
  { 
    id: '2', 
    userId: 'demo-user',
    type: 'upgrade', 
    amount: -99000, 
    balanceBefore: 500000,
    balanceAfter: 401000,
    description: 'Nâng cấp gói Cơ bản', 
    metadata: {},
    date: new Date(Date.now() - 172800000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    status: 'completed' 
  },
  { 
    id: '3', 
    userId: 'demo-user',
    type: 'topup', 
    amount: 200000, 
    balanceBefore: 401000,
    balanceAfter: 601000,
    description: 'Nạp tiền qua chuyển khoản', 
    metadata: {},
    date: new Date(Date.now() - 259200000).toISOString(),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    status: 'completed', 
    method: 'bank_transfer' 
  },
];

export const defaultActivities: ActivityLog[] = [
  { 
    id: '1', 
    userId: 'demo-user',
    type: 'login', 
    description: 'Đăng nhập từ Chrome trên Windows', 
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    entityType: 'user',
    entityId: 'demo-user',
    metadata: { device: 'Chrome / Windows' },
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome / Windows',
    ip: '192.168.1.100', 
    device: 'Chrome / Windows' 
  },
  { 
    id: '2', 
    userId: 'demo-user',
    type: 'export', 
    description: 'Xuất PDF "Tem nhãn sản phẩm"', 
    date: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    entityType: 'pdf',
    entityId: null,
    metadata: {},
    ipAddress: null,
    userAgent: null
  },
  { 
    id: '3', 
    userId: 'demo-user',
    type: 'create', 
    description: 'Tạo phiên làm việc mới "Thiết kế Card Visit"', 
    date: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    entityType: 'session',
    entityId: null,
    metadata: {},
    ipAddress: null,
    userAgent: null
  },
  { 
    id: '4', 
    userId: 'demo-user',
    type: 'share', 
    description: 'Chia sẻ link xem trước cho khách hàng', 
    date: new Date(Date.now() - 10800000).toISOString(),
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    entityType: 'link',
    entityId: null,
    metadata: {},
    ipAddress: null,
    userAgent: null
  },
  { 
    id: '5', 
    userId: 'demo-user',
    type: 'upgrade', 
    description: 'Nâng cấp tài khoản lên gói Cơ bản', 
    date: new Date(Date.now() - 172800000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    entityType: 'subscription',
    entityId: null,
    metadata: {},
    ipAddress: null,
    userAgent: null
  },
];

export const defaultTeamMembers: TeamMember[] = [
  { id: '1', name: 'Nguyễn Văn A', email: 'admin@xuongin.vn', role: 'owner', joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastActive: new Date().toISOString(), status: 'active' },
  { id: '2', name: 'Trần Thị B', email: 'design@xuongin.vn', role: 'editor', joinedAt: new Date(Date.now() - 15 * 86400000).toISOString(), lastActive: new Date(Date.now() - 3600000).toISOString(), status: 'active' },
  { id: '3', name: 'Lê Văn C', email: 'sales@xuongin.vn', role: 'viewer', joinedAt: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'invited' },
];

export const defaultBusinessInfo: BusinessInfo = {
  name: 'Xưởng In ABC',
  taxCode: '0123456789',
  address: '123 Đường ABC, Quận 1, TP.HCM',
  province: 'Hồ Chí Minh',
  commune: 'Phường Bến Nghé',
  phone: '0901234567',
  email: 'contact@xuongin.vn',
  website: 'https://xuongin.vn',
  description: 'Chuyên in ấn tem nhãn, bao bì, card visit chất lượng cao',
  printingCapacity: '50.000 tem/ngày',
  equipment: ['Máy in Offset Heidelberg', 'Máy in kỹ thuật số HP Indigo', 'Máy cắt bế tự động'],
  taxPercent: 10
};
