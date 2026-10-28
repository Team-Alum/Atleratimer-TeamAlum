import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.YOUTUBE_API_KEY && !process.env.YOUTUBE_API_KEY) {
    process.env.YOUTUBE_API_KEY = env.YOUTUBE_API_KEY
  }

  return {
    plugins: [
      react(),
      {
        name: 'local-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url.startsWith('/api/youtube-search') || req.url.startsWith('/api/analytics'))) {
              try {
                const apiModule = req.url.startsWith('/api/analytics')
                  ? '/api/analytics.js'
                  : '/api/youtube-search.js'
                const { default: handler } = await server.ssrLoadModule(apiModule)
                const parsedUrl = new URL(req.url, 'http://localhost')
                req.query = Object.fromEntries(parsedUrl.searchParams.entries())

                const mockRes = {
                  setHeader(k, v) {
                    res.setHeader(k, v)
                    return this
                  },
                  status(code) {
                    res.statusCode = code
                    return this
                  },
                  json(data) {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(data))
                    return this
                  },
                  end() {
                    res.end()
                    return this
                  },
                }

                await handler(req, mockRes)
                return
              } catch (err) {
                console.error('Local API proxy error:', err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'internal_error', message: err.message }))
                return
              }
            }
            next()
          })
        },
      },
    ],
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
  }
})
