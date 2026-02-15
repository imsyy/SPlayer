import { toError } from "@/utils/error";
import { SharedRingBuffer } from "./SharedRingBuffer";
import createAudioDecoderCore from "./ffmpeg.js";
import type {
  AudioDecoderModule,
  AudioProperties,
  AudioStreamDecoder,
  WorkerRequest,
  WorkerResponse,
} from "./types";

const IDX_SEEK_GEN = 4; // Header(16 bytes) + 4 bytes offset

let ffmpegModulePromise: Promise<AudioDecoderModule> | null = null;

function getModule(): Promise<AudioDecoderModule> {
  if (!ffmpegModulePromise) {
    ffmpegModulePromise = createAudioDecoderCore({
      locateFile: (path: string) => (path.endsWith(".wasm") ? "/wasm/ffmpeg.wasm" : path),
      print: (text: string) => console.log("[WASM]", text),
      printErr: (text: string) => console.error("[WASM Error]", text),
    }) as Promise<AudioDecoderModule>;
  }
  return ffmpegModulePromise;
}

class DecoderSession {
  private decoder: AudioStreamDecoder | null = null;
  private mountDir: string | null = null;
  private isRunning = true;
  private isPaused = false;

  private ringBuffer: SharedRingBuffer | null = null;
  private sabHeader: Int32Array | null = null;

  constructor(
    private module: AudioDecoderModule,
    public req: WorkerRequest & { type: "INIT" | "INIT_STREAM" },
  ) {
    if (req.type === "INIT") {
      this.mountDir = `/session_${req.id}`;
      this.initFile(req.file);
    } else {
      this.initStream(req.sab, req.fileSize);
    }
  }

  private initFile(file: File) {
    if (!this.mountDir) return;
    try {
      this.module.FS.mkdir(this.mountDir);
      this.module.FS.mount(this.module.FS.filesystems.WORKERFS, { files: [file] }, this.mountDir);
    } catch (e) {
      console.warn(`[DecoderSession] Mount error: ${e}`);
    }

    const filePath = `${this.mountDir}/${file.name}`;
    this.decoder = new this.module.AudioStreamDecoder();
    const props = this.decoder.init(filePath);

    this.handleInitResult(props);
    this.decodeLoop();
  }

  private initStream(sab: SharedArrayBuffer, fileSize: number) {
    this.ringBuffer = new SharedRingBuffer(sab);
    this.sabHeader = new Int32Array(sab, 0, IDX_SEEK_GEN + 1);

    this.decoder = new this.module.AudioStreamDecoder();

    const readCallback = (ptr: number, size: number): number => {
      if (!this.ringBuffer) return -1;
      return this.ringBuffer.blockingRead(this.module.HEAPU8, ptr, size);
    };

    const seekCallback = (offset: number, whence: number): number => {
      // AVSEEK_SIZE
      if (whence === 65536) {
        return fileSize;
      }

      if (!this.sabHeader) return -1;

      let targetPos = offset;
      if (whence === 2) {
        // SEEK_END
        targetPos = fileSize + offset;
      }

      // 防止 FFmpeg 估算的 offset 超过文件实际大小导致 HTTP 416 或立即 EOF
      if (targetPos >= fileSize) {
        // 回退到文件末尾前 128KB，确保有数据可读，让 FFmpeg 能找到帧头 resync
        const SAFE_MARGIN = 128 * 1024;
        const newPos = Math.max(0, fileSize - SAFE_MARGIN);
        // console.warn(
        // 	`[Worker] Seek target ${targetPos} > fileSize ${fileSize}. Smart clamping to ${newPos}`,
        // );
        targetPos = newPos;
      }

      const currentGen = Atomics.load(this.sabHeader, IDX_SEEK_GEN);

      this.post({
        type: "SEEK_NET",
        id: this.req.id,
        seekOffset: targetPos,
      });

      Atomics.wait(this.sabHeader, IDX_SEEK_GEN, currentGen);

      return targetPos;
    };

    const props = this.decoder.initStream(readCallback, seekCallback);
    this.handleInitResult(props);
    this.decodeLoop();
  }

  private handleInitResult(props: AudioProperties) {
    if (props.status.status < 0) {
      throw new Error(`Decoder init failed: ${props.status.error}`);
    }

    const metadataObj: Record<string, string> = {};
    const keysList = props.metadata.keys();

    for (let i = 0; i < keysList.size(); i++) {
      const key = keysList.get(i);
      metadataObj[key] = props.metadata.get(key);
    }
    keysList.delete();

    let coverUrl: string | undefined;
    if (props.coverArt.size() > 0) {
      const cover = new Uint8Array(props.coverArt.size());
      for (let i = 0; i < props.coverArt.size(); i++) {
        cover[i] = props.coverArt.get(i);
      }
      coverUrl = URL.createObjectURL(new Blob([cover]));
    }

    this.post({
      type: "METADATA",
      id: this.req.id,
      sampleRate: props.sampleRate,
      channels: props.channelCount,
      duration: props.duration,
      metadata: metadataObj,
      encoding: props.encoding,
      coverUrl,
      bitsPerSample: props.bitsPerSample,
    });

    props.metadata.delete();
    props.coverArt.delete();
  }

