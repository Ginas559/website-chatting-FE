import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

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
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/user': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
})