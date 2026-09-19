import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { fetchSvgData } from "../../konva/svgLoader";
import { applyTemplateTransforms } from "../../konva/templateTransforms";
import { parsePath, getPathPoints } from "../../konva/svgPathUtils";
import { getRuleForChild } from "./modelRules";
import { usePointer } from "../../stores/selectionStore";
import { useUploadTextureStore } from "../../stores/uploadTextureStore";
import { apiUrl } from "../../constants/api";

const MM_TO_SCENE = 0.01;
const FULL_ANGLE = Math.PI / 2;

const getStageProgress = (stageIndex, progress) => {
  const stageStart = (stageIndex - 1) * 0.125;
  return Math.max(0, Math.min((progress - stageStart) / 0.125, 1));
};

const buildShapeFromPath = (d) => {
  const segments = parsePath(d);
  const pts = getPathPoints(segments);
  if (pts.length < 3) return null;
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    shape.lineTo(pts[i].x, pts[i].y);
  }
  shape.closePath();
  return shape;
};

const applyPlanarUvFromXY = (geom) => {
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  if (!bb) return;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const minX = bb.min.x;
  const minY = bb.min.y;
  const w = Math.max(1e-6, size.x);
  const h = Math.max(1e-6, size.y);

  const pos = geom.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv[i * 2] = (x - minX) / w;
    uv[i * 2 + 1] = (y - minY) / h;
  }
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
};

const splitByNormalZ = (geom) => {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  if (!pos || !nor || !uv) return { top: null, bottom: null, sides: g };

  const topPos = [];
  const topNor = [];
  const topUv = [];
  const bottomPos = [];
  const bottomNor = [];
  const bottomUv = [];
  const sidePos = [];
  const sideNor = [];
  const sideUv = [];

  for (let i = 0; i < pos.count; i += 3) {
    const nz = (nor.getZ(i) + nor.getZ(i + 1) + nor.getZ(i + 2)) / 3;
    const isTop = nz > 0.5;
    const isBottom = nz < -0.5;
    const tgtPos = isTop ? topPos : isBottom ? bottomPos : sidePos;
    const tgtNor = isTop ? topNor : isBottom ? bottomNor : sideNor;
    const tgtUv = isTop ? topUv : isBottom ? bottomUv : sideUv;
    for (let k = 0; k < 3; k += 1) {
      const idx = i + k;
      tgtPos.push(pos.getX(idx), pos.getY(idx), pos.getZ(idx));
      tgtNor.push(nor.getX(idx), nor.getY(idx), nor.getZ(idx));
      tgtUv.push(uv.getX(idx), uv.getY(idx));
    }
  }

  const makeGeom = (p, n, u) => {
    if (!p.length) return null;
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    out.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    out.setAttribute("uv", new THREE.Float32BufferAttribute(u, 2));
    out.computeBoundingBox();
    out.computeBoundingSphere();
    return out;
  };

  return {
    top: makeGeom(topPos, topNor, topUv),
    bottom: makeGeom(bottomPos, bottomNor, bottomUv),
    sides: makeGeom(sidePos, sideNor, sideUv),
  };
};

