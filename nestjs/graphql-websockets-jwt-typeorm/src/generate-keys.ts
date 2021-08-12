import crypto from 'crypto';
import fs from 'fs';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

fs.writeFileSync(__dirname + '/../keys/private.key', privateKey);
fs.writeFileSync(__dirname + '/../keys/public.key', publicKey);
