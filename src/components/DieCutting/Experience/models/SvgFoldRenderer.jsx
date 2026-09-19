import React, { useMemo } from "react";
import * as THREE from "three";

const FULL_ANGLE = Math.PI / 2;

// Match the GLB fold staging timing.
const getStageProgress = (stageIndex, progress) => {
  const stageStart = (stageIndex - 1) * 0.125;
  return Math.max(0, Math.min((progress - stageStart) / 0.125, 1));
};

const collectByPrefix = (pieces, prefix) =>
  ["1", "2", "3"]
    .map((s) => pieces.get(`${prefix}${s}`))
    .filter(Boolean);

const hingeAtMinY = (group) => {
  const bb = new THREE.Box3().setFromObject(group);
  if (!Number.isFinite(bb.min.y)) return 0;
  return bb.min.y;
};

const pivotAroundY = (group, hingeY) => {
  const pivot = new THREE.Group();
  pivot.position.y = hingeY;
  group.position.y -= hingeY;
  pivot.add(group);
  return pivot;
};

export default function SvgFoldRenderer({
  pieces,
  progress,
  scale = 0.01,
  position = [0, -1, 0],
}) {
  const folded = useMemo(() => {
    const root = new THREE.Group();
    root.name = "svg-fold-root";

    // Clone pieces so we can safely rebuild the hierarchy each frame.
    const pieceMap = new Map();
    pieces.forEach((obj, id) => {
      pieceMap.set(id, obj.clone(true));
    });

    // At rest, do not fold or re-parent; keep layout identical to 2D.
    if (progress <= 1e-4) {
      pieceMap.forEach((obj) => root.add(obj));
      return root;
    }

    const stage1 = getStageProgress(1, progress);
    const stage2 = getStageProgress(2, progress);
    const stage7 = getStageProgress(7, progress);
    const stage8 = getStageProgress(8, progress);

    const groupA = new THREE.Group();
    collectByPrefix(pieceMap, "A").forEach((p) => groupA.add(p));
    const groupB = new THREE.Group();
    collectByPrefix(pieceMap, "B").forEach((p) => groupB.add(p));
    const groupC = new THREE.Group();
    collectByPrefix(pieceMap, "C").forEach((p) => groupC.add(p));
    const groupF = new THREE.Group();
    collectByPrefix(pieceMap, "F").forEach((p) => groupF.add(p));

    // Keep D/E/O static for now but include them in the scene.
    ["D1", "D2", "D3", "E1", "E2", "E3", "O"].forEach((id) => {
      const p = pieceMap.get(id);
      if (p) root.add(p);
    });

    // Approximate hinges using minY edge to mimic cap-like folding.
    const aPivot = pivotAroundY(groupA, hingeAtMinY(groupA));
    const bPivot = pivotAroundY(groupB, hingeAtMinY(groupB));
    const cPivot = pivotAroundY(groupC, hingeAtMinY(groupC));
    const fPivot = pivotAroundY(groupF, hingeAtMinY(groupF));

    aPivot.rotation.x = stage8 * FULL_ANGLE;
    bPivot.rotation.x = stage7 * FULL_ANGLE;
    cPivot.rotation.x = stage2 * FULL_ANGLE;
    fPivot.rotation.x = -stage1 * FULL_ANGLE;

    bPivot.add(aPivot);
    cPivot.add(bPivot);

    root.add(cPivot);
    root.add(fPivot);

    return root;
  }, [pieces, progress]);

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <primitive object={folded} />
    </group>
  );
}
