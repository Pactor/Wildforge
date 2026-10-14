import { mkdir, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const LOG_DIRECTORY = resolve(process.cwd(), 'playtest-logs');
const LOG_FILE = resolve(LOG_DIRECTORY, 'playtest.ndjson');

function localPlaytestLog() {
  return {
    name: 'wildforge-local-playtest-log',
    configureServer(server) {
      server.middlewares.use('/__wildforge_playtest_log', async (request, response) => {
        if (request.method === 'GET') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ ok: true, file: 'playtest-logs/playtest.ndjson' }));
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        try {
          let body = '';
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 131072) throw new Error('Playtest log batch too large');
          }
          const parsed = JSON.parse(body || '{}');
          const events = Array.isArray(parsed.events) ? parsed.events.slice(0, 100) : [];
          if (!events.length) throw new Error('No playtest events');
          await mkdir(LOG_DIRECTORY, { recursive: true });
          const receivedAt = new Date().toISOString();
          const lines = events.map((event) => JSON.stringify({ receivedAt, ...event })).join('\n') + '\n';
          await appendFile(LOG_FILE, lines, 'utf8');
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ ok: true, accepted: events.length }));
        } catch (error) {
          response.statusCode = 400;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
        }
      });
    },
  };
}

export default defineConfig({ plugins: [localPlaytestLog()] });
