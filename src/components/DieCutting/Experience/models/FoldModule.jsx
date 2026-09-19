import React, { useRef, useEffect } from "react";
import { useSelection } from "../../stores/selectionStore";
import * as THREE from "three";
import { getRuleForChild } from "./modelRules";
import resizeConfig from "../../json/pointConfig/150010.json";
import { evaluate } from 'mathjs';

import { getCachedPivot,cachePivotPositions , pivotCache } from './pivotCache';
import { computeLocalMeshBB, computeLocalGroupBB } from "./geometryUtils";

export const restorePivotPositions = () => {
  pivotCache.forEach((data, name) => {
    const obj = scene.getObjectByName(name);
    if (!obj) return;

    obj.position.copy(data.position);
    obj.rotation.copy(data.rotation);
    obj.scale.copy(data.scale);
  });
};


export function computeGroup(group, only_main = true) {
  const box = new THREE.Box3();

  group.traverse((child) => {
    // 🔥 Filter trước khi tính
    if (!child.isMesh || !child.geometry) return;
    if (only_main && child.name[1] !== "2") return;

    child.updateMatrixWorld(); // Sync matrix
    
    // 🔥 AUTO: scale + position + rotation + children!
    box.expandByObject(child);
  });

  return box;
}



export function applyMinXPivot(group, reserved = false) {
  if (!group || !group.children.length) return;

  group.updateWorldMatrix(true, true);

  const box = computeLocalGroupBB(group);
  const minX = reserved ? box.min.x : box.max.x;

//   group.children.forEach(child => {
//     child.position.z -= minZ;
//   });

    group.traverse((child) => {
    if (child.parent === group) {  // Chỉ direct children
      child.position.x -= minX;
    }
  });

  group.position.z += minX;
}


export function applyMinZPivot(group, reserved = false) {
  if (!group || !group.children.length) return;

  group.updateWorldMatrix(true, true);

  const box = computeLocalGroupBB(group);
  const minZ = reserved ? box.min.z : box.max.z;

  group.children.forEach(child => {
    child.position.z -= minZ;
  });

  group.position.z += minZ;
}



const isChild = (child, s) => {
  return child.name === s || child.name.startsWith(s + "_");
};

const getFoldConfig = (prefix) => {
  return resizeConfig.foldPivots[prefix] || {};
};

const parseOffset = (size, str) => {
    const scope = { w: size.x, h: size.y, l: size.z };
    return evaluate(str, scope);
};


const createDebugBox = (position, size = 0.1, color = 0xff0000) => {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshBasicMaterial({ 
    color, 
    wireframe: true,
    transparent: true,
    opacity: 0.8 
  });
  const box = new THREE.Mesh(geometry, material);
  box.position.copy(position);
  box.userData.isDebugBox = true; // Để texture bỏ qua
  return box;
};

// 🔥 HELPER: Tính stage progress
const getStageProgress = (stageIndex, progress) => {
  const stageStart = (stageIndex - 1) * 0.125;
  return Math.max(0, Math.min((progress - stageStart) / 0.125, 1));
};

