import React from 'react';

export type AITool = 'inpaint' | 'outpaint' | 'remove-bg' | 'upscale' | 'color';

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIImageProcessorProps {
  initialTool?: AITool;
}

export type ColorMode =
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'brightness'
  | 'contrast'
  | 'saturate';

export type AIStatus = 'checking' | 'available' | 'unavailable' | 'not-installed';

export interface ToolDefinition {
  id: AITool;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  badge?: string;
}
