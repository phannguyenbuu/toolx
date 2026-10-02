import React, { useState, useEffect, useRef } from 'react';

export interface DebouncedNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  shortDebounceMs?: number;
  longDebounceMs?: number;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const DebouncedNumberInput: React.FC<DebouncedNumberInputProps> = ({
  value,
  onChange,
  step = 1,
  min,
  max,
  className = '',
  disabled,
  shortDebounceMs = 250,
  longDebounceMs = 350,
  inputRef,
}) => {
  const [localValue, setLocalValue] = useState(value !== undefined && value !== null ? String(value) : '');
  const isFocusedRef = useRef(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const targetRef = (inputRef || internalRef) as React.MutableRefObject<HTMLInputElement | null>;

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  const commitValue = (valStr: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const cleanStr = String(valStr).replace(',', '.').trim();
    if (cleanStr === '') {
      const fallback = min !== undefined ? min : (value ?? 0);
      setLocalValue(String(fallback));
      onChange(fallback);
      return;
    }
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed)) {
      setLocalValue(String(value ?? 0));
      return;
    }
    const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
    const final = min !== undefined ? Math.max(clamped, min) : clamped;
    const rounded = Math.round(final * 100) / 100;
    setLocalValue(String(rounded));
    onChange(rounded);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const cleanStr = raw.replace(',', '.').trim();
    if (cleanStr === '') return;

    const numericPart = cleanStr.replace(/[^0-9]/g, '');
    const debounceTime = numericPart.length <= 1 ? longDebounceMs : shortDebounceMs;

    timeoutRef.current = setTimeout(() => {
      const parsed = parseFloat(cleanStr);
      if (!isNaN(parsed)) {
        const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
        const final = min !== undefined ? Math.max(clamped, min) : clamped;
        onChange(Math.round(final * 100) / 100);
      }
    }, debounceTime);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    e.target.select();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    commitValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(localValue);
      e.currentTarget.blur();
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      ref={targetRef}
      type="number"
      step={step}
      min={min}
      max={max}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      disabled={disabled}
    />
  );
};
