import resizeConfig from "../json/pointConfig/150010.json";
import templateRules from "../json/templateRules/150010.json";
import defaultConfig from "../json/default.json";
import {
  parsePath,
  getPathPoints,
  transformPath,
  transformPathWithAdjust,
  scalePath,
  translatePath,
  computeGroupBounds,
} from "./svgPathUtils";

const isHeightFoldPanel = (id) => ["A2", "C2", "F2"].some((prefix) => (id || "").startsWith(prefix));

const resolveRuleKey = (id, map) => {
  if (!map) return null;
  if (map[id]) return map[id];
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  const match = keys.find((k) => id && id.startsWith(k));
  return match ? map[match] : null;
};

const pivotValue = (token, bounds, baseCenterX) => {
  switch (token) {
    case "minX":
      return bounds.minX;
    case "maxX":
      return bounds.maxX;
    case "centerX":
      return baseCenterX;
    case "minY":
      return bounds.minY;
    case "maxY":
      return bounds.maxY;
    case "centerY":
      return (bounds.minY + bounds.maxY) / 2;
    default:
      return token && token.includes("X") ? baseCenterX : bounds.maxY;
  }
};

const resolvePivot = (id, bounds, baseCenterX) => {
  const spec = resolveRuleKey(id, templateRules.pivots) || { x: "maxX", y: "maxY" };
  return {
    x: pivotValue(spec.x, bounds, baseCenterX),
    y: pivotValue(spec.y, bounds, baseCenterX),
  };
};

const resolveScaleSpec = (id) => resolveRuleKey(id, templateRules.scales) || { x: "height", y: "length" };

const resolveScales = (id, scaleRefs) => {
  const spec = resolveScaleSpec(id);
  return {
    sx: scaleRefs[spec.x] ?? 1,
    sy: scaleRefs[spec.y] ?? 1,
  };
};

const buildChainCandidates = (firstPass, ids, scaleRefs, baseCenterX) =>
  firstPass
    .map((group, idx) => ({ group, idx }))
    .filter(({ group }) => ids.includes(group.id))
    .map(({ group, idx }) => {
      const bounds = computeGroupBounds(group.paths);
      const pivot = resolvePivot(group.id, bounds, baseCenterX);
      const { sx, sy } = resolveScales(group.id, scaleRefs);
      const scaledPaths = group.paths.map((p) => ({
        ...p,
        d: scalePath(p.d, sx, sy, pivot.x, pivot.y),
      }));
      const scaledBounds = computeGroupBounds(scaledPaths);
      const width = scaledBounds.maxX - scaledBounds.minX;
      return { idx, scaledPaths, scaledBounds, width, id: group.id };
    });

const alignToAverageY = (oBounds, bounds) => {
  // Keep the top edges locked to O to avoid visible gaps after scaling.
  return oBounds.maxY - bounds.maxY;
};

const pickMid = (candidates, idHint) => {
  const hinted = candidates.filter((c) => c.id === idHint);
  if (hinted.length) return [...hinted].sort((a, b) => a.width - b.width)[0];
  return [...candidates].sort((a, b) => a.width - b.width)[0];
};

const pickByIdOrEdge = (candidates, idHint, edge = "min") => {
  const hinted = candidates.filter((c) => c.id === idHint);
  if (hinted.length) {
    const sortedHinted = [...hinted].sort((a, b) => a.scaledBounds.minX - b.scaledBounds.minX);
    return edge === "max" ? sortedHinted[sortedHinted.length - 1] : sortedHinted[0];
  }
  const sorted = [...candidates].sort((a, b) => a.scaledBounds.minX - b.scaledBounds.minX);
  return edge === "max" ? sorted[sorted.length - 1] : sorted[0];
};

