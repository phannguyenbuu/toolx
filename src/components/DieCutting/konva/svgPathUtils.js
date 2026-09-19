// SVG path and geometry utilities for Konva SVG rendering
import polygonClipping from "polygon-clipping";

export const tokenizePath = (d) =>
  d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];

export const parsePath = (d) => {
  const tokens = tokenizePath(d);
  const segments = [];
  let i = 0;
  let cmd = null;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;

  const readNumber = () => Number(tokens[i++]);
  const isCommand = (t) => /^[a-zA-Z]$/.test(t);

  while (i < tokens.length) {
    const token = tokens[i];
    if (isCommand(token)) {
      cmd = token;
      i += 1;
    }
    if (!cmd) break;

    const upper = cmd.toUpperCase();
    const isRel = cmd !== upper;

    const pushSegment = (name, values) => {
      segments.push({ cmd: name, values });
    };

    if (upper === "Z") {
      pushSegment("Z", []);
      cx = sx;
      cy = sy;
      cmd = null;
      continue;
    }

    if (upper === "M") {
      let first = true;
      while (i < tokens.length && !isCommand(tokens[i])) {
        const x = readNumber();
        const y = readNumber();
        const nx = isRel ? cx + x : x;
        const ny = isRel ? cy + y : y;
        if (first) {
          pushSegment("M", [nx, ny]);
          sx = nx;
          sy = ny;
          first = false;
        } else {
          pushSegment("L", [nx, ny]);
        }
        cx = nx;
        cy = ny;
      }
      continue;
    }

    const readPairs = (pairCount, cmdName) => {
      while (i < tokens.length && !isCommand(tokens[i])) {
        const values = [];
        for (let p = 0; p < pairCount; p += 1) {
          const x = readNumber();
          const y = readNumber();
          const nx = isRel ? cx + x : x;
          const ny = isRel ? cy + y : y;
          values.push(nx, ny);
          if (p === pairCount - 1) {
            cx = nx;
            cy = ny;
          }
        }
        pushSegment(cmdName, values);
      }
    };

    switch (upper) {
      case "L":
        readPairs(1, "L");
        break;
      case "H":
        while (i < tokens.length && !isCommand(tokens[i])) {
          const x = readNumber();
          const nx = isRel ? cx + x : x;
          cx = nx;
          pushSegment("H", [nx]);
        }
        break;
      case "V":
        while (i < tokens.length && !isCommand(tokens[i])) {
          const y = readNumber();
          const ny = isRel ? cy + y : y;
          cy = ny;
          pushSegment("V", [ny]);
        }
        break;
      case "C":
        readPairs(3, "C");
        break;
      case "S":
        readPairs(2, "S");
        break;
      case "Q":
        readPairs(2, "Q");
        break;
      case "T":
        readPairs(1, "T");
        break;
      case "A": {
        while (i < tokens.length && !isCommand(tokens[i])) {
          const rx = readNumber();
          const ry = readNumber();
          const xAxisRotation = readNumber();
          const largeArc = readNumber();
          const sweep = readNumber();
          const x = readNumber();
          const y = readNumber();
          const nx = isRel ? cx + x : x;
          const ny = isRel ? cy + y : y;
          pushSegment("A", [
            rx,
            ry,
            xAxisRotation,
            largeArc,
            sweep,
            nx,
            ny,
          ]);
          cx = nx;
          cy = ny;
        }
        break;
      }
      default:
        i = tokens.length;
        break;
    }
  }

  return segments;
};

export const parsePointsAttr = (points) => {
  if (!points) return [];
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number))
    .filter((pair) => pair.length === 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
    .map(([x, y]) => ({ x, y }));
};

export const pointsToPath = (points, close = true) => {
  if (!points.length) return "";
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i += 1) {
    parts.push(`L ${points[i].x} ${points[i].y}`);
  }
  if (close) parts.push("Z");
  return parts.join(" ");
};

const polygonArea = (points) => {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return area / 2;
};

const lineIntersection = (p1, d1, p2, d2) => {
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-6) return null;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
};

