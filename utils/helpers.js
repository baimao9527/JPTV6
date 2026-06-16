import config from './config.js';
import fs from 'fs';
import path from 'path';

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
    const localPath = path.join(process.cwd(), 'public', 'channels.json');
    if (fs.existsSync(localPath)) {
      return normalizeChannels(JSON.parse(fs.readFileSync(localPath, 'utf8')));
    }
  } catch (error) {
    console.error('本地 channels.json 读取失败:', error.message);
  }

  return [];
};

export const buildLogoUrl = (logoId) => {
  if (!logoId) return '';
  return String(logoId).startsWith('http') ? logoId : `${config.logoBaseUrl}${logoId}.png`;
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
    logo: String(channel.logo || '').trim(),
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
