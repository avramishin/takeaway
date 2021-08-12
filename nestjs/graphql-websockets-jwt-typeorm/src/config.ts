import { config as fromFile } from 'dotenv';

fromFile({ path: __dirname + '/../.env' });

import fs from 'fs';

export const config = {
  db: {
    url: process.env.DB_URL || '',
  },

  jwt: {
    privateKey: fs.readFileSync(__dirname + '/../keys/private.key'),
    publicKey: fs.readFileSync(__dirname + '/../keys/public.key'),
    expiresIn: '160h',
    algorithm: 'RS256',
  },

  default_broker_id: 'some constant',
};
