import { formatChannelTitle, getChannelSources, getChannels } from '../utils/helpers.js';
import config from '../utils/config.js';

export default function handler(req, res) {
  const token = req.query.token || '';
  if (!config.listToken || token !== config.listToken) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).send('Unauthorized: Invalid List Token');
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  const lines = [];

  getChannels().forEach((group) => {
    if (!group.channels.length) return;

    lines.push(`${group.group},#genre#`);
    group.channels.forEach((channel) => {
      getChannelSources(channel).forEach((source) => {
        lines.push(`${formatChannelTitle(channel.name, source.note)},${source.url}`);
      });
    });
    lines.push('');
  });

  res.status(200).send(lines.join('\n'));
}
