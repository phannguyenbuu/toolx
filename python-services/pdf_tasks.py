"""
Background PDF Generation Tasks
"""

import os
import time
import json
from typing import List, Dict, Any
from task_manager import task_manager
from processor import generate_pdf_multipage, UPLOADS_DIR


OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_pdf_task(
    task_id: str,
    input_paths: List[str],
    pages_meta: List[Dict],
    plan_items: List[Dict],
    page_w: float,
    page_h: float,
    item_w: float,
    item_h: float,
    dpi: int,
    fit_mode: str,
    color_mode: str,
    total_sheets: int,
    use_crop: bool = False,
    crop_len: float = 10,
    crop_dist: float = 10,
    crop_thick: float = 0.5,
    crop_color: str = '#000000',
    auto_rotate: bool = False,
    info_text: str = '',
    process_mode: str = 'raster',
    shape: str = 'rect',
    use_page_crop: bool = False,
    page_crop_len: float = 10,
    page_crop_dist: float = 10,
    page_crop_thick: float = 0.5,
    page_crop_color: str = '#000000',
    is_2sided: bool = False,
    rot_180_front: bool = False,
    rot_180_back: bool = False,
    data_mode: int = 1,
    x_up_qty: int = 1,
    standard_qty: int = 1
) -> Dict[str, Any]:
    """
    Background task for PDF generation
    Returns dict with file_path and file_size
    """
    try:
        task_manager.update_progress(task_id, 10, "Đang xử lý ảnh...")
        
        pdf_bytes = generate_pdf_multipage(
            input_paths=input_paths,
            pages_meta=pages_meta,
            plan_items=plan_items,
            page_w=page_w,
            page_h=page_h,
            item_w=item_w,
            item_h=item_h,
            dpi=dpi,
            fit_mode=fit_mode,
            color_mode=color_mode,
            use_crop=use_crop,
            crop_len=crop_len,
            crop_dist=crop_dist,
            crop_thick=crop_thick,
            crop_color=crop_color,
            auto_rotate=auto_rotate,
            info_text=info_text,
            process_mode=process_mode,
            shape=shape,
            use_page_crop=use_page_crop,
            page_crop_len=page_crop_len,
            page_crop_dist=page_crop_dist,
            page_crop_thick=page_crop_thick,
            page_crop_color=page_crop_color,
            is_2sided=is_2sided,
            rot_180_front=rot_180_front,
            rot_180_back=rot_180_back,
            data_mode=data_mode,
            x_up_qty=x_up_qty,
            standard_qty=standard_qty,
            total_sheets=total_sheets
        )
        
        task_manager.update_progress(task_id, 90, "Đang lưu PDF...")
        
        output_filename = f"print_layout_{task_id[:8]}_{int(time.time())}.pdf"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)
        
        for path in input_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
        
        task_manager.update_progress(task_id, 100, "Hoàn thành!")
        
        return {
            "file_path": output_path,
            "file_name": output_filename,
            "file_size": len(pdf_bytes),
            "total_sheets": total_sheets
        }
        
    except Exception as e:
        for path in input_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
        raise e


def start_pdf_generation(
    input_paths: List[str],
    pages_meta: List[Dict],
    plan_items: List[Dict],
    page_w: float,
    page_h: float,
    item_w: float,
    item_h: float,
    dpi: int,
    fit_mode: str,
    color_mode: str,
    total_sheets: int,
    **kwargs
) -> str:
    """
    Start async PDF generation task
    Returns task_id for polling
    """
    task = task_manager.create_task("pdf_generation")
    
    task_manager.run_async(
        task,
        generate_pdf_task,
        input_paths=input_paths,
        pages_meta=pages_meta,
        plan_items=plan_items,
        page_w=page_w,
        page_h=page_h,
        item_w=item_w,
        item_h=item_h,
        dpi=dpi,
        fit_mode=fit_mode,
        color_mode=color_mode,
        total_sheets=total_sheets,
        **kwargs
    )
    
    return task.id
