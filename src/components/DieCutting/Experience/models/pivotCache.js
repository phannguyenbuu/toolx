// fold/pivotCache.js
import * as THREE from 'three';

export const pivotCache = new Map();

/**
 * Cache bbox theo group fold
 * GỌI SAU KHI resizeScene
 */
export function cachePivotPositions(scene) {
  if (!scene) return;

  pivotCache.clear();
  scene.updateWorldMatrix(true, true);

  scene.traverse(obj => {
    if (!obj.isGroup) return;
    if (!obj.userData?.foldGroup) return;

    const box = new THREE.Box3().setFromObject(obj);

    pivotCache.set(obj.uuid, {
      minZ: box.min.z,
      maxZ: box.max.z,
      center: box.getCenter(new THREE.Vector3())
    });
  });
}

/**
 * Lấy pivot Z đúng cho fold
 */
export function getCachedPivot(obj) {
  return pivotCache.get(obj.uuid);
}
