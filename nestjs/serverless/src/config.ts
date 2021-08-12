require('dotenv').config({ path: __dirname + '/../.env' });
export const config = {
  db: {
    prefix: 'trade_service',
  },
  service: {
    name: 'trade-service-serverless',
  },
  evenBridge: {
    bus: 'trade-service-events',
  },
  authService: {
    production: {
      username: process.env.AUTH_SERVICE_PRODUCTION_USERNAME,
      password:
        process.env.NODE_ENV == 'Local'
          ? Buffer.from(
              process.env.AUTH_SERVICE_PRODUCTION_PASSWORD ||
                'AUTH_SERVICE_PRODUCTION_PASSWORD',
              'base64',
            ).toString()
          : process.env.AUTH_SERVICE_PRODUCTION_PASSWORD,
    },
    staging: {
      username: process.env.AUTH_SERVICE_STAGING_USERNAME,
      password:
        process.env.NODE_ENV == 'Local'
          ? Buffer.from(
              process.env.AUTH_SERVICE_STAGING_PASSWORD ||
                'AUTH_SERVICE_STAGING_PASSWORD',
              'base64',
            ).toString()
          : process.env.AUTH_SERVICE_STAGING_PASSWORD,
    },
  },
  adminService: {
    url: process.env.ADMIN_SERVICE_URL || 'ADMIN_SERVICE_URL',
  },
  loggly: {
    token: process.env.LOGGLY_TOKEN || 'LOGGLY_TOKEN',
    tag: process.env.LOGGLY_TAG || 'LOGGLY_TAG',
  },
  logServer: {
    url: process.env.LOG_SERVER_URL || 'LOG_SERVER_URL',
    apiToken: process.env.LOG_SERVER_API_TOKEN || 'LOG_SERVER_API_TOKEN',
    project: process.env.LOG_SERVER_PROJECT || 'LOG_SERVER_PROJECT',
    channel: process.env.LOG_SERVER_CHANNEL || 'LOG_SERVER_CHANNEL',
  },
  aws: {
    region: process.env.REGION || 'us-east-1',
  },
};