const foldObj = (idx, mesh, rule, size, ax) => {
  let offsetX = ax.toUpperCase() === "X" ? (idx === 0 ? -size.x / 2 : size.x / 2) : mesh.position.x;
  let offsetY = mesh.position.y;
  let offsetZ = mesh.position.z;

  

  // 🔥 PARSE OFFSET TỪ JSON VỚI SUBSTITUTE
  if (rule && rule.offset) {
    // if(mesh.name.includes("B2"))
    //   console.log("mesh",mesh.name, rule, rule.offset);
    const [xStr, yStr, zStr] = rule.offset.split(',');
    
    // Helper function parse với substitute
    // if(mesh.name==="A2_1")
    //   console.log("scale_f", ax,  parseOffset(size, zStr));

    offsetX += parseOffset(size, xStr);
    offsetY += parseOffset(size, yStr);
    offsetZ += parseOffset(size, zStr);
  }

  return [offsetX, offsetY, offsetZ];
}
const createFoldGroup = ({
  sceneClone,
  config,
  progress = 0,
  size,
  originalSize,
  axis = 0,
  reversed = false,
  moveZ = null
}) => {

  // === TÍNH MOVE Z ===
  const dz = moveZ
    ? evaluate(moveZ, { w: size.x, h: size.y, l: size.z })
    : 0;

  // === TẠO GROUP ===
  const foldGroup = new THREE.Group();
  foldGroup.userData.foldGroup = true;
  foldGroup.name = `FoldGroup_${config.prefix}`;


  // === THU MESH ===
  const meshes = { left: [], right: [], pivot: [] };
  const prefix = config.prefix;
  const pivotPrefix = config.pivot;

  sceneClone.traverse(child => {
    if (!child.isMesh) return;
    if (isChild(child, prefix + '1')) meshes.left.push(child);
    if (isChild(child, prefix + '3')) meshes.right.push(child);
    if (isChild(child, pivotPrefix)) meshes.pivot.push(child);
  });

  // === ADD LEFT / RIGHT ===
  [meshes.left, meshes.right].forEach((list, idx) => {
    list.forEach(mesh => {
      const rules = getRuleForChild(mesh.name, resizeConfig.resizeRules);
      const [x, y, z] = foldObj(idx, mesh, rules?.X, size, "x");
      mesh.position.set(x, y, z);
      foldGroup.add(mesh);
    });
  });

  // === ADD PIVOT MESH ===
  meshes.pivot.forEach(mesh => foldGroup.add(mesh));


  // === ÁP PIVOT = MIN.Z (🔥 QUAN TRỌNG NHẤT) ===
  applyMinZPivot(foldGroup, reversed);
  foldGroup.position.z = dz;

  // === ROTATION ===
  const FULL_ANGLE = Math.PI / 2;
  const chainProgress = Math.min(progress * 6.67, 1);

  const bbox = computeLocalGroupBB(foldGroup);
  const nz = bbox.max.z - bbox.min.z;
//   console.log("Round", nz);

//   meshes.left.forEach(mesh => {mesh.rotation.z = -chainProgress * FULL_ANGLE;});
//   meshes.right.forEach(mesh => {mesh.rotation.z = chainProgress * FULL_ANGLE;});

    meshes.left.forEach(mesh => {
        mesh.rotation.z = -chainProgress * FULL_ANGLE;
        
        // 🔥 SCALE Z = nz
        const currentZ = mesh.geometry.boundingBox.max.z - mesh.geometry.boundingBox.min.z;
        const scaleZ = nz / currentZ;
        mesh.scale.z = scaleZ;

        const bb = computeLocalMeshBB(mesh);
        mesh.position.z += bbox.min.z - bb.min.z;
        // console.log(`Left ${mesh.name}: Z ${currentZ.toFixed(2)} → ${nz}`);
    });

    meshes.right.forEach(mesh => {
        mesh.rotation.z = chainProgress * FULL_ANGLE;
        
        // 🔥 SCALE Z = nz
        const currentZ = mesh.geometry.boundingBox.max.z - mesh.geometry.boundingBox.min.z;
        const scaleZ = nz / currentZ;
        mesh.scale.z = scaleZ;

        const bb = computeLocalMeshBB(mesh);
        mesh.position.z += bbox.min.z - bb.min.z;
        // console.log(`Right ${mesh.name}: Z ${currentZ.toFixed(2)} → ${nz}`);
    });

  const groupProgress = Math.max(0, Math.min(1, progress));

  if (axis === 1) {
    foldGroup.rotation.z =
      reversed ? -groupProgress * FULL_ANGLE : groupProgress * FULL_ANGLE;
  } else {
    foldGroup.rotation.x =
      reversed ? -groupProgress * FULL_ANGLE : groupProgress * FULL_ANGLE;
  }

  // === DEBUG TÂM XOAY ===
  addPivotDebug(foldGroup, 0.15, 0x00ff00);

  return foldGroup;
};