const offsetPolygonPoints = (points, offset, miterLimit = 4) => {
  if (points.length < 3) return points;
  const area = polygonArea(points);
  const isCCW = area > 0;
  const edges = points.map((p, i) => {
    const p2 = points[(i + 1) % points.length];
    const dx = p2.x - p.x;
    const dy = p2.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const dir = { x: dx / len, y: dy / len };
    const nx = dy / len;
    const ny = -dx / len;
    const normal = isCCW ? { x: nx, y: ny } : { x: -nx, y: -ny };
    return { dir, normal };
  });

  const result = [];
  points.forEach((p, i) => {
    const prevEdge = edges[(i - 1 + edges.length) % edges.length];
    const nextEdge = edges[i];
    const p1 = { x: p.x + prevEdge.normal.x * offset, y: p.y + prevEdge.normal.y * offset };
    const p2 = { x: p.x + nextEdge.normal.x * offset, y: p.y + nextEdge.normal.y * offset };

    const inter = lineIntersection(p1, prevEdge.dir, p2, nextEdge.dir);
    const mx = prevEdge.normal.x + nextEdge.normal.x;
    const my = prevEdge.normal.y + nextEdge.normal.y;
    const mLen = Math.hypot(mx, my) || 1;
    const fallback = { x: p.x + (mx / mLen) * offset, y: p.y + (my / mLen) * offset };

    if (inter) {
      const dist = Math.hypot(inter.x - p.x, inter.y - p.y);
      const limit = Math.abs(offset) * miterLimit;
      if (dist <= limit) {
        result.push(inter);
        return;
      }
    }

    result.push(fallback);
  });

  return result;
};

const getPathVertices = (d) => {
  const segments = parsePath(d);
  const points = [];
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  segments.forEach((seg) => {
    const { cmd, values } = seg;
    if (cmd === "M") {
      current = { x: values[0], y: values[1] };
      start = { ...current };
      points.push({ ...current });
      return;
    }
    if (cmd === "L" || cmd === "T") {
      current = { x: values[0], y: values[1] };
      points.push({ ...current });
      return;
    }
    if (cmd === "H") {
      current = { x: values[0], y: current.y };
      points.push({ ...current });
      return;
    }
    if (cmd === "V") {
      current = { x: current.x, y: values[0] };
      points.push({ ...current });
      return;
    }
    if (cmd === "C") {
      current = { x: values[4], y: values[5] };
      points.push({ ...current });
      return;
    }
    if (cmd === "S" || cmd === "Q") {
      current = { x: values[2], y: values[3] };
      points.push({ ...current });
      return;
    }
    if (cmd === "A") {
      current = { x: values[5], y: values[6] };
      points.push({ ...current });
      return;
    }
    if (cmd === "Z") {
      if (points.length && (current.x !== start.x || current.y !== start.y)) {
        points.push({ ...start });
      }
    }
  });
  return points;
};

const convexHull = (points) => {
  if (points.length < 3) return points;
  const pts = [...points]
    .map((p) => ({ x: p.x, y: p.y }))
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  pts.forEach((p) => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  });
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
};

export const buildOffsetPath = (d, offset) => {
  const segments = parsePath(d);
  const points = [];
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };

  segments.forEach((seg) => {
    const { cmd, values } = seg;
    if (cmd === "M") {
      current = { x: values[0], y: values[1] };
      start = { ...current };
      points.push({ ...current });
      return;
    }
    if (cmd === "L" || cmd === "T") {
      current = { x: values[0], y: values[1] };
      points.push({ ...current });
      return;
    }
    if (cmd === "H") {
      current = { x: values[0], y: current.y };
      points.push({ ...current });
      return;
    }
    if (cmd === "V") {
      current = { x: current.x, y: values[0] };
      points.push({ ...current });
      return;
    }
    if (cmd === "C") {
      current = { x: values[4], y: values[5] };
      points.push({ ...current });
      return;
    }
    if (cmd === "S" || cmd === "Q") {
      current = { x: values[2], y: values[3] };
      points.push({ ...current });
      return;
    }
    if (cmd === "A") {
      current = { x: values[5], y: values[6] };
      points.push({ ...current });
      return;
    }
    if (cmd === "Z") {
      if (points.length && (current.x !== start.x || current.y !== start.y)) {
        points.push({ ...start });
      }
    }
  });

  if (points.length < 3) return "";
  const deduped = [];
  points.forEach((p) => {
    const last = deduped[deduped.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) deduped.push(p);
  });
  if (deduped.length > 1) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (first.x === last.x && first.y === last.y) {
      deduped.pop();
    }
  }
  if (deduped.length < 3) return "";
  const cleaned = [];
  for (let i = 0; i < deduped.length; i += 1) {
    const prev = deduped[(i - 1 + deduped.length) % deduped.length];
    const curr = deduped[i];
    const next = deduped[(i + 1) % deduped.length];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const cross = v1x * v2y - v1y * v2x;
    if (Math.abs(cross) > 1e-6) cleaned.push(curr);
  }
  if (cleaned.length < 3) return "";
  const offsetPts = offsetPolygonPoints(cleaned, offset);
  return pointsToPath(offsetPts, true);
};

