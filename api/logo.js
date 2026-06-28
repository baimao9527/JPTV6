import fs from 'fs';
import path from 'path';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sanitizeLogoPath(value = '') {
  const raw = String(value).replace(/^\/+/, '').replace(/\\/g, '/');
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === '.' || normalized.startsWith('..') || normalized.includes('/..')) return '';
  return normalized;
}

export default function handler(req, res) {
  const file = sanitizeLogoPath(req.query.file || req.query.path || '');
  if (!file) return res.status(400).send('Bad Request');

  const root = path.join(process.cwd(), 'data', 'logo');
  const filePath = path.join(root, file);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
    return res.status(403).send('Forbidden');
  }

  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return res.status(404).send('Not Found');
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  fs.createReadStream(resolvedPath).pipe(res);
}
