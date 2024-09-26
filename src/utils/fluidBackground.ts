import type { RGB } from "@/types/main";

// 配置选项
interface FluidBackgroundType {
  canvas: HTMLCanvasElement;
  colors?: RGB[];
  totalParticles?: number;
  maxRadius?: number;
  minRadius?: number;
  speed?: number;
}

// App 类，负责管理整个画布和动画的主逻辑
export class FluidBackground {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixelRatio: number;
  private colors: RGB[];
  private totalParticles: number;
  private maxRadius: number;
  private minRadius: number;
  private speed: number;
  private particles: GlowParticle[];
  private stageWidth!: number;
  private stageHeight!: number;

  constructor({
    canvas,
    colors,
    totalParticles,
    maxRadius,
    minRadius,
    speed,
  }: FluidBackgroundType) {
    // 使用传入的 canvas 元素
    this.canvas = canvas;

    // 获取 2D 绘图上下文
    this.ctx = this.canvas.getContext("2d")!;

    // 根据设备像素比设置比例，处理高清屏幕的显示问题
    this.pixelRatio = window.devicePixelRatio > 1 ? 2 : 1;

    // 设置颜色数组，粒子的颜色将从这个数组中选择
    this.colors = colors || [
      { r: 45, g: 74, b: 227 },
      { r: 250, g: 255, b: 89 },
      { r: 255, g: 104, b: 248 },
      { r: 44, g: 209, b: 252 },
      { r: 54, g: 233, b: 84 },
    ];

    // 设置色块球的数量，默认值为 15
    this.totalParticles = totalParticles || 15;

    // 设置色块球的最大和最小半径，默认值分别为 200 和 150
    this.maxRadius = maxRadius || 200;
    this.minRadius = minRadius || 150;

    // 设置色块球的运动速度，默认值为 2
    this.speed = speed || 2;

    // 保存色块球的数组
    this.particles = [];

    // 监听窗口大小变化，调整画布尺寸
    window.addEventListener("resize", this.resize.bind(this), false);

    // 初始化画布大小和色块球
    this.resize();

    // 启动动画
    this.animate();
  }

  // 处理画布大小调整的方法
  private resize() {
    // 获取当前窗口的宽度和高度
    this.stageWidth = window.innerWidth;
    this.stageHeight = window.innerHeight;

    // 设置画布的宽度和高度，并根据设备像素比进行缩放
    this.canvas.width = this.stageWidth * this.pixelRatio;
    this.canvas.height = this.stageHeight * this.pixelRatio;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);

    // 设置混合模式，使色块球重叠时产生更丰富的颜色效果
    this.ctx.globalCompositeOperation = "saturation";

    // 创建色块球
    this.createParticles();
  }

  // 创建色块球的逻辑
  private createParticles() {
    let curColor = 0;
    this.particles = []; // 清空粒子数组
    for (let i = 0; i < this.totalParticles; i++) {
      // 随机生成色块球的初始位置和半径
      this.particles.push(
        new GlowParticle(
          Math.random() * this.stageWidth, // 随机生成 X 位置
          Math.random() * this.stageHeight, // 随机生成 Y 位置
          Math.random() * (this.maxRadius - this.minRadius) + this.minRadius, // 随机生成半径
          this.colors[curColor % this.colors.length], // 循环选择颜色
          this.speed, // 传递速度
        ),
      );
      curColor++; // 颜色索引递增
    }
  }

  // 动画帧渲染方法
  private animate() {
    // 使用 requestAnimationFrame 来创建动画循环
    window.requestAnimationFrame(this.animate.bind(this));

    // 清除画布上的内容
    this.ctx.clearRect(0, 0, this.stageWidth, this.stageHeight);

    // 遍历每个色块球并调用其 animate 方法进行绘制和更新位置
    for (let i = 0; i < this.totalParticles; i++) {
      const item = this.particles[i];
      item.animate(this.ctx, this.stageWidth, this.stageHeight);
    }
  }
}

// GlowParticle 类，表示单个色块球
class GlowParticle {
  private x: number;
  private y: number;
  private radius: number;
  private rgb: RGB;
  private vx: number;
  private vy: number;
  private sinValue: number;

  constructor(x: number, y: number, radius: number, rgb: RGB, speed: number) {
    this.x = x; // 初始 X 位置
    this.y = y; // 初始 Y 位置
    this.radius = radius; // 半径
    this.rgb = rgb; // 颜色对象 {r, g, b}
    this.vx = Math.random() * speed; // 随机生成 X 方向的速度
    this.vy = Math.random() * speed; // 随机生成 Y 方向的速度
    this.sinValue = Math.random(); // 用于控制半径变化的正弦值
  }

  // 动画方法，更新位置和绘制色块球
  animate(ctx: CanvasRenderingContext2D, stageWidth: number, stageHeight: number) {
    // 更新正弦值，使色块球的半径产生波动效果
    this.sinValue += 0.01;
    this.radius += Math.sin(this.sinValue); // 半径在正弦波动下变化

    // 更新 X 和 Y 位置
    this.x += this.vx;
    this.y += this.vy;

    // 边界检测，如果超出画布边界则反向运动
    if (this.x < -10 || this.x > stageWidth + 10) {
      this.vx *= -1;
    }
    if (this.y < -10 || this.y > stageHeight + 10) {
      this.vy *= -1;
    }

    // 开始绘制色块球
    ctx.beginPath();

    // 创建径向渐变，用于色块球的颜色过渡效果
    const g = ctx.createRadialGradient(
      this.x,
      this.y,
      this.radius * 0.01, // 渐变起始半径
      this.x,
      this.y,
      this.radius, // 渐变结束半径
    );

    // 定义渐变颜色的起始点和结束点
    g.addColorStop(0, `rgba(${this.rgb.r},${this.rgb.g},${this.rgb.b},1)`);
    g.addColorStop(1, `rgba(${this.rgb.r},${this.rgb.g},${this.rgb.b},0)`);

    // 设置填充样式为渐变
    ctx.fillStyle = g;

    // 画一个圆，表示色块球
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);

    // 填充圆形
    ctx.fill();
  }
}

export default FluidBackground;
