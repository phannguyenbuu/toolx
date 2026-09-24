import { TourStepItem } from './types';

export const TOUR_STEPS: TourStepItem[] = [
  {
    id: 'welcome',
    text: 'Chào mừng đến với ToolXPrint - Hệ thống thiết kế và in ấn chuyên nghiệp',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' },
  },
  {
    id: 'label-designer',
    text: 'Thiết kế nhãn - Tạo và chỉnh sửa nhãn với các công cụ chuyên nghiệp',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' },
  },
  {
    id: 'imposition',
    text: 'Bình trang - Sắp xếp và tối ưu hóa layout in ấn',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' },
  },
  {
    id: 'business',
    text: 'Quản lý kinh doanh - Quản lý khách hàng, báo giá và hóa đơn',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' },
  },
  {
    id: 'account',
    text: 'Quản lý tài khoản - Cài đặt tài khoản và gói dịch vụ',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' },
  },
];

export const IDLE_MESSAGES = [
  'Tôi có thể giúp bạn thiết kế nhãn chuyên nghiệp',
  'Hãy hỏi tôi về các tính năng của ToolXPrint',
  'Tôi sẵn sàng hướng dẫn bạn sử dụng hệ thống',
  'Bạn cần hỗ trợ gì về in ấn và thiết kế?',
  'Tôi có thể giải thích các công cụ bình trang',
];

export const STEP_DURATION = 6000;
