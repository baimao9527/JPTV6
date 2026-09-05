import { buildLogoUrl, formatChannelTitle, getChannelSources, getChannels, getRequestOrigin } from '../utils/helpers.js';
import config from '../utils/config.js';

export default function handler(req, res) {
  const token = req.query.token || '';
  if (!config.listToken || token !== config.listToken) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).send('Unauthorized: Invalid List Token');
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  const groups = getChannels();
  const requestOrigin = getRequestOrigin(req);
  let m3u = '#EXTM3U x-tvg-url="http://e.erw.cc/e.xml.gz"\n';

  groups.forEach((group) => {
    group.channels.forEach((channel) => {
      const logo = buildLogoUrl(channel.logo, requestOrigin);
      const tvgId = channel.id || channel.name;

      getChannelSources(channel).forEach((source) => {
        m3u += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${channel.name}" tvg-logo="${logo}" group-title="${group.group}",${formatChannelTitle(channel.name, source.note)}\n`;
        m3u += `${source.url}\n`;
      });
    });

    if (group.channels.length) m3u += '\n';
  });

  res.status(200).send(m3u);
}