const addPivotDebug = (group, size = 0.12, color = 0x00ff00) => {
  const pivotBox = createDebugBox(
    new THREE.Vector3(0, 0, 0), // 🔥 LOCAL ORIGIN
    size,
    color
  );
  pivotBox.userData.isPivotDebug = true;
  group.add(pivotBox);
};



const collectMeshes = (scene, nameList) => {
  const result = [];
  scene.traverse((child) => {
    if (child.isMesh && nameList.some(name => isChild(child, name))) {
      result.push(child);
    }
  });
  return result;
};

// 🔥 createThreeStageFoldGroup HOÀN TOÀN TỪ JSON
const createThreeStageFoldGroup = ({
  sceneClone,
  prefixList,
  progress,
  size = { x: 0, y: 0, z: 0 },
  position,
  reversed = false,
  debug = false
}) => {
  const prefix = prefixList[0];
  const foldConfigData = getFoldConfig(prefix);
  const stages = foldConfigData.stages || [];

  const meshesList = prefixList.map(prefix =>
    collectMeshes(sceneClone, [prefix + '1', prefix + '2', prefix + '3'])
  );

  const FULL_ANGLE = Math.PI / 2;
  const dir = reversed ? 1 : -1;

  const mainGroup = new THREE.Group();
  meshesList.flat().forEach(mesh => mainGroup.add(mesh));

  const dPivot = new THREE.Group();
  
  
  

  const xOffset = reversed ? -size.y : size.y;
//   dPivot.position.add(new THREE.Vector3(xOffset, 0, 0));
  dPivot.add(mainGroup);
//   mainGroup.position.set(0, 0, 0);

  // 🔥 DEBUG DPIVOT
  if (debug) {
    const dPivotBox = createDebugBox(new THREE.Vector3(), 0.12, 0x0000ff); //Blue
    dPivot.add(dPivotBox);
  }

  // 🔥 STAGE 1: dPivot rotation
  const p1 = Math.min(progress / 0.3, 1);
  dPivot.rotation.z = dir * p1 * FULL_ANGLE;

  // 🔥 STAGE 2: D12 folding
  const d12Meshes = collectMeshes(mainGroup, [prefixList[0] + '1', prefixList[0] + '2']);
  if (d12Meshes.length > 0) {
    const d12Bbox = new THREE.Box3();
    d12Meshes.forEach(mesh => {
      mesh.updateMatrixWorld();
      d12Bbox.expandByObject(mesh);
    });
    const d12Pivot = new THREE.Vector3(reversed ? d12Bbox.min.x : d12Bbox.max.x, d12Bbox.min.y, 0);

    const d12RotationGroup = new THREE.Group();
    d12RotationGroup.position.copy(d12Pivot);
    mainGroup.add(d12RotationGroup);

    if (debug) {
      const d12Box = createDebugBox(new THREE.Vector3(), 0.1, 0xff0000); //Red
      d12RotationGroup.add(d12Box);
    }

    d12Meshes.forEach(mesh => {
      const meshLocalPos = mesh.position.clone();
      mesh.position.copy(meshLocalPos.sub(d12Pivot));
      d12RotationGroup.add(mesh);
    });

    const p2 = Math.max(0, Math.min((progress - 0.3) / 0.4, 1));
    d12RotationGroup.rotation.z = dir * p2 * FULL_ANGLE;

    // 🔥 STAGE 3: D1 folding
    const d1Meshes = collectMeshes(d12RotationGroup, [prefixList[0] + '1']);
    if (d1Meshes.length > 0) {
      const d1Bbox = new THREE.Box3();
      d1Meshes.forEach(mesh => {
        mesh.updateMatrixWorld();
        d1Bbox.expandByObject(mesh);
      });
      
      // 🔥 D1 OFFSET TỪ JSON STAGES
      const stage3 = stages.find(s => s.group === "d1RotationGroup");
      const xOffset = reversed ? -(stage3?.offset || 0.085) : (stage3?.offset || 0.085);
      const d1PivotPos = new THREE.Vector3(reversed ? d1Bbox.min.x - xOffset : d1Bbox.max.x - xOffset, d1Bbox.min.y, 0);

      const d1RotationGroup = new THREE.Group();
      d1RotationGroup.position.copy(d1PivotPos);
      d12RotationGroup.add(d1RotationGroup);

      if (debug) {
        const d1Box = createDebugBox(new THREE.Vector3(), 0.08, 0xff00ff); //Pink
        d1RotationGroup.add(d1Box);
      }

      d1Meshes.forEach(mesh => {
        const meshLocalPos = mesh.position.clone();
        mesh.position.copy(meshLocalPos.sub(d1PivotPos));
        mesh.position.x -= xOffset;
        d1RotationGroup.add(mesh);
      });

      const p3 = Math.max(0, Math.min((progress - 0.7) / 0.3, 1));
      d1RotationGroup.rotation.z = dir * p3 * FULL_ANGLE;
    }
  }

  let bb = computeLocalGroupBB(dPivot, false);
  
  const [real_h, real_l] = getSideRealSize(mainGroup, "3_1");
  
  
  dPivot.scale.x = size.y / real_h;
  dPivot.scale.z = size.z / real_l;
//   console.log("BB");
//   applyMinXPivot(dPivot);
  bb = computeLocalGroupBB(dPivot, false);
  const nx = bb.max.x - bb.min.x;
  // console.log("BB", size.y / real_h, size.y);

  const dx =  size.y / real_h * size.x;
    mainGroup.position.x += reversed ? real_h : - real_h;
    

  dPivot.position.set( reversed ? size.x/2 : -size.x/2, 0, size.z / 2);
  addPivotDebug(dPivot,0.15,0x00ffff);
  

  return dPivot;
};

