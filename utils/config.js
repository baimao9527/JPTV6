export default {
  currentVersion: '1.2.0',

  // ADMIN_TOKEN: admin page, save, and deploy.
  adminToken: process.env.ADMIN_TOKEN || '9321',

  // TOKEN: M3U/TXT list access only.
  listToken: process.env.TOKEN || '9527',

  platform: {
    projectId: process.env.DEPLOY_PLATFROM_PROJECT || '',
    token: process.env.DEPLOY_PLATFROM_TOKEN || ''
  }
};
