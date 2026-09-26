import { IccProfile } from '../types';
import { API_BASE } from '../constants';

export async function fetchIccProfiles(): Promise<IccProfile[]> {
  const response = await fetch(API_BASE + '/icc-profiles');
  if (response.ok) {
    const data = await response.json();
    return data.profiles || [];
  }
  return [];
}

export async function checkPythonServiceHealth(): Promise<boolean> {
  try {
    const r = await fetch(API_BASE + '/python-health');
    return r.ok;
  } catch {
    return false;
  }
}
