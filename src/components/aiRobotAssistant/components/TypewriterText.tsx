import React, { useState, useEffect } from 'react';
import { TypewriterTextProps } from '../types';

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  onComplete,
  speed = 40,
}) => {
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
