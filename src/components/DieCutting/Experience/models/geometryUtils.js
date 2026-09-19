import * as THREE from "three";

export function computeLocalMeshBB(child) {
  const box = new THREE.Box3();

  child.geometry.computeBoundingBox();
  const childBox = child.geometry.boundingBox.clone();

  childBox.min.multiply(child.scale);
  childBox.max.multiply(child.scale);

  childBox.translate(child.position);
  box.union(childBox);

  return box;
}

export function computeLocalGroupBB(group, onlyMain = true) {
  const box = new THREE.Box3();

  group.children.forEach((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (onlyMain && child.name[1] !== "2") return;

    child.geometry.computeBoundingBox();
    const childBox = child.geometry.boundingBox.clone();

    childBox.min.multiply(child.scale);
    childBox.max.multiply(child.scale);

    childBox.translate(child.position);
    box.union(childBox);
  });

  return box;
}