const buildChainShifts = ({
  candidates,
  oBounds,
  anchorEdge,
  chainIds,
}) => {
  const shifts = {};
  if (!oBounds || candidates.length < 3) return shifts;

  const [id1, id2, id3] = chainIds;
  const byId = (id, strategy = "minX") => {
    const matches = candidates.filter((c) => c.id === id);
    if (!matches.length) return null;
    if (strategy === "smallestWidth") {
      return [...matches].sort((a, b) => a.width - b.width)[0];
    }
    if (strategy === "maxMaxX") {
      const sortedByMax = [...matches].sort((a, b) => a.scaledBounds.maxX - b.scaledBounds.maxX);
      return sortedByMax[sortedByMax.length - 1];
    }
    const sorted = [...matches].sort((a, b) => a.scaledBounds.minX - b.scaledBounds.minX);
    return strategy === "maxX" ? sorted[sorted.length - 1] : sorted[0];
  };

  // Prefer deterministic by-id chaining when all three ids are present.
  // This enforces: D1.maxX = D2.minX = ... and avoids edge-based mis-picks.
  const explicitMid = byId(id2, anchorEdge === "minX" ? "maxMaxX" : "minX");
  // For right-side chains (E*), the anchor is id1 near O.maxX, so pick the
  // rightmost instance of that id to avoid grabbing a duplicate farther left.
  const explicitLeft = byId(id1, anchorEdge === "maxX" ? "maxX" : "minX");
  const explicitRight = byId(id3, "maxX");
  const useExplicit =
    explicitMid &&
    explicitLeft &&
    explicitRight &&
    new Set([explicitMid.idx, explicitLeft.idx, explicitRight.idx]).size === 3;

  const midId = id2;
  const mid = useExplicit ? explicitMid : pickMid(candidates, midId);
  const remaining = candidates.filter((c) => c.idx !== mid.idx);

  const anchorId = anchorEdge === "minX" ? id3 : id1;
  const outerId = anchorEdge === "minX" ? id1 : id3;

  const anchor = useExplicit
    ? anchorEdge === "minX"
      ? explicitRight
      : explicitLeft
    : pickByIdOrEdge(remaining, anchorId, anchorEdge === "minX" ? "max" : "min");

  const outer = useExplicit
    ? anchorEdge === "minX"
      ? explicitLeft
      : explicitRight
    : pickByIdOrEdge(
        remaining.filter((c) => c.idx !== anchor.idx),
        outerId,
        anchorEdge === "minX" ? "min" : "max"
      );

  const anchorDy = alignToAverageY(oBounds, anchor.scaledBounds);
  const anchorDx =
    anchorEdge === "minX"
      ? oBounds.minX - anchor.scaledBounds.maxX
      : oBounds.maxX - anchor.scaledBounds.minX;
  shifts[anchor.idx] = { dx: anchorDx, dy: anchorDy };

  if (anchorEdge === "minX") {
    const anchorMinAfter = anchor.scaledBounds.minX + anchorDx;
    const midDx = anchorMinAfter - mid.scaledBounds.maxX;
    shifts[mid.idx] = { dx: midDx, dy: alignToAverageY(oBounds, mid.scaledBounds) };

    if (outer) {
      const midMinAfter = mid.scaledBounds.minX + midDx;
      const outerDx = midMinAfter - outer.scaledBounds.maxX;
      shifts[outer.idx] = { dx: outerDx, dy: alignToAverageY(oBounds, outer.scaledBounds) };
    }
  } else {
    const anchorMaxAfter = anchor.scaledBounds.maxX + anchorDx;
    const midDx = anchorMaxAfter - mid.scaledBounds.minX;
    shifts[mid.idx] = { dx: midDx, dy: alignToAverageY(oBounds, mid.scaledBounds) };

    if (outer) {
      const midMaxAfter = mid.scaledBounds.maxX + midDx;
      const outerDx = midMaxAfter - outer.scaledBounds.minX;
      shifts[outer.idx] = { dx: outerDx, dy: alignToAverageY(oBounds, outer.scaledBounds) };
    }
  }

  // Final snap to exact constraints to avoid tiny accumulated gaps.
  const snap = (bounds, shift) => ({
    minX: bounds.minX + shift.dx,
    maxX: bounds.maxX + shift.dx,
    minY: bounds.minY + shift.dy,
    maxY: bounds.maxY + shift.dy,
  });
  const oAvgY = (oBounds.minY + oBounds.maxY) / 2;
  const avgY = (b) => (b.minY + b.maxY) / 2;
  // Small overlap combats visual gaps from stroke scaling/antialiasing.
  const eps = 0.5;

  if (anchorEdge === "minX") {
    const a = shifts[anchor.idx];
    const m = shifts[mid.idx];
    if (a) {
      const aSnap = snap(anchor.scaledBounds, a);
      a.dx += oBounds.minX - aSnap.maxX + eps;
      a.dy += oAvgY - avgY(aSnap);
    }
    if (m) {
      const aSnap = snap(anchor.scaledBounds, shifts[anchor.idx]);
      const mSnap = snap(mid.scaledBounds, m);
      m.dx += aSnap.minX - mSnap.maxX + eps;
      m.dy += oAvgY - avgY(mSnap);
    }
    if (outer && shifts[outer.idx]) {
      const mSnap = snap(mid.scaledBounds, shifts[mid.idx]);
      const oSnap = snap(outer.scaledBounds, shifts[outer.idx]);
      shifts[outer.idx].dx += mSnap.minX - oSnap.maxX + eps;
      shifts[outer.idx].dy += oAvgY - avgY(oSnap);
    }
  } else {
    const a = shifts[anchor.idx];
    const m = shifts[mid.idx];
    if (a) {
      const aSnap = snap(anchor.scaledBounds, a);
      a.dx += oBounds.maxX - aSnap.minX - eps;
      a.dy += oAvgY - avgY(aSnap);
    }
    if (m) {
      const aSnap = snap(anchor.scaledBounds, shifts[anchor.idx]);
      const mSnap = snap(mid.scaledBounds, m);
      m.dx += aSnap.maxX - mSnap.minX - eps;
      m.dy += oAvgY - avgY(mSnap);
    }
    if (outer && shifts[outer.idx]) {
      const mSnap = snap(mid.scaledBounds, shifts[mid.idx]);
      const oSnap = snap(outer.scaledBounds, shifts[outer.idx]);
      shifts[outer.idx].dx += mSnap.maxX - oSnap.minX - eps;
      shifts[outer.idx].dy += oAvgY - avgY(oSnap);
    }
  }

  return shifts;
};

