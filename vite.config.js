import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/setupTests.js',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('lucide-react') || id.includes('framer-motion')) {
              return 'vendor'
            }

            if (id.includes('@supabase/supabase-js')) {
              return 'supabase'
            }

            return 'vendor'
          }
        },
      },
    },
  },
})