import React, { createContext, useContext, useState, ReactNode } from "react";
import defaultConfig from "../json/default.json";

interface SelectionContextType {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
}

const SelectionContext = createContext<SelectionContextType>({
  message: '',
  setMessage: () => {},
});

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string>('');

  return (
    <SelectionContext.Provider value={{ message, setMessage }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  return useContext(SelectionContext);
}

export interface PointerContextType {
  boxWidth: number;
  setBoxWidth: (val: number) => void;
  boxLength: number;
  setBoxLength: (val: number) => void;
  boxHeight: number;
  setBoxHeight: (val: number) => void;
  boxDepth: number;
  setBoxDepth: (val: number) => void;

  originalWidth: number;
  setOriginalWidth: (val: number) => void;
  originalLength: number;
  setOriginalLength: (val: number) => void;
  originalHeight: number;
  setOriginalHeight: (val: number) => void;

  resizeRevision: number;
  pulseResize: (frames?: number) => void;

  deltaWidth: number;
  deltaLength: number;
  deltaHeight: number;
  deltaDepth: number;
  scaleHeight: number;
  scaleLength: number;

  boxSize: { width: number; length: number; height: number; depth: number };
  originalSize: { x: number; y: number; z: number };
  deltas: { width: number; length: number; height: number; depth: number };
}

const PointerContext = createContext<PointerContextType>({} as PointerContextType);

export function PointerProvider({ children }: { children: ReactNode }) {
  const initRoom = (defaultConfig as any)?.room || { width: 7, length: 6, height: 3.6, door: 0.238 };
  const [boxWidth, setBoxWidth] = useState<number>(initRoom.width);
  const [boxLength, setBoxLength] = useState<number>(initRoom.length);
  const [boxHeight, setBoxHeight] = useState<number>(initRoom.height);
  const [boxDepth, setBoxDepth] = useState<number>(initRoom.door);

  const [originalWidth, setOriginalWidth] = useState<number>(initRoom.width);
  const [originalLength, setOriginalLength] = useState<number>(initRoom.length);
  const [originalHeight, setOriginalHeight] = useState<number>(initRoom.height);
  const [resizeRevision, setResizeRevision] = useState<number>(0);

  const deltaWidth = boxWidth - originalWidth;
  const deltaLength = boxLength - originalLength;
  const deltaHeight = boxHeight - originalHeight;
  const deltaDepth = boxDepth - 0;
  const scaleHeight = originalHeight ? boxHeight / originalHeight : 1;
  const scaleLength = originalLength ? boxLength / originalLength : 1;

  const pulseResize = (frames = 3) => {
    let count = 0;
    const tick = () => {
      setResizeRevision((v) => v + 1);
      count += 1;
      if (count < frames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  return (
    <PointerContext.Provider
      value={{
        boxWidth,
        setBoxWidth,
        boxLength,
        setBoxLength,
        boxHeight,
        setBoxHeight,
        boxDepth,
        setBoxDepth,

        originalWidth,
        setOriginalWidth,
        originalLength,
        setOriginalLength,
        originalHeight,
        setOriginalHeight,

        resizeRevision,
        pulseResize,

        deltaWidth,
        deltaLength,
        deltaHeight,
        deltaDepth,
        scaleHeight,
        scaleLength,

        boxSize: { width: boxWidth, length: boxLength, height: boxHeight, depth: boxDepth },
        originalSize: {
          x: originalWidth || boxWidth,
          z: originalLength || boxLength,
          y: originalHeight || boxHeight,
        },
        deltas: { width: deltaWidth, length: deltaLength, height: deltaHeight, depth: deltaDepth },
      }}
    >
      {children}
    </PointerContext.Provider>
  );
}

export function usePointer() {
  return useContext(PointerContext);
}
