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
        self.item_w = item_w
        self.item_h = item_w if shape == 'circle' else item_h
        self.padding = padding
        self.step_w = self.item_w + padding
        self.step_h = self.item_h + padding
        self.print_w = print_w
        self.print_h = print_h
        self.page_w = page_w
        self.page_h = page_h
        self.shape = shape

    def _fill(self, x: float, y: float, w: float, h: float, rot: bool) -> List[Dict]:
        """Fill a rectangular area with items"""
        slot_w = self.item_h if rot else self.item_w
        slot_h = self.item_w if rot else self.item_h
        
        if slot_w > w or slot_h > h:
            return []
        
        step_x = slot_w + self.padding
        step_y = slot_h + self.padding
        cols = int((w + self.padding) // step_x)
        rows = int((h + self.padding) // step_y)
        items = []
        
        for r in range(rows):
            for c in range(cols):
                items.append({
                    'x': x + (c * step_x),
                    'y': y + (r * step_y),
                    'w': slot_w,
                    'h': slot_h,
                    'rot': rot
                })
        
        return items

    def _fill_staggered(self) -> List[Dict]:
        """Fill with staggered (honeycomb) pattern for circles"""
        D = self.item_w
        step_x = D + self.padding
        row_h = step_x * 0.866025  # sqrt(3)/2
        items = []
        y = 0
        r = 0
        
        while (y + D) <= self.print_h:
            off_x = 0 if (r % 2 == 0) else (step_x / 2)
            x = off_x
            
            while (x + D) <= self.print_w:
                items.append({
                    'x': x,
                    'y': y,
                    'w': D,
                    'h': D,
                    'rot': False
                })
                x += step_x
            
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
        step_x = self.item_w + self.padding
        step_h = self.item_h + self.padding
        row_h = step_h * 0.75
        
        y = 0
        r = 0
        
        while y + self.item_h <= self.print_h:
            off_x = 0 if r % 2 == 0 else step_x * 0.5
            x = off_x
            
            while x + self.item_w <= self.print_w:
                items.append({
                    'x': x,
                    'y': y,
                    'w': self.item_w,
                    'h': self.item_h,
                    'rot': False
                })
                x += step_x
            
            y += row_h
            r += 1
            
        return items

    def _fill_triangle_alternating(self) -> List[Dict]:
        """Fill with alternating pattern for triangles"""
        items = []
        step_x = (self.item_w + self.padding) * 0.5
        step_y = self.item_h + self.padding
        
        y = 0
        while y + self.item_h <= self.print_h:
            x = 0
            c = 0
            while x + self.item_w <= self.print_w:
                is_flipped = (c % 2 != 0)
                items.append({
                    'x': x,
                    'y': y,
                    'w': self.item_w,
                    'h': self.item_h,
                    'rot': is_flipped # Rotated means Point Down
                })
                x += step_x
                c += 1
            y += step_y
            
        return items

    def _fill_trapezoid_alternating(self) -> List[Dict]:
        """Fill with alternating pattern for trapezoids"""
        items = []
        step_x = self.item_w + self.padding
        step_y = self.item_h + self.padding
        
        y = 0
        while y + self.item_h <= self.print_h:
            x = 0
            c = 0
            while x + self.item_w <= self.print_w:
                is_flipped = (c % 2 != 0)
                items.append({
                    'x': x,
                    'y': y,
                    'w': self.item_w,
                    'h': self.item_h,
                    'rot': is_flipped
                })
                x += step_x
                c += 1
            y += step_y
            
        return items

    def solve(self) -> List[Dict[str, Any]]:
        """Calculate all layout plans"""
        plans = []
        is_square = (self.item_w == self.item_h)
        
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
                step_x = self.item_w + self.padding
                max_cols = int((self.print_w + self.padding) // step_x)
                for i in range(1, max_cols + 1):
                    w1 = i * step_x
                    w2 = self.print_w - w1
                    if w2 < self.item_h:
                        continue
                    
                    items = self._fill(0, 0, w1 - self.padding, self.print_h, False)
                    items.extend(self._fill(w1, 0, w2, self.print_h, True))
                    
                    plans.append({
                        'name': f'Cắt Dọc ({i} cột thẳng)',
                        'priority': P_MIXED,
                        'items': items
                    })
                
                # Horizontal cuts
                step_y = self.item_h + self.padding
                max_rows = int((self.print_h + self.padding) // step_y)
                for i in range(1, max_rows + 1):
                    h1 = i * step_y
                    h2 = self.print_h - h1
                    if h2 < self.item_w:
                        continue
                    
                    items = self._fill(0, 0, self.print_w, h1 - self.padding, False)
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
