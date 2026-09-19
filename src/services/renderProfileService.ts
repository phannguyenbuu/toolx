import { RenderColorProfile, PRESET_PROFILES } from '../types/renderProfile';

const STORAGE_KEY = 'toolx_render_profiles_v1';
const ACTIVE_PROFILE_KEY = 'toolx_active_render_profile_id';

/**
 * Lấy danh sách tất cả các Profile (Bao gồm Preset hệ thống + Profile do người dùng lưu)
 */
export function getProfiles(): RenderColorProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Khởi tạo lần đầu với các Profile Preset chuẩn phòng in
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESET_PROFILES));
      return [...PRESET_PROFILES];
    }
    const parsed: RenderColorProfile[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESET_PROFILES));
      return [...PRESET_PROFILES];
    }

    // Đảm bảo các preset hệ thống luôn có mặt và cập nhật cấu hình mới nhất
    let hasChanges = false;
    const merged = parsed.map((item) => {
      if (item.isPreset) {
        const defaultPreset = PRESET_PROFILES.find((dp) => dp.id === item.id);
        if (defaultPreset) {
          return {
            ...item,
            name: defaultPreset.name,
            machineName: defaultPreset.machineName,
            description: defaultPreset.description,
            renderSettings: { ...defaultPreset.renderSettings }
          };
        }
      }
      return item;
    });

    const existingIds = new Set(merged.map((p) => p.id));
    const missingPresets = PRESET_PROFILES.filter((p) => !existingIds.has(p.id));
    if (missingPresets.length > 0) {
      merged.push(...missingPresets);
      hasChanges = true;
    }

    if (hasChanges || JSON.stringify(merged) !== raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }

    return merged;
  } catch (err) {
    console.error('Lỗi khi đọc danh sách render profiles:', err);
    return [...PRESET_PROFILES];
  }
}

/**
 * Lưu danh sách Profiles vào LocalStorage
 */
export function saveProfiles(profiles: RenderColorProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    // Phát event để các component khác (nếu có) đồng bộ ngay
    window.dispatchEvent(new CustomEvent('toolx_profiles_updated', { detail: profiles }));
  } catch (err) {
    console.error('Lỗi khi lưu render profiles:', err);
  }
}

/**
 * Lấy ID của Profile đang hoạt động
 */
export function getActiveProfileId(): string {
  try {
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (activeId) {
      const all = getProfiles();
      if (all.some((p) => p.id === activeId)) {
        return activeId;
      }
    }
  } catch (err) {
    console.error('Lỗi lấy active profile id:', err);
  }
  // Mặc định trả về profile mặc định
  const all = getProfiles();
  const def = all.find((p) => p.isDefault) || all[0];
  return def ? def.id : 'preset_default';
}

/**
 * Đặt Profile đang hoạt động
 */
export function setActiveProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    window.dispatchEvent(new CustomEvent('toolx_active_profile_changed', { detail: id }));
  } catch (err) {
    console.error('Lỗi đặt active profile id:', err);
  }
}

/**
 * Lấy Profile đang hoạt động hiện tại
 */
export function getActiveProfile(): RenderColorProfile {
  const activeId = getActiveProfileId();
  const all = getProfiles();
  return all.find((p) => p.id === activeId) || all[0] || PRESET_PROFILES[0];
}

/**
 * Lưu hoặc cập nhật một Profile.
 * Nếu là preset hệ thống và bị chỉnh sửa, tự động nhân bản thành Custom profile.
 */
export function saveProfile(profile: RenderColorProfile): RenderColorProfile {
  const all = getProfiles();
  const now = new Date().toISOString();

  if (profile.isPreset) {
    // Không ghi đè trực tiếp Preset hệ thống, tạo bản sao tùy chỉnh
    const newProfile: RenderColorProfile = {
      ...profile,
      id: 'custom_' + Date.now(),
      name: `${profile.name} (Tùy chỉnh)`,
      isPreset: false,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    };
    saveProfiles([newProfile, ...all]);
    setActiveProfileId(newProfile.id);
    return newProfile;
  }

  const existingIndex = all.findIndex((p) => p.id === profile.id);
  const updatedProfile: RenderColorProfile = {
    ...profile,
    updatedAt: now
  };

  let nextProfiles: RenderColorProfile[];
  if (existingIndex >= 0) {
    nextProfiles = [...all];
    nextProfiles[existingIndex] = updatedProfile;
  } else {
    nextProfiles = [updatedProfile, ...all];
  }

  saveProfiles(nextProfiles);
  return updatedProfile;
}

/**
 * Nhân bản một Profile để tạo cấu hình mới
 */
export function duplicateProfile(id: string, customName?: string): RenderColorProfile {
  const all = getProfiles();
  const source = all.find((p) => p.id === id) || PRESET_PROFILES[0];
  const now = new Date().toISOString();

  const newProfile: RenderColorProfile = {
    ...JSON.parse(JSON.stringify(source)),
    id: 'custom_' + Date.now(),
    name: customName || `${source.name} (Bản sao)`,
    isPreset: false,
    isDefault: false,
    createdAt: now,
    updatedAt: now
  };

  saveProfiles([newProfile, ...all]);
  setActiveProfileId(newProfile.id);
  return newProfile;
}

/**
 * Xóa một Profile (Không cho phép xóa Preset hệ thống)
 */
export function deleteProfile(id: string): boolean {
  const all = getProfiles();
  const target = all.find((p) => p.id === id);
  if (!target || target.isPreset) {
    return false;
  }

  const filtered = all.filter((p) => p.id !== id);
  saveProfiles(filtered);

  // Nếu đang active profile bị xóa, chuyển về default
  if (getActiveProfileId() === id) {
    const nextActive = filtered.find((p) => p.isDefault) || filtered[0];
    if (nextActive) setActiveProfileId(nextActive.id);
  }
  return true;
}

/**
 * Đặt một profile làm mặc định
 */
export function setDefaultProfile(id: string): void {
  const all = getProfiles();
  const next = all.map((p) => ({
    ...p,
    isDefault: p.id === id
  }));
  saveProfiles(next);
}

/**
 * Xuất danh sách profiles ra JSON file để mang sang máy khác
 */
export function exportProfilesToJson(): string {
  const all = getProfiles();
  return JSON.stringify(all, null, 2);
}

/**
 * Nhập danh sách profiles từ chuỗi JSON
 */
export function importProfilesFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'Dữ liệu JSON không hợp lệ (cần danh sách mảng profile).' };
    }

    const current = getProfiles();
    const currentMap = new Map(current.map((p) => [p.id, p]));

    let importedCount = 0;
    for (const item of parsed) {
      if (item && item.id && item.name && item.renderSettings && item.colorSettings) {
        currentMap.set(item.id, {
          ...item,
          updatedAt: new Date().toISOString()
        });
        importedCount++;
      }
    }

    const nextList = Array.from(currentMap.values());
    saveProfiles(nextList);
    return { success: true, count: importedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Lỗi khi giải mã file JSON' };
  }
}
