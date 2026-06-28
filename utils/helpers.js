import fs from 'fs';
import path from 'path';

export const LOGO_BASE_PATH = '/data/logo';
export const DEFAULT_LOGO_FILE = 'jptv.png';

const ABSOLUTE_URL_PATTERN = /^(https?:)?\/\//i;

const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '');

export const getLogoFileName = (logoId = '') => {
  const value = String(logoId || '').trim();
  if (!value) return '';

  const clean = value
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/^\/+/, '')
    .replace(/\\/g, '/')
    .split(/[?#]/)[0];

  const fileName = (clean.includes('/') ? clean.split('/').pop() : clean).trim();
  if (!fileName) return '';

  return /\.[a-z0-9]+$/i.test(fileName) ? fileName : `${fileName}.png`;
};

export const getDefaultLogoUrl = (baseUrl = '') => {
  const origin = trimTrailingSlash(baseUrl);
  const logoPath = `${LOGO_BASE_PATH}/${DEFAULT_LOGO_FILE}`;
  return origin ? `${origin}${logoPath}` : logoPath;
};

export const getRequestOrigin = (req = {}) => {
  const headers = req.headers || {};
  const proto = String(headers['x-forwarded-proto'] || headers['x-forwarded-scheme'] || 'https').split(',')[0].trim() || 'https';
  const host = String(headers['x-forwarded-host'] || headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
};

export const getChannels = () => {
  if (process.env.CHANNELS_DATA) {
    try {
      const envData = JSON.parse(process.env.CHANNELS_DATA);
      if (Array.isArray(envData)) return normalizeChannels(envData);
    } catch (error) {
      console.warn('CHANNELS_DATA 解析失败，回退到本地 channels.json:', error.message);
    }
  }

  try {
    const localPaths = [
      path.join(process.cwd(), 'data', 'channels.json'),
      path.join(process.cwd(), 'public', 'channels.json')
    ];

    for (const localPath of localPaths) {
      if (fs.existsSync(localPath)) {
        return normalizeChannels(JSON.parse(fs.readFileSync(localPath, 'utf8')));
      }
    }
  } catch (error) {
    console.error('本地 channels.json 读取失败:', error.message);
  }

  return [];
};

export const buildLogoUrl = (logoId, baseUrl = '') => {
  const value = String(logoId || '').trim();
  if (ABSOLUTE_URL_PATTERN.test(value) || value.startsWith('data:')) return value;

  const fileName = getLogoFileName(logoId);
  if (!fileName) return getDefaultLogoUrl(baseUrl);

  const origin = trimTrailingSlash(baseUrl);
  const logoPath = `${LOGO_BASE_PATH}/${fileName}`;
  return origin ? `${origin}${logoPath}` : logoPath;
};

export const normalizeLogoId = (logoId = '') => {
  const value = String(logoId || '').trim();
  if (ABSOLUTE_URL_PATTERN.test(value) || value.startsWith('data:')) return value;

  const fileName = getLogoFileName(logoId);
  if (!fileName || fileName === DEFAULT_LOGO_FILE) return '';
  return fileName;
};

export const normalizeChannels = (groups = []) => {
  if (!Array.isArray(groups)) return [];

  return groups
    .map((group) => ({
      group: String(group.group || group.name || '').trim(),
      id: group.id || '',
      channels: Array.isArray(group.channels) ? group.channels.map(normalizeChannel).filter(Boolean) : []
    }))
    .filter((group) => group.group);
};

export const normalizeChannel = (channel = {}) => {
  const name = String(channel.name || '').trim();
  if (!name) return null;

  const sources = normalizeSources(channel.sources || channel.urls || channel.url);
  return {
    name,
    id: String(channel.id || name).trim(),
    logo: normalizeLogoId(channel.logo),
    sources,
    url: sources.map((source) => source.url)
  };
};

export const normalizeSources = (value) => {
  const items = Array.isArray(value) ? value : value ? [value] : [];

  return items
    .map((item) => {
      if (typeof item === 'string') return { url: item.trim(), note: '' };
      if (item && typeof item === 'object') {
        return {
          url: String(item.url || item.href || '').trim(),
          note: String(item.note || item.remark || item.name || '').trim()
        };
      }
      return null;
    })
    .filter((item) => item && item.url);
};

export const getChannelSources = (channel = {}) => normalizeSources(channel.sources || channel.urls || channel.url);

export const formatChannelTitle = (name, note) => {
  const cleanName = String(name || '').trim();
  const cleanNote = String(note || '').trim();
  return cleanNote ? `${cleanName} | ${cleanNote}` : cleanName;
};
