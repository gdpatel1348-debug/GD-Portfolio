import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let PORT = parseInt(process.env.PORT, 10) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function createServer(port) {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    try {
      reqUrl = decodeURIComponent(reqUrl);
    } catch (e) {}

    // Rewrite /sanity-cdn/ to local images
    if (reqUrl.startsWith('/sanity-cdn/')) {
      const filename = path.basename(reqUrl);
      reqUrl = '/images/sanity/' + filename;
    }

    let filePath = path.join(__dirname, reqUrl);
    let stat = null;

    try {
      if (fs.existsSync(filePath)) {
        stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
          if (fs.existsSync(filePath)) {
            stat = fs.statSync(filePath);
          } else {
            stat = null;
          }
        }
      }
    } catch (e) {}

    // Fallback for painted textures if missing
    if (!stat && reqUrl.includes('_painted.webp')) {
      const fallbackUrl = reqUrl.replace('_painted.webp', '.webp');
      const fallbackPath = path.join(__dirname, fallbackUrl);
      if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isFile()) {
        filePath = fallbackPath;
        stat = fs.statSync(filePath);
      }
    }

    // Fallback for sound aliases
    if (!stat && reqUrl.startsWith('/sounds/')) {
      if (reqUrl.includes('tear')) {
        const tearPath = path.join(__dirname, 'sounds', 'papersound.mp3');
        if (fs.existsSync(tearPath)) { filePath = tearPath; stat = fs.statSync(filePath); }
      } else if (reqUrl.includes('pencil')) {
        const pencilPath = path.join(__dirname, 'sounds', 'uchyleniedrzwi.mp3');
        if (fs.existsSync(pencilPath)) { filePath = pencilPath; stat = fs.statSync(filePath); }
      }
    }

    // SPA fallback
    if (!stat || !stat.isFile()) {
      const ext = path.extname(reqUrl);
      if (!ext) {
        filePath = path.join(__dirname, 'index.html');
        if (fs.existsSync(filePath)) {
          stat = fs.statSync(filePath);
        }
      }
    }

    if (stat && stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + reqUrl);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying port ${port + 1}...`);
      createServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n  ✨ ITom 3D Portfolio Server is running! ✨\n`);
    console.log(`  ➜  Local:   http://localhost:${port}/`);
    console.log(`  ➜  Network: http://127.0.0.1:${port}/\n`);
    console.log(`  Press Ctrl+C to stop the server.\n`);
  });
}

createServer(PORT);
