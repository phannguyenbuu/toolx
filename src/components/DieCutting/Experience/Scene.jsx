// Scene.jsx - SỬA LỖI + Tích hợp foldProgress
import React, { Suspense, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import BoxSample from "./models/BoxSample.jsx";
import { useToggleRoomStore } from "../stores/toggleRoomStore";
import { usePointer, useSelection } from "../stores/selectionStore";
import gsap from "gsap";
import { useFrame } from "@react-three/fiber";

const Scene = ({ camera, pointerRef, isExperienceReady, foldProgress = 0 }) => { // ✅ Nhận foldProgress từ parent
  const darkGroupRef = useRef();
  const lightGroupRef = useRef();
  const gridPlanesRef = useRef();
  const darkRoomGroupPosition = new THREE.Vector3(0, 0, 0);
  const lightRoomGroupPosition = new THREE.Vector3(24, 0, 3.5);
  const groupRotationRef = useRef(0);
  const { isDarkRoom } = useToggleRoomStore();
  const { directionAxis } = usePointer();

  useEffect(() => {
    if (!gridPlanesRef.current) return;

    const targetPosition = isDarkRoom
      ? darkRoomGroupPosition
      : lightRoomGroupPosition;

    gsap.to(gridPlanesRef.current.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      delay: 1,
    });
  }, [isDarkRoom]);

  useFrame(() => {
    if (
      !darkGroupRef.current ||
      !lightGroupRef.current ||
      !gridPlanesRef.current
    )
      return;

    const targetRotation = pointerRef.current.x * Math.PI * 0.032;

    groupRotationRef.current = THREE.MathUtils.lerp(
      groupRotationRef.current,
      targetRotation,
      0.1
    );

    darkGroupRef.current.rotation.y = groupRotationRef.current;
    lightGroupRef.current.rotation.y = groupRotationRef.current;
    gridPlanesRef.current.rotation.y = groupRotationRef.current;
  });

  return (
    <>
      <Suspense>
        {/* ✅ CHỈ DÙNG 1 BoxSample + pass foldProgress */}
        <BoxSample 
          progress={foldProgress} 
          position={[0, 0, 0]} 
          scale={1}
        />
      </Suspense>
    </>
  );
};

export default Scene;