export const buildUnionOutlinePath = (groups, offset) => {
  if (!groups?.length) return "";
  const polygons = [];
  groups.forEach((group) => {
    group.paths.forEach((p) => {
      const offsetPath = buildOffsetPath(p.d, offset);
      if (!offsetPath) return;
      const pts = getPathVertices(offsetPath);
      if (pts.length < 3) return;
      const ring = [];
      pts.forEach((pt) => {
        const last = ring[ring.length - 1];
        if (!last || last[0] !== pt.x || last[1] !== pt.y) {
          ring.push([pt.x, pt.y]);
        }
      });
      if (ring.length > 2) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] === last[0] && first[1] === last[1]) {
          ring.pop();
        }
      }
      if (ring.length >= 3) {
        polygons.push([ring]);
      }
    });
  });
  if (!polygons.length) return "";

  const ringArea = (ring) => {
    let area = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      area += x1 * y2 - x2 * y1;
    }
    return area / 2;
  };
  const simplifyRing = (ring) => {
    if (!ring || ring.length < 4) return ring;
    const minLen = Math.max(0.25, Math.abs(offset) * 0.1);
    const cleaned = [];
    for (let i = 0; i < ring.length; i += 1) {
      const [x, y] = ring[i];
      const last = cleaned[cleaned.length - 1];
      if (!last || Math.hypot(x - last[0], y - last[1]) >= minLen) {
        cleaned.push([x, y]);
      }
    }
    if (cleaned.length < 4) return cleaned;
    const simplified = [];
    for (let i = 0; i < cleaned.length; i += 1) {
      const prev = cleaned[(i - 1 + cleaned.length) % cleaned.length];
      const curr = cleaned[i];
      const next = cleaned[(i + 1) % cleaned.length];
      const v1x = curr[0] - prev[0];
      const v1y = curr[1] - prev[1];
      const v2x = next[0] - curr[0];
      const v2y = next[1] - curr[1];
      const l1 = Math.hypot(v1x, v1y);
      const l2 = Math.hypot(v2x, v2y);
      if (l1 < minLen * 1.5 && l2 < minLen * 1.5) continue;
      const cross = v1x * v2y - v1y * v2x;
      const dot = v1x * v2x + v1y * v2y;
      if (Math.abs(cross) < 1e-6 && dot > 0) continue;
      simplified.push(curr);
    }
    return simplified.length >= 3 ? simplified : cleaned;
  };
  const simplifyRdp = (points, epsilon) => {
    if (!points || points.length < 4) return points;
    const distToSegment = (p, a, b) => {
      const vx = b[0] - a[0];
      const vy = b[1] - a[1];
      const wx = p[0] - a[0];
      const wy = p[1] - a[1];
      const c1 = vx * wx + vy * wy;
      if (c1 <= 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
      const c2 = vx * vx + vy * vy;
      if (c2 <= c1) return Math.hypot(p[0] - b[0], p[1] - b[1]);
      const t = c1 / c2;
      const px = a[0] + t * vx;
      const py = a[1] + t * vy;
      return Math.hypot(p[0] - px, p[1] - py);
    };
    const rdp = (pts) => {
      if (pts.length < 3) return pts;
      let maxDist = 0;
      let idx = -1;
      const start = pts[0];
      const end = pts[pts.length - 1];
      for (let i = 1; i < pts.length - 1; i += 1) {
        const d = distToSegment(pts[i], start, end);
        if (d > maxDist) {
          maxDist = d;
          idx = i;
        }
      }
      if (maxDist > epsilon && idx !== -1) {
        const left = rdp(pts.slice(0, idx + 1));
        const right = rdp(pts.slice(idx));
        return left.slice(0, -1).concat(right);
      }
      return [start, end];
    };
    const closed = points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1];
    const pts = closed ? points.slice(0, -1) : points.slice();
    const simplified = rdp(pts);
    return closed ? simplified.concat([simplified[0]]) : simplified;
  };

  try {
    const unioned = polygonClipping.union(...polygons);
    if (!unioned?.length) return "";
    let bestRing = null;
    let bestArea = -Infinity;
    unioned.forEach((poly) => {
      if (!poly?.length) return;
      const outer = poly[0];
      if (!outer || outer.length < 3) return;
      const area = Math.abs(ringArea(outer));
      if (area > bestArea) {
        bestArea = area;
        bestRing = outer;
      }
    });
    if (!bestRing) return "";
    const cleanedRing = simplifyRing(bestRing);
    const rdpRing = simplifyRdp(cleanedRing, Math.max(0.5, Math.abs(offset) * 0.2));
    const pts = rdpRing.map(([x, y]) => ({ x, y }));
    return pointsToPath(pts, true);
  } catch (err) {
    console.warn("outline union failed:", err);
    return "";
  }
};


