import fs from 'fs';
import path from 'path';

export const LOGO_BASE_PATH = '/data/logo';
export const DEFAULT_LOGO_FILE = 'jptv.png';

const ABSOLUTE_URL_PATTERN = /^(https?:)?\/\//i;

const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '');

const parseChannelsData = (value) => {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.channels)) return data.channels;
  if (data && Array.isArray(data.groups)) return data.groups;
  return null;
};

const readLocalChannels = () => {
  const localPath = path.join(process.cwd(), 'data', 'channels.json');
  if (!fs.existsSync(localPath)) return [];
  return parseChannelsData(fs.readFileSync(localPath, 'utf8')) || [];
};

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
  const envValue = String(process.env.CHANNELS_DATA || '').trim();

  if (envValue) {
    try {
      const envData = parseChannelsData(envValue);
      if (envData) return normalizeChannels(envData);
      console.warn('CHANNELS_DATA 格式无效，回退到 data/channels.json');
    } catch (error) {
      console.warn('CHANNELS_DATA 解析失败，回退到 data/channels.json:', error.message);
    }
  }

  try {
    return normalizeChannels(readLocalChannels());
  } catch (error) {
    console.error('data/channels.json 读取失败:', error.message);
    return [];
  }
};

export const buildLogoUrl = (logoId, baseUrl = '') => {
  const value = String(logoId || '').trim();
  if (ABSOLUTE_URL_PATTERN.test(value) || value.startsWith('data:')) return value;

  const fileName = getLogoFileName(value);
  if (!fileName) return getDefaultLogoUrl(baseUrl);

  const origin = trimTrailingSlash(baseUrl);
  const logoPath = `${LOGO_BASE_PATH}/${fileName}`;
  return origin ? `${origin}${logoPath}` : logoPath;
};

export const normalizeLogoId = (logoId = '') => {
  const value = String(logoId || '').trim();
  if (ABSOLUTE_URL_PATTERN.test(value) || value.startsWith('data:')) return value;

  const fileName = getLogoFileName(value);
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
      if (!item || typeof item !== 'object') return null;

      return {
        url: String(item.url || item.href || '').trim(),
        note: String(item.note || item.remark || item.name || '').trim()
      };
    })
    .filter((item) => item && item.url);
};

export const getChannelSources = (channel = {}) => normalizeSources(channel.sources || channel.urls || channel.url);

export const formatChannelTitle = (name, note) => {
  const cleanName = String(name || '').trim();
  const cleanNote = String(note || '').trim();
  return cleanNote ? `${cleanName} | ${cleanNote}` : cleanName;
};
