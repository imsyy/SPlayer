class MusicFrequency {
  /**
   * 创建一个 MusicFrequency 实例。
   * @param {HTMLCanvasElement} canvas - 要绘制频谱的画布元素。
   * @param {HTMLAudioElement} audio - 要播放并可视化的音频元素。
   * @param {number} [width=null] - 画布的宽度，默认为页面宽度的 1600 分之一或当前窗口的宽度（取较小值）。
   * @param {number} [height=null] - 画布的高度，默认为 200。
   * @param {Array<Array<number|string>>} [color=null] - 渐变的颜色数组，每个元素是一个长度为 2 的数组，表示颜色的位置和颜色值，默认为从白色到白色的渐变。
   * @param {number} [lineWidth=null] - 线条宽度，默认为画布宽度的 360 分之一的 1.6 倍。
   * @param {number} [vHight=null] - 纵向缩放比例，默认为 2。
   */
  // 构造函数，接受画布、音频和其他可选参数
  constructor(
    canvas,
    audio,
    width = null,
    height = null,
    color = null,
    lineWidth = null,
    vHight = null
  ) {
    this.canvas = canvas;
    // 设置画布宽高
    this.canvas.width =
      width || document.body.clientWidth >= 1600
        ? 1600
        : document.body.clientWidth;
    this.canvas.height = height || 200;
    // 存储音频和其他参数
    this.audio = audio;
    this.color = color;
    this.vHight = vHight || 2;
    // 计算线条宽度
    this.lineWidth = lineWidth || this.canvas.width / 360 / 1.6;
    // 获取画布上下文
    this.ctx = this.canvas.getContext("2d");
    // 创建渐变
    this.createGradient();
    // 创建输出缓冲区
    this.output = new Uint8Array(360);
    // 暂停和播放方法的重写
    this.audio._play = this.audio.play;
    this.audio.play = () => {
      this.context.resume();
      this.audio._play();
    };
    this.audio._pause = this.audio.pause;
    this.audio.pause = () => {
      this.context.suspend();
      this.audio._pause();
    };
    // 创建音频上下文和分析器
    this.createContext();
  }
  // 创建渐变
  createGradient() {
    this.grd = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    // 如果未传入颜色，则使用默认的白色
    this.color = this.color || [
      [0, "white"],
      [1, "white"],
    ];
    // 添加颜色停止
    this.color.forEach((v) => {
      this.grd.addColorStop(v[0], v[1]);
    });
  }
  // 创建音频上下文和分析器
  createContext() {
    // 创建音频上下文
    let AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext();
    // 创建媒体源和分析器
    this.source = this.context.createMediaElementSource(this.audio);
    this.analyser = this.context.createAnalyser();
    // 连接媒体源和分析器
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }
  // 断开音频元素和分析器之间的连接，释放音频上下文
  disconnect() {
    // 断开连接
    this.source.disconnect();
    this.analyser.disconnect();
    // 关闭音频上下文
    this.context.close();
  }
  // 绘制频谱
  drawSpectrum() {
    // 获取频域数据
    this.analyser.getByteFrequencyData(this.output);
    // 清除画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // 绘制每个频率的柱形
    for (let i = 0; i < 360; i++) {
      let value = this.output[i] / this.vHight;
      let x = i * 5;
      // 如果x小于画布宽度，绘制柱形
      if (x <= this.canvas.width) {
        this.ctx.strokeStyle = this.grd;
        this.ctx.beginPath();
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.moveTo(x, this.canvas.height);
        this.ctx.lineTo(x, this.canvas.height - value);
        this.ctx.stroke();
      }
    }

    //请求下一帧
    requestAnimationFrame(() => {
      this.drawSpectrum();
    });
  }
}

export default MusicFrequency;