const getSideRealSize = (mainGroup, key) => {
  let real_h = 0, real_l = 0;
  const keyMeshes = []; // 🔥 Array tất cả meshes

  // 🔥 Tìm TẤT CẢ meshes startsWith key
  mainGroup.traverse(child => {
    if (child.isMesh && child.name.includes(key)) {
      keyMeshes.push(child);
    }
  });

  if (keyMeshes.length === 0) {
    console.warn(`No meshes found for key: ${key}`);
    return 0;
  }

  // 🔥 Tính BB của tất cả keyMeshes
  const bb_group = computeLocalMeshBB(keyMeshes[0], false);
  real_h = bb_group.max.x - bb_group.min.x;
  real_l = bb_group.max.z - bb_group.min.z;

//   console.log(`getSideRealHeight(${key}): ${keyMeshes.length} meshes → real_h=${real_h.toFixed(3)}`);
  
  return [real_h, real_l];
};


const setTexture = (sceneClone, getCurrentTexture) => {
  const texture = getCurrentTexture();
  if (texture) {
    sceneClone.traverse((child) => {
      if (child.isMesh && !child.userData.isDebugBox) {
        const nameOK = child.name.includes('_1');
        if (nameOK) {
          child.material = child.material.clone();
          child.material.map = texture;
          child.material.needsUpdate = true;
          child.material.envMapIntensity = 1.5;
        }
      }
    });
  }
};


export const buildFoldScene = ({
  sceneClone,
  progress,
  boxSize,
  originalSize
}) => {
  pivotCache.clear();
  cachePivotPositions(sceneClone);


  const stage1 = getStageProgress(1, progress);
  const stage2 = getStageProgress(2, progress);
  const stage5 = getStageProgress(5, progress);
  const stage6 = getStageProgress(6, progress);
  const stage7 = getStageProgress(7, progress);
  const stage8 = getStageProgress(8, progress);

  const groups = [];

  const common = {
    sceneClone,
    size: boxSize,
    originalSize,
    axis: 0,
    reversed: false
  };

  // 🔥 OBJECT CONFIG - SIÊU DỄ ĐỌC!
  const lidGroupA = createFoldGroup({...common,
    config: { prefix: 'A', pivot: 'A2' }, progress: stage8,
    moveZ:"-l-0.02"
  });


  const sideGroupB = createFoldGroup({...common,
    config: { prefix: 'B', pivot: 'B2' }, progress: stage7,
    moveZ:"-h"
  });

  const sideGroupC = createFoldGroup({...common,
    config: { prefix: 'C', pivot: 'C2' }, progress: stage2,
    moveZ:""
  });

  const sideGroupF = createFoldGroup({...common,
    config: { prefix: 'F', pivot: 'F2' }, progress: stage1,
    reversed: true,
    moveZ:"l"
  });

  const d123Folded = createThreeStageFoldGroup({
    sceneClone,
    prefixList: ['D'],
    progress: stage5,
    size: boxSize,
    // position: {x:-boxSize.x/2, y:0, z:boxSize.z/2},
    reversed: false
  });

    const e123Folded = createThreeStageFoldGroup({
    sceneClone,
    prefixList: ['E'],
    progress: stage6,
    size: boxSize,
    // position: {x:boxSize.x/2, y:0, z:boxSize.z/2},
    reversed: true,
    });

  // Nesting
  sideGroupB.add(lidGroupA);
  sideGroupC.add(sideGroupB);
  
  [sideGroupF, sideGroupC, d123Folded, e123Folded].forEach(group => {
    if (group) sceneClone.add(group);
  });


  groups.push(sideGroupC);
  groups.push(sideGroupF);

  return groups;
};

export const animateFoldGroups = (groups, progress) => {
  const FULL_ANGLE = Math.PI / 2;

  groups.forEach((group, i) => {
    const p = Math.min(progress * 1.25, 1);
    group.rotation.x = p * FULL_ANGLE;
  });
};



// export const foldAllStages = (sceneClone, progress, boxSize, originalSize, delta) => {
//     const foldPivots = resizeConfig.foldPivots;
//   const stage1 = getStageProgress(1, progress);
//   const stage2 = getStageProgress(2, progress);
//   const stage5 = getStageProgress(5, progress);
//   const stage6 = getStageProgress(6, progress);
//   const stage7 = getStageProgress(7, progress);
//   const stage8 = getStageProgress(8, progress);

  
//   const common = {sceneClone, originalSize, size: boxSize, axis: 0, reversed: false, delta};

//   // 🔥 OBJECT CONFIG - SIÊU DỄ ĐỌC!
//   const lidGroupA = createFoldGroup({...common,
//     config: { prefix: 'A', pivot: 'A2' }, progress: stage8,
//     moveZ:foldPivots.A || ""
//   });


//   const sideGroupB = createFoldGroup({...common,
//     config: { prefix: 'B', pivot: 'B2' }, progress: stage7,
//     moveZ:foldPivots.B || ""
//   });

//   const sideGroupC = createFoldGroup({...common,
//     config: { prefix: 'C', pivot: 'C2' }, progress: stage2,
//     moveZ:foldPivots.C || ""
//   });

//   const sideGroupF = createFoldGroup({...common,
//     config: { prefix: 'F', pivot: 'F2' }, progress: stage1,
//     reversed: true,
//     moveZ:foldPivots.F || ""
//   });

//   const d123Folded = createThreeStageFoldGroup({
//     sceneClone,
//     prefixList: ['D'],
//     progress: stage5,
//     size: boxSize,  // 🔥 SIZE TỪ JSON geometry
//     reversed: false,
//     delta
//   });