export const parseTransformOps = (transform) => {
  if (!transform) return [];
  const ops = [];
  const regex = /(translate|scale|rotate)\(([^)]*)\)/g;
  let match;
  while ((match = regex.exec(transform))) {
    const name = match[1];
    const values = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    ops.push({ name, values });
  }
  return ops;
};

export const normalizeStroke = (stroke) => {
  if (!stroke) return "#444";
  const s = String(stroke).trim().toLowerCase();
  if (s === "#fff" || s === "#ffffff" || s === "white") return "#444";
  return stroke;
};

export const applyTransformOps = (pt, ops) => {
  let x = pt.x;
  let y = pt.y;
  for (let i = ops.length - 1; i >= 0; i -= 1) {
    const { name, values } = ops[i];
    if (name === "translate") {
      const tx = values[0] || 0;
      const ty = values[1] || 0;
      x += tx;
      y += ty;
    } else if (name === "scale") {
      const sx = values[0] ?? 1;
      const sy = values[1] ?? sx;
      x *= sx;
      y *= sy;
    } else if (name === "rotate") {
      const ang = (values[0] || 0) * (Math.PI / 180);
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const xr = x * cosA - y * sinA;
      const yr = x * sinA + y * cosA;
      x = xr;
      y = yr;
    }
  }
  return { x, y };
};

export const getPathPoints = (segments) => {
  const points = [];
  segments.forEach((seg) => {
    const { cmd, values } = seg;
    switch (cmd) {
      case "M":
      case "L":
      case "T":
        points.push({ x: values[0], y: values[1] });
        break;
      case "H":
        points.push({ x: values[0], y: 0 });
        break;
      case "V":
        points.push({ x: 0, y: values[0] });
        break;
      case "C":
        points.push(
          { x: values[0], y: values[1] },
          { x: values[2], y: values[3] },
          { x: values[4], y: values[5] }
        );
        break;
      case "S":
      case "Q":
        points.push(
          { x: values[0], y: values[1] },
          { x: values[2], y: values[3] }
        );
        break;
      case "A":
        points.push({ x: values[5], y: values[6] });
        break;
      default:
        break;
    }
  });
  return points;
};

export const computePathBounds = (d, transformOps = []) => {
  const segments = parsePath(d);
  const points = getPathPoints(segments);
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    const pt = transformOps.length ? applyTransformOps(p, transformOps) : p;
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  });
  return { minX, minY, maxX, maxY };
};

export const formatNumber = (n) => {
  const rounded = Number.isFinite(n) ? Number(n.toFixed(4)) : 0;
  return `${rounded}`;
};

export const buildPath = (segments) =>
  segments
    .map(({ cmd, values }) =>
      values.length ? `${cmd} ${values.map(formatNumber).join(" ")}` : cmd
    )
    .join(" ");

