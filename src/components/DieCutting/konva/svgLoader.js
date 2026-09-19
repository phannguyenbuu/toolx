import {
  parsePointsAttr,
  pointsToPath,
  parseTransformOps,
  computePathBounds,
} from "./svgPathUtils";
import { DEFAULT_TEXTURE_SIZE } from "../constants/texture";

export const fetchSvgData = async (svgPath) => {
  const response = await fetch(svgPath);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const svgText = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  const outerGroup = svgEl?.querySelector("svg > g");
  const outerOps = parseTransformOps(outerGroup?.getAttribute("transform") || "");
  const viewBox = svgEl?.getAttribute("viewBox");
  let width = Number(svgEl?.getAttribute("width")) || DEFAULT_TEXTURE_SIZE;
  let height = Number(svgEl?.getAttribute("height")) || DEFAULT_TEXTURE_SIZE;
  let minX = 0;
  let minY = 0;

  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4) {
      minX = parts[0];
      minY = parts[1];
      width = parts[2];
      height = parts[3];
    }
  }

  const paths = Array.from(doc.querySelectorAll("path")).map((p) => {
    const stroke = p.getAttribute("stroke");
    const fill = p.getAttribute("fill");
    return {
      d: p.getAttribute("d") || "",
      stroke: stroke && stroke !== "none" ? stroke : null,
      fill: fill && fill !== "none" ? fill : null,
      strokeWidth: Number(p.getAttribute("stroke-width")) || 1,
      opacity: Number(p.getAttribute("opacity")) || 1,
    };
  });

  const groupNodes = outerGroup
    ? Array.from(outerGroup.querySelectorAll("g[id]"))
    : Array.from(doc.querySelectorAll("g[id]"));

  if (!groupNodes.length) {
    const flatPaths = paths.filter((p) => p.d);
    const flatBounds = flatPaths.reduce(
      (acc, path) => {
        const b = computePathBounds(path.d);
        return {
          minX: Math.min(acc.minX, b.minX),
          minY: Math.min(acc.minY, b.minY),
          maxX: Math.max(acc.maxX, b.maxX),
          maxY: Math.max(acc.maxY, b.maxY),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    return {
      svgBounds: { width, height, minX, minY },
      svgGroups: [
        {
          id: "",
          paths: flatPaths,
          transformOps: outerOps,
          bounds:
            Number.isFinite(flatBounds.minX) && Number.isFinite(flatBounds.minY)
              ? flatBounds
              : { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        },
      ],
    };
  }

  const groups = groupNodes
    .filter((g) => (g.getAttribute("id") || "").toLowerCase() !== "defpoints")
    .map((g) => {
      const id = g.getAttribute("id") || "";
      const groupOps = parseTransformOps(g.getAttribute("transform") || "");
      const transformOps = outerOps.concat(groupOps);
      const pathNodes = Array.from(g.querySelectorAll("path"));
      const polygonNodes = Array.from(g.querySelectorAll("polygon"));
      const polylineNodes = Array.from(g.querySelectorAll("polyline"));
      const groupPaths = [
        ...pathNodes.map((p) => {
          const stroke = p.getAttribute("stroke");
          const fill = p.getAttribute("fill");
          return {
            d: p.getAttribute("d") || "",
            stroke: stroke && stroke !== "none" ? stroke : null,
            fill: fill && fill !== "none" ? fill : null,
            strokeWidth: Number(p.getAttribute("stroke-width")) || 1,
            opacity: Number(p.getAttribute("opacity")) || 1,
          };
        }),
        ...polygonNodes.map((p) => {
          const stroke = p.getAttribute("stroke");
          const fill = p.getAttribute("fill");
          const points = parsePointsAttr(p.getAttribute("points") || "");
          return {
            d: pointsToPath(points, true),
            stroke: stroke && stroke !== "none" ? stroke : null,
            fill: fill && fill !== "none" ? fill : null,
            strokeWidth: Number(p.getAttribute("stroke-width")) || 1,
            opacity: Number(p.getAttribute("opacity")) || 1,
          };
        }),
        ...polylineNodes.map((p) => {
          const stroke = p.getAttribute("stroke");
          const fill = p.getAttribute("fill");
          const points = parsePointsAttr(p.getAttribute("points") || "");
          return {
            d: pointsToPath(points, false),
            stroke: stroke && stroke !== "none" ? stroke : null,
            fill: fill && fill !== "none" ? fill : null,
            strokeWidth: Number(p.getAttribute("stroke-width")) || 1,
            opacity: Number(p.getAttribute("opacity")) || 1,
          };
        }),
      ].filter((p) => p.d);

      const groupBounds = groupPaths.reduce(
        (acc, path) => {
          const b = computePathBounds(path.d, transformOps);
          return {
            minX: Math.min(acc.minX, b.minX),
            minY: Math.min(acc.minY, b.minY),
            maxX: Math.max(acc.maxX, b.maxX),
            maxY: Math.max(acc.maxY, b.maxY),
          };
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );

      return {
        id,
        paths: groupPaths,
        transformOps,
        bounds:
          Number.isFinite(groupBounds.minX) && Number.isFinite(groupBounds.minY)
            ? groupBounds
            : { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      };
    });

  return {
    svgBounds: { width, height, minX, minY },
    svgGroups: groups,
  };
};
