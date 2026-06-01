import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const backendTarget = 'http://localhost:8088'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ 
      presets: [reactCompilerPreset()] 
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/user': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/admin/profile': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/admin/users': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/moderator/profile': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
})
