import { Client as SSHClient } from 'ssh2';

const conn = new SSHClient();

conn.on('ready', () => {
  console.log('📌 Conectado à VPS 1 (infosinistros). Buscando logs...');
  conn.exec('docker logs --tail 200 infosinistros-api-container', (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', () => {
      console.log('=== LOGS INFOSINISTROS API (ÚLTIMAS 200 LINHAS) ===\n' + output);
      conn.end();
    }).on('data', (data) => { output += data; });
  });
}).connect({
  host: '217.196.49.248',
  port: 22,
  username: 'root',
  password: 'S#YYj1Bt7NpQBn+Q'
});
