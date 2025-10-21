import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    // 启用全局测试环境
    globals: true,
    // 启用DOM模拟
    environment: 'jsdom',
    // 排除测试文件
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/server/**',
      '**/public/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    // 包含测试文件
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
  }
})