import * as THREE from "three";
import resizeConfig from "../../json/pointConfig/150010.json";
import { computeLocalMeshBB } from "./geometryUtils";
import { getRuleForChild } from "./modelRules";
// export const calculateOriginalBBox = (gltf) => {
//   const box = new THREE.Box3();
//   gltf.scene.traverse((child) => {
//     if (child.isMesh && child.geometry) {
//       child.geometry.computeBoundingBox();
//       box.union(child.geometry.boundingBox);
//     }
//   });
//   return box;
// };

const resizeAxisX = (coord, deltaSize, rule) => {
  
  if (rule?.type === "full") {
    const multiplier = rule.deltaMultiplier || 1;
    const v =  deltaSize * (rule.deltaMultiplier ? multiplier : 0);

    return rule.direction === "left" ? coord - v : coord + v;
  } else {
    // Default symmetric
    const deltaHalf = deltaSize / 2;
    return coord > 0 ? (coord + deltaHalf) : (coord - deltaHalf);
  }
  
};

const resizeAxisZ = (coord, deltaSize, rule, isCoord, sign = 1) => {
  
  if (rule?.type === "pivot") {
    const v =  deltaSize * (rule.deltaMultiplier ? rule.deltaMultiplier : 0) + (rule.extent ? rule.extent : 0);

    // console.log("V", coord, isCoord);
    return isCoord ? coord + sign * v : coord;
  } 
    return coord;
  
  
};


export const applyResizeRule = (geometry, childName, boxWidth, boxLength, boxHeight, originalBBox, resizeRules, isONode) => {
  const rules = getRuleForChild(childName, resizeRules);


  const positions = [...geometry.attributes.position.array];
  const bboxSize = {
    x: originalBBox.max.x - originalBBox.min.x,
    z: originalBBox.max.z - originalBBox.min.z
  };

   

  const isHeightFoldPanel = ["A2", "C2", "F2"].some(prefix =>
    childName.startsWith(prefix)
  );

   const delta = isHeightFoldPanel ? boxHeight - bboxSize.z : boxLength - bboxSize.z;

  const centerZ = (originalBBox.min.z + originalBBox.max.z) / 2;

  // if(childName.startsWith("B2"))
  //     console.log("R", childName, rules.Z); 
  

  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i], y = positions[i + 1], z = positions[i + 2];
    
    x = resizeAxisX(x, (boxWidth - bboxSize.x), rules.X);

    if(!isONode)
    {
      
      if(isHeightFoldPanel)
          z = resizeAxisZ(z, delta, rules.Y,  z >= centerZ, 1);
      else
          z = resizeAxisZ(z, delta, rules.Z,  z >= centerZ, 1);
    }
    
    positions[i] = x; positions[i + 1] = y; positions[i + 2] = z;
  }



  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
};







export const resizeScene = (gltf, boxWidth, boxLength, boxHeight, sizeCache, sizeKey) => {
  let baseScene;
  
  if (!sizeCache.current || sizeCache.current.key !== sizeKey) {
    const originalScene = gltf.clone(true);
    
    const pivotPositions = {};
    originalScene.traverse(child => {
      if (child.isMesh && child.name.includes('2')) {
        child.updateMatrixWorld(true);
        pivotPositions[child.name] = child.getWorldPosition(new THREE.Vector3()).clone();
      }
    });
    
    baseScene = originalScene.clone(true);
    baseScene.traverse(child => {
      if (child.isMesh) {
        const childBbox = new THREE.Box3();
        childBbox.setFromBufferAttribute(child.geometry.attributes.position);

        const isONode = child.name.includes("O");

        child.geometry = applyResizeRule(
          child.geometry.clone(),
          child.name,
          boxWidth, boxLength, boxHeight,
          childBbox,
          resizeConfig.resizeRules,
          isONode
        );
        
        if(isONode)
        {
          let bb = computeLocalMeshBB(child);          
          const scaleZ = boxLength / (bb.max.z - bb.min.z);
          child.scale.z = scaleZ;
          bb = computeLocalMeshBB(child);
          child.position.z -= bb.min.z;
        }
      }
    });
    
    sizeCache.current = { 
      key: sizeKey, 
      scene: baseScene,
      pivotPositions 
    };
  } else {
    baseScene = sizeCache.current.scene;
  }
  
  return baseScene;
};
