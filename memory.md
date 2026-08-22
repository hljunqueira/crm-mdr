# Memória do Projeto e Correções

- **Procedimento Inicial**: Toda sessão deve iniciar com a leitura de `agentes.md`, `memory.md` e das skills contidas em `.agent/skills/` (`crm-mdr-core`, `crm-mdr-backend-frontend`, `crm-mdr-database`).
- **Mapeamento de Abas do Financeiro (`origin_type`) & Nomenclaturas**:
  - `CREDIARIO_LOJA`: Exibido no menu e aba `Caixa Loja` (`caixa_loja`).
  - `FINANCIAMENTO_CELULAR`: Exibido no menu e aba `Caixa Financeira` / `Caixa Financiamento Celular` (`caixa_financeira`).
  - O antigo "Turno e Caixa Diário" é denominado **`Caixa Diário`** no menu lateral.
  - Ao mover uma venda/crediário entre abas do caixa, deve-se atualizar a coluna `origin_type` de forma consistente nas tabelas **`sales`** e **`installments`** no Supabase e no SQLite local (caso exista).
- **Cálculo Unificado do Caixa Financeira**:
  - `saldoDisponivelReal` = $(\text{Recebimentos Asaas} + \text{Aportes Manuais}) - \text{Repasses para Lojas} - \text{Despesas Operacionais}$.
- **Formatação Segura de Moedas (`formatBRL`)**:
  - Todo valor monetário próximo de zero ($\text{Math.abs}(v) < 0.001$) deve ser normalizado para zero absoluto para evitar a exibição de `R$ -0,00`.
