import { AI_SYSTEM_PROMPT, searchPages, WEBSITE_PAGES } from '../data/aiSystemPrompt';

const DEFAULT_GROQ_KEY = process.env.REACT_APP_GROQ_API_KEY || '';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  message: string;
  navigateTo?: string;
  pageName?: string;
}

export const sendChatMessage = async (
  userMessage: string,
  chatHistory: ChatMessage[] = []
): Promise<AIChatResponse> => {
  const GROQ_API_KEY = localStorage.getItem('groq_api_key') || DEFAULT_GROQ_KEY;
  
  const quickSearch = searchPages(userMessage);
  if (quickSearch && userMessage.length < 30) {
    return {
      message: `Đang mở ${quickSearch.name} cho bạn...`,
      navigateTo: quickSearch.id,
      pageName: quickSearch.name
    };
  }

  try {
    const messages = [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      ...chatHistory.slice(-6),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || 'Xin lỗi, tôi không hiểu. Bạn có thể hỏi lại không?';

    const navigateMatch = aiMessage.match(/\[NAVIGATE:(\w+[-\w]*)\]/);
    let navigateTo: string | undefined;
    let pageName: string | undefined;
    let cleanMessage = aiMessage;

    if (navigateMatch) {
      navigateTo = navigateMatch[1];
      cleanMessage = aiMessage.replace(/\[NAVIGATE:\w+[-\w]*\]/g, '').trim();
      const page = WEBSITE_PAGES.find(p => p.id === navigateTo);
      pageName = page?.name;
    }

    return {
      message: cleanMessage,
      navigateTo,
      pageName
    };
  } catch (error) {
    console.error('AI Chat error:', error);
    
    const fallbackSearch = searchPages(userMessage);
    if (fallbackSearch) {
      return {
        message: `Tôi tìm thấy ${fallbackSearch.name}. Để tôi đưa bạn đến đó!`,
        navigateTo: fallbackSearch.id,
        pageName: fallbackSearch.name
      };
    }

    return {
      message: 'Xin lỗi, tôi đang gặp sự cố. Bạn có thể thử:\n• Trang chủ - Tạo QR Code\n• Biến Đổi Dữ Liệu - Thiết kế tem\n• Xử Lý PDF - Ghép/tách PDF\n• Bình Trang - Layout in\n• Tính Giá In - Báo giá'
    };
  }
};

export interface GuideStep {
  title: string;
  content: string;
}

const PAGE_GUIDES: Record<string, GuideStep[]> = {
  'home': [
    { title: 'Menu chức năng', content: 'Phía trên là 5 thẻ chức năng chính: Biến Đổi Dữ Liệu, Xử Lý PDF, Bình Trang, Tính Giá In, và Kinh Doanh. Bấm vào từng thẻ để mở.' },
    { title: 'Tạo QR Code', content: 'Chọn loại QR bạn muốn tạo: URL, Text, WiFi, Google Docs, Vị trí, VCard, Email, SMS, WhatsApp, Telegram, PayPal, Crypto, hoặc Sự kiện.' },
    { title: 'Tuỳ chỉnh thiết kế', content: 'Thay đổi kiểu chấm, màu sắc, gradient, và thêm logo vào giữa mã QR theo ý thích.' },
    { title: 'Tải về', content: 'Bấm các nút PNG, SVG, JPG, EPS hoặc PDF để tải mã QR về máy với định dạng mong muốn.' },
  ],
  'label-designer': [
    { title: 'Thiết kế tem nhãn', content: 'Đây là công cụ thiết kế tem nhãn với dữ liệu biến đổi từ Excel hoặc Google Sheets.' },
    { title: 'Thêm dữ liệu', content: 'Nhập file Excel hoặc dán link Google Sheets để lấy dữ liệu merge fields.' },
    { title: 'Kéo thả elements', content: 'Thêm text, hình ảnh, QR code, barcode lên canvas. Kéo thả để bố trí.' },
    { title: 'Xuất PDF', content: 'Bấm nút Xuất PDF để tạo file in hàng loạt với dữ liệu từ bảng tính.' },
  ],
  'pdf-processor': [
    { title: 'Xử lý PDF', content: 'Công cụ ghép, tách, và chuyển đổi file PDF một cách nhanh chóng.' },
    { title: 'Ghép PDF', content: 'Kéo thả nhiều file PDF vào để ghép thành một file duy nhất.' },
    { title: 'Tách PDF', content: 'Chọn các trang cần tách ra thành file riêng biệt.' },
  ],
  'imposition': [
    { title: 'Bình trang', content: 'Công cụ sắp xếp layout in offset tự động, tối ưu sử dụng giấy.' },
    { title: 'Chọn khổ giấy', content: 'Chọn khổ giấy in (A3, A4, SRA3...) và số lượng hình trên trang.' },
    { title: 'AI gợi ý', content: 'Bấm nút AI để nhận gợi ý layout tối ưu nhất cho công việc của bạn.' },
  ],
  'price-calc-offset': [
    { title: 'Tính giá in', content: 'Công cụ tính chi phí in offset và gợi ý giá in kỹ thuật số.' },
    { title: 'Nhập thông số', content: 'Điền số lượng, kích thước, loại giấy, và các gia công cần thiết.' },
    { title: 'Xem kết quả', content: 'Hệ thống sẽ tự động tính toán và hiển thị chi phí chi tiết.' },
  ],
  'customers': [
    { title: 'Quản lý kinh doanh', content: 'Quản lý khách hàng, tạo báo giá và theo dõi hóa đơn.' },
    { title: 'Thêm khách hàng', content: 'Bấm nút Thêm để tạo mới thông tin khách hàng.' },
    { title: 'Tạo báo giá', content: 'Chọn khách hàng và tạo báo giá nhanh chóng.' },
  ],
  'data': [
    { title: 'Quản lý dữ liệu', content: 'Xem và quản lý các file đã upload lên hệ thống.' },
    { title: 'Tìm file', content: 'Sử dụng ô tìm kiếm để tìm file theo tên hoặc loại.' },
    { title: 'Tải xuống', content: 'Bấm vào file để xem chi tiết hoặc tải về máy.' },
  ],
};

export const generateContextualGuide = async (currentPage: string): Promise<GuideStep[]> => {
  if (PAGE_GUIDES[currentPage]) {
    return PAGE_GUIDES[currentPage];
  }
  
  const GROQ_API_KEY = localStorage.getItem('groq_api_key') || DEFAULT_GROQ_KEY;
  const page = WEBSITE_PAGES.find(p => p.id === currentPage);
  const pageName = page?.name || currentPage;
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { 
            role: 'system', 
            content: `Bạn là trợ lý hướng dẫn của Label Designer Pro. Tạo 3-4 bước hướng dẫn ngắn gọn cho trang "${pageName}".
Trả về JSON array với format: [{"title": "Tiêu đề ngắn", "content": "Mô tả 1-2 câu"}]
Chỉ trả về JSON, không giải thích thêm.`
          },
          { role: 'user', content: `Tạo hướng dẫn cho trang: ${pageName}` }
        ],
        temperature: 0.3,
        max_tokens: 400
      })
    });

    if (!response.ok) throw new Error('API failed');
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Generate guide error:', error);
  }
  
  return [
    { title: 'Chào mừng', content: `Bạn đang ở trang ${pageName}. Khám phá các tính năng bên dưới.` },
    { title: 'Trợ giúp', content: 'Bấm vào tôi và chọn "Tìm kiếm" để hỏi bất cứ điều gì về trang này.' },
  ];
};

export const getPageSuggestions = (query: string): Array<{ id: string; name: string }> => {
  if (!query.trim()) {
    return WEBSITE_PAGES.slice(0, 5).map(p => ({ id: p.id, name: p.name }));
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  const results: Array<{ id: string; name: string; score: number }> = [];
  
  for (const page of WEBSITE_PAGES) {
    let score = 0;
    
    if (page.name.toLowerCase().includes(normalizedQuery)) {
      score += 10;
    }
    
    for (const keyword of page.keywords) {
      if (keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)) {
        score += 5;
      }
    }
    
    if (score > 0) {
      results.push({ id: page.id, name: page.name, score });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => ({ id: r.id, name: r.name }));
};
