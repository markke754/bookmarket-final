<template>
  <div class="hero-section">
    <canvas ref="particleCanvas" class="particles-canvas"></canvas>
    <div class="hero-content">
      <h1>探索知识的殿堂</h1>
      <p>找到您喜爱的图书，开启阅读之旅</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useThemeStore } from '../stores/theme';

const particleCanvas = ref(null);
const themeStore = useThemeStore();

let canvas, ctx;
let particles = [];
let animationFrameId;
let mouseX = 0;
let mouseY = 0;

// 定义不同主题的颜色配置
const themeColors = {
  light: {
    particles: ['#4facfe', '#00f2fe', '#fa709a', '#fee140', '#43e97b', '#38f9d7'],
    background: 'rgba(240, 249, 255, 0.1)',
    glow: 'rgba(64, 158, 255, 0.15)'
  },
  dark: {
    particles: ['#9c27b0', '#7b1fa2', '#2196f3', '#03a9f4', '#673ab7', '#5e35b1'],
    background: 'rgba(30, 33, 58, 0.1)',
    glow: 'rgba(106, 90, 205, 0.15)'
  }
};

// 粒子类
class Particle {
  constructor(x, y, colors) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.size = Math.random() * 3 + 1;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.vx = Math.random() * 2 - 1;
    this.vy = Math.random() * 2 - 1;
    this.force = 0;
    this.angle = 0;
    this.distance = 0;
    this.friction = Math.random() * 0.03 + 0.92;
    this.ease = Math.random() * 0.1 + 0.01;
    // 添加浮动效果相关属性
    this.floatAngle = Math.random() * Math.PI * 2;
    this.floatSpeed = Math.random() * 0.001 + 0.001;
    this.floatRange = Math.random() * 30 + 10;
  }

  update(mouseX, mouseY) {
    this.distance = Math.sqrt(
      Math.pow(this.x - mouseX, 2) + Math.pow(this.y - mouseY, 2)
    );
    
    // 更新浮动角度
    this.floatAngle += this.floatSpeed;
    
    // 计算浮动偏移量
    const floatOffsetX = Math.sin(this.floatAngle) * this.floatRange * 0.3;
    const floatOffsetY = Math.cos(this.floatAngle * 0.5) * this.floatRange * 0.2;
    
    // 鼠标引力场效果
    if (this.distance < 120) {
      this.force = (120 - this.distance) / 120;
      this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
      this.vx += this.force * Math.cos(this.angle) * 0.2;
      this.vy += this.force * Math.sin(this.angle) * 0.2;
    }
    
    // 回归原始位置（考虑浮动偏移）
    const dx = (this.originX + floatOffsetX) - this.x;
    const dy = (this.originY + floatOffsetY) - this.y;
    this.vx += dx * this.ease;
    this.vy += dy * this.ease;
    
    // 应用摩擦力
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    // 更新位置
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx, glow) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    // 添加光晕效果
    if (this.distance < 120) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * (1 + this.force * 2), 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }
  }
}

// 初始化粒子
function initParticles() {
  canvas = particleCanvas.value;
  ctx = canvas.getContext('2d');
  
  // 设置canvas尺寸
  const resizeCanvas = () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    createParticles();
  };
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // 全局鼠标移动事件，即使鼠标不在canvas上也能追踪
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    // 存储全局鼠标位置，用于计算边缘流光效果
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  
  // 触摸事件
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      mouseY = e.touches[0].clientY - rect.top;
      e.preventDefault();
    }
  });
  
  // 开始动画循环
  animate();
  
  return () => {
    window.removeEventListener('resize', resizeCanvas);
    window.removeEventListener('mousemove', null);
    canvas.removeEventListener('touchmove', null);
    cancelAnimationFrame(animationFrameId);
  };
}

// 创建粒子
function createParticles() {
  particles = [];
  const currentTheme = themeStore.theme;
  const colors = themeColors[currentTheme].particles;
  // 增加粒子密度，但限制最大数量
  const numParticles = Math.min(Math.max(canvas.width * canvas.height / 6000, 50), 200);
  
  for (let i = 0; i < numParticles; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    particles.push(new Particle(x, y, colors));
  }
}

// 动画循环
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const currentTheme = themeStore.theme;
  const backgroundColor = themeColors[currentTheme].background;
  const glowColor = themeColors[currentTheme].glow;
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 更新并绘制所有粒子
  particles.forEach(particle => {
    particle.update(mouseX, mouseY);
    particle.draw(ctx, glowColor);
  });
  
  // 绘制粒子间的连接线
  connectParticles(glowColor);
}

// 连接临近粒子
function connectParticles(color) {
  // 减少连接计算量，不是每个粒子都需要连接
  const checkFrequency = particles.length > 100 ? 2 : 1;
  
  for (let i = 0; i < particles.length; i += checkFrequency) {
    for (let j = i + 1; j < particles.length; j += checkFrequency) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 增大连接距离但减小线的透明度
      if (distance < 120) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.4;
        ctx.globalAlpha = 0.8 * (1 - (distance / 120));
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
}

// 监听主题变化
watch(() => themeStore.theme, () => {
  if (particles.length > 0) {
    createParticles();
  }
});

onMounted(() => {
  const cleanup = initParticles();
  
  onUnmounted(() => {
    if (cleanup) cleanup();
    cancelAnimationFrame(animationFrameId);
  });
});
</script>

<style scoped>
.hero-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  padding: 40px 0;
  margin-bottom: 60px;
  position: relative;
  overflow: hidden;
}

.hero-content {
  width: 50%;
  padding: 40px;
  z-index: 2;
  position: relative;
  animation: fadeIn 1.5s ease-out;
  background-color: transparent !important;
  box-shadow: none !important;
  border: none !important;
}

.hero-content h1 {
  font-size: 3.2rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--text-primary);
  animation: fadeInUp 1s ease-out;
  text-shadow: 0 0 15px rgba(0, 0, 0, 0.2), 0 0 5px rgba(0, 0, 0, 0.1);
}

.hero-content p {
  font-size: 1.3rem;
  margin-bottom: 30px;
  color: var(--text-secondary);
  animation: fadeInUp 1.2s ease-out;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.2), 0 0 3px rgba(0, 0, 0, 0.1);
}

.particles-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    min-height: auto;
    padding: 40px 0;
  }
  
  .hero-content {
    width: 90%;
    padding: 30px;
    text-align: center;
    margin-bottom: 20px;
  }
  
  .particles-canvas {
    width: 100%;
    height: 100%;
  }
}
</style>