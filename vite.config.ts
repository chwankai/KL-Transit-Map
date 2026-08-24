import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function devTranslationsSaver() {
  return {
    name: 'dev-translations-saver',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.method === 'POST' && req.url === '/__dev/save-translations') {
          let body = ''
          req.on('data', (chunk: any) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              if (data && data.code) {
                const targetPath = path.resolve(__dirname, 'src/lib/translations.ts')
                fs.writeFileSync(targetPath, data.code, 'utf-8')
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, message: 'Successfully updated src/lib/translations.ts' }))
                return
              }
              res.statusCode = 400
              res.end(JSON.stringify({ success: false, error: 'Missing code payload' }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devTranslationsSaver()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
