import React, { useRef, useEffect } from "react";
import Scene from "./Scene";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, Environment } from "@react-three/drei";

import { useResponsiveStore } from "../stores/useResponsiveStore";
import { useExperienceStore } from "../stores/experienceStore";
import { useSelection, usePointer } from "../stores/selectionStore";

const Experience = ({foldProgress}) => {
  const cameraRef = useRef();
  const controlsRef = useRef();
  const pointerRef = useRef({ x: 0, y: 0 });
  const { isExperienceReady } = useExperienceStore();
  const { isMobile } = useResponsiveStore();
  const { setMessage } = useSelection();
  const { scaleHeight } = usePointer();

  
  

  const zoomValues = {
    default: isMobile ? 74 : 80,
    animation: isMobile ? 65 : 110,
  };

  useEffect(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    cam.position.set(8.483, 3.054, -11.225);
    const target = controlsRef.current?.target;
    if (target) {
      target.set(-0.327, -2.875, -1.975);
    }
    controlsRef.current?.update?.();
    cam.updateProjectionMatrix();
  }, []);


  useEffect(() => {
    if (!cameraRef.current) return;

    zoomValues.default = isMobile ? 74 : 135;
    zoomValues.animation = isMobile ? 65 : 110;

    cameraRef.current.zoom = zoomValues.default;
    cameraRef.current.updateProjectionMatrix();
  }, [isMobile]);


  useEffect(() => {
    const onPointerMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;

      pointerRef.current = { x, y };
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        pointerRef.current.x =
          (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        pointerRef.current.y =
          -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    };

    // window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("touchmove", onTouchMove);

    return () => {
      // window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  });

  useEffect(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const target = controlsRef.current?.target;
    const msg =
      `scaleHeight=${Number.isFinite(scaleHeight) ? scaleHeight.toFixed(4) : scaleHeight}\n` +
      `camera=(${cam.position.x.toFixed(3)}, ${cam.position.y.toFixed(3)}, ${cam.position.z.toFixed(3)})\n` +
      `target=(${target?.x?.toFixed?.(3) ?? 0}, ${target?.y?.toFixed?.(3) ?? 0}, ${target?.z?.toFixed?.(3) ?? 0})`;
    setMessage((prev) => (prev ? `${prev}\n${msg}` : msg));
  }, [scaleHeight, isMobile, setMessage]);


  return (
    <>
      <Canvas
        style={{ background: "#f8fafc", width: "100%", height: "100%" }}
        dpr={1}
        shadows={false}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
          preserveDrawingBuffer: false,
          stencil: false,
        }}
      >
        <Environment 
          preset="studio"
          background={false}
          environmentIntensity={0.5}
          blur={0.5}
        />

        <ambientLight intensity={0.65} />


        <directionalLight
          position={[8, 12, 6]}
          intensity={2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
        />
        
        <directionalLight
          position={[-4, 2, -6]}
          intensity={0.6}
        />
        
       <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[8.483, 2.8, -11.225]}
          rotation={[-0.6, -0.7, -0.4]}
          fov={45}  // Tương đương zoom={zoomValues.default} ~1.0-1.5 ortho
          near={0.1}
          far={1000}
        />
        
        <OrbitControls ref={controlsRef} />
        <Scene
          camera={cameraRef}
          pointerRef={pointerRef}
          isExperienceReady={isExperienceReady}
          foldProgress={foldProgress} 
        />

      </Canvas>

      
      
    </>
  );
};

export default Experience;
