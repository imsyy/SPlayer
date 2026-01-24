import { DialogApi, LoadingBarApi, MessageApi, ModalApi, NotificationApi } from "naive-ui";

declare global {
  interface Window {
    // naiveui
    $message: MessageApi;
    $dialog: DialogApi;
    $notification: NotificationApi;
    $loadingBar: LoadingBarApi;
    $modal: ModalApi;
    // electron
    api: {
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: unknown) => Promise<boolean>;
        has: (key: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        reset: (keys?: string[]) => Promise<boolean>;
        export: (data: any) => Promise<boolean>;
        import: () => Promise<any>;
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
