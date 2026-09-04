# SCRATCHPAD

## Status Atual
- **Deploy em Produção (deploy-mdr all)**: 🚀 Concluído com sucesso na VPS (HTTP 200 OK).
- **Isolamento de Caixa Geral vs Caixa Diário & Data Retroativa (Imagens 1, 2 e 3)**: ✅ Concluído, Saneado e Validado em Produção.
- **Régua e Bot de Cobrança Automática (Financiamento Celular & Crediário)**: ✅ Corrigido, Testado e Validado (`npm run build` OK - 0 erros).
- **Mapeamento e Padronização da Unidade Padrão ARROIO**: ✅ Concluído e Validado.
- **Envio de Nota de Venda via WhatsApp (Evolution API + n8n)**: ✅ Concluído e Validado.
- **Correção Saldo D+0 Caixa Financeira**: ✅ Concluído e Validado.
- **Desativação Aba Gestão de Saldo Caixa Loja**: ✅ Concluído e Validado.
- **Correção Origem da Venda de Mariane (Maireane)**: ✅ Concluído (atualizado para CREDIARIO_LOJA).

---

## 🎯 Atividades Recentes
1. Adicionado endpoint `POST /api/sales/:id/send-receipt-whatsapp` e `POST /api/sales/send-receipt-whatsapp` em `server/routes/sales.ts`.
2. Formatado o texto exatamente conforme o template solicitado pelo usuário:
   - 🧾 *MDR INFORMÁTICA & CELULARES*
   - *Comprovante / Nota de Venda*
   - Olá, *{NOME_CLIENTE}*! Agradecemos pela sua preferência. Segue o comprovante da sua compra:
   - 📱 *Produto / Item:* {MODELO_APARELHO}
   - 💰 *Valor Total:* R$ {VALOR_TOTAL}
   - 💳 *Forma de Pagamento:* {FORMA_PAGAMENTO}
   - 📅 *Data da Compra:* {DATA_VENDA}
   - 📞 *Atendimento:* {TELEFONE_UNIDADE}
3. Implementado botão `🟢 Enviar via WhatsApp` no modal de sucesso de vendas em `SaleForm.tsx`.
4. Implementado botão de disparo de WhatsApp em cada linha da tabela de vendas em `Sales.tsx`.
5. Validação com `npm run build` concluída com sucesso (0 erros).
6. Executado script de migração de dados no Supabase para alterar a origem de venda da cliente `maireane viana da cruz` e de suas 2 parcelas associadas de `FINANCIAMENTO_CELULAR` para `CREDIARIO_LOJA`.

## Log de Modificações Recentes
- `src/pages/cashier/StoreCrediarioCashier.tsx`: Removida sub-aba `gestao`, atualizado estado inicial para `despesas`, ajustado `tabsConfig` e `tabsOrder` com 3 abas.
- `server/routes/cashier.ts`: Sincronizado `disponivelD0` do Caixa Financeira com saldo líquido real.
- `scratch/fix_mariane_sale_origin.js`: Script temporário de correção criado e executado.