  private decodeLoop = () => {
    if (!this.isRunning || this.isPaused || !this.decoder) return;

    try {
      const FORMAT_F32 = this.module.SampleFormat.PlanarF32;
      const result = this.decoder.readChunk(this.req.chunkSize, FORMAT_F32);

      if (result.status.status < 0) {
        // EOF
        if (result.status.status !== -541478725) {
          throw new Error(`Decode error: ${result.status.error}`);
        }
      }

      if (result.samples.length > 0) {
        const chunkData = result.samples as Float32Array;
        const copy = chunkData.slice();
        this.post(
          {
            type: "CHUNK",
            id: this.req.id,
            data: copy,
            startTime: result.startTime,
          },
          [copy.buffer],
        );
      }

      if (result.isEOF) {
        this.post({ type: "EOF", id: this.req.id });
        this.isRunning = false;
      } else {
        // 让出主线程，避免 UI 卡死
        setTimeout(this.decodeLoop, 0);
      }
    } catch (e) {
      this.handleError(e);
    }
  };

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.decodeLoop();
    }
  }

  public seek(time: number, newId: number) {
    if (!this.decoder) return;
    try {
      const result = this.decoder.seek(time);
      if (result.status < 0) throw new Error(result.error);

      this.req.id = newId;

      this.post({ type: "SEEK_DONE", id: newId, time });

      this.isRunning = true;
      this.isPaused = false;
      this.decodeLoop();
    } catch (e) {
      this.handleError(e);
    }
  }

  public setTempo(tempo: number) {
    this.decoder?.setTempo(tempo);
  }

  public setPitch(pitch: number) {
    this.decoder?.setPitch(pitch);
  }

  public destroy() {
    this.isRunning = false;

    if (this.decoder) {
      this.decoder.close();
      this.decoder.delete();
      this.decoder = null;
    }

    if (this.module && this.mountDir) {
      try {
        this.module.FS.unmount(this.mountDir);
        this.module.FS.rmdir(this.mountDir);
      } catch {
        // ignore
      }
    }

    this.ringBuffer = null;
    this.sabHeader = null;
  }

  private handleError(e: unknown) {
    const err = toError(e);
    console.error("[Worker] DecoderSession error:", err);
    this.post({
      type: "ERROR",
      id: this.req.id,
      error: err.message,
    });
    this.destroy();
  }

  private post(msg: WorkerResponse, transfer: Transferable[] = []) {
    self.postMessage(msg, transfer);
  }
}

async function handleExportWav(
  module: AudioDecoderModule,
  req: WorkerRequest & { type: "EXPORT_WAV" },
) {
  const mountDir = `/export_${req.id}`;
  let decoder: AudioStreamDecoder | null = null;

  try {
    try {
      module.FS.mkdir(mountDir);
      module.FS.mount(module.FS.filesystems.WORKERFS, { files: [req.file] }, mountDir);
    } catch {
      // 忽略目录已存在错误
    }

    decoder = new module.AudioStreamDecoder();
    const filePath = `${mountDir}/${req.file.name}`;
    const props = decoder.init(filePath);

    if (props.status.status < 0) {
      throw new Error(`Export init failed: ${props.status.error}`);
    }

    const chunks: Int16Array[] = [];
    const CHUNK_SIZE = 4096 * 16;
    const FORMAT_S16 = module.SampleFormat.InterleavedS16;

    while (true) {
      const result = decoder.readChunk(CHUNK_SIZE, FORMAT_S16);

      if (result.status.status < 0) {
        throw new Error(`Export decode error: ${result.status.error}`);
      }

      if (result.samples.length > 0) {
        chunks.push(result.samples as Int16Array);
      }

      if (result.isEOF) break;
    }

    const totalSamples = chunks.reduce((acc, curr) => acc + curr.length, 0);
    const dataByteLength = totalSamples * 2; // Int16 = 2 bytes

    const wavHeader = createWavHeader(props.sampleRate, props.channelCount, dataByteLength);

    props.metadata.delete();
    props.coverArt.delete();

    const blob = new Blob([wavHeader, ...chunks] as BlobPart[], {
      type: "audio/wav",
    });

    self.postMessage({
      type: "EXPORT_WAV_DONE",
      id: req.id,
      blob: blob,
    });
  } catch (e) {
    const err = toError(e);
    console.error("[Worker] Export WAV error:", err);
    self.postMessage({
      type: "ERROR",
      id: req.id,
      error: err.message,
    });
  } finally {
    if (decoder) {
      decoder.close();
      decoder.delete();
    }
    try {
      module.FS.unmount(mountDir);
      module.FS.rmdir(mountDir);
    } catch {
      // ignore
    }
  }
}

function createWavHeader(sampleRate: number, channels: number, dataLength: number): Uint8Array {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true); // File size - 8
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true); // ByteRate
  view.setUint16(32, channels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

let currentSession: DecoderSession | null = null;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;

  switch (req.type) {
    case "INIT":
    case "INIT_STREAM":
      currentSession?.destroy();
      currentSession = null;

      try {
        const module = await getModule();
        currentSession = new DecoderSession(module, req);
        self.postMessage({ type: "ACK", id: req.id });
      } catch (e) {
        const err = toError(e);
        console.error("[Worker] Init error:", err);
        self.postMessage({
          type: "ERROR",
          id: req.id,
          error: `Module load failed: ${err.message}`,
        });
      }
      break;

    case "PAUSE":
      if (currentSession) {
        currentSession.pause();
        self.postMessage({ type: "ACK", id: req.id });
      }
      break;

    case "RESUME":
      if (currentSession) {
        currentSession.resume();
        self.postMessage({ type: "ACK", id: req.id });
      }
      break;

    case "SEEK":
      if (currentSession) {
        currentSession.seek(req.seekTime, req.id);
      }
      break;

    case "SET_TEMPO":
      if (currentSession) {
        currentSession.setTempo(req.value);
        self.postMessage({ type: "ACK", id: req.id });
      }
      break;

    case "SET_PITCH":
      if (currentSession) {
        currentSession.setPitch(req.value);
        self.postMessage({ type: "ACK", id: req.id });
      }
      break;

    case "EXPORT_WAV":
      {
        const module = await getModule();
        handleExportWav(module, req);
      }
      break;
  }
};
