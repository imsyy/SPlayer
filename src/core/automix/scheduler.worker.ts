let timer: ReturnType<typeof setInterval> | null = null;

/**
 * 启动定时器
 * @param intervalMs 定时器间隔（毫秒）
 */
const startTick = (intervalMs: number) => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  timer = setInterval(() => {
    postMessage({ type: "TICK" });
  }, intervalMs);
};

/**
 * 停止定时器
 */
const stopTick = () => {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
};

/**
 * 监听主线程的消息
 */
self.onmessage = (ev: MessageEvent) => {
  const msg = ev.data as { type?: string; intervalMs?: number } | undefined;
  if (!msg?.type) return;
  if (msg.type === "START") {
    startTick(msg.intervalMs ?? 75);
  } else if (msg.type === "STOP") {
    stopTick();
  }
};