// const e123Folded = createThreeStageFoldGroup({
//   sceneClone,
//   prefixList: ['E'],
//   progress: stage6,
//   size: boxSize,  // 🔥 SIZE TỪ JSON geometry
//   reversed: false,
//   delta
// });

//   // Nesting
//   sideGroupB.add(lidGroupA);
//   sideGroupC.add(sideGroupB);
//   lidGroupA.position.z += 0.55;
//   sideGroupB.position.z -= 0.55;

//   [sideGroupF, sideGroupC, d123Folded, e123Folded].forEach(group => {
//     if (group) sceneClone.add(group);
//   });
// };

export const FoldRenderer = ({ sceneClone, progress, getCurrentTexture, boxSize, originalSize  }) => {
const group = useRef();
const foldGroups = useRef([]);

const {setMessage} = useSelection();
const ADVANCE_DEBUG = false;

// import * as THREE from "three";

function logBBoxOfObjects(scene, names, label = "") {
  if (!scene) return;

  scene.updateWorldMatrix(true, true);
    let msg = '';
  names.forEach(name => {
    const obj = scene.getObjectByName(name);
    if (!obj) {
      console.warn(`[BBox] ${name} NOT FOUND`);
      return;
    }

    // WORLD bbox
    const worldBox = new THREE.Box3().setFromObject(obj);

    // LOCAL bbox (geometry)
    let localBox = null;
    if (obj.geometry) {
      obj.geometry.computeBoundingBox();
      localBox = obj.geometry.boundingBox.clone();
    }

    msg += `📦 BBOX ${name} ${label}\n`;

    // msg += `position: [${obj.position.toArray().map(n => n.toFixed(4)).join(', ')}]\n`;
    // msg += `scale:    [${obj.scale.toArray().map(n => n.toFixed(4)).join(', ')}]\n`;
    // msg += `rotation: [${[
    // obj.rotation.x,
    // obj.rotation.y,
    // obj.rotation.z
    // ].map(n => n.toFixed(4)).join(', ')}]\n`;

    if (localBox) {
    // msg += `LOCAL bbox:\n`;
    // msg += `  min: [${localBox.min.toArray().map(n => n.toFixed(4)).join(', ')}]\n`;
    // msg += `  max: [${localBox.max.toArray().map(n => n.toFixed(4)).join(', ')}]\n`;
    msg += `  size:[${localBox.getSize(new THREE.Vector3()).toArray().map(n => n.toFixed(4)).join(', ')}]\n`;
    } else {
    msg += `LOCAL bbox: none\n`;
    }

    // msg += `WORLD bbox:\n`;
    // msg += `  min: [${worldBox.min.toArray().map(n => n.toFixed(4)).join(', ')}]\n`;
    // msg += `  max: [${worldBox.max.toArray().map(n => n.toFixed(4)).join(', ')}]\n`;
    // msg += `  size:[${worldBox.getSize(new THREE.Vector3()).toArray().map(n => n.toFixed(4)).join(', ')}]\n`;

    if (ADVANCE_DEBUG) setMessage(msg);

  });
}


useEffect(() => {
  if (!sceneClone || !originalSize) return;

  const working = sceneClone.clone(true);

  setTexture(working, getCurrentTexture);

  foldGroups.current = buildFoldScene({
    sceneClone: working,
    progress,
    boxSize,
    originalSize
  });


  logBBoxOfObjects(
    working,
    ["A2_1", "B2_1", "C2_1", "O_1", "F2_1"],
    "AFTER BUILD FOLD"
    );

  group.current.clear();
  group.current.add(working);
}, [sceneClone, boxSize, originalSize, getCurrentTexture, progress]);


// useFrame(() => {
//   if (!foldGroups.current.length) return;
//   animateFoldGroups(foldGroups.current, progress);
// });




  return <group ref={group} dispose={null} />;
};
