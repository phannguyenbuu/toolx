import { UtiCommandItem, ExecResult } from './types';
import { DEFAULT_TOOLX_UTICOMMANDS } from './defaultCommands';
import { executeUtiCommand } from './commandExecutor';
import { GOAGENT_DEFAULT_PORT } from '../goAgentService';
import { AgentNode } from '../agentMeshService';

const STORAGE_KEY = 'toolx_uticommands_db';

export class UtiCommandService {
  private commands: UtiCommandItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Tải danh sách commands từ LocalStorage hoặc khởi tạo từ DEFAULT
   */
  public loadFromStorage(): UtiCommandItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existing = new Set(parsed.map((c: any) => c.command));
          const missing = DEFAULT_TOOLX_UTICOMMANDS.filter((c) => !existing.has(c.command));
          if (missing.length > 0) {
            this.commands = [...missing, ...parsed];
            this.saveToStorage();
            return this.commands;
          }
          this.commands = parsed;
          return this.commands;
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc uticommands từ storage:', e);
    }

    this.commands = [...DEFAULT_TOOLX_UTICOMMANDS];
    this.saveToStorage();
    return this.commands;
  }

  /**
   * Lưu danh sách vào LocalStorage
   */
  public saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.commands));
    } catch (e) {
      console.error('Lỗi lưu uticommands vào storage:', e);
    }
  }

  /**
   * Lấy toàn bộ danh sách lệnh
   */
  public getAllCommands(): UtiCommandItem[] {
    if (this.commands.length === 0) {
      this.loadFromStorage();
    }
    return [...this.commands];
  }

  /**
   * Lấy danh sách lệnh hiển thị trên menu (is_visible === true)
   */
  public getVisibleMenuCommands(): UtiCommandItem[] {
    return this.getAllCommands().filter((c) => c.is_visible !== false);
  }

  /**
   * Lấy chi tiết một lệnh theo mã slug
   */
  public getCommand(commandSlug: string): UtiCommandItem | undefined {
    return this.getAllCommands().find((c) => c.command === commandSlug);
  }

  /**
   * Thêm mới hoặc cập nhật một UtiCommand
   */
  public upsertCommand(item: UtiCommandItem): UtiCommandItem {
    const existingIdx = this.commands.findIndex((c) => c.command === item.command);
    const now = new Date().toISOString();

    const normalizedItem: UtiCommandItem = {
      ...item,
      updated_at: now,
      created_at: item.created_at || now,
      is_visible: item.is_visible !== undefined ? item.is_visible : true,
      category: item.category || '📦 Tùy chỉnh'
    };

    if (existingIdx >= 0) {
      this.commands[existingIdx] = normalizedItem;
    } else {
      this.commands.unshift(normalizedItem);
    }

    this.saveToStorage();
    return normalizedItem;
  }

  /**
   * Xóa một UtiCommand
   */
  public deleteCommand(commandSlug: string): boolean {
    const prevLen = this.commands.length;
    this.commands = this.commands.filter((c) => c.command !== commandSlug);
    if (this.commands.length !== prevLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Bật/Tắt hiển thị của lệnh trên menu
   */
  public toggleVisibility(commandSlug: string): boolean {
    const item = this.commands.find((c) => c.command === commandSlug);
    if (item) {
      item.is_visible = !item.is_visible;
      item.updated_at = new Date().toISOString();
      this.saveToStorage();
      return item.is_visible;
    }
    return false;
  }

  /**
   * Khôi phục danh sách lệnh về mặc định
   */
  public resetToDefaults(): UtiCommandItem[] {
    this.commands = [...DEFAULT_TOOLX_UTICOMMANDS];
    this.saveToStorage();
    return this.commands;
  }

  /**
   * Thực thi code sống của một UtiCommand (Live Code Build System)
   */
  public executeCommand(
    commandOrScript: string | UtiCommandItem,
    params: Record<string, string> = {},
    engine: 'goagent' | 'server' | 'browser' = 'goagent',
    port = GOAGENT_DEFAULT_PORT,
    targetNode?: AgentNode
  ): Promise<ExecResult> {
    return executeUtiCommand(
      commandOrScript,
      params,
      engine,
      port,
      targetNode,
      (slug: string) => this.getCommand(slug)
    );
  }
}

export const utiCommandService = new UtiCommandService();
