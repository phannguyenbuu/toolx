import React from 'react';

interface RobotIdleToastProps {
  message: string;
  onClick: () => void;
}

export const RobotIdleToast: React.FC<RobotIdleToastProps> = ({ message, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="absolute bottom-full left-0 mb-4 z-20 cursor-pointer"
      style={{ width: '220px' }}
    >
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs py-2 px-3 rounded-xl shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-colors">
        <p className="whitespace-pre-line leading-relaxed">{message}</p>
      </div>
      <div className="absolute -bottom-1 left-[60px] w-3 h-3 bg-purple-600 transform rotate-45" />
    </div>
  );
};
