import { useState, useEffect } from 'react';
import { AIStatus } from '../types';

const API_BASE = '/api';

export function useAIStatus() {
  const [aiStatus, setAiStatus] = useState<AIStatus>('checking');

  const checkAIStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inpaint/status`);
      if (!res.ok) {
        setAiStatus('unavailable');
        return;
      }
      const data = await res.json();
      setAiStatus(data.available ? 'available' : 'not-installed');
    } catch (error) {
      console.error('AI service connection failed:', error);
      setAiStatus('unavailable');
    }
  };

  useEffect(() => {
    checkAIStatus();
  }, []);

  return {
    aiStatus,
    checkAIStatus
  };
}
