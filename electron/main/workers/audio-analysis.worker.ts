import { createRequire } from "node:module";
import { parentPort } from "node:worker_threads";

type AnalyzeRequest = {
  type: "analyze";
  filePath: string;
  maxTime: number;
  nativeModulePath: string;
};

type AnalyzeHeadRequest = {
  type: "analyzeHead";
  filePath: string;
  maxTime: number;
  nativeModulePath: string;
};

type SuggestTransitionRequest = {
  type: "suggestTransition";
  currentPath: string;
  nextPath: string;
  nativeModulePath: string;
};

type SuggestLongMixRequest = {
  type: "suggestLongMix";
  currentPath: string;
  nextPath: string;
  nativeModulePath: string;
};

type WorkerRequest =
  | AnalyzeRequest
  | AnalyzeHeadRequest
  | SuggestTransitionRequest
  | SuggestLongMixRequest;

type AnalyzeResponse = { ok: true; result: unknown } | { ok: false; error: string };

const requireNative = createRequire(import.meta.url);

let cachedNativeModulePath: string | null = null;
let cachedTools: {
  analyzeAudioFile?: (filePath: string, maxTime: number) => unknown;
  analyzeAudioFileHead?: (filePath: string, maxTime: number) => unknown;
  suggestTransition?: (currentPath: string, nextPath: string) => unknown;
  suggestLongMix?: (currentPath: string, nextPath: string) => unknown;
} | null = null;
let cachedToolsError: string | null = null;

const getTools = (nativeModulePath: string) => {
  if (cachedNativeModulePath === nativeModulePath) {
    return { tools: cachedTools, error: cachedToolsError };
  }

  try {
    cachedNativeModulePath = nativeModulePath;
    cachedTools = requireNative(nativeModulePath) as typeof cachedTools;
    cachedToolsError = null;
    return { tools: cachedTools, error: null };
  } catch (e) {
    cachedNativeModulePath = nativeModulePath;
    cachedTools = null;
    cachedToolsError = e instanceof Error ? e.message : String(e);
    return { tools: null, error: cachedToolsError };
  }
};

const port = parentPort;
if (!port) throw new Error("WORKER_PARENT_PORT_MISSING");

port.on("message", (msg: WorkerRequest) => {
  try {
    const { tools, error } = getTools(msg.nativeModulePath);
    if (!tools) {
      port.postMessage({
        ok: false,
        error: error ? `NATIVE_TOOLS_NOT_AVAILABLE:${error}` : "NATIVE_TOOLS_NOT_AVAILABLE",
      } satisfies AnalyzeResponse);
      return;
    }

    let result: unknown;
    if (msg.type === "analyze") {
      if (typeof tools.analyzeAudioFile !== "function") {
        port.postMessage({ ok: false, error: "NATIVE_EXPORT_MISSING:analyzeAudioFile" });
        return;
      }
      result = tools.analyzeAudioFile(msg.filePath, msg.maxTime);
    } else if (msg.type === "analyzeHead") {
      if (typeof tools.analyzeAudioFileHead !== "function") {
        port.postMessage({ ok: false, error: "NATIVE_EXPORT_MISSING:analyzeAudioFileHead" });
        return;
      }
      result = tools.analyzeAudioFileHead(msg.filePath, msg.maxTime);
    } else if (msg.type === "suggestTransition") {
      if (typeof tools.suggestTransition !== "function") {
        port.postMessage({ ok: false, error: "NATIVE_EXPORT_MISSING:suggestTransition" });
        return;
      }
      result = tools.suggestTransition(msg.currentPath, msg.nextPath);
    } else if (msg.type === "suggestLongMix") {
      if (typeof tools.suggestLongMix !== "function") {
        port.postMessage({ ok: false, error: "NATIVE_EXPORT_MISSING:suggestLongMix" });
        return;
      }
      result = tools.suggestLongMix(msg.currentPath, msg.nextPath);
    }

    if (result == null) {
      const resp: AnalyzeResponse = { ok: false, error: "ANALYZE_RETURNED_NULL" };
      port.postMessage(resp);
      return;
    }
    const resp: AnalyzeResponse = { ok: true, result };
    port.postMessage(resp);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const resp: AnalyzeResponse = { ok: false, error };
    port.postMessage(resp);
  }
});
