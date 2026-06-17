export default {
  currentVersion: '1.2.0',

  // ADMIN_TOKEN: admin page, save, and deploy.
  adminToken: process.env.ADMIN_TOKEN || '9321',

  // TOKEN: M3U/TXT list access only.
  listToken: process.env.TOKEN || '',

  logoBaseUrl: 'https://gcore.jsdelivr.net/gh/fanmingming/live/tv/',
  projectUrl: 'https://github.com/JY4K/jptv_redirect',
  repoApiUrl: 'https://api.github.com/repos/imput/iptv-pro/releases/latest',

  platform: {
    projectId: process.env.DEPLOY_PLATFROM_PROJECT || '',
    token: process.env.DEPLOY_PLATFROM_TOKEN || ''
  }
};
