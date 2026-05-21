import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const backendTarget = 'http://localhost:8080'

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
      '/admin': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/moderator': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
})