import { formatChannelTitle, getChannelSources, getChannels } from '../utils/helpers.js';

export default function handler(req, res) {
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
