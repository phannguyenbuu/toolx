"""
SVG Nesting Solver using NFP (No-Fit Polygon)
Parses SVG die-cut paths, computes true contour-based nesting
"""
import math
from shapely.geometry import Polygon, MultiPolygon
from shapely.affinity import rotate, translate, scale
from shapely.ops import unary_union
from svgpathtools import parse_path, svg2paths2
from io import StringIO
import xml.etree.ElementTree as ET


def parse_svg_to_polygon(svg_text: str, num_samples=200):
    """Parse SVG text to Shapely Polygon using actual path contour"""
    root = ET.fromstring(svg_text)
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    
    # Get viewBox for coordinate space
    vb = root.get('viewBox', '0 0 100 100')
    parts = vb.replace(',', ' ').split()
    vb_w = float(parts[2]) if len(parts) > 2 else 100
    vb_h = float(parts[3]) if len(parts) > 3 else 100
    
    # Find all path elements
    paths = root.findall('.//{http://www.w3.org/2000/svg}path')
    if not paths:
        paths = root.findall('.//path')
    
    if not paths:
        return None, vb_w, vb_h
    
    # Use the longest path (main die-cut contour)
    best_path = None
    best_len = 0
    for p in paths:
        d = p.get('d', '')
        if not d:
            continue
        try:
            parsed = parse_path(d)
            length = parsed.length()
            if length > best_len:
                best_len = length
                best_path = parsed
        except:
            continue
    
    if not best_path:
        return None, vb_w, vb_h
    
    # Sample points along the path
    points = []
    for i in range(num_samples):
        t = i / num_samples
        pt = best_path.point(t)
        points.append((pt.real, pt.imag))
    
    # Close the polygon
    if points:
        points.append(points[0])
    
    try:
        poly = Polygon(points)
        if not poly.is_valid:
            poly = poly.buffer(0)  # Fix self-intersections
        if poly.is_empty:
            return None, vb_w, vb_h
        # If buffer returns MultiPolygon, take largest
        if isinstance(poly, MultiPolygon):
            poly = max(poly.geoms, key=lambda g: g.area)
        return poly, vb_w, vb_h
    except:
        return None, vb_w, vb_h


def compute_nfp(fixed: Polygon, moving: Polygon, step=0.5):
    """
    Compute No-Fit Polygon approximation using Minkowski difference.
    Returns the region where moving's reference point CAN be placed.
    """
    # NFP = Minkowski sum of fixed and (-moving)
    # For placement: moving can be placed at point P if
    # translate(moving, P) doesn't intersect fixed
    # We approximate by testing grid points
    return None  # We use direct collision instead


def nest_on_sheet(poly: Polygon, sheet_w: float, sheet_h: float,
                  item_w: float, item_h: float, padding: float,
                  rotations=None):
    """
    Nest SVG shapes on a sheet using actual polygon contour.
    Returns list of {placements, rotation} results.
    """
    if rotations is None:
        rotations = [0, 45, 90, 135, 180]
    
    # Scale polygon to item dimensions
    bounds = poly.bounds  # (minx, miny, maxx, maxy)
    poly_w = bounds[2] - bounds[0]
    poly_h = bounds[3] - bounds[1]
    
    sx = item_w / poly_w if poly_w > 0 else 1
    sy = item_h / poly_h if poly_h > 0 else 1
    
    # Normalize: move to origin and scale
    base_poly = translate(poly, -bounds[0], -bounds[1])
    base_poly = scale(base_poly, sx, sy, origin=(0, 0))
    
    # Add padding by buffering
    if padding > 0:
        padded = base_poly.buffer(padding / 2)
    else:
        padded = base_poly
    
    results = []
    
    for rot_angle in rotations:
        # Rotate around centroid
        rotated = rotate(padded, rot_angle, origin='centroid', use_radians=False)
        # Normalize to origin
        rb = rotated.bounds
        rotated = translate(rotated, -rb[0], -rb[1])
        rb = rotated.bounds
        rw = rb[2] - rb[0]
        rh = rb[3] - rb[1]
        
        if rw > sheet_w or rh > sheet_h:
            continue
        
        # Place shapes using bottom-left fill with actual polygon collision
        placed_union = Polygon()  # Union of all placed shapes
        placements = []
        
        # Adaptive step: smaller of 10% item size or 2mm
        step = max(0.3, min(rw, rh) * 0.08)
        
        y = 0.0
        while y <= sheet_h - rh + 0.01:
            x = 0.0
            while x <= sheet_w - rw + 0.01:
                candidate = translate(rotated, x, y)
                
                # Check if within sheet
                cb = candidate.bounds
                if cb[2] > sheet_w + 0.01 or cb[3] > sheet_h + 0.01:
                    x += step
                    continue
                
                # Check collision with placed shapes
                if placed_union.is_empty or not candidate.intersects(placed_union):
                    placed_union = unary_union([placed_union, candidate])
                    placements.append({'x': round(x, 2), 'y': round(y, 2), 'rotation': rot_angle})
                
                x += step
            y += step
        
        if placements:
            results.append({
                'placements': placements,
                'rotation': rot_angle,
                'count': len(placements)
            })
    
    # Yin-yang nesting: alternate normal + 180° flip
    for rot_angle in [0, 45, 90, 135]:
        poly_n = rotate(padded, rot_angle, origin='centroid')
        poly_f = rotate(padded, rot_angle + 180, origin='centroid')
        
        # Normalize both
        nb = poly_n.bounds
        poly_n = translate(poly_n, -nb[0], -nb[1])
        fb = poly_f.bounds
        poly_f = translate(poly_f, -fb[0], -fb[1])
        
        nb = poly_n.bounds
        fb = poly_f.bounds
        nw, nh = nb[2], nb[3]
        fw, fh = fb[2], fb[3]
        
        if nw > sheet_w or nh > sheet_h:
            continue
        
        placed_union = Polygon()
        placements = []
        step = max(0.3, min(nw, nh) * 0.08)
        flip_row = False
        
        y = 0.0
        while y <= sheet_h - min(nh, fh) + 0.01:
            flip_row = not flip_row
            flip_col = flip_row
            x = 0.0
            while x <= sheet_w - min(nw, fw) + 0.01:
                flip_col = not flip_col
                use_poly = poly_f if flip_col else poly_n
                candidate = translate(use_poly, x, y)
                
                cb = candidate.bounds
                if cb[2] > sheet_w + 0.01 or cb[3] > sheet_h + 0.01:
                    x += step
                    continue
                
                if placed_union.is_empty or not candidate.intersects(placed_union):
                    placed_union = unary_union([placed_union, candidate])
                    placements.append({
                        'x': round(x, 2), 'y': round(y, 2),
                        'rotation': (rot_angle + 180) if flip_col else rot_angle
                    })
                
                x += step
            y += step
        
        if placements:
            results.append({
                'placements': placements,
                'rotation': rot_angle,
                'count': len(placements),
                'yinyang': True
            })
    
    # Sort by most placements
    results.sort(key=lambda r: r['count'], reverse=True)
    return results
