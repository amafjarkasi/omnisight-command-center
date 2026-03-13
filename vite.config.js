import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-globe.gl') || id.includes('three')) {
              return 'globe';
            }
            if (id.includes('react-simple-maps') || id.includes('react-zoom-pan-pinch') || id.includes('d3-')) {
              return 'maps';
            }
            if (id.includes('lucide-react') || id.includes('recharts')) {
              return 'ui';
            }
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'vendor';
            }
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/maptoolkit-api': {
        target: 'https://api.maptoolkit.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maptoolkit-api/, '')
      }
    }
  },
  preview: {
    proxy: {
      '/maptoolkit-api': {
        target: 'https://api.maptoolkit.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maptoolkit-api/, '')
      }
    }
  }
})
