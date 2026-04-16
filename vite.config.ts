import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const VAULT_SKY_SEAT_DIR = 'C:/Users/shawn/Dropbox/Foundry-Satellite/satellite-Vault/_meta/sky-seat'

function skyDataPlugin(): Plugin {
  let watcher: ReturnType<typeof spawn> | null = null
  return {
    name: 'sky-data',
    configureServer(server) {
      // Boot the sync watcher alongside dev
      watcher = spawn('node', ['scripts/sync-sky-data.js', '--watch'], {
        stdio: 'inherit',
        shell: true,
      })
      server.httpServer?.once('close', () => {
        watcher?.kill()
      })

      // GET /api/sky-seat/entries?days=N — return parsed recent sky-seat entries
      server.middlewares.use('/api/sky-seat/entries', async (req, res, next) => {
        if (req.method !== 'GET') return next()
        try {
          const url = new URL(req.url || '/', 'http://local')
          const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') || '30')))
          const files = await fs.readdir(VAULT_SKY_SEAT_DIR).catch(() => [] as string[])
          const mdFiles = files.filter((f) => f.endsWith('.md')).sort().reverse().slice(0, days)
          const entries: { date: string; lines: { time: string; view: string; text: string }[] }[] = []
          for (const f of mdFiles) {
            const date = f.replace(/\.md$/, '')
            const content = await fs.readFile(path.join(VAULT_SKY_SEAT_DIR, f), 'utf8').catch(() => '')
            const lines: { time: string; view: string; text: string }[] = []
            for (const raw of content.split('\n')) {
              const m = raw.match(/^- \*\*([0-9:]+)\*\*\s+_\(([^)]+)\)_\s+—\s+(.+)$/)
              if (m) lines.push({ time: m[1], view: m[2], text: m[3] })
            }
            if (lines.length) entries.push({ date, lines })
          }
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ entries }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err) }))
        }
      })

      // POST /api/sky-seat/log — appends a line to today's sky-seat log
      server.middlewares.use('/api/sky-seat/log', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const { text, view } = JSON.parse(body || '{}') as { text?: string; view?: string }
            if (!text || !text.trim()) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'missing text' }))
              return
            }
            const now = new Date()
            const ymd = now.toISOString().slice(0, 10)
            const hm = now.toISOString().slice(11, 16)
            await fs.mkdir(VAULT_SKY_SEAT_DIR, { recursive: true })
            const file = path.join(VAULT_SKY_SEAT_DIR, `${ymd}.md`)
            const existing = await fs.readFile(file, 'utf8').catch(() => '')
            const header = existing
              ? ''
              : `---\ntitle: Sky Seat — ${ymd}\npillar: _meta\ntags: [sky-seat]\n---\n\n# Sky Seat — ${ymd}\n\n`
            const line = `- **${hm}** _(${view ?? 'unknown'})_ — ${text.trim()}\n`
            await fs.writeFile(file, existing + header + line, 'utf8')
            res.statusCode = 200
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, file }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
      })
    },
    async buildStart() {
      // One-shot sync for prod builds too
      await new Promise<void>((resolve) => {
        const p = spawn('node', ['scripts/sync-sky-data.js'], { stdio: 'inherit', shell: true })
        p.on('exit', () => resolve())
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), skyDataPlugin()],
})
