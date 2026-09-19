import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Search, BookOpen, X, Send, Play, Pause, SkipForward, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { sendChatMessage, getPageSuggestions, ChatMessage, generateContextualGuide, GuideStep } from '../services/aiChatService';

// Temporary inline tour guide content to fix build issue
const TOUR_STEPS = [
  {
    id: 'welcome',
    text: 'Chào mừng đến với ToolXPrint - Hệ thống thiết kế và in ấn chuyên nghiệp',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' }
  },
  {
    id: 'label-designer',
    text: 'Thiết kế nhãn - Tạo và chỉnh sửa nhãn với các công cụ chuyên nghiệp',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' }
  },
  {
    id: 'imposition',
    text: 'Bình trang - Sắp xếp và tối ưu hóa layout in ấn',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' }
  },
  {
    id: 'business',
    text: 'Quản lý kinh doanh - Quản lý khách hàng, báo giá và hóa đơn',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' }
  },
  {
    id: 'account',
    text: 'Quản lý tài khoản - Cài đặt tài khoản và gói dịch vụ',
    position: { bottom: '20px', left: '20px' },
    bubbleStyle: { top: '-110px', left: '0px' },
    arrowStyle: { left: '60px' }
  }
];

const IDLE_MESSAGES = [
  "Tôi có thể giúp bạn thiết kế nhãn chuyên nghiệp",
  "Hãy hỏi tôi về các tính năng của ToolXPrint",
  "Tôi sẵn sàng hướng dẫn bạn sử dụng hệ thống",
  "Bạn cần hỗ trợ gì về in ấn và thiết kế?",
  "Tôi có thể giải thích các công cụ bình trang"
];

interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, onComplete, speed = 40 }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    let index = 0;
    
    const timer = setInterval(() => {
      index++;
      setDisplayedText(text.slice(0, index));
      
      if (index >= text.length) {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return <span>{displayedText}</span>;
};

interface AIRobotAssistantProps {
  onNavigate?: (pageId: string) => void;
  currentPage?: string;
}

const AIRobotAssistant: React.FC<AIRobotAssistantProps> = ({ onNavigate, currentPage = 'home' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHappy, setIsHappy] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dialogueStep, setDialogueStep] = useState(0);
  const [currentTourIndex, setCurrentTourIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(100);
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);
  const [idleMessageIndex, setIdleMessageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [pendingNavigate, setPendingNavigate] = useState<{ id: string; name: string } | null>(null);
  const [dynamicGuideSteps, setDynamicGuideSteps] = useState<GuideStep[]>([]);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [robotPosition, setRobotPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('robot_position');
    return saved ? JSON.parse(saved) : null;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const STEP_DURATION = 6000;

  useEffect(() => {
    let pressCount = 0;
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        pressCount++;
        if (timeout) clearTimeout(timeout);
        
        timeout = setTimeout(() => { pressCount = 0; }, 500);

        if (pressCount === 3) {
          setIsVisible(true);
          setDialogueStep(1);
          pressCount = 0;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (dialogueStep === 1) {
      const timer = setTimeout(() => setDialogueStep(3), 5000);
      setIdleTimer(timer);
      return () => clearTimeout(timer);
    }
    if (idleTimer) clearTimeout(idleTimer);

    if (dialogueStep === 0) {
      const timer = setTimeout(() => setDialogueStep(1), 3000);
      return () => clearTimeout(timer);
    }
    
    if (dialogueStep === 5) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setDialogueStep(0);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [dialogueStep]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (dialogueStep === 3) {
      const duration = idleMessageIndex === 0 ? 2000 : 12000;
      
      timer = setTimeout(() => {
        setIdleMessageIndex((prev) => (prev + 1) % IDLE_MESSAGES.length);
      }, duration);
    } else {
      setIdleMessageIndex(0);
    }
    return () => clearTimeout(timer);
  }, [dialogueStep, idleMessageIndex]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (dialogueStep === 4 && !isPaused) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            handleNextTourStep();
            return 100;
          }
          return prev - (100 / (STEP_DURATION / 100));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [dialogueStep, isPaused, currentTourIndex]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = getPageSuggestions(searchQuery);
      setSuggestions(results);
    } else {
      setSuggestions(getPageSuggestions(''));
    }
  }, [searchQuery]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, aiResponse]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    setMousePos({
      x: Math.max(-5, Math.min(5, x * 5)),
      y: Math.max(-3, Math.min(3, y * 3))
    });
  };

  const handleRobotClick = () => {
    setIsHappy(!isHappy);
    if (dialogueStep === 3) setDialogueStep(1);
    if (dialogueStep === 4) setIsPaused(!isPaused);
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (dialogueStep === 4) return;
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const currentX = robotPosition?.x ?? 12;
    const currentY = robotPosition?.y ?? 12;
    
    setDragOffset({
      x: clientX - currentX,
      y: clientY - (window.innerHeight - currentY - 200)
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const newX = Math.max(0, Math.min(window.innerWidth - 140, clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 200, window.innerHeight - clientY + dragOffset.y - 200));
      
      setRobotPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
      if (robotPosition) {
        localStorage.setItem('robot_position', JSON.stringify(robotPosition));
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset, robotPosition]);

  const handleStartTour = async () => {
    setIsLoadingGuide(true);
    setDialogueStep(4);
    setCurrentTourIndex(0);
    setIsPaused(true);
    setTimeLeft(100);
    setIsHappy(true);
    
    try {
      const steps = await generateContextualGuide(currentPage);
      setDynamicGuideSteps(steps);
    } catch (error) {
      console.error('Error generating guide:', error);
      setDynamicGuideSteps([
        { title: 'Chào mừng', content: 'Khám phá các tính năng của trang này.' },
        { title: 'Trợ giúp', content: 'Bấm vào tôi để hỏi bất cứ điều gì.' },
      ]);
    } finally {
      setIsLoadingGuide(false);
      setIsPaused(false);
    }
  };

  const handleDisappear = () => {
    setDialogueStep(5);
  };

  const handleNextTourStep = () => {
    const stepsToUse = dynamicGuideSteps.length > 0 ? dynamicGuideSteps : TOUR_STEPS;
    if (currentTourIndex < stepsToUse.length - 1) {
      setCurrentTourIndex(prev => prev + 1);
      setTimeLeft(100);
    } else {
      endTour();
    }
  };

  const endTour = () => {
    setDialogueStep(1);
    setIsHappy(false);
    setCurrentTourIndex(0);
    setDynamicGuideSteps([]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || isLoading) return;
    
    setIsLoading(true);
    const userMessage = searchQuery.trim();
    setSearchQuery('');
    
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      const response = await sendChatMessage(userMessage, chatMessages);
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
      setAiResponse(response.message);
      
      if (response.navigateTo && response.pageName) {
        setPendingNavigate({ id: response.navigateTo, name: response.pageName });
        setTimeout(() => {
          if (onNavigate) {
            onNavigate(response.navigateTo!);
          }
          setPendingNavigate(null);
        }, 1500);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (pageId: string, pageName: string) => {
    if (onNavigate) {
      setAiResponse(`Đang mở ${pageName}...`);
      setChatMessages(prev => [...prev, 
        { role: 'user', content: pageName },
        { role: 'assistant', content: `Đang mở ${pageName}...` }
      ]);
      setTimeout(() => {
        onNavigate(pageId);
      }, 500);
    }
  };

  const getRobotStyle = (): React.CSSProperties => {
    if (dialogueStep === 4) {
      const stepConfig = TOUR_STEPS[currentTourIndex]?.position || {};
      return {
        position: 'fixed',
        transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 50,
        ...stepConfig
      };
    }
    
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 50,
      cursor: isDragging ? 'grabbing' : 'grab',
      transition: isDragging ? 'none' : 'all 0.3s ease-out',
      transform: isDragging ? 'scale(1.05)' : 'scale(1)',
      filter: isDragging ? 'drop-shadow(0 10px 20px rgba(168, 85, 247, 0.4))' : 'none',
    };

    if (robotPosition) {
      return {
        ...baseStyle,
        left: `${robotPosition.x}px`,
        bottom: `${robotPosition.y}px`,
      };
    }
    
    return {
      ...baseStyle,
      bottom: '12px',
      left: '12px',
    };
  };

  const getCurrentBubbleStyle = (): React.CSSProperties => {
    if (dialogueStep === 4 && TOUR_STEPS[currentTourIndex]) {
      return TOUR_STEPS[currentTourIndex].bubbleStyle || { top: '-110px', left: '0px' };
    }
    return { bottom: '100%', left: '0px', marginBottom: '12px' };
  };

  const getCurrentArrowStyle = (): React.CSSProperties => {
    if (dialogueStep === 4 && TOUR_STEPS[currentTourIndex]) {
      return TOUR_STEPS[currentTourIndex].arrowStyle || { left: '60px' };
    }
    return { 
      left: '60px', 
      bottom: '-8px', 
      transform: 'rotate(45deg)', 
      borderBottomWidth: '2px', 
      borderRightWidth: '2px',
      top: 'auto'
    };
  };

  if (!isVisible) return null;

  return (
    <div className="select-none" style={getRobotStyle()}>
      <style>{`
        @keyframes robot-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes robot-glow {
          0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 5px #a855f7); }
          50% { opacity: 1; filter: drop-shadow(0 0 15px #d8b4fe); }
        }
        @keyframes robot-thrust {
          0% { transform: scaleY(1); opacity: 0.8; }
          50% { transform: scaleY(1.2); opacity: 0.4; }
          100% { transform: scaleY(1); opacity: 0.8; }
        }
        @keyframes robot-blink {
          0%, 96%, 100% { transform: scaleY(1); }
          98% { transform: scaleY(0.1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .robot-float-anim { animation: robot-float 4s ease-in-out infinite; }
        .core-glow-anim { animation: robot-glow 2s ease-in-out infinite; }
        .thruster-anim { animation: robot-thrust 0.1s linear infinite; }
        .eye-blink-anim { animation: robot-blink 4s infinite; }
        .animate-fade-in-robot { animation: fade-in 0.3s ease-out; }
      `}</style>

      <div className="relative" style={{ width: '140px' }}>
        {dialogueStep !== 3 && (
          <div 
            className="absolute z-20 animate-fade-in-robot"
            style={{ ...getCurrentBubbleStyle(), width: dialogueStep === 2 ? '300px' : '264px' }}
          >
            <div className="bg-white border-2 border-purple-200 rounded-2xl p-3 shadow-xl relative overflow-hidden">
              {dialogueStep === 4 && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                  <div 
                    className={`h-full ${isPaused ? 'bg-yellow-400' : 'bg-purple-500'} transition-all duration-100`}
                    style={{ width: `${timeLeft}%` }}
                  ></div>
                </div>
              )}

              <div 
                className="absolute w-3 h-3 bg-white border-purple-200"
                style={getCurrentArrowStyle()}
              ></div>

              <div className="min-h-[40px]">
                {dialogueStep === 0 && (
                  <div className="text-purple-700 font-medium text-sm">
                    <TypewriterText text="Xin chào bạn đến với Hệ Thống In" speed={50} />
                  </div>
                )}

                {dialogueStep === 1 && (
                  <div className="animate-fade-in-robot">
                    <p className="text-gray-700 mb-1 text-xs font-medium">
                      Bạn có cần tôi hướng dẫn sử dụng website không?
                    </p>
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={handleStartTour}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                        >
                          <BookOpen size={14} /> Xem hướng dẫn
                        </button>
                        <button 
                          onClick={() => setDialogueStep(2)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-md whitespace-nowrap"
                        >
                          <Search size={14} /> Tìm kiếm
                        </button>
                      </div>
                      <button 
                        onClick={handleDisappear}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs transition-colors"
                      >
                        <EyeOff size={12} /> Cho tôi biến mất
                      </button>
                    </div>
                  </div>
                )}

                {dialogueStep === 2 && (
                  <div className="animate-fade-in-robot">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-purple-600">Tìm kiếm & Chat AI</span>
                      <button onClick={() => { setDialogueStep(1); setChatMessages([]); setAiResponse(''); }} className="text-gray-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                    
                    {chatMessages.length > 0 && (
                      <div 
                        ref={chatContainerRef}
                        className="max-h-32 overflow-y-auto mb-2 space-y-2 text-xs"
                      >
                        {chatMessages.slice(-4).map((msg, idx) => (
                          <div key={idx} className={`p-2 rounded-lg ${msg.role === 'user' ? 'bg-purple-50 text-purple-700 ml-4' : 'bg-gray-50 text-gray-700 mr-4'}`}>
                            {msg.content}
                          </div>
                        ))}
                        {isLoading && (
                          <div className="flex items-center gap-2 text-purple-500 p-2">
                            <Loader2 size={12} className="animate-spin" />
                            <span>Đang suy nghĩ...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {pendingNavigate && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2 flex items-center gap-2 text-xs text-green-700">
                        <ArrowRight size={12} />
                        <span>Đang chuyển đến {pendingNavigate.name}...</span>
                      </div>
                    )}

                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        placeholder="Hỏi AI hoặc tìm trang..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                        autoFocus
                        disabled={isLoading}
                      />
                      <button 
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>

                    {suggestions.length > 0 && chatMessages.length === 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 uppercase font-medium">Truy cập nhanh:</p>
                        <div className="flex flex-wrap gap-1">
                          {suggestions.map((page) => (
                            <button
                              key={page.id}
                              onClick={() => handleSuggestionClick(page.id, page.name)}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                            >
                              {page.name}
                              <ArrowRight size={8} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {dialogueStep === 4 && (
                  <div className="animate-fade-in-robot pt-1">
                    {isLoadingGuide ? (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 size={16} className="animate-spin text-purple-600" />
                        <span className="text-sm text-purple-600">Đang tạo hướng dẫn...</span>
                      </div>
                    ) : dynamicGuideSteps[currentTourIndex] ? (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-purple-700 font-bold text-xs">
                            {dynamicGuideSteps[currentTourIndex].title} ({currentTourIndex + 1}/{dynamicGuideSteps.length})
                          </p>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => setIsPaused(!isPaused)} 
                              className={`p-1 rounded hover:bg-gray-100 ${isPaused ? 'text-yellow-600' : 'text-gray-500'}`}
                              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
                            >
                              {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 text-sm mb-3 min-h-[40px]">
                          <TypewriterText text={dynamicGuideSteps[currentTourIndex].content} speed={30} key={currentTourIndex} />
                        </p>
                        
                        <div className="flex justify-between gap-2">
                          <button 
                            onClick={endTour}
                            className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs rounded-full shadow-sm border border-red-100 transition-colors"
                          >
                            <X size={10} /> Kết thúc
                          </button>
                          <button 
                            onClick={handleNextTourStep}
                            className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs rounded-full shadow-sm border border-purple-100 transition-colors"
                          >
                            {currentTourIndex < dynamicGuideSteps.length - 1 ? (
                              <>Tiếp <SkipForward size={10} /></>
                            ) : 'Hoàn tất'}
                          </button>
                        </div>
                      </>
                    ) : TOUR_STEPS[currentTourIndex] && (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-purple-700 font-bold text-xs">
                            BƯỚC {currentTourIndex + 1}/{TOUR_STEPS.length}
                          </p>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => setIsPaused(!isPaused)} 
                              className={`p-1 rounded hover:bg-gray-100 ${isPaused ? 'text-yellow-600' : 'text-gray-500'}`}
                              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
                            >
                              {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 text-sm mb-3 min-h-[40px]">
                          <TypewriterText text={TOUR_STEPS[currentTourIndex].text} speed={30} key={currentTourIndex} />
                        </p>
                        
                        <div className="flex justify-between gap-2">
                          <button 
                            onClick={endTour}
                            className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs rounded-full shadow-sm border border-red-100 transition-colors"
                          >
                            <X size={10} /> Kết thúc
                          </button>
                          <button 
                            onClick={handleNextTourStep}
                            className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs rounded-full shadow-sm border border-purple-100 transition-colors"
                          >
                            {currentTourIndex < TOUR_STEPS.length - 1 ? (
                              <>Tiếp <SkipForward size={10} /></>
                            ) : 'Hoàn tất'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {dialogueStep === 5 && (
                  <div className="animate-fade-in-robot">
                    <p className="text-purple-700 font-bold text-sm mb-1">Tạm biệt nhé!</p>
                    <p className="text-gray-600 text-sm italic">
                      Bấm Ctrl 3 lần để gọi tôi lại bất cứ lúc nào.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {dialogueStep === 3 && (
          <div 
            onClick={() => setDialogueStep(1)}
            className="absolute bottom-full left-0 mb-4 z-20 cursor-pointer"
            style={{ width: '220px' }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs py-2 px-3 rounded-xl shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-colors">
              <p className="whitespace-pre-line leading-relaxed">{IDLE_MESSAGES[idleMessageIndex]}</p>
            </div>
            <div className="absolute -bottom-1 left-[60px] w-3 h-3 bg-purple-600 transform rotate-45"></div>
          </div>
        )}

        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleRobotClick}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className={`transition-transform z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ width: '140px', height: '200px' }}
        >
          <svg 
            viewBox="0 0 200 300" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-xl robot-float-anim"
          >
            <defs>
              <linearGradient id="robotBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
              <linearGradient id="robotThrustGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
              </linearGradient>
            </defs>

            <ellipse cx="100" cy="280" rx="30" ry="5" fill="#000" opacity="0.1" className="blur-sm">
              <animate attributeName="rx" values="30;20;30" dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.1;0.2;0.1" dur="4s" repeatCount="indefinite" />
            </ellipse>

            <g transform="translate(100, 235)">
              <ellipse cx="0" cy="0" rx="12" ry="35" fill="url(#robotThrustGradient)" className="thruster-anim" />
              <ellipse cx="0" cy="5" rx="6" ry="20" fill="#fff" opacity="0.8" className="thruster-anim" style={{animationDelay: '0.05s'}} />
            </g>

            <g transform="translate(35, 145)">
              <circle cx="10" cy="10" r="12" fill="#6b21a8" />
              <circle cx="10" cy="10" r="6" fill="#f3e8ff" />
              <rect x="2" y="10" width="16" height="25" rx="4" fill="#a855f7" transform="rotate(20 10 10)" />
              <circle cx="0" cy="35" r="8" fill="#4c1d95" />
              <rect x="-6" y="35" width="12" height="20" rx="3" fill="#c084fc" transform="rotate(-10 0 35)" />
              <g transform="translate(-5, 55) rotate(-10)">
                <path d="M-6,0 Q-10,10 -2,15" fill="none" stroke="#6b21a8" strokeWidth="3" strokeLinecap="round" />
                <path d="M6,0 Q10,10 2,15" fill="none" stroke="#6b21a8" strokeWidth="3" strokeLinecap="round" />
                <rect x="-4" y="-2" width="8" height="6" rx="1" fill="#4c1d95" />
              </g>
            </g>

            <g transform="translate(165, 145) scale(-1, 1)">
              <circle cx="10" cy="10" r="12" fill="#6b21a8" />
              <circle cx="10" cy="10" r="6" fill="#f3e8ff" />
              <rect x="2" y="10" width="16" height="25" rx="4" fill="#a855f7" transform="rotate(20 10 10)" />
              <circle cx="0" cy="35" r="8" fill="#4c1d95" />
              <rect x="-6" y="35" width="12" height="20" rx="3" fill="#c084fc" transform="rotate(-10 0 35)" />
              <g transform="translate(-5, 55) rotate(-10)">
                <path d="M-6,0 Q-10,10 -2,15" fill="none" stroke="#6b21a8" strokeWidth="3" strokeLinecap="round" />
                <path d="M6,0 Q10,10 2,15" fill="none" stroke="#6b21a8" strokeWidth="3" strokeLinecap="round" />
                <rect x="-4" y="-2" width="8" height="6" rx="1" fill="#4c1d95" />
              </g>
            </g>

            <g transform="translate(100, 160)">
              <path 
                d="M-40,-45 L40,-45 L30,65 Q0,75 -30,65 Z" 
                fill="url(#robotBodyGradient)" 
                stroke="#c084fc" 
                strokeWidth="2"
              />
              <path d="M-20,20 L20,20 L15,50 L-15,50 Z" fill="rgba(255,255,255,0.2)" stroke="none" />
              <circle cx="0" cy="-10" r="18" fill="#2e1065" stroke="#c084fc" strokeWidth="1" />
              <circle cx="0" cy="-10" r="12" fill={isHappy ? "#ec4899" : "#06b6d4"} className="core-glow-anim" />
            </g>

            <rect x="90" y="105" width="20" height="15" fill="#6b21a8" rx="4" />

            <g transform="translate(100, 75)">
              <rect x="-48" y="-25" width="10" height="30" rx="3" fill="#c084fc" />
              <rect x="38" y="-25" width="10" height="30" rx="3" fill="#c084fc" />
              <path d="M0,-45 L0,-65" stroke="#a855f7" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="0" cy="-65" r="4" fill={isHappy ? "#ec4899" : "#06b6d4"} className="core-glow-anim" />
              <rect x="-42" y="-45" width="84" height="70" rx="22" fill="url(#robotBodyGradient)" stroke="#c084fc" strokeWidth="2" />
              <rect x="-35" y="-30" width="70" height="45" rx="12" fill="#1e1b4b" stroke="#4c1d95" strokeWidth="1"/>

              <g transform={`translate(${mousePos.x}, ${mousePos.y})`} className="eye-blink-anim">
                {isHappy ? (
                  <g stroke="#ec4899" strokeWidth="5" strokeLinecap="round" fill="none">
                    <path d="M-18,-5 Q-12,-12 -6,-5" />
                    <path d="M6,-5 Q12,-12 18,-5" />
                  </g>
                ) : (
                  <g>
                    <ellipse cx="-16" cy="-5" rx="9" ry="11" fill="#06b6d4" className="core-glow-anim" />
                    <ellipse cx="-13" cy="-8" rx="3" ry="4" fill="#fff" opacity="0.6" />
                    <ellipse cx="16" cy="-5" rx="9" ry="11" fill="#06b6d4" className="core-glow-anim" />
                    <ellipse cx="19" cy="-8" rx="3" ry="4" fill="#fff" opacity="0.6" />
                  </g>
                )}
              </g>

              {isHappy && (
                <g fill="#ec4899" opacity="0.6">
                  <ellipse cx="-25" cy="10" rx="4" ry="2" />
                  <ellipse cx="25" cy="10" rx="4" ry="2" />
                </g>
              )}
            </g>
            
            {isHappy && (
              <g transform="translate(150, 40)" className="animate-bounce">
                <Sparkles color="#ec4899" size={20} />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AIRobotAssistant;
