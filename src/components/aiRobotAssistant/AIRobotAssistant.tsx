import React from 'react';
import { AIRobotAssistantProps } from './types';
import { IDLE_MESSAGES } from './constants';
import { useAIRobotAssistantState } from './hooks/useAIRobotAssistantState';
import { RobotCharacterSvg } from './components/RobotCharacterSvg';
import { RobotDialogueBubble } from './components/RobotDialogueBubble';
import { RobotIdleToast } from './components/RobotIdleToast';

export const AIRobotAssistant: React.FC<AIRobotAssistantProps> = ({
  onNavigate,
  currentPage = 'home',
}) => {
  const {
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
  } = useAIRobotAssistantState({ currentPage, onNavigate });

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
        {/* Dialogue Bubble */}
        <RobotDialogueBubble
          dialogueStep={dialogueStep}
          timeLeft={timeLeft}
          isPaused={isPaused}
          currentTourIndex={currentTourIndex}
          dynamicGuideSteps={dynamicGuideSteps}
          isLoadingGuide={isLoadingGuide}
          chatMessages={chatMessages}
          isLoading={isLoading}
          pendingNavigate={pendingNavigate}
          searchQuery={searchQuery}
          suggestions={suggestions}
          chatContainerRef={chatContainerRef}
          bubbleStyle={getCurrentBubbleStyle()}
          arrowStyle={getCurrentArrowStyle()}
          onStartTour={handleStartTour}
          onOpenSearch={() => setDialogueStep(2)}
          onDisappear={handleDisappear}
          onCloseChat={() => {
            setDialogueStep(1);
            setChatMessages([]);
            setAiResponse('');
          }}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
          onSuggestionClick={handleSuggestionClick}
          onTogglePause={() => setIsPaused(!isPaused)}
          onNextTourStep={handleNextTourStep}
          onEndTour={endTour}
        />

        {/* Idle message bubble */}
        {dialogueStep === 3 && (
          <RobotIdleToast
            message={IDLE_MESSAGES[idleMessageIndex]}
            onClick={() => setDialogueStep(1)}
          />
        )}

        {/* Robot Character SVG */}
        <RobotCharacterSvg
          containerRef={containerRef}
          isDragging={isDragging}
          isHappy={isHappy}
          mousePos={mousePos}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleRobotClick}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        />
      </div>
    </div>
  );
};

export default AIRobotAssistant;
