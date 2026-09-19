import { create } from 'zustand';
import * as THREE from 'three';
import { DEFAULT_TEXTURE_SIZE, TEXTURE_SCALE } from "../constants/texture";
import { apiUrl } from "../constants/api";

export interface UploadTextureState {
  currentImage: HTMLImageElement | null;
  currentTexture: THREE.CanvasTexture | null;
  textureKey: number;
  showEditor: boolean;
  editorImage: HTMLImageElement | null;
  defaultImageUrl: string;
  backgroundColor: string;
  insideMode: string;
  insideColor: string;
  is3dBusy: boolean;
  editorActions: Record<string, any>;
  piecesDataUrls: Record<string, string>;

  getCurrentTexture: () => THREE.CanvasTexture | null;
  uploadImage: (file: File) => Promise<void>;
  initDefaultImage: () => void;
  setBackgroundColor: (color: string) => void;
  setInsideMode: (mode: string) => void;
  setInsideColor: (color: string) => void;
  set3dBusy: (busy: boolean) => void;
  setEditorActions: (actions: Record<string, any>) => void;
  setPiecesDataUrls: (pieces: Record<string, string>) => void;
  updateTextureFromCanvas: (canvas: HTMLCanvasElement) => void;
  openEditor: () => void;
  closeEditor: () => void;
}

const createTextureFromImage = (img: HTMLImageElement, set: any) => {
  const canvas = document.createElement('canvas');
  const size = DEFAULT_TEXTURE_SIZE * TEXTURE_SCALE;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  if (texture.colorSpace !== undefined) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.needsUpdate = true;
  set({ currentTexture: texture, textureKey: Date.now() });
};

export const useUploadTextureStore = create<UploadTextureState>((set, get) => ({
  currentImage: null,
  currentTexture: null,
  textureKey: Date.now(),
  showEditor: false,
  editorImage: null,
  defaultImageUrl: apiUrl('/hoasen_03.png'),
  backgroundColor: "#ffffff",
  insideMode: "Cardboard",
  insideColor: "#c79a63",
  is3dBusy: false,
  editorActions: {},
  piecesDataUrls: {},

  getCurrentTexture: () => get().currentTexture,

  uploadImage: async (file: File) => {
    const img = new Image();
    img.onload = () => {
      set({
        currentImage: img,
        editorImage: img,
        showEditor: true,
      });
      createTextureFromImage(img, set);
    };
    img.src = URL.createObjectURL(file);
  },

  initDefaultImage: () => {
    if (get().currentImage) return;
    const img = new Image();
    img.onload = () => {
      set({
        currentImage: img,
        editorImage: img,
      });
      createTextureFromImage(img, set);
    };
    img.src = get().defaultImageUrl;
  },

  setBackgroundColor: (color: string) => set({ backgroundColor: color || "#ffffff" }),
  setInsideMode: (mode: string) => {
    const nextMode = mode === "Cardboard" ? "Cardboard" : "White";
    const nextColor = nextMode === "Cardboard" ? "#c79a63" : "#ffffff";
    set({ insideMode: nextMode, insideColor: nextColor });
  },
  setInsideColor: (color: string) => set({ insideColor: color || "#ffffff" }),
  set3dBusy: (busy: boolean) => set({ is3dBusy: !!busy }),
  setEditorActions: (actions: Record<string, any>) => set({ editorActions: actions || {} }),
  setPiecesDataUrls: (pieces: Record<string, string>) =>
    set({
      piecesDataUrls: pieces || {},
      textureKey: Date.now(),
    }),

  updateTextureFromCanvas: (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    if (texture.colorSpace !== undefined) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.needsUpdate = true;
    (texture as any).version = performance.now();

    set({
      currentTexture: texture,
      textureKey: Date.now(),
    });
    window.dispatchEvent(new CustomEvent('liveTextureUpdate'));
  },

  openEditor: () => set({ showEditor: true }),
  closeEditor: () => set({ showEditor: false }),
}));