export const applyResizePoint = (pt, centerX, centerY, deltaX, deltaY, ruleX, ruleZ, invertZ = false) => {
  let x = pt.x;
  let y = pt.y;
  if (ruleX?.type === "full") {
    const multiplier = ruleX.deltaMultiplier || 1;
    const v = deltaX * (ruleX.deltaMultiplier ? multiplier : 0);
    x = ruleX.direction === "left" ? x - v : x + v;
  } else {
    const deltaHalf = deltaX / 2;
    x = x > centerX ? x + deltaHalf : x - deltaHalf;
  }

  if (ruleZ?.type === "pivot") {
    const v =
      deltaY * (ruleZ.deltaMultiplier ? ruleZ.deltaMultiplier : 0) +
      (ruleZ.extent ? ruleZ.extent : 0);
    if (invertZ) {
      if (y <= centerY) y -= v;
    } else if (y >= centerY) {
      y += v;
    }
  }
  return { x, y };
};

export const transformPath = (
  d,
  { transformOps, centerX, centerY, deltaX, deltaY, ruleX, ruleZ, invertZ }
) => {
  const segments = parsePath(d);
  let current = { x: 0, y: 0 };

  const mapPoint = (x, y) => {
    const global = applyTransformOps({ x, y }, transformOps);
    return applyResizePoint(global, centerX, centerY, deltaX, deltaY, ruleX, ruleZ, invertZ);
  };

  const nextSegments = [];

  segments.forEach((seg) => {
    const { cmd, values } = seg;
    if (cmd === "M") {
      const p = mapPoint(values[0], values[1]);
      nextSegments.push({ cmd: "M", values: [p.x, p.y] });
      current = { x: values[0], y: values[1] };
      return;
    }
    if (cmd === "L") {
      const p = mapPoint(values[0], values[1]);
      nextSegments.push({ cmd: "L", values: [p.x, p.y] });
      current = { x: values[0], y: values[1] };
      return;
    }
    if (cmd === "H") {
      const p = mapPoint(values[0], current.y);
      nextSegments.push({ cmd: "L", values: [p.x, p.y] });
      current = { x: values[0], y: current.y };
      return;
    }
    if (cmd === "V") {
      const p = mapPoint(current.x, values[0]);
      nextSegments.push({ cmd: "L", values: [p.x, p.y] });
      current = { x: current.x, y: values[0] };
      return;
    }
    if (cmd === "C") {
      const p1 = mapPoint(values[0], values[1]);
      const p2 = mapPoint(values[2], values[3]);
      const p3 = mapPoint(values[4], values[5]);
      nextSegments.push({ cmd: "C", values: [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y] });
      current = { x: values[4], y: values[5] };
      return;
    }
    if (cmd === "S") {
      const p1 = mapPoint(values[0], values[1]);
      const p2 = mapPoint(values[2], values[3]);
      nextSegments.push({ cmd: "S", values: [p1.x, p1.y, p2.x, p2.y] });
      current = { x: values[2], y: values[3] };
      return;
    }
    if (cmd === "Q") {
      const p1 = mapPoint(values[0], values[1]);
      const p2 = mapPoint(values[2], values[3]);
      nextSegments.push({ cmd: "Q", values: [p1.x, p1.y, p2.x, p2.y] });
      current = { x: values[2], y: values[3] };
      return;
    }
    if (cmd === "T") {
      const p = mapPoint(values[0], values[1]);
      nextSegments.push({ cmd: "T", values: [p.x, p.y] });
      current = { x: values[0], y: values[1] };
      return;
    }
    if (cmd === "A") {
      const p = mapPoint(values[5], values[6]);
      nextSegments.push({
        cmd: "A",
        values: [values[0], values[1], values[2], values[3], values[4], p.x, p.y],
      });
      current = { x: values[5], y: values[6] };
      return;
    }
    nextSegments.push(seg);
  });

  return buildPath(nextSegments);
};