export const applyTemplateTransforms = ({
  svgGroups,
  boxWidth,
  boxLength,
  boxHeight,
  boxDepth,
  scaleHeight: scaleHeightOverride,
  getRuleForChild,
  setMessage,
}) => {
  if (!svgGroups.length) return [];

  const oGroup = svgGroups.find((g) => g.id === "O");
  const oBounds = oGroup?.bounds;
  if (!oBounds) return svgGroups;

  const baseWidthSvg = oBounds.maxX - oBounds.minX;
  const baseLengthSvg = oBounds.maxY - oBounds.minY;
  const baseCenterX = (oBounds.minX + oBounds.maxX) / 2;
  const baseCenterY = (oBounds.minY + oBounds.maxY) / 2;

  const heightGroup =
    svgGroups.find((g) => g.id === "C2") ||
    svgGroups.find((g) => g.id === "A2") ||
    svgGroups.find((g) => g.id === "F2");

  const heightBaseSvg = heightGroup
    ? heightGroup.bounds.maxY - heightGroup.bounds.minY
    : baseLengthSvg;
  const MM_FACTOR = 100;
  const baseOriginal2d = {
    x: baseWidthSvg / MM_FACTOR,
    z: baseLengthSvg / MM_FACTOR,
    y: heightBaseSvg / MM_FACTOR,
  };
  const scaleLengthBase = baseOriginal2d.z > 0 ? boxLength / baseOriginal2d.z : 1;
  const baseDeltaX = (boxWidth - baseOriginal2d.x) * MM_FACTOR;
  const baseDeltaLen = (boxLength - baseOriginal2d.z) * MM_FACTOR;

  const scaleWidth = baseOriginal2d.x > 0 ? boxWidth / baseOriginal2d.x : 1;
  const scaleLength = baseOriginal2d.z > 0 ? boxLength / baseOriginal2d.z : 1;
  const computedScaleHeight = baseOriginal2d.y > 0 ? boxHeight / baseOriginal2d.y : 1;
  const scaleHeight = scaleHeightOverride ?? computedScaleHeight;
  const baseDepth = defaultConfig?.room?.door ?? 1;
  const depthTarget = (boxDepth ?? baseDepth) * 3;
  const scaleDepth = baseDepth > 0 ? depthTarget / baseDepth : 1;
  const scaleRefs = {
    width: scaleWidth,
    length: scaleLength,
    height: scaleHeight,
    depth: scaleDepth,
  };

  const firstPass = svgGroups.map((group) => {
    const heightCenter = heightGroup
      ? (heightGroup.bounds.minY + heightGroup.bounds.maxY) / 2
      : baseCenterY;

    const deltaX = baseDeltaX;
    const deltaLen = baseDeltaLen;
    const deltaY = isHeightFoldPanel(group.id) ? 0 : deltaLen;
    const centerX = baseCenterX;
    const centerY = isHeightFoldPanel(group.id) ? heightCenter : baseCenterY;
    const rules = getRuleForChild(group.id || "", resizeConfig.resizeRules);
    const ruleZ = isHeightFoldPanel(group.id) ? rules.Y : rules.Z;
    const heightScalePivot = resolvePivot(group.id, group.bounds, baseCenterX);

    const oBehavior = templateRules.behaviors?.O || {};
    const effectiveDeltaY = group.id === "O" && oBehavior.disableDeltaY ? 0 : deltaY;
    const effectiveRuleZ = group.id === "O" && oBehavior.disableRuleZ ? null : ruleZ;

    const nextPaths = group.paths.map((path) => {
      if (group.id === "B2") {
        const baseAvgY = (group.bounds.minY + group.bounds.maxY) / 2;
        const shiftY = (scaleHeight - 1) * heightBaseSvg;
        return {
          ...path,
          d: transformPathWithAdjust(
            path.d,
            {
              transformOps: group.transformOps || [],
              centerX,
              centerY,
              deltaX,
              deltaY: 0,
              ruleX: rules.X,
              ruleZ: null,
              invertZ: false,
            },
            (pt) => {
              let y = pt.y - shiftY;
              if (pt.y < baseAvgY) {
                y -= deltaLen;
              }
              return { x: pt.x, y };
            }
          ),
        };
      }

      const baseTransformed = transformPath(path.d, {
        transformOps: group.transformOps || [],
        centerX,
        centerY,
        deltaX,
        deltaY: effectiveDeltaY,
        ruleX: rules.X,
        ruleZ: effectiveRuleZ,
        invertZ: isHeightFoldPanel(group.id),
      });

      if (isHeightFoldPanel(group.id)) {
        return {
          ...path,
          d: scalePath(baseTransformed, 1, scaleHeight, heightScalePivot.x, heightScalePivot.y),
        };
      }

      return { ...path, d: baseTransformed };
    });

    if (group.id === "O" && scaleLengthBase !== 1) {
      const pivot = resolvePivot(group.id, oBounds, baseCenterX);
      return {
        ...group,
        paths: nextPaths.map((p) => ({
          ...p,
          d: scalePath(p.d, 1, scaleLengthBase, pivot.x, pivot.y),
        })),
      };
    }

    return { ...group, paths: nextPaths };
  });

  const boundsById = firstPass.reduce((acc, group) => {
    if (!group.id) return acc;
    const b = computeGroupBounds(group.paths);
    if (Number.isFinite(b.minY)) acc[group.id] = b;
    return acc;
  }, {});

  const b2Bounds = boundsById.B2;
  const oBoundsAfter = boundsById.O;
  const a2TopY = boundsById.A2
    ? boundsById.A2.maxY + (b2Bounds ? b2Bounds.minY - boundsById.A2.maxY : 0)
    : null;
  const c2TopY = boundsById.C2 ? boundsById.C2.maxY : null;
  const c2BottomY = boundsById.C2 ? boundsById.C2.minY : null;
  if (boundsById.A2 || boundsById.A1) {
    const lines = [];
    if (a2TopY !== null) {
      const value = Number.isFinite(a2TopY) ? a2TopY.toFixed(4) : a2TopY;
      lines.push(`A2.top=${value}`);
    }
    if (boundsById.A1) {
      const value = Number.isFinite(boundsById.A1.minY) ? boundsById.A1.minY.toFixed(4) : boundsById.A1.minY;
      lines.push(`A1.bottom=${value}`);
    }
    if (lines.length) {
      const msg = lines.join("\n");
      if (typeof setMessage === "function") {
        setMessage((prev) => (prev ? `${prev}\n${msg}` : msg));
      } else {
        console.log(msg);
      }
    }
  }
  const f2Dy = oBoundsAfter && boundsById.F2 ? oBoundsAfter.maxY - boundsById.F2.minY : 0;
  const f2TargetCenterY = boundsById.F2
    ? (boundsById.F2.minY + boundsById.F2.maxY) / 2 + f2Dy
    : null;
  const f2TopY = boundsById.F2 ? boundsById.F2.maxY + f2Dy : null;

  const dBehavior = templateRules.behaviors?.D || {};
  const eBehavior = templateRules.behaviors?.E || {};

  const dIds = dBehavior.chain || ["D1", "D2", "D3"];
  const eIds = eBehavior.chain || ["E1", "E2", "E3"];

  const dCandidates = buildChainCandidates(firstPass, dIds, scaleRefs, baseCenterX);
  const eCandidates = buildChainCandidates(firstPass, eIds, scaleRefs, baseCenterX);

  const dShiftByIdx = buildChainShifts({
    candidates: dCandidates,
    oBounds: oBoundsAfter,
    anchorEdge: dBehavior.anchorEdge || "minX",
    chainIds: dIds,
  });
  const eShiftByIdx = buildChainShifts({
    candidates: eCandidates,
    oBounds: oBoundsAfter,
    anchorEdge: eBehavior.anchorEdge || "maxX",
    chainIds: eIds,
  });

  return firstPass.map((group, groupIdx) => {
    const bounds = boundsById[group.id];

    if (group.id === "A1" || group.id === "A3") {
      if (!bounds) return group;
      const pivot = resolvePivot(group.id, bounds, baseCenterX);
      const { sx, sy } = resolveScales(group.id, scaleRefs);
      const dx = group.id === "A1" ? -baseDeltaX / 2 : baseDeltaX / 2;
      const scaledPaths = group.paths.map((p) => ({
        ...p,
        d: scalePath(p.d, sx, sy, pivot.x, pivot.y),
      }));
      const scaledBounds = computeGroupBounds(scaledPaths);
      const dy =
        a2TopY !== null ? a2TopY - 0.677 * scaleHeight - scaledBounds.maxY : 0;
      return {
        ...group,
        paths: scaledPaths.map((p) => ({ ...p, d: translatePath(p.d, dx, dy) })),
      };
    }

    if (group.id === "B1" || group.id === "B3") {
      if (!bounds) return group;
      const pivot = resolvePivot(group.id, bounds, baseCenterX);
      const { sx, sy } = resolveScales(group.id, scaleRefs);
      const b2MinX = b2Bounds ? b2Bounds.minX : null;
      const b2MaxX = b2Bounds ? b2Bounds.maxX : null;
      const b2CenterY = b2Bounds ? (b2Bounds.minY + b2Bounds.maxY) / 2 : null;
      const scaledPaths = group.paths.map((p) => ({
        ...p,
        d: scalePath(p.d, sx, sy, pivot.x, pivot.y),
      }));
      const scaledBounds = computeGroupBounds(scaledPaths);
      const currentCenterY = (scaledBounds.minY + scaledBounds.maxY) / 2;
      const alignDx =
        b2MinX !== null && b2MaxX !== null
          ? group.id === "B1"
            ? b2MinX - scaledBounds.maxX
            : b2MaxX - scaledBounds.minX
          : 0;
      const alignDy = b2CenterY !== null ? b2CenterY - currentCenterY : 0;
      return {
        ...group,
        paths: scaledPaths.map((p) => ({ ...p, d: translatePath(p.d, alignDx, alignDy) })),
      };
    }

    if (dShiftByIdx[groupIdx]) {
      const shift = dShiftByIdx[groupIdx];
      const pivot = resolvePivot(group.id, bounds, baseCenterX);
      const { sx, sy } = resolveScales(group.id, scaleRefs);
      const scaledPaths = group.paths.map((p) => ({
        ...p,
        d: scalePath(p.d, sx, sy, pivot.x, pivot.y),
      }));
      return {
        ...group,
        paths: scaledPaths.map((p) => ({ ...p, d: translatePath(p.d, shift.dx, shift.dy) })),
      };
    }

    if (eShiftByIdx[groupIdx]) {
      const shift = eShiftByIdx[groupIdx];
      const pivot = resolvePivot(group.id, bounds, baseCenterX);
      const { sx, sy } = resolveScales(group.id, scaleRefs);
      const scaledPaths = group.paths.map((p) => ({
        ...p,
        d: scalePath(p.d, sx, sy, pivot.x, pivot.y),
      }));
      return {
        ...group,
        paths: scaledPaths.map((p) => ({ ...p, d: translatePath(p.d, shift.dx, shift.dy) })),
      };
    }

    if (group.id === "C1" || group.id === "C3") {
      if (!bounds) return group;
      const pivot = resolvePivot(group.id, bounds, baseCenterX);
      const { sx, sy } = resolveScales(group.id, scaleRefs);
      const dx = group.id === "C1" ? -baseDeltaX / 2 : baseDeltaX / 2;
      const scaledPaths = group.paths.map((p) => ({
        ...p,
        d: scalePath(p.d, sx, sy, pivot.x, pivot.y),
      }));
      const scaledBounds = computeGroupBounds(scaledPaths);
      const dy =
        c2BottomY !== null ? c2BottomY + 0.677 * scaleHeight - scaledBounds.minY : 0;
      return {
        ...group,
        paths: scaledPaths.map((p) => ({ ...p, d: translatePath(p.d, dx, dy) })),
      };
    }

    if (group.id === "F1" || group.id === "F3") {
      if (!bounds) return group;
      const pivot = resolvePivot(group.id, bounds, baseCenterX);
      const { sx, sy } = resolveScales(group.id, scaleRefs);
      const dx = group.id === "F1" ? -baseDeltaX / 2 : baseDeltaX / 2;
      const scaledPaths = group.paths.map((p) => ({
        ...p,
        d: scalePath(p.d, sx, sy, pivot.x, pivot.y),
      }));
      const scaledBounds = computeGroupBounds(scaledPaths);
      const dy = f2TopY !== null ? f2TopY - scaledBounds.maxY : f2Dy;
      return {
        ...group,
        paths: scaledPaths.map((p) => ({ ...p, d: translatePath(p.d, dx, dy) })),
      };
    }

    if (group.id === "A2" && b2Bounds) {
      const targetY = b2Bounds.minY;
      if (bounds) {
        const dy = targetY - bounds.maxY;
        return {
          ...group,
          paths: group.paths.map((p) => ({ ...p, d: translatePath(p.d, 0, dy) })),
        };
      }
    }

    if (group.id === "F2" && oBoundsAfter) {
      if (bounds) {
        return {
          ...group,
          paths: group.paths.map((p) => ({ ...p, d: translatePath(p.d, 0, f2Dy) })),
        };
      }
    }

    return group;
  });
};
