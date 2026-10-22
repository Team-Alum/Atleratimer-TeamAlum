import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split the heavy third-party libraries into their own chunks.
        //
        // Two benefits:
        //  - app-code deploys do not invalidate the vendor cache
        //  - the Supabase SDK (by far the largest dependency) can be fetched
        //    on demand, so guests who never sign in never download it
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules[\\/](@supabase|@realtime-js|ws)[\\/]/.test(id)) return 'supabase'
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
          if (/node_modules[\\/]lucide-react[\\/]/.test(id)) return 'icons'
          return undefined
        },
      },
    },
  },
})
