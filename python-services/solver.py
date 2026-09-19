"""
Layout Solver - Tính toán các phương án xếp hình
Ported from PHP SolverV10
"""

import hashlib
import json
from typing import List, Dict, Any, Optional

# Priority constants
P_STRAIGHT = 1
P_ROTATED = 2
P_MIXED = 3
P_STAGGERED = 4


class LayoutSolver:
    def __init__(
        self,
        item_w: float,
        item_h: float,
        padding: float,
        print_w: float,
        print_h: float,
        page_w: float,
        page_h: float,
        shape: str = 'rect'
    ):
        self.iW = item_w + padding
        self.iH = item_h + padding
        self.padding = padding
        self.print_w = print_w
        self.print_h = print_h
        self.page_w = page_w
        self.page_h = page_h
        self.shape = shape

    def _fill(self, x: float, y: float, w: float, h: float, rot: bool) -> List[Dict]:
        """Fill a rectangular area with items"""
        iW = self.iH if rot else self.iW
        iH = self.iW if rot else self.iH
        
        if iW > w or iH > h:
            return []
        
        cols = int(w // iW)
        rows = int(h // iH)
        items = []
        
        for r in range(rows):
            for c in range(cols):
                items.append({
                    'x': x + (c * iW),
                    'y': y + (r * iH),
                    'w': iW,
                    'h': iH,
                    'rot': rot
                })
        
        return items

    def _fill_staggered(self) -> List[Dict]:
        """Fill with staggered (honeycomb) pattern for circles"""
        D = self.iW
        row_h = D * 0.866025  # sqrt(3)/2
        items = []
        y = 0
        r = 0
        
        while (y + D) <= self.print_h:
            off_x = 0 if (r % 2 == 0) else (D / 2)
            x = off_x
            
            while (x + D) <= self.print_w:
                items.append({
                    'x': x,
                    'y': y,
                    'w': D,
                    'h': D,
                    'rot': False
                })
                x += D
            
            y += row_h
            r += 1
        
        return items

    def _center(self, items: List[Dict]) -> List[Dict]:
        """Center items on the page"""
        if not items:
            return items
        
        min_x = min(it['x'] for it in items)
        min_y = min(it['y'] for it in items)
        max_x = max(it['x'] + it['w'] for it in items)
        max_y = max(it['y'] + it['h'] for it in items)
        
        t_x = (self.page_w - (max_x - min_x)) / 2
        t_y = (self.page_h - (max_y - min_y)) / 2
        
        for it in items:
            it['x'] = (it['x'] - min_x) + t_x
            it['y'] = (it['y'] - min_y) + t_y
        
        return items

    def _fill_hexagon_honeycomb(self) -> List[Dict]:
        """Fill with honeycomb pattern for hexagons (Pointy Top)"""
        items = []
        # Vertical distance between row centers = H * 0.75 (Pointy Top)
        # Using iH * 0.75 distributes padding proportionally
        row_h = self.iH * 0.75
        
        y = 0
        r = 0
        
        while y + self.iH <= self.print_h:
            off_x = 0 if r % 2 == 0 else self.iW * 0.5
            x = off_x
            
            while x + self.iW <= self.print_w:
                items.append({
                    'x': x,
                    'y': y,
                    'w': self.iW,
                    'h': self.iH,
                    'rot': False
                })
                x += self.iW
            
            y += row_h
            r += 1
            
        return items

    def _fill_triangle_alternating(self) -> List[Dict]:
        """Fill with alternating pattern for triangles"""
        items = []
        # Safe Mode: No overlap bounding box
        step_x = self.iW
        
        y = 0
        while y + self.iH <= self.print_h:
            x = 0
            c = 0
            while x + self.iW <= self.print_w:
                is_flipped = (c % 2 != 0)
                items.append({
                    'x': x,
                    'y': y,
                    'w': self.iW,
                    'h': self.iH,
                    'rot': is_flipped # Rotated means Point Down
                })
                x += step_x
                c += 1
            y += self.iH
            
        return items

    def _fill_trapezoid_alternating(self) -> List[Dict]:
        """Fill with alternating pattern for trapezoids"""
        items = []
        top_ratio = 0.7
        # Calculate dimensions based on item (excluding padding for geometry)
        # But iW includes padding. 
        # JS: const narrowW = (iW - padding) * topRatio + padding? No.
        # JS: const narrowW = config.itemW * topRatio.
        # JS: const offset = (config.itemW - narrowW) / 2.
        # JS: const stepX = narrowW + offset + config.padding.
        
        item_w_real = self.iW - self.padding
        narrow_w = item_w_real * top_ratio
        offset = (item_w_real - narrow_w) / 2
        step_x = narrow_w + offset + self.padding
        
        y = 0
        while y + self.iH <= self.print_h:
            x = 0
            c = 0
            while x + self.iW <= self.print_w:
                is_flipped = (c % 2 != 0)
                
                # Flipped item needs adjustment in X to align slope?
                # JS logic: simple stepX.
                
                items.append({
                    'x': x,
                    'y': y,
                    'w': self.iW,
                    'h': self.iH,
                    'rot': is_flipped
                })
                x += step_x
                c += 1
            y += self.iH
            
        return items

    def solve(self) -> List[Dict[str, Any]]:
        """Calculate all layout plans"""
        plans = []
        is_square = (self.iW == self.iH)
        
        # Special shapes logic
        if self.shape == 'hexagon':
            plans.append({
                'name': 'Tổ ong (Lục giác)',
                'priority': P_STAGGERED,
                'items': self._fill_hexagon_honeycomb()
            })
            # Fallback to straight grid if desired
            plans.append({
                'name': 'Thẳng (Grid)',
                'priority': P_STRAIGHT,
                'items': self._fill(0, 0, self.print_w, self.print_h, False)
            })
            
        elif self.shape == 'triangle':
            plans.append({
                'name': 'Xen kẽ (Đảo chiều)',
                'priority': P_STAGGERED,
                'items': self._fill_triangle_alternating()
            })
            plans.append({
                'name': 'Thẳng (Grid)',
                'priority': P_STRAIGHT,
                'items': self._fill(0, 0, self.print_w, self.print_h, False)
            })
            
        elif self.shape == 'trapezoid':
            plans.append({
                'name': 'Xen kẽ (Đảo chiều)',
                'priority': P_STAGGERED,
                'items': self._fill_trapezoid_alternating()
            })
            plans.append({
                'name': 'Thẳng (Grid)',
                'priority': P_STRAIGHT,
                'items': self._fill(0, 0, self.print_w, self.print_h, False)
            })
            
        elif self.shape == 'circle':
            # Circle logic
            plans.append({
                'name': 'Tổ ong (So le)',
                'priority': P_STAGGERED,
                'items': self._fill_staggered()
            })
            plans.append({
                'name': 'Thẳng (Grid)',
                'priority': P_STRAIGHT,
                'items': self._fill(0, 0, self.print_w, self.print_h, False)
            })
            
        else:
            # Rect/Oval logic
            # Plan 1: Straight grid
            plans.append({
                'name': 'Thẳng (Grid)',
                'priority': P_STRAIGHT,
                'items': self._fill(0, 0, self.print_w, self.print_h, False)
            })
            
            # Plan 2: Rotated (only for non-circle, non-square)
            if self.shape != 'circle' and not is_square:
                plans.append({
                    'name': 'Xoay Ngang',
                    'priority': P_ROTATED,
                    'items': self._fill(0, 0, self.print_w, self.print_h, True)
                })
            
            # Mixed plans (only for non-circle, non-square)
            if self.shape != 'circle' and not is_square:
                # Vertical cuts
                max_cols = int(self.print_w // self.iW)
                for i in range(1, max_cols + 1):
                    w1 = i * self.iW
                    w2 = self.print_w - w1
                    if w2 < self.iH:
                        continue
                    
                    items = self._fill(0, 0, w1, self.print_h, False)
                    items.extend(self._fill(w1, 0, w2, self.print_h, True))
                    
                    plans.append({
                        'name': f'Cắt Dọc ({i} cột thẳng)',
                        'priority': P_MIXED,
                        'items': items
                    })
                
                # Horizontal cuts
                max_rows = int(self.print_h // self.iH)
                for i in range(1, max_rows + 1):
                    h1 = i * self.iH
                    h2 = self.print_h - h1
                    if h2 < self.iW:
                        continue
                    
                    items = self._fill(0, 0, self.print_w, h1, False)
                    items.extend(self._fill(0, h1, self.print_w, h2, True))
                    
                    plans.append({
                        'name': f'Cắt Ngang ({i} dòng thẳng)',
                        'priority': P_MIXED,
                        'items': items
                    })
        
        # Calculate quantities and center items
        for p in plans:
            p['qty'] = len(p['items'])
            p['items'] = self._center(p['items'])
        
        # Sort by quantity (desc), then priority (asc)
        plans.sort(key=lambda x: (-x['qty'], x['priority']))
        
        # Remove duplicates
        unique = []
        seen_hashes = set()
        
        for p in plans:
            h = hashlib.md5(json.dumps(p['items'], sort_keys=True).encode()).hexdigest()
            if h not in seen_hashes:
                seen_hashes.add(h)
                unique.append(p)
        
        return unique[:6]  # Return top 6 plans


def calculate_layout(
    shape: str,
    item_w: float,
    item_h: float,
    padding: float,
    print_w: float,
    print_h: float,
    page_w: float,
    page_h: float
) -> List[Dict[str, Any]]:
    """
    Main function to calculate layout plans
    
    Args:
        shape: 'rect', 'circle', or 'oval'
        item_w: Item width in mm
        item_h: Item height in mm
        padding: Gap between items in mm
        print_w: Printable area width in mm
        print_h: Printable area height in mm
        page_w: Page width in mm
        page_h: Page height in mm
    
    Returns:
        List of layout plans with items positioned
    """
    if shape == 'circle':
        item_h = item_w  # Circle has equal dimensions
    
    solver = LayoutSolver(
        item_w=item_w,
        item_h=item_h,
        padding=padding,
        print_w=print_w,
        print_h=print_h,
        page_w=page_w,
        page_h=page_h,
        shape=shape
    )
    
    return solver.solve()
