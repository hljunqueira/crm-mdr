# Scratchpad & Histórico de Sessões

## Tarefa Atual
- [x] Auditoria completa de todas as unidades (Consolidado, Gaivota e Arroio) para o Caixa Loja.
- [x] Identificada e corrigida causa raiz de divergência: dupla contagem de vendas automáticas somadas sobre `transactions` no card de saldo e total de entradas.
- [x] Ajustada a fórmula de `manualSuprimentosTotal` e `totalEntradasCaixaLoja` para manter integridade exata em todas as abas e períodos.
- [x] Build validado com sucesso (`npm run build`).

## Log de Modificações Recentes
- `src/pages/cashier/StoreCrediarioCashier.tsx`: Corrigido cálculo de entradas manuais e saldo total do caixa da loja na sub-aba de Lançamentos & Despesas.
- Scripts de auditoria executados (`audit_caixa_loja_all_units.cjs`, `test_clean_calculations.cjs`).
