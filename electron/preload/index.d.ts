import { ElectronAPI } from "@electron-toolkit/preload";
import type { StoreType } from "../main/store";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      store: {
        get<K extends keyof StoreType>(key: K): Promise<StoreType[K]>;
        set<K extends keyof StoreType>(key: K, value: StoreType[K]): Promise<boolean>;
        has(key: keyof StoreType): Promise<boolean>;
        delete(key: keyof StoreType): Promise<boolean>;
        reset(keys?: (keyof StoreType)[]): Promise<boolean>;
        export(data: any): Promise<boolean>;
        import(): Promise<boolean>;
      };
      log: {
        info(message: string, ...args: unknown[]): void;
        warn(message: string, ...args: unknown[]): void;
        error(message: string, ...args: unknown[]): void;
        debug(message: string, ...args: unknown[]): void;
      };
      googleDrive: {
        login: () => Promise<{ status: string; message?: string }>;
        getStatus: () => Promise<{ authenticated: boolean; hasRefreshToken: boolean }>;
        getFiles: (pageSize?: number) => Promise<{ status: string; message?: string; files: any[] }>;
        logout: () => Promise<{ status: string; message?: string }>;
        scanAudio: (pageSize?: number) => Promise<{ status: string; message?: string; files: any[] }>;
        getStreamInfo: (fileId: string) => Promise<{ status: string; message?: string; info?: { url: string; headers: Record<string, string> } }>;
        downloadFile: (fileId: string, destPath: string) => Promise<{ status: string; message?: string }>;
      };
    };
  }
}
