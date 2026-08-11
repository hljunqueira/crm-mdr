# Memória do Projeto e Correções

- **Procedimento Inicial**: Toda sessão deve iniciar com a leitura de `agentes.md`, `memory.md` e das skills contidas em `.agent/skills/` (`crm-mdr-core`, `crm-mdr-backend-frontend`, `crm-mdr-database`).
- **Mapeamento de Abas do Financeiro (`origin_type`)**:
  - `CREDIARIO_LOJA`: Exibido na aba `caixa_loja` (Crediário Loja).
  - `FINANCIAMENTO_CELULAR`: Exibido na aba `caixa_financiamento` (Caixa Financiamento Celular).
  - Ao mover uma venda/crediário entre abas do caixa, deve-se atualizar a coluna `origin_type` de forma consistente nas tabelas **`sales`** e **`installments`** no Supabase e no SQLite local (caso exista).