export const transformPathWithAdjust = (
  d,
  { transformOps, centerX, centerY, deltaX, deltaY, ruleX, ruleZ, invertZ },
  adjustPoint
) => {
  const segments = parsePath(d);
  let current = { x: 0, y: 0 };

  const mapPoint = (x, y) => {
    const global = applyTransformOps({ x, y }, transformOps);
    const resized = applyResizePoint(
      global,
      centerX,
      centerY,
      deltaX,
      deltaY,
      ruleX,
      ruleZ,
      invertZ
    );
    return adjustPoint ? adjustPoint(resized) : resized;
  };

  const nextSegments = [];

  segments.forEach((seg) => {
    const { cmd, values } = seg;
    if (cmd === "M") {
      const p = mapPoint(values[0], values[1]);
      nextSegments.push({ cmd: "M", values: [p.x, p.y] });
      current = { x: values[0], y: values[1] };
      return;
    }
    if (cmd === "L") {
      const p = mapPoint(values[0], values[1]);
      nextSegments.push({ cmd: "L", values: [p.x, p.y] });
      current = { x: values[0], y: values[1] };
      return;
    }
    if (cmd === "H") {
      const p = mapPoint(values[0], current.y);
      nextSegments.push({ cmd: "L", values: [p.x, p.y] });
      current = { x: values[0], y: current.y };
      return;
    }
    if (cmd === "V") {
      const p = mapPoint(current.x, values[0]);
      nextSegments.push({ cmd: "L", values: [p.x, p.y] });
      current = { x: current.x, y: values[0] };
      return;
    }
    if (cmd === "C") {
      const p1 = mapPoint(values[0], values[1]);
      const p2 = mapPoint(values[2], values[3]);
      const p3 = mapPoint(values[4], values[5]);
      nextSegments.push({ cmd: "C", values: [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y] });
      current = { x: values[4], y: values[5] };
      return;
    }
    if (cmd === "S") {
      const p1 = mapPoint(values[0], values[1]);
      const p2 = mapPoint(values[2], values[3]);
      nextSegments.push({ cmd: "S", values: [p1.x, p1.y, p2.x, p2.y] });
      current = { x: values[2], y: values[3] };
      return;
    }
    if (cmd === "Q") {
      const p1 = mapPoint(values[0], values[1]);
      const p2 = mapPoint(values[2], values[3]);
      nextSegments.push({ cmd: "Q", values: [p1.x, p1.y, p2.x, p2.y] });
      current = { x: values[2], y: values[3] };
      return;
    }
    if (cmd === "T") {
      const p = mapPoint(values[0], values[1]);
      nextSegments.push({ cmd: "T", values: [p.x, p.y] });
      current = { x: values[0], y: values[1] };
      return;
    }
    if (cmd === "A") {
      const p = mapPoint(values[5], values[6]);
      nextSegments.push({
        cmd: "A",
        values: [values[0], values[1], values[2], values[3], values[4], p.x, p.y],
      });
      current = { x: values[5], y: values[6] };
      return;
    }
    nextSegments.push(seg);
  });

  return buildPath(nextSegments);
};

export const translatePath = (d, dx, dy) => {
  const segments = parsePath(d);
  segments.forEach((seg) => {
    const { cmd, values } = seg;
    if (!values.length) return;
    if (cmd === "H") {
      values[0] += dx;
      return;
    }
    if (cmd === "V") {
      values[0] += dy;
      return;
    }
    if (cmd === "A") {
      values[5] += dx;
      values[6] += dy;
      return;
    }
    for (let i = 0; i < values.length; i += 2) {
      values[i] += dx;
      values[i + 1] += dy;
    }
  });
  return buildPath(segments);
};

export const scalePath = (d, sx, sy, pivotX, pivotY) => {
  const segments = parsePath(d);
  segments.forEach((seg) => {
    const { cmd, values } = seg;
    if (!values.length) return;
    if (cmd === "H") {
      values[0] = pivotX + (values[0] - pivotX) * sx;
      return;
    }
    if (cmd === "V") {
      values[0] = pivotY + (values[0] - pivotY) * sy;
      return;
    }
    if (cmd === "A") {
      values[5] = pivotX + (values[5] - pivotX) * sx;
      values[6] = pivotY + (values[6] - pivotY) * sy;
      return;
    }
    for (let i = 0; i < values.length; i += 2) {
      values[i] = pivotX + (values[i] - pivotX) * sx;
      values[i + 1] = pivotY + (values[i + 1] - pivotY) * sy;
    }
  });
  return buildPath(segments);
};

export const computeGroupBounds = (paths) =>
  paths.reduce(
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