export default function SvgExtrudeMeshes({
  svgPath = apiUrl("/box-sample/150010.svg"),
  progress = 0,
}) {
  const { boxWidth, boxLength, boxHeight, boxDepth, resizeRevision, scaleHeight } = usePointer();
  const currentTexture = useUploadTextureStore((s) => s.currentTexture);
  const textureKey = useUploadTextureStore((s) => s.textureKey);
  const backgroundColor = useUploadTextureStore((s) => s.backgroundColor);
  const insideColor = useUploadTextureStore((s) => s.insideColor);
  const piecesDataUrls = useUploadTextureStore((s) => s.piecesDataUrls);
  const [svgGroups, setSvgGroups] = useState([]);
  const textureCacheRef = useRef(new Map());
  const materialCacheRef = useRef(new Map());
  const bakedTextureRef = useRef(null);
  const topMaterialRef = useRef(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(insideColor || "#ffffff"),
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  const sideMaterialRef = useRef(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(backgroundColor || "#ffffff"),
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  const [, setTextureTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchSvgData(svgPath)
      .then(({ svgGroups: groups }) => {
        if (alive) setSvgGroups(groups);
      })
      .catch((err) => console.warn("svg load failed:", err));
    return () => {
      alive = false;
    };
  }, [svgPath]);

  const transformedGroups = useMemo(() => {
    if (!svgGroups.length) return [];
    return applyTemplateTransforms({
      svgGroups,
      boxWidth,
      boxLength,
      boxHeight,
      boxDepth,
      scaleHeight,
      getRuleForChild,
      setMessage: null,
    });
  }, [svgGroups, boxWidth, boxLength, boxHeight, boxDepth, resizeRevision, scaleHeight]);

  const groupBoundsById = useMemo(() => {
    const depth = Math.max(0.001, boxDepth);
    const settings = { depth, bevelEnabled: false, curveSegments: 8 };
    const map = new Map();
    transformedGroups.forEach((group) => {
      const box = new THREE.Box3();
      let hasAny = false;
      group.paths.forEach((p) => {
        const shape = buildShapeFromPath(p.d);
        if (!shape) return;
        const geom = new THREE.ExtrudeGeometry(shape, settings);
        geom.computeBoundingBox();
        if (geom.boundingBox) {
          box.union(geom.boundingBox);
          hasAny = true;
        }
      });
      map.set(group.id, hasAny ? box : null);
    });
    return map;
  }, [transformedGroups, boxDepth]);

  const stage1 = useMemo(() => getStageProgress(1, progress), [progress]);
  const stage3 = useMemo(() => getStageProgress(3, progress), [progress]);
  const stage4 = useMemo(() => getStageProgress(4, progress), [progress]);
  const stage5 = useMemo(() => getStageProgress(5, progress), [progress]);
  const stage6 = useMemo(() => getStageProgress(6, progress), [progress]);
  const stage7 = useMemo(() => getStageProgress(7, progress), [progress]);
  const stage8 = useMemo(() => getStageProgress(8, progress), [progress]);
  const stage9 = useMemo(() => getStageProgress(9, progress), [progress]);
  const stage10 = useMemo(() => getStageProgress(10, progress), [progress]);

  useEffect(() => {
    // Backend files are overwritten; clear cached textures so they reload.
    textureCacheRef.current.forEach((tex) => tex.dispose?.());
    textureCacheRef.current.clear();
    setTextureTick((v) => v + 1);
  }, [textureKey, backgroundColor]);

  useEffect(() => {
    topMaterialRef.current.color = new THREE.Color(insideColor || "#ffffff");
    topMaterialRef.current.needsUpdate = true;
  }, [insideColor]);

  useEffect(() => {
    sideMaterialRef.current.color = new THREE.Color(backgroundColor || "#ffffff");
    sideMaterialRef.current.needsUpdate = true;
  }, [backgroundColor]);
  useEffect(() => {
    const img = currentTexture?.image;
    if (!img?.width || !img?.height) {
      bakedTextureRef.current = null;
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bakedTextureRef.current = null;
      return;
    }
    ctx.fillStyle = backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const baked = new THREE.CanvasTexture(canvas);
    baked.flipY = false;
    if (baked.colorSpace !== undefined) baked.colorSpace = THREE.SRGBColorSpace;
    bakedTextureRef.current = baked;
  }, [currentTexture, backgroundColor]);

  useEffect(() => {
    if (!transformedGroups.length) return;
    const loader = new THREE.TextureLoader();
    transformedGroups.forEach((group) => {
      if (!group.id || textureCacheRef.current.has(group.id)) return;
      const dataUrl = piecesDataUrls?.[group.id];
      if (!dataUrl) return;
      loader.load(
        dataUrl,
        (tex) => {
          const img = tex.image;
          if (img?.width && img?.height) {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = backgroundColor || "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const baked = new THREE.CanvasTexture(canvas);
              baked.flipY = false;
              if (baked.colorSpace !== undefined) baked.colorSpace = THREE.SRGBColorSpace;
              textureCacheRef.current.set(group.id, baked);
              setTextureTick((v) => v + 1);
              return;
            }
          }
          tex.flipY = false;
          if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
          textureCacheRef.current.set(group.id, tex);
          setTextureTick((v) => v + 1);
        },
        undefined,
        () => {
          // Missing textures are expected early on.
        }
      );
    });
  }, [textureKey, transformedGroups, backgroundColor, piecesDataUrls]);

  const getMaterialForId = (id) => {
    const tex =
      textureCacheRef.current.get(id) ||
      bakedTextureRef.current ||
      currentTexture ||
      null;
    let mat = materialCacheRef.current.get(id);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(backgroundColor || "#ffffff"),
        side: THREE.DoubleSide,
        map: tex,
        transparent: false,
        roughness: 0.85,
        metalness: 0.05,
      });
      materialCacheRef.current.set(id, mat);
    }
    if (mat.color) {
      mat.color = new THREE.Color(backgroundColor || "#ffffff");
    }
    if (mat.map !== tex) {
      mat.map = tex;
      mat.needsUpdate = true;
    }
    return mat;
  };

  return (
    <group
      name="svg-extrudes"
      position={[0, -1, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={MM_TO_SCENE}
    >
      {(() => {
        const depth = Math.max(0.001, boxDepth);
        const settings = { depth, bevelEnabled: false, curveSegments: 8 };
        const renderGroup = (group) => {
          if (!group) return null;
          const material = getMaterialForId(group.id);
          return (
            <group key={group.id || Math.random()} name={group.id || "piece"}>
              {group.paths.map((p, idx) => {
                const shape = buildShapeFromPath(p.d);
                if (!shape) return null;
                const geom = new THREE.ExtrudeGeometry(shape, settings);
                geom.computeVertexNormals();
                applyPlanarUvFromXY(geom);
                const split = splitByNormalZ(geom);
                return (
                  <group key={`${group.id || "piece"}-${idx}`} name={`${group.id || "piece"}_${idx}`}>
                    {split.sides && (
                      <mesh
                        name={`${group.id || "piece"}_${idx}_sides`}
                        geometry={split.sides}
                        material={sideMaterialRef.current}
                        castShadow
                        receiveShadow
                      />
                    )}
                    {split.bottom && (
                      <mesh
                        name={`${group.id || "piece"}_${idx}_bottom`}
                        geometry={split.bottom}
                        material={material}
                        castShadow
                        receiveShadow
                      />
                    )}
                    {split.top && (
                      <mesh
                        name={`${group.id || "piece"}_${idx}_top`}
                        geometry={split.top}
                        material={topMaterialRef.current}
                        castShadow
                        receiveShadow
                      />
                    )}
                  </group>
                );
              })}
            </group>
          );
        };

        const renderGroupWithLocalPivot = (group, rotationY, debug = false, pivotXMode = "center") => {
          if (!group) return null;
          const bounds = groupBoundsById.get(group.id);
          if (!bounds) return renderGroup(group);
          const cx =
            pivotXMode === "min"
              ? bounds.min.x
              : pivotXMode === "max"
                ? bounds.max.x
                : (bounds.min.x + bounds.max.x) / 2;
          const cy = (bounds.min.y + bounds.max.y) / 2;
          const cz = (bounds.min.z + bounds.max.z) / 2;
          return (
            <group name={`${group.id}_pivot`} position={[cx, cy, cz]} rotation={[0, rotationY, 0]}>
              {debug && (
                null
              )}
              <group position={[-cx, -cy, -cz]}>{renderGroup(group)}</group>
            </group>
          );
        };

        const f1 = transformedGroups.find((g) => g.id === "F1");
        const f2 = transformedGroups.find((g) => g.id === "F2");
        const f3 = transformedGroups.find((g) => g.id === "F3");
        const a1 = transformedGroups.find((g) => g.id === "A1");
        const a2 = transformedGroups.find((g) => g.id === "A2");
        const a3 = transformedGroups.find((g) => g.id === "A3");
        const b1 = transformedGroups.find((g) => g.id === "B1");
        const b2 = transformedGroups.find((g) => g.id === "B2");
        const b3 = transformedGroups.find((g) => g.id === "B3");
        const c1 = transformedGroups.find((g) => g.id === "C1");
        const c2 = transformedGroups.find((g) => g.id === "C2");
        const c3 = transformedGroups.find((g) => g.id === "C3");
        const f2Bounds = groupBoundsById.get("F2");
        const pivotX = f2Bounds ? (f2Bounds.min.x + f2Bounds.max.x) / 2 : 0;
        const pivotY = f2Bounds ? f2Bounds.min.y : 0;
        const pivotZ = f2Bounds ? f2Bounds.min.z : 0;
        const fRotation = stage1 * FULL_ANGLE;
        const fSideRotation = -stage1 * FULL_ANGLE;

        const c2Bounds = groupBoundsById.get("C2");
        const abcPivotX = c2Bounds ? (c2Bounds.min.x + c2Bounds.max.x) / 2 : 0;
        const abcPivotY = c2Bounds ? c2Bounds.max.y : 0;
        const abcPivotZ = c2Bounds ? c2Bounds.min.z : 0;
        const abcRotation = -stage1 * FULL_ANGLE;
        const abcSideRotation = -stage1 * FULL_ANGLE;
        const bSideRotation = -stage7 * FULL_ANGLE;
        const bRotation = -stage8 * FULL_ANGLE;
        const aSideRotation = -stage9 * FULL_ANGLE;
        const aRotation = -stage10 * FULL_ANGLE;

        const unionBounds = (boxes) => {
          const out = new THREE.Box3();
          let hasAny = false;
          boxes.forEach((b) => {
            if (!b) return;
            if (!hasAny) {
              out.copy(b);
              hasAny = true;
            } else {
              out.union(b);
            }
          });
          return hasAny ? out : null;
        };

        const dBounds = unionBounds([
          groupBoundsById.get("D1"),
          groupBoundsById.get("D2"),
          groupBoundsById.get("D3"),
        ]);
        const eBounds = unionBounds([
          groupBoundsById.get("E1"),
          groupBoundsById.get("E2"),
          groupBoundsById.get("E3"),
        ]);
        const aBounds = unionBounds([
          groupBoundsById.get("A1"),
          groupBoundsById.get("A2"),
          groupBoundsById.get("A3"),
        ]);
        const bBounds = unionBounds([
          groupBoundsById.get("B1"),
          groupBoundsById.get("B2"),
          groupBoundsById.get("B3"),
        ]);
        const dPivot = dBounds
          ? [dBounds.max.x, dBounds.min.y, (dBounds.min.z + dBounds.max.z) / 2]
          : [0, 0, 0];
        const ePivot = eBounds
          ? [eBounds.min.x + boxDepth, eBounds.min.y, eBounds.min.z]
          : [0, 0, 0];
        const bPivot = bBounds
          ? [(bBounds.min.x + bBounds.max.x) / 2, bBounds.max.y, bBounds.max.z]
          : [0, 0, 0];
        const aPivot = aBounds
          ? [(aBounds.min.x + aBounds.max.x) / 2, aBounds.max.y, aBounds.max.z]
          : [0, 0, 0];

        const handled = new Set([
          "F1",
          "F2",
          "F3",
          "A1",
          "A2",
          "A3",
          "B1",
          "B2",
          "B3",
          "C1",
          "C2",
          "C3",
          "D1",
          "D2",
          "D3",
          "E1",
          "E2",
          "E3",
        ]);

        return (
          <>
            null
            <group position={[pivotX, pivotY, pivotZ]} rotation={[fRotation, 0, 0]}>
              <group position={[-pivotX, -pivotY, -pivotZ]}>
                {renderGroupWithLocalPivot(f1, -fSideRotation, false, "max")}
                {renderGroup(f2)}
                {renderGroupWithLocalPivot(f3, fSideRotation, false, "min")}
              </group>
            </group>
            null
            <group position={[abcPivotX, abcPivotY, abcPivotZ]} rotation={[abcRotation, 0, 0]}>
              <group position={[-abcPivotX, -abcPivotY, -abcPivotZ]}>
                {renderGroupWithLocalPivot(c1, -abcSideRotation, false, "max")}
                {renderGroup(c2)}
                {renderGroupWithLocalPivot(c3, abcSideRotation, false, "min")}
                <group position={bPivot} rotation={[bRotation, 0, 0]}>
                  <group position={[-bPivot[0], -bPivot[1], -bPivot[2]]}>
                    {renderGroupWithLocalPivot(b1, -bSideRotation, false, "max")}
                    {renderGroup(b2)}
                    {renderGroupWithLocalPivot(b3, bSideRotation, false, "min")}
                    <group position={aPivot} rotation={[aRotation, 0, 0]}>
                      <group position={[-aPivot[0], -aPivot[1], -aPivot[2]]}>
                        {renderGroupWithLocalPivot(a1, -aSideRotation, false, "max")}
                        {renderGroup(a2)}
                        {renderGroupWithLocalPivot(a3, aSideRotation, false, "min")}
                      </group>
                    </group>
                  </group>
                </group>
              </group>
            </group>
            <group position={dPivot} rotation={[0, stage5 * FULL_ANGLE, 0]}>
              <group position={[-dPivot[0], -dPivot[1], -dPivot[2]]}>
                {(() => {
                  const d2 = transformedGroups.find((g) => g.id === "D2");
                  const d1 = transformedGroups.find((g) => g.id === "D1");
                  const d2Bounds = groupBoundsById.get("D2");
                  if (!d2Bounds) {
                    return (
                      <>
                        {renderGroup(d2)}
                        {renderGroup(d1)}
                      </>
                    );
                  }
                  const cx = d2Bounds.max.x;
                  const cy = (d2Bounds.min.y + d2Bounds.max.y) / 2;
                  const cz = (d2Bounds.min.z + d2Bounds.max.z) / 2;
                  const d1Bounds = groupBoundsById.get("D1");
                  const d1Pivot = d1Bounds
                    ? [
                        d1Bounds.max.x,
                        (d1Bounds.min.y + d1Bounds.max.y) / 2,
                        d1Bounds.min.z,
                      ]
                    : [0, 0, 0];
                  return (
                    <group name="D1D2_pivot" position={[cx, cy, cz]} rotation={[0, stage3 * FULL_ANGLE, 0]}>
                      <group position={[-cx, -cy, -cz]}>
                        {renderGroup(d2)}
                        {d1Bounds ? (
                          <group
                            name="D1_stage4"
                            position={d1Pivot}
                            rotation={[0, stage6 * FULL_ANGLE, 0]}
                          >
                            <group position={[-d1Pivot[0], -d1Pivot[1], -d1Pivot[2]]}>
                              {renderGroup(d1)}
                            </group>
                          </group>
                        ) : (
                          renderGroup(d1)
                        )}
                      </group>
                    </group>
                  );
                })()}
                {renderGroup(transformedGroups.find((g) => g.id === "D3"))}
              </group>
            </group>
            <group position={ePivot} rotation={[0, -stage5 * FULL_ANGLE, 0]}>
              <group position={[-ePivot[0], -ePivot[1], -ePivot[2]]}>
                {(() => {
                  const e2 = transformedGroups.find((g) => g.id === "E2");
                  const e1 = transformedGroups.find((g) => g.id === "E1");
                  const e2Bounds = groupBoundsById.get("E2");
                  if (!e2Bounds) {
                    return (
                      <>
                        {renderGroup(e2)}
                        {renderGroup(e1)}
                      </>
                    );
                  }
                  const cx = e2Bounds.min.x;
                  const cy = (e2Bounds.min.y + e2Bounds.max.y) / 2;
                  const cz = (e2Bounds.min.z + e2Bounds.max.z) / 2;
                  const e1Bounds = groupBoundsById.get("E1");
                  const e1Pivot = e1Bounds
                    ? [
                        e1Bounds.min.x,
                        (e1Bounds.min.y + e1Bounds.max.y) / 2,
                        e1Bounds.min.z,
                      ]
                    : [0, 0, 0];
                  return (
                    <group name="E1E2_pivot" position={[cx, cy, cz]} rotation={[0, -stage3 * FULL_ANGLE, 0]}>
                      <group position={[-cx, -cy, -cz]}>
                        {renderGroup(e2)}
                        {e1Bounds ? (
                          <group
                            name="E1_stage4"
                            position={e1Pivot}
                            rotation={[0, -stage6 * FULL_ANGLE, 0]}
                          >
                            <group position={[-e1Pivot[0], -e1Pivot[1], -e1Pivot[2]]}>
                              {renderGroup(e1)}
                            </group>
                          </group>
                        ) : (
                          renderGroup(e1)
                        )}
                      </group>
                    </group>
                  );
                })()}
                {renderGroup(transformedGroups.find((g) => g.id === "E3"))}
              </group>
            </group>
            {transformedGroups.filter((g) => !handled.has(g.id)).map((g) => renderGroup(g))}
          </>
        );
      })()}
    </group>
  );
}
