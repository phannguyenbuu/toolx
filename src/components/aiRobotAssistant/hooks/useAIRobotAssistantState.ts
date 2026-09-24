import React, { useState, useEffect, useRef } from 'react';
import {
  sendChatMessage,
  getPageSuggestions,
  ChatMessage,
  generateContextualGuide,
  GuideStep,
} from '../../../services/aiChatService';
import { TOUR_STEPS, IDLE_MESSAGES, STEP_DURATION } from '../constants';
import { RobotPosition } from '../types';

interface UseAIRobotAssistantStateProps {
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
}

export const useAIRobotAssistantState = ({
  currentPage = 'home',
  onNavigate,
}: UseAIRobotAssistantStateProps) => {
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
  const [robotPosition, setRobotPosition] = useState<RobotPosition | null>(() => {
    const saved = localStorage.getItem('robot_position');
    return saved ? JSON.parse(saved) : null;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Ctrl x 3 hotkey
  useEffect(() => {
    let pressCount = 0;
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        pressCount++;
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
          pressCount = 0;
        }, 500);

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

  // Dialogue steps transitions
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

  // Idle message rotation
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

  // Tour step progress timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (dialogueStep === 4 && !isPaused) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            handleNextTourStep();
            return 100;
          }
          return prev - 100 / (STEP_DURATION / 100);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [dialogueStep, isPaused, currentTourIndex]);

  // Page suggestions
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = getPageSuggestions(searchQuery);
      setSuggestions(results);
    } else {
      setSuggestions(getPageSuggestions(''));
    }
  }, [searchQuery]);

  // Chat auto-scroll
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
      y: Math.max(-3, Math.min(3, y * 3)),
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
      y: clientY - (window.innerHeight - currentY - 200),
    });
  };

  // Drag mousemove & touchend listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const newX = Math.max(0, Math.min(window.innerWidth - 140, clientX - dragOffset.x));
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - 200, window.innerHeight - clientY + dragOffset.y - 200)
      );

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
      setCurrentTourIndex((prev) => prev + 1);
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

    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await sendChatMessage(userMessage, chatMessages);

      setChatMessages((prev) => [...prev, { role: 'assistant', content: response.message }]);
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
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (pageId: string, pageName: string) => {
    if (onNavigate) {
      setAiResponse(`Đang mở ${pageName}...`);
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', content: pageName },
        { role: 'assistant', content: `Đang mở ${pageName}...` },
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
        ...stepConfig,
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
      top: 'auto',
    };
  };

  return {
    isVisible,
    isHappy,
    mousePos,
    dialogueStep,
    setDialogueStep,
    currentTourIndex,
    isPaused,
    setIsPaused,
    timeLeft,
    idleMessageIndex,
    searchQuery,
    setSearchQuery,
    isLoading,
    chatMessages,
    setChatMessages,
    setAiResponse,
    suggestions,
    pendingNavigate,
    dynamicGuideSteps,
    isLoadingGuide,
    isDragging,
    containerRef,
    chatContainerRef,
    handleMouseMove,
    handleRobotClick,
    handleMouseLeave,
    handleDragStart,
    handleStartTour,
    handleDisappear,
    handleNextTourStep,
    endTour,
    handleSearch,
    handleSuggestionClick,
    getRobotStyle,
    getCurrentBubbleStyle,
    getCurrentArrowStyle,
  };
};
