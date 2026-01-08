import { DialogApi, LoadingBarApi, MessageApi, ModalApi, NotificationApi } from "naive-ui";

import type { DiscordConfigPayload } from "@discord-rpc";
import type {
  MetadataParam,
  PlayModePayload,
  PlayStatePayload,
  SmtcEvent,
  TimelinePayload,
} from "@native";

export { DiscordConfigPayload };

export interface DiscordMetadataParam {
  songName: string;
  authorName: string;
  albumName: string;
  originalCoverUrl?: string;
  duration?: number;
  ncmId?: number;
}

export interface DiscordPlayStateParam {
  status: "Playing" | "Paused";
}

export interface DiscordTimelineParam {
  currentTime: number;
  totalTime: number;
}

export interface MprisMetadataParam {
  title?: string;
  artist?: string;
  album?: string;
  length?: number; // milliseconds
  url?: string;
}

export interface MprisPlayStateParam {
  status: "Playing" | "Paused" | "Stopped";
}

export interface MprisTimelineParam {
  position: number; // milliseconds
  length: number; // milliseconds
}

export interface MprisLoopStatusParam {
  status: "None" | "Track" | "Playlist";
}

export interface MprisShuffleParam {
  shuffle: boolean;
}

export interface MprisVolumeParam {
  volume: number; // 0.0 - 1.0
}

export interface IpcChannelMap {
  "smtc-update-metadata": MetadataParam;
  "smtc-update-play-state": PlayStatePayload;
  "smtc-update-timeline": TimelinePayload;
  "smtc-update-play-mode": PlayModePayload;
  "discord-enable": void;
  "discord-disable": void;
  "discord-update-config": DiscordConfigPayload;
  "discord-update-metadata": DiscordMetadataParam;
  "discord-update-play-state": DiscordPlayStateParam;
  "discord-update-timeline": DiscordTimelineParam;
  "mpris-update-metadata": MprisMetadataParam;
  "mpris-update-play-state": MprisPlayStateParam;
  "mpris-update-timeline": MprisTimelineParam;
  "mpris-update-loop-status": MprisLoopStatusParam;
  "mpris-update-shuffle": MprisShuffleParam;
  "mpris-update-volume": MprisVolumeParam;
}

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
    };
    electron: {
      ipcRenderer: {
        send<K extends keyof IpcChannelMap>(channel: K, payload: IpcChannelMap[K]): void;

        on(
          channel: "smtc-event",
          listener: (event: Electron.IpcRendererEvent, payload: SmtcEvent) => void,
        ): void;

        // TODO: 这些类型定义不怎么安全
        send(channel: string, ...args: any[]): void;
        on(
          channel: string,
          listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
        ): void;
        once(
          channel: string,
          listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
        ): void;
        invoke(channel: string, ...args: any[]): Promise<any>;
        removeAllListeners(channel: string): void;
        sendSync(channel: string, ...args: any[]): any;
      };
    };
  }
}
