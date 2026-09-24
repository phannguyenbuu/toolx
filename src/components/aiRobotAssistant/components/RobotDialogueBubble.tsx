import React from 'react';
import {
  BookOpen,
  Search,
  EyeOff,
  X,
  Send,
  Loader2,
  ArrowRight,
  Play,
  Pause,
  SkipForward,
} from 'lucide-react';
import { ChatMessage, GuideStep } from '../../../services/aiChatService';
import { TOUR_STEPS } from '../constants';
import { TypewriterText } from './TypewriterText';

interface RobotDialogueBubbleProps {
  dialogueStep: number;
  timeLeft: number;
  isPaused: boolean;
  currentTourIndex: number;
  dynamicGuideSteps: GuideStep[];
  isLoadingGuide: boolean;
  chatMessages: ChatMessage[];
  isLoading: boolean;
  pendingNavigate: { id: string; name: string } | null;
  searchQuery: string;
  suggestions: Array<{ id: string; name: string }>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  bubbleStyle: React.CSSProperties;
  arrowStyle: React.CSSProperties;
  onStartTour: () => void;
  onOpenSearch: () => void;
  onDisappear: () => void;
  onCloseChat: () => void;
  onSearchQueryChange: (val: string) => void;
  onSearch: () => void;
  onSuggestionClick: (id: string, name: string) => void;
  onTogglePause: () => void;
  onNextTourStep: () => void;
  onEndTour: () => void;
}

export const RobotDialogueBubble: React.FC<RobotDialogueBubbleProps> = ({
  dialogueStep,
  timeLeft,
  isPaused,
  currentTourIndex,
  dynamicGuideSteps,
  isLoadingGuide,
  chatMessages,
  isLoading,
  pendingNavigate,
  searchQuery,
  suggestions,
  chatContainerRef,
  bubbleStyle,
  arrowStyle,
  onStartTour,
  onOpenSearch,
  onDisappear,
  onCloseChat,
  onSearchQueryChange,
  onSearch,
  onSuggestionClick,
  onTogglePause,
  onNextTourStep,
  onEndTour,
}) => {
  if (dialogueStep === 3) return null;

  return (
    <div
      className="absolute z-20 animate-fade-in-robot"
      style={{ ...bubbleStyle, width: dialogueStep === 2 ? '300px' : '264px' }}
    >
      <div className="bg-white border-2 border-purple-200 rounded-2xl p-3 shadow-xl relative overflow-hidden">
        {dialogueStep === 4 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
            <div
              className={`h-full ${isPaused ? 'bg-yellow-400' : 'bg-purple-500'} transition-all duration-100`}
              style={{ width: `${timeLeft}%` }}
            />
          </div>
        )}

        <div className="absolute w-3 h-3 bg-white border-purple-200" style={arrowStyle} />

        <div className="min-h-[40px]">
          {/* Step 0: Welcome */}
          {dialogueStep === 0 && (
            <div className="text-purple-700 font-medium text-sm">
              <TypewriterText text="Xin chào bạn đến với Hệ Thống In" speed={50} />
            </div>
          )}

          {/* Step 1: Choice */}
          {dialogueStep === 1 && (
            <div className="animate-fade-in-robot">
              <p className="text-gray-700 mb-1 text-xs font-medium">
                Bạn có cần tôi hướng dẫn sử dụng website không?
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex gap-2">
                  <button
                    onClick={onStartTour}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                  >
                    <BookOpen size={14} /> Xem hướng dẫn
                  </button>
                  <button
                    onClick={onOpenSearch}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-md whitespace-nowrap"
                  >
                    <Search size={14} /> Tìm kiếm
                  </button>
                </div>
                <button
                  onClick={onDisappear}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs transition-colors"
                >
                  <EyeOff size={12} /> Cho tôi biến mất
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Search & Chat */}
          {dialogueStep === 2 && (
            <div className="animate-fade-in-robot">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-purple-600">Tìm kiếm & Chat AI</span>
                <button onClick={onCloseChat} className="text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>

              {chatMessages.length > 0 && (
                <div
                  ref={chatContainerRef}
                  className="max-h-32 overflow-y-auto mb-2 space-y-2 text-xs"
                >
                  {chatMessages.slice(-4).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-purple-50 text-purple-700 ml-4'
                          : 'bg-gray-50 text-gray-700 mr-4'
                      }`}
                    >
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
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                  autoFocus
                  disabled={isLoading}
                />
                <button
                  onClick={onSearch}
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
                        onClick={() => onSuggestionClick(page.id, page.name)}
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

          {/* Step 4: Tour guide */}
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
                      {dynamicGuideSteps[currentTourIndex].title} ({currentTourIndex + 1}/
                      {dynamicGuideSteps.length})
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={onTogglePause}
                        className={`p-1 rounded hover:bg-gray-100 ${
                          isPaused ? 'text-yellow-600' : 'text-gray-500'
                        }`}
                        title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                      >
                        {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm mb-3 min-h-[40px]">
                    <TypewriterText
                      text={dynamicGuideSteps[currentTourIndex].content}
                      speed={30}
                      key={currentTourIndex}
                    />
                  </p>

                  <div className="flex justify-between gap-2">
                    <button
                      onClick={onEndTour}
                      className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs rounded-full shadow-sm border border-red-100 transition-colors"
                    >
                      <X size={10} /> Kết thúc
                    </button>
                    <button
                      onClick={onNextTourStep}
                      className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs rounded-full shadow-sm border border-purple-100 transition-colors"
                    >
                      {currentTourIndex < dynamicGuideSteps.length - 1 ? (
                        <>
                          Tiếp <SkipForward size={10} />
                        </>
                      ) : (
                        'Hoàn tất'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                TOUR_STEPS[currentTourIndex] && (
                  <>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-purple-700 font-bold text-xs">
                        BƯỚC {currentTourIndex + 1}/{TOUR_STEPS.length}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={onTogglePause}
                          className={`p-1 rounded hover:bg-gray-100 ${
                            isPaused ? 'text-yellow-600' : 'text-gray-500'
                          }`}
                          title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                        >
                          {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-700 text-sm mb-3 min-h-[40px]">
                      <TypewriterText
                        text={TOUR_STEPS[currentTourIndex].text}
                        speed={30}
                        key={currentTourIndex}
                      />
                    </p>

                    <div className="flex justify-between gap-2">
                      <button
                        onClick={onEndTour}
                        className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs rounded-full shadow-sm border border-red-100 transition-colors"
                      >
                        <X size={10} /> Kết thúc
                      </button>
                      <button
                        onClick={onNextTourStep}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs rounded-full shadow-sm border border-purple-100 transition-colors"
                      >
                        {currentTourIndex < TOUR_STEPS.length - 1 ? (
                          <>
                            Tiếp <SkipForward size={10} />
                          </>
                        ) : (
                          'Hoàn tất'
                        )}
                      </button>
                    </div>
                  </>
                )
              )}
            </div>
          )}

          {/* Step 5: Goodbye */}
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
  );
};
