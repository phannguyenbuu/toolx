export interface AIRobotAssistantProps {
  onNavigate?: (pageId: string) => void;
  currentPage?: string;
}

export interface TourStepItem {
  id: string;
  text: string;
  position: { bottom: string; left: string };
  bubbleStyle: { top: string; left: string };
  arrowStyle: { left: string };
}

export interface RobotPosition {
  x: number;
  y: number;
}

export interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
}
