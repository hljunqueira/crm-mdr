# MDR Informática e Celulares — Arquitetura e Engenharia de Contexto

Este arquivo consolida a arquitetura, stack tecnológica e convenções do **CRM MDR**, servindo como fonte primária de contexto para o desenvolvimento do projeto.

---

## 🎯 1. Objetivo Principal do Sistema
Gerenciar todo o ecossistema comercial e operacional da **MDR Informática e Celulares**, contemplando:
- **Vendas e PDV (Balcão)**: Vendas presenciais/online com emissão de contratos e carnês.
- **Crediário Próprio**: Controle de parcelamentos, vencimentos, liquidações e réguas de cobrança automatizadas via WhatsApp.
- **Estoque Rastreável**: Controle rígido de aparelhos/smartphones por IMEI e número de série.
- **Assistência Técnica (OS)**: Gestão de ordens de serviço e manutenção técnica via painel Kanban.
- **Módulo SCP (Investidores)**: Gestão de Sociedade em Conta de Participação, contratos e repasse automatizado de dividendos.
- **Gestão Financeira**: Fechamento diário de caixa por loja física, controle de movimentações, sangrias, suprimentos e DRE.

---

## 💻 2. Stack Tecnológica Exata
- **Frontend Web**: React 19, Vite, TailwindCSS v4, Zustand, Lucide React, Recharts.
- **Backend API**: Node.js, Express, Drizzle ORM.
- **Banco de Dados**: Híbrido com PostgreSQL (Supabase em nuvem) e SQLite (Better-SQLite3 local/offline).
- **Desktop**: Electron com empacotamento NSIS.
- **Integrações Externas**: Evolution API (WhatsApp automatizado), Groq SDK (IA assistente), Google APIs.

---

## 🏗️ 3. Padrões de Arquitetura e Convenções
- **Backend**: Arquitetura modular baseada em rotas Express (`server/routes/`), com transações atômicas para atualização de estoque por IMEI (`devices`) e geração de vendas/parcelas (`sales`, `installments`).
- **Frontend**: Componentização em `src/pages/` e `src/components/` com visual moderno, responsivo e focado em UX de PDV e gestão financeira.
- **Banco de Dados**: Modelagem ORM via Drizzle Schema com UUID/INTEGER, preservando integridade referencial entre lojas (`stores`), usuários (`profiles`), clientes (`customers`) e transações.

---

## 💾 4. Banco de Dados e Integrações
- **Banco de Dados Principal**: PostgreSQL via Supabase em nuvem para sincronização multi-loja + SQLite (Drizzle ORM) local.
- **Integrações**: WhatsApp (Evolution API) para disparos automatizados de réguas de cobrança e comprovantes; Groq AI para auxílio em diagnósticos e suporte ao vendedor.

---

## 👁️ 5. Observabilidade (Diretriz Futura)
- **Instalação e Configuração de Ferramentas**: É **estritamente proibido** tentar instalar ou configurar ferramentas de observabilidade (ex: Sentry, Datadog, New Relic, OpenTelemetry, etc.) durante a resolução de issues atuais ou tarefas de rotina, **a não ser que seja expressamente e explicitamente solicitado pelo usuário**.

---

REGRA DE MEMÓRIA DE SESSÃO: Toda vez que iniciarmos uma nova interação de trabalho, você deve ler obrigatoriamente o arquivo memory.md. Sempre que eu corrigir um código seu, um erro de sintaxe, ou te ensinar um novo padrão de código específico deste projeto, você deve anotar a lição de forma concisa no memory.md para evitar alucinações futuras.
