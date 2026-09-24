import React, { useState, useEffect, useRef } from 'react';

interface DebouncedNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  shortDebounceMs?: number;
  longDebounceMs?: number;
}

export const DebouncedNumberInput: React.FC<DebouncedNumberInputProps> = ({
  value,
  onChange,
  step = 1,
  min,
  max,
  className = '',
  shortDebounceMs = 300,
  longDebounceMs = 1000
}) => {
  const [localValue, setLocalValue] = useState(String(value));
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const numericPart = newValue.replace(/[^0-9]/g, '');
    const debounceTime = numericPart.length <= 1 ? longDebounceMs : shortDebounceMs;

    timeoutRef.current = setTimeout(() => {
      const parsed = parseFloat(newValue) || 0;
      const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
      const final = min !== undefined ? Math.max(clamped, min) : clamped;
      onChange(final);
    }, debounceTime);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={localValue}
      onChange={handleChange}
      className={className}
    />
  );
};
