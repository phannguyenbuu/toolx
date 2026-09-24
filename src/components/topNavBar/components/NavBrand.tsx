import React from 'react';
import ToolXPrintLogo from '../../ToolXPrintLogo';

interface NavBrandProps {
  onNavClick?: (linkId: string) => void;
}

export const NavBrand: React.FC<NavBrandProps> = ({ onNavClick }) => {
  return (
    <div className="h-16 border-b border-gray-100 flex items-center justify-center p-2 flex-shrink-0">
      <ToolXPrintLogo
        compact={true}
        onClick={() => onNavClick && onNavClick('home')}
      />
    </div>
  );
};
