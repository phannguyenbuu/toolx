"""
Background Task Manager using Python Threading
Replaces Celery+Redis for simpler deployment in Replit
"""

import os
import uuid
import time
import threading
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from enum import Enum


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class Task:
    def __init__(self, task_id: str, task_type: str):
        self.id = task_id
        self.task_type = task_type
        self.status = TaskStatus.PENDING
        self.progress = 0
        self.message = ""
        self.result = None
        self.error = None
        self.created_at = datetime.now()
        self.started_at = None
        self.completed_at = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "task_type": self.task_type,
            "status": self.status.value,
            "progress": self.progress,
            "message": self.message,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class TaskManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init()
        return cls._instance
    
    def _init(self):
        self.tasks: Dict[str, Task] = {}
        self.max_workers = 4
        self.active_workers = 0
        self.worker_lock = threading.Lock()
        self.cleanup_interval = 3600
        self.task_ttl = 7200
        
        cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        cleanup_thread.start()
    
    def create_task(self, task_type: str) -> Task:
        task_id = str(uuid.uuid4())
        task = Task(task_id, task_type)
        self.tasks[task_id] = task
        return task
    
    def get_task(self, task_id: str) -> Optional[Task]:
        return self.tasks.get(task_id)
    
    def update_progress(self, task_id: str, progress: int, message: str = ""):
        task = self.tasks.get(task_id)
        if task:
            task.progress = progress
            task.message = message
    
    def run_async(self, task: Task, func: Callable, *args, **kwargs):
        def worker():
            try:
                with self.worker_lock:
                    self.active_workers += 1
                
                task.status = TaskStatus.RUNNING
                task.started_at = datetime.now()
                
                result = func(task.id, *args, **kwargs)
                
                task.status = TaskStatus.SUCCESS
                task.progress = 100
                task.result = result
                task.completed_at = datetime.now()
                
            except Exception as e:
                task.status = TaskStatus.FAILED
                task.error = str(e)
                task.completed_at = datetime.now()
                print(f"[TaskManager] Task {task.id} failed: {e}")
                
            finally:
                with self.worker_lock:
                    self.active_workers -= 1
        
        thread = threading.Thread(target=worker, daemon=True)
        thread.start()
        return task.id
    
    def _cleanup_loop(self):
        while True:
            time.sleep(self.cleanup_interval)
            self._cleanup_old_tasks()
    
    def _cleanup_old_tasks(self):
        now = datetime.now()
        expired = []
        for task_id, task in self.tasks.items():
            if task.completed_at:
                age = (now - task.completed_at).total_seconds()
                if age > self.task_ttl:
                    expired.append(task_id)
        
        for task_id in expired:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                if task.result and isinstance(task.result, dict):
                    file_path = task.result.get("file_path")
                    if file_path and os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                        except:
                            pass
                del self.tasks[task_id]
        
        if expired:
            print(f"[TaskManager] Cleaned up {len(expired)} expired tasks")


task_manager = TaskManager()
