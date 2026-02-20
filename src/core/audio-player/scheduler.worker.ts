let timer: ReturnType<typeof setInterval> | null = null;

const startTick = (intervalMs: number) => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  timer = setInterval(() => {
    postMessage({ type: "TICK" });
  }, intervalMs);
};

const stopTick = () => {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
};

self.onmessage = (ev: MessageEvent) => {
  const msg = ev.data as { type?: string; intervalMs?: number } | undefined;
  if (!msg?.type) return;
  if (msg.type === "START") {
    startTick(msg.intervalMs ?? 75);
  } else if (msg.type === "STOP") {
    stopTick();
  }
};
