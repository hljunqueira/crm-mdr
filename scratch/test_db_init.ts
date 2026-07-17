import { db } from '../server/db/connection.ts';
import { stores } from '../server/db/schema.ts';

async function test() {
  console.log('[Test] Banco de dados carregado.');
  // Insere uma loja de teste
  const testStore = {
    id: 'test-store-id',
    name: 'MDR Informática Gaivota',
    cnpj: '12.345.678/0001-99',
  };

  try {
    await db.insert(stores).values(testStore).onConflictDoNothing();
    const allStores = await db.select().from(stores);
    console.log('[Test] Lojas cadastradas no SQLite:', allStores);
    console.log('[Test] Banco de dados funcionando perfeitamente!');
  } catch (error) {
    console.error('[Test] Erro ao testar banco de dados:', error);
  }
}

test();
