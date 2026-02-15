// 头部信息的索引位置 (Int32Array)
const HEADER_SIZE = 16; // 4个 Int32 (16 bytes)
const IDX_WRITE = 0; // 写指针
const IDX_READ = 1; // 读指针
const IDX_EOF = 2; // 结束标记
const IDX_NOTIFY_COUNT = 3; // 通知计数器

export class SharedRingBuffer {
  private header: Int32Array;
  private buffer: Uint8Array;
  private capacity: number;
  private sab: SharedArrayBuffer;
  private writeGen = 0;

  constructor(sab: SharedArrayBuffer) {
    this.sab = sab;
    this.capacity = sab.byteLength - HEADER_SIZE;
    this.header = new Int32Array(sab, 0, HEADER_SIZE / 4);
    this.buffer = new Uint8Array(sab, HEADER_SIZE, this.capacity);
  }

  /**
   * 创建一个新的 SAB 并初始化
   * @param size 缓冲区大小 (bytes)
   */
  static create(size: number) {
    const sab = new SharedArrayBuffer(size + HEADER_SIZE);
    return new SharedRingBuffer(sab);
  }

  get sharedArrayBuffer(): SharedArrayBuffer {
    return this.sab;
  }

  /**
   * 写入数据 chunks
   */
  async write(chunk: Uint8Array) {
    const myGen = this.writeGen;
    let offset = 0;
    let left = chunk.length;

    while (left > 0) {
      if (this.writeGen !== myGen) {
        // console.warn("Zombie write detected and dropped.");
        return;
      }
      const writePos = Atomics.load(this.header, IDX_WRITE);
      const readPos = Atomics.load(this.header, IDX_READ);

      // 计算可用空间
      let available = 0;
      if (writePos >= readPos) {
        //  保留 1 字节 gap
        available = this.capacity - writePos + readPos - 1;
      } else {
        available = readPos - writePos - 1;
      }

      if (available === 0) {
        // 缓冲区满了，等待 10ms 再重试
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }

      const toWrite = Math.min(left, available);

      // 执行环形写入
      const endSpace = this.capacity - writePos;
      const len1 = Math.min(toWrite, endSpace);

      this.buffer.set(chunk.subarray(offset, offset + len1), writePos);

      if (len1 < toWrite) {
        // 需要回绕到开头继续写
        this.buffer.set(chunk.subarray(offset + len1, offset + toWrite), 0);
        Atomics.store(this.header, IDX_WRITE, toWrite - len1);
      } else {
        Atomics.store(this.header, IDX_WRITE, writePos + len1);
      }

      offset += toWrite;
      left -= toWrite;

      // 先修改计数器，再通知，这样能保证 wait 能够感知到变化
      Atomics.add(this.header, IDX_NOTIFY_COUNT, 1);
      Atomics.notify(this.header, IDX_NOTIFY_COUNT, 1);
    }
  }

  setEOF() {
    Atomics.store(this.header, IDX_EOF, 1);
    Atomics.add(this.header, IDX_NOTIFY_COUNT, 1);
    Atomics.notify(this.header, IDX_NOTIFY_COUNT, 1);
  }

  reset() {
    this.writeGen++;
    Atomics.store(this.header, IDX_WRITE, 0);
    Atomics.store(this.header, IDX_READ, 0);
    Atomics.store(this.header, IDX_EOF, 0);
    Atomics.store(this.header, IDX_NOTIFY_COUNT, 0);
  }

  /**
   * 阻塞式读取，直接写入 WASM 内存
   * @param wasmHeapU8 WASM 的 HEAPU8 视图
   * @param destPtr WASM 内存目标地址
   * @param size 请求读取的字节数
   * @returns 实际读取的字节数 (0 表示 EOF)
   */
  blockingRead(wasmHeapU8: Uint8Array, destPtr: number, size: number): number {
    if (size === 0) return 0;

    let totalRead = 0;

    while (totalRead < size) {
      const beforeNotifyState = Atomics.load(this.header, IDX_NOTIFY_COUNT);
      const writePos = Atomics.load(this.header, IDX_WRITE);
      const readPos = Atomics.load(this.header, IDX_READ);
      const isEOF = Atomics.load(this.header, IDX_EOF);

      if (readPos === writePos) {
        if (isEOF) {
          return totalRead;
        }

        Atomics.wait(this.header, IDX_NOTIFY_COUNT, beforeNotifyState, 500);
        continue;
      }

      let available = 0;
      if (writePos > readPos) {
        available = writePos - readPos;
      } else {
        available = this.capacity - readPos + writePos;
      }

      const needed = size - totalRead;
      const toRead = Math.min(available, needed);

      const endSpace = this.capacity - readPos;
      const len1 = Math.min(toRead, endSpace);

      wasmHeapU8.set(this.buffer.subarray(readPos, readPos + len1), destPtr + totalRead);

      if (len1 < toRead) {
        const len2 = toRead - len1;
        wasmHeapU8.set(this.buffer.subarray(0, len2), destPtr + totalRead + len1);
        Atomics.store(this.header, IDX_READ, len2);
      } else {
        Atomics.store(this.header, IDX_READ, readPos + len1);
      }

      totalRead += toRead;
    }

    return totalRead;
  }
}
