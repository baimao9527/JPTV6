export default {
  currentVersion: '5.0.0',
  adminToken: process.env.ADMIN_TOKEN || '123456',
  logoBaseUrl: 'https://gcore.jsdelivr.net/gh/fanmingming/live/tv/',
  platform: {
    projectId: process.env.DEPLOY_PLATFROM_PROJECT || '',
    token: process.env.DEPLOY_PLATFROM_TOKEN || ''
  }
};
