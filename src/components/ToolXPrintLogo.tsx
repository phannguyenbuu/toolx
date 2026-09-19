import React, { useState } from 'react';

interface ToolXPrintLogoProps {
  onClick?: () => void;
  compact?: boolean;
}

const ToolXPrintLogo: React.FC<ToolXPrintLogoProps> = ({ onClick, compact = false }) => {
  const [replayKey, setReplayKey] = useState(0);

  const handleClick = () => {
    setReplayKey(prev => prev + 1);
    if (onClick) onClick();
  };

  return (
    <div
      className={compact 
        ? "relative w-11 h-11 flex items-center justify-center cursor-pointer select-none rounded-xl hover:bg-slate-100 transition-colors mx-auto group"
        : "relative w-full max-w-56 p-0.5 cursor-pointer select-none"
      }
      onClick={handleClick}
      title="Về Trang chủ ToolX"
    >
      <svg
        key={replayKey}
        viewBox={compact ? "220 0 200 200" : "0 0 640 200"}
        className={compact ? "w-10 h-10 drop-shadow-md group-hover:scale-105 transition-transform" : "w-full h-auto drop-shadow-lg"}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="metal-gradient-dark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="print-gradient-purple" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          <linearGradient id="tech-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          <linearGradient id="shine-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="40%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.6" />
            <stop offset="60%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <mask id="scan-mask">
            <rect x="0" y="0" width="640" height="200" fill="white">
              <animate
                attributeName="width"
                from="0"
                to="640"
                dur="1.8s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.4 0 0.2 1"
              />
            </rect>
          </mask>

          <mask id="tool-text-mask">
            <text
              x="50"
              y="125"
              fontFamily="'Inter', sans-serif"
              fontWeight="900"
              fontSize="80"
              fill="white"
              letterSpacing="-4"
            >
              TOOL
            </text>
          </mask>
        </defs>

        <g mask="url(#scan-mask)">
          <text
            x="50"
            y="125"
            fontFamily="'Inter', sans-serif"
            fontWeight="900"
            fontSize="80"
            fill="url(#metal-gradient-dark)"
            letterSpacing="-4"
          >
            TOOL
          </text>

          <g mask="url(#tool-text-mask)">
            <rect x="-50" y="0" width="200" height="200" fill="url(#shine-gradient)" transform="skewX(-20)">
              <animate
                attributeName="x"
                from="-200"
                to="400"
                dur="3.5s"
                repeatCount="indefinite"
                begin="1s"
              />
            </rect>
          </g>
        </g>

        <g transform="translate(320, 100)">
          <g>
            <path
              d="M0 -50 A50 50 0 0 1 0 50 A50 50 0 0 1 0 -50"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="10 20"
              opacity="0.6"
            >
              <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="30s" repeatCount="indefinite" />
            </path>

            <path
              d="M-40 -40 L-50 -40 L-50 40 L-40 40"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            >
              <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
            </path>
            <path
              d="M40 -40 L50 -40 L50 40 L40 40"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            >
              <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" begin="1.5s" />
            </path>

            <circle cx="0" cy="0" r="38" fill="none" stroke="#f3e8ff" strokeWidth="2" strokeDasharray="30 180" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="38" fill="none" stroke="#f3e8ff" strokeWidth="2" strokeDasharray="10 180" strokeLinecap="round" opacity="0.7">
              <animateTransform attributeName="transform" type="rotate" from="180 0 0" to="540 0 0" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>

          <g>
            <path d="M-28 -28 L28 28 M28 -28 L-28 28" stroke="white" strokeWidth="16" strokeLinecap="square" opacity="0.9" />

            <path d="M-28 -28 L28 28" stroke="url(#tech-gradient)" strokeWidth="8" strokeLinecap="round" />
            <path d="M28 -28 L-28 28" stroke="url(#tech-gradient)" strokeWidth="8" strokeLinecap="round" />

            <rect x="-8" y="-8" width="16" height="16" transform="rotate(45)" fill="white" stroke="#d8b4fe" strokeWidth="2" />
            <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#d946ef" />

            <circle cx="-28" cy="-28" r="4" fill="white" stroke="#22d3ee" strokeWidth="2" />
            <circle cx="28" cy="28" r="4" fill="white" stroke="#ec4899" strokeWidth="2" />
            <circle cx="28" cy="-28" r="4" fill="white" stroke="#8b5cf6" strokeWidth="2" />
            <circle cx="-28" cy="28" r="4" fill="white" stroke="#22d3ee" strokeWidth="2" />
          </g>

          <circle r="3" fill="white" filter="drop-shadow(0 0 2px #fff)">
            <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
            <animateMotion path="M-28 -28 L0 0" dur="2s" repeatCount="indefinite" calcMode="linear" />
          </circle>
          <circle r="3" fill="white" filter="drop-shadow(0 0 2px #fff)">
            <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="1s" repeatCount="indefinite" />
            <animateMotion path="M0 0 L28 28" dur="2s" begin="1s" repeatCount="indefinite" calcMode="linear" />
          </circle>
          <circle r="2" fill="#a5f3fc">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
            <animateMotion path="M28 -28 L-28 28" dur="1.5s" repeatCount="indefinite" calcMode="linear" />
          </circle>
        </g>

        <g mask="url(#scan-mask)">
          <text
            x="380"
            y="125"
            fontFamily="'Inter', sans-serif"
            fontWeight="900"
            fontSize="80"
            fill="url(#print-gradient-purple)"
            style={{
              textShadow: '0px 0px 20px rgba(192, 38, 211, 0.2)',
              letterSpacing: '-2px',
            }}
          >
            PRINT
          </text>
        </g>

        <g>
          <line x1="0" y1="45" x2="0" y2="145" stroke="#d946ef" strokeWidth="4" opacity="0.8" strokeLinecap="round">
            <animate
              attributeName="x1"
              from="0"
              to="640"
              dur="1.8s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.4 0 0.2 1"
            />
            <animate
              attributeName="x2"
              from="0"
              to="640"
              dur="1.8s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.4 0 0.2 1"
            />
            <animate attributeName="opacity" values="0.8;0" dur="0.2s" begin="1.8s" fill="freeze" />
          </line>
        </g>
      </svg>
    </div>
  );
};

export default ToolXPrintLogo;
