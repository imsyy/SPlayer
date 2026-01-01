/**
 * @file ipcManager.ts
 * @description 统一的 IPC 事件管理器，解决内存泄漏问题
 *
 * 主要功能：
 * 1. 自动管理 IPC 事件监听器的生命周期
 * 2. 提供统一的清理机制
 * 3. 防止监听器累积导致的内存泄漏
 */

import { onScopeDispose } from "vue";

type IPCChannel = string;
type IPCHandler = (...args: any[]) => void;

class IPCManager {
  private static instance: IPCManager;
  /** 存储所有监听器引用，用于清理 */
  private listeners: Map<IPCChannel, Set<IPCHandler>> = new Map();
  /** 存储监听器的注册信息，用于调试 */
  private listenerRegistry: Map<IPCHandler, { channel: IPCChannel; addedAt: number }> = new Map();

  private constructor() {
    // 在开发环境下监控未清理的监听器
    if (import.meta.env.DEV) {
      this.startDevMonitoring();
    }
  }

  public static getInstance(): IPCManager {
    if (!IPCManager.instance) {
      IPCManager.instance = new IPCManager();
    }
    return IPCManager.instance;
  }

  /**
   * 注册 IPC 事件监听器
   * @param channel 事件通道名称
   * @param handler 事件处理函数
   * @param autoUnmount 是否在组件卸载时自动清理（默认 true）
   * @returns 清理函数
   */
  public on(
    channel: IPCChannel,
    handler: IPCHandler,
    autoUnmount: boolean = true,
  ): () => void {
    if (!window.electron?.ipcRenderer) {
      console.warn(`[IPCManager] electron.ipcRenderer not available for channel: ${channel}`);
      return () => {};
    }

    // 注册监听器
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(handler);

    // 记录注册信息
    this.listenerRegistry.set(handler, {
      channel,
      addedAt: Date.now(),
    });

    // 添加 IPC 监听器
    window.electron.ipcRenderer.on(channel, handler as (...args: any[]) => void);

    // 返回清理函数
    const cleanup = () => this.off(channel, handler);

    // 如果是 Vue 组件，尝试在卸载时自动清理
    if (autoUnmount && typeof window !== "undefined") {
      // 延迟执行，确保在 onMounted 之后
      Promise.resolve().then(() => {
        // 尝试获取当前 Vue 组件实例
        const currentInstance = (window as any).__current_vue_instance;
        if (currentInstance && currentInstance.scope) {
          onScopeDispose(cleanup);
        }
      });
    }

    return cleanup;
  }

  /**
   * 移除指定通道的监听器
   * @param channel 事件通道名称
   * @param handler 可选，指定要移除的处理函数，如果不指定则移除该通道所有监听器
   */
  public off(channel: IPCChannel, handler?: IPCHandler): void {
    if (!window.electron?.ipcRenderer) return;

    const listeners = this.listeners.get(channel);
    if (!listeners) return;

    if (handler) {
      // 移除特定的监听器
      if (listeners.has(handler)) {
        // 使用 removeAllListeners 移除特定监听器
        window.electron.ipcRenderer.removeAllListeners(channel);
        // 重新添加其他监听器
        listeners.forEach((h) => {
          if (h !== handler) {
            window.electron.ipcRenderer.on(channel, h as (...args: any[]) => void);
          }
        });
        listeners.delete(handler);
        this.listenerRegistry.delete(handler);
      }
    } else {
      // 移除该通道的所有监听器
      window.electron.ipcRenderer.removeAllListeners(channel);
      listeners.forEach((h) => {
        this.listenerRegistry.delete(h);
      });
      this.listeners.delete(channel);
    }
  }

  /**
   * 移除所有监听器
   * 通常在应用退出或页面卸载时调用
   */
  public cleanup(): void {
    if (!window.electron?.ipcRenderer) return;

    this.listeners.forEach((handlers, channel) => {
      window.electron.ipcRenderer.removeAllListeners(channel);
      handlers.forEach((handler) => {
        this.listenerRegistry.delete(handler);
      });
    });

    this.listeners.clear();
    console.log("[IPCManager] ✅ 所有 IPC 监听器已清理");
  }

  /**
   * 获取当前监听器统计信息
   */
  public getStats(): {
    totalChannels: number;
    totalListeners: number;
    listenersByChannel: Record<string, number>;
  } {
    const listenersByChannel: Record<string, number> = {};

    this.listeners.forEach((handlers, channel) => {
      listenersByChannel[channel] = handlers.size;
    });

    return {
      totalChannels: this.listeners.size,
      totalListeners: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
      listenersByChannel,
    };
  }

  /**
   * 开发环境监控
   */
  private startDevMonitoring(): void {
    // 每 30 秒检查一次监听器数量
    setInterval(() => {
      const stats = this.getStats();
      if (stats.totalListeners > 50) {
        console.warn(
          `[IPCManager] ⚠️ 监听器数量过多: ${stats.totalListeners} 个，可能存在内存泄漏`,
          stats,
        );
      }
    }, 30000);

    // 页面卸载时检查
    window.addEventListener("beforeunload", () => {
      const stats = this.getStats();
      if (stats.totalListeners > 0) {
        console.warn(
          `[IPCManager] ⚠️ 页面卸载时仍有 ${stats.totalListeners} 个监听器未清理`,
          stats,
        );
      }
    });
  }
}

// 导出单例获取函数
export const useIPCManager = (): IPCManager => IPCManager.getInstance();

// 导出便捷的 composable 函数
export function useIPCObservable() {
  const ipcManager = useIPCManager();

  return {
    /**
     * 监听一次性事件
     */
    once: (channel: string, handler: IPCHandler) => {
      const wrappedHandler = (...args: any[]) => {
        handler(...args);
        ipcManager.off(channel, wrappedHandler);
      };
      return ipcManager.on(channel, wrappedHandler);
    },

    /**
     * 监听事件并自动处理错误
     */
    safeOn: (channel: string, handler: IPCHandler) => {
      const safeHandler = (...args: any[]) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[IPCManager] Error in handler for channel "${channel}":`, error);
        }
      };
      return ipcManager.on(channel, safeHandler);
    },
  };
}
