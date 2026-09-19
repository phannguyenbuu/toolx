import { io, Socket } from 'socket.io-client';
import { DesignSession } from '../types/api';

// Extended session interface for socket communication
export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: {
    elements: any[]; // TODO: Refactor to ElementData[] from App.tsx
    pageConfig: any; // TODO: Refactor to PageConfig from types.ts
    dataRows: any[]; // TODO: Refactor to SheetRow[] from types.ts
    headers: string[];
    customerSettings: { active: boolean; pin: string; allowEdit: boolean };
    customerNotes: Record<number, string>;
    uploadedImages?: any[]; // TODO: Refactor to UploadedImage[] from types.ts
    sheetUrl?: string;
    currentRowIndex?: number;
  };
}

export interface SocketService {
  connect: () => void;
  disconnect: () => void;
  joinSession: (sessionId: string) => void;
  saveSession: (sessionId: string, sessionData: DesignSession, sessions: Session[]) => void;
  createSession: (sessionData: Session) => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newName: string) => void;
  on: (event: string, callback: (data: any) => void) => void; // TODO: Refactor callback types
  off: (event: string, callback: (data: any) => void) => void; // TODO: Refactor callback types
}

import { ENV_CONFIG } from '../config/environment';

class SocketIOService implements SocketService {
  private socket: Socket | null = null;
  private readonly SERVER_URL = ENV_CONFIG.SOCKET_URL; // Use environment config
  private connectionErrorLogged = false;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(this.SERVER_URL, {
      autoConnect: false, // Don't auto-connect, only connect when explicitly called
      reconnection: true,
      reconnectionDelay: 5000, // Wait longer between retries
      reconnectionAttempts: 3 // Fewer retry attempts
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    this.socket.on('connect_error', (error) => {
      // Only log once, not spam
      if (!this.connectionErrorLogged) {
        console.warn('Socket.IO server not available (session sync disabled)');
        this.connectionErrorLogged = true;
      }
    });

    // Actually connect
    this.socket.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('join-session', sessionId);
    }
  }

  saveSession(sessionId: string, sessionData: DesignSession, sessions: Session[]) {
    if (this.socket) {
      this.socket.emit('save-session', {
        sessionId,
        sessionData,
        sessions
      });
    }
  }

  createSession(sessionData: Session) {
    if (this.socket) {
      this.socket.emit('create-session', sessionData);
    }
  }

  loadSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('load-session', sessionId);
    }
  }

  deleteSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('delete-session', sessionId);
    }
  }

  renameSession(sessionId: string, newName: string) {
    if (this.socket) {
      this.socket.emit('rename-session', sessionId, newName);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketService = new SocketIOService();
export default socketService;
