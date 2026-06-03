import net from 'net';

const client = new net.Socket();
client.setTimeout(5000);

console.log('Tentando conectar a 216.22.5.129:22...');

client.connect(22, '216.22.5.129', () => {
  console.log('🟢 Conectado via TCP! Aguardando banner do SSH...');
});

client.on('data', (data) => {
  console.log('📥 Recebido do servidor:', data.toString().trim());
  client.destroy(); // Fecha a conexão
});

client.on('timeout', () => {
  console.log('🔴 Limite de tempo esgotado (Timeout)!');
  client.destroy();
});

client.on('error', (err) => {
  console.log('❌ Erro na conexão:', err.message);
  client.destroy();
});

client.on('close', () => {
  console.log('🔒 Conexão fechada pelo servidor ou encerrada.');
});
