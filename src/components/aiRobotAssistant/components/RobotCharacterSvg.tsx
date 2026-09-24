import React from 'react';
import { Sparkles } from 'lucide-react';

interface RobotCharacterSvgProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  isHappy: boolean;
  mousePos: { x: number; y: number };
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
  onTouchStart: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const RobotCharacterSvg: React.FC<RobotCharacterSvgProps> = ({
  containerRef,
  isDragging,
  isHappy,
  mousePos,
  onMouseMove,
  onMouseLeave,
  onClick,
  onMouseDown,
  onTouchStart,
}) => {
  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
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
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        <ellipse cx="100" cy="280" rx="30" ry="5" fill="#000" opacity="0.1" className="blur-sm">
          <animate attributeName="rx" values="30;20;30" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.2;0.1" dur="4s" repeatCount="indefinite" />
        </ellipse>

        <g transform="translate(100, 235)">
          <ellipse cx="0" cy="0" rx="12" ry="35" fill="url(#robotThrustGradient)" className="thruster-anim" />
          <ellipse
            cx="0"
            cy="5"
            rx="6"
            ry="20"
            fill="#fff"
            opacity="0.8"
            className="thruster-anim"
            style={{ animationDelay: '0.05s' }}
          />
        </g>

        {/* Left Arm */}
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

        {/* Right Arm */}
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

        {/* Body */}
        <g transform="translate(100, 160)">
          <path
            d="M-40,-45 L40,-45 L30,65 Q0,75 -30,65 Z"
            fill="url(#robotBodyGradient)"
            stroke="#c084fc"
            strokeWidth="2"
          />
          <path d="M-20,20 L20,20 L15,50 L-15,50 Z" fill="rgba(255,255,255,0.2)" stroke="none" />
          <circle cx="0" cy="-10" r="18" fill="#2e1065" stroke="#c084fc" strokeWidth="1" />
          <circle cx="0" cy="-10" r="12" fill={isHappy ? '#ec4899' : '#06b6d4'} className="core-glow-anim" />
        </g>

        {/* Neck */}
        <rect x="90" y="105" width="20" height="15" fill="#6b21a8" rx="4" />

        {/* Head */}
        <g transform="translate(100, 75)">
          <rect x="-48" y="-25" width="10" height="30" rx="3" fill="#c084fc" />
          <rect x="38" y="-25" width="10" height="30" rx="3" fill="#c084fc" />
          <path d="M0,-45 L0,-65" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
          <circle cx="0" cy="-65" r="4" fill={isHappy ? '#ec4899' : '#06b6d4'} className="core-glow-anim" />
          <rect x="-42" y="-45" width="84" height="70" rx="22" fill="url(#robotBodyGradient)" stroke="#c084fc" strokeWidth="2" />
          <rect x="-35" y="-30" width="70" height="45" rx="12" fill="#1e1b4b" stroke="#4c1d95" strokeWidth="1" />

          {/* Eyes with tracking */}
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
  );
};
