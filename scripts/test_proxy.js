import express from 'express';

import evolutionRoutes from '../server/routes/evolution.js';

const app = express();
app.use(express.json());
app.use('/api/evolution', evolutionRoutes);

const server = app.listen(3001, async () => {
  console.log('Test server listening on port 3001');
  try {
    const res = await fetch('http://localhost:3001/api/evolution/instance/fetchInstances');
    console.log('Proxy Status:', res.status);
    const data = await res.json();
    console.log('Proxy Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
  }
});
