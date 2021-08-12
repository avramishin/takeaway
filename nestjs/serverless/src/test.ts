import axios from 'axios';
import NodeRSA from 'node-rsa';

const publicKey = `
-----BEGIN PUBLIC KEY-----
MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgEhoCiRktb+rZZ79CM0DczOzfB6Z
1xToJcrUHcvrO1Dqru67TW8uyYwAE8YSH4iIwl3uUBK7cbSq/N/eHeZ8gNXVh0RV
TjMjkcxlC5ym1Yz/tgiiRKihjtqkb3QkwVcnL1sulDlJ5RR3Shf4svv7MrzBQlEt
V7gydBz3qu/dtjb/AgMBAAE=
-----END PUBLIC KEY-----
`;
const privateKey = `
-----BEGIN RSA PRIVATE KEY-----
MIICWgIBAAKBgEhoCiRktb+rZZ79CM0DczOzfB6Z1xToJcrUHcvrO1Dqru67TW8u
yYwAE8YSH4iIwl3uUBK7cbSq/N/eHeZ8gNXVh0RVTjMjkcxlC5ym1Yz/tgiiRKih
jtqkb3QkwVcnL1sulDlJ5RR3Shf4svv7MrzBQlEtV7gydBz3qu/dtjb/AgMBAAEC
gYBFbu964tCfEr+KbN+JqatJgu6dca0dMVk8XZiNOfBRshs6d4bT/avsgw5zPGHc
zjiFVsiWjgWF2QpRq3BE3FO2tcPEBFeZFbUUOdRaE5ldhzMfCoxkCqmfullePRMx
osz7tM1z/vyQZJghACG5aUDR5y+jPRmJvXPAFPsk63SR8QJBAIjhV/khCzp5g9UB
YgUKp7OBL2qCgrLeLyTFeyjrkvEC+wNBTRXgiFS2Gimb8SnwZV4yeBj1Ew+oTrio
g4LXeGUCQQCHav1QNc1WDQInSOdMLdfky5LDyA1hqRd6UKwK6LrC4DuQ606h2hrG
P0YDi4EIeEC45kXJ8ab9SB7+xjnqQfGTAkA0ROjVJ3skLzbaZhbKGhGECHbU01WZ
fCLAhfDL5XlNM3gq/Aq1qfIldwxyiywCedwbpmYaEavftMOq3B6sHh/JAkBxhPwD
cIbIuzDx88iJ8OhKEWngG+Uz2EcpL1V5860UTltA2jFZtve49zPfJuQtUHmZRth8
OMqvCvWIyG2mdk9nAkBAduHd/4oxl0KvRfCjXYdNqaRzG/e1p2/sfgJoWvdPbr17
c7yaftGUMN6BviZKyakJKKo90jM5RU7poCDecBe9
-----END RSA PRIVATE KEY-----
`;

function createSignature(payload: any) {
  const rsaKey = new NodeRSA();
  rsaKey.importKey(privateKey);
  return rsaKey.sign(JSON.stringify(payload)).toString('base64');
}

function verifySignature(signature: string, payload: any) {
  const rsaKey = new NodeRSA();
  rsaKey.importKey(publicKey);
  return rsaKey.verify(
    Buffer.from(JSON.stringify(payload)),
    signature,
    'buffer',
    'base64',
  );
}

async function main() {
  const body = {};
  const signature = createSignature(body);
  const res = await axios({
    url: 'http://localhost:3000/v1/trade/orders/open',
    method: 'get',
    headers: {
      'API-KEY-ID': '16771981-9609-4764-9a38-2a9e15e811f7',
      'API-SIGNATURE': signature,
    },
  });
  console.log(res.data);
}

main();
