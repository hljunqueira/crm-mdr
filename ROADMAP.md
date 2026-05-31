# 🗺️ Roadmap Premium de Melhorias por Componente & Página — CRM MDR

Este documento contém um diagnóstico arquitetural profundo e detalhado de cada componente e página do ecossistema **CRM MDR**, indicando o estado atual de implementação, pontos de atenção e um plano de evolução técnica e visual para elevar o sistema ao nível máximo de robustez e sofisticação.

---

## 📊 1. Painel & Resultados

### 1.1 Painel Executivo (`Dashboard.tsx`)
*   **Estado Atual:**
    *   Exibe cards analíticos de novos clientes, faturamento previsto e taxas de inadimplência.
    *   Gera gráficos de faturamento por marcas de aparelhos e fluxo semanal dinâmico via Recharts.
    *   Tabela reativa para listar clientes com parcelas vencidas ou bloqueadas.
*   **Análise Detalhada de Componentes:**
    *   *Cards de Estatísticas (`StatCard`):* Estáticos no mesmo arquivo. Reutilizam estilos CSS redundantes.
    *   *Gráficos (`Recharts`):* Re-renderizam inteiramente a cada mudança do estado global das lojas, causando um leve flicker visual.
*   **Roadmap de Melhorias:**
    *   **[Componentização]** Isolar os cards em um componente genérico `<StatCard />` com suporte a animações de contagem progressiva (`react-countup`).
    *   **[Desempenho]** Criar uma View no Supabase (`v_dashboard_metrics`) para consolidar as queries de Clientes, Vendas e Finanças em um único fetch indexado de alta performance.
    *   **[UX/UI]** Implementar um filtro de intervalo (`date-fns`) permitindo selecionar períodos personalizados além de um esqueleto de carregamento (`SkeletonLoader`) em formato de pulsos durante o carregamento de rede.

### 1.2 Relatórios (`Reports.tsx`)
*   **Estado Atual:**
    *   Página de fechamentos de caixa e gráficos consolidados de movimentações.
*   **Análise Detalhada de Componentes:**
    *   *Tabelas de Dados:* Exibição simples baseada em elementos HTML nativos sem suporte a paginação no cliente ou ordenação por colunas.
*   **Roadmap de Melhorias:**
    *   **[Componentização]** Adicionar um componente reutilizável `<SmartTable />` contendo paginação nativa, pesquisa interna e filtros por coluna.
    *   **[Exportação]** Integrar bibliotecas client-side (`xlsx` e `jspdf`) para exportação instantânea de relatórios financeiros e de auditoria de estoque em 1-clique.

---

## 🤝 2. Comercial & CRM

### 2.1 Funil de Vendas & Leads (`Leads.tsx` / `Kanban`)
*   **Estado Atual:**
    *   Possui modo de alternância entre Tabela Clássica de Leads e o Funil Kanban com 4 colunas de oportunidades.
    *   Controle de prioridade nos cards (Alta, Média, Baixa) e valores de oportunidades.
*   **Análise Detalhada de Componentes:**
    *   *Formulários (`LeadForm` & `KanbanCardForm`):* Integrados via modais do contexto de UI.
    *   *Drag & Drop:* Utiliza eventos de drag nativos do HTML5, o que limita efeitos visuais de sobreposição (drag overlay) e transições suaves de ordenação.
*   **Roadmap de Melhorias:**
    *   **[UX/UI - Drag & Drop]** Refatorar o funil utilizando `@dnd-kit/core` e `@dnd-kit/sortable` para obter arrasto ultra-fluido com transições animadas usando `Framer Motion` e feedback háptico.
    *   **[Integração WPP]** Adicionar um botão de ação rápida `<WhatsappQuickAction />` em cada cartão do Kanban para iniciar mensagens automáticas pré-cadastradas no WhatsApp Web/Chatwoot sem precisar sair do Kanban.

### 2.2 Clientes (`Customers.tsx`)
*   **Estado Atual:**
    *   Tabela com lista de clientes, contatos, CPF estruturado, endereços e área de upload e visualização de comprovantes.
*   **Análise Detalhada de Componentes:**
    *   *Upload de Comprovantes:* Integração com Supabase Storage.
    *   *Formulário de Cadastro:* Muitos campos manuais de endereço, gerando atrito no balcão de vendas.
*   **Roadmap de Melhorias:**
    *   **[Automação]** Integrar API do ViaCEP. Ao digitar o CEP, um hook customizado (`useCep`) faz a consulta e autocompleta Rua, Bairro e Cidade instantaneamente.
    *   **[UI Drawer]** Substituir modais de detalhes por um componente lateral deslizante `<Drawer />` que exibe a ficha completa do cliente, histórico de compras, OSs antigas e score de crédito acumulado.

### 2.3 Vendas & Celulares (`Sales.tsx`)
*   **Estado Atual:**
    *   Mapeamento de saídas de dispositivos com suporte a Trade-in (celular usado como parte do pagamento), taxas de juros por parcelamento e descontos.
*   **Análise Detalhada de Componentes:**
    *   *Cálculos Financeiros:* Lógica de juros embutida no frontend, sujeita a inconsistências de arredondamento Javascript (`float`).
*   **Roadmap de Melhorias:**
    *   **[Segurança]** Mover os cálculos de parcelamento e amortização para uma Edge Function ou lógica do backend (PostgreSQL) para evitar manipulação de juros no front-end.
    *   **[WOW Factor]** Implementar assinatura eletrônica em tela (`react-signature-canvas`) para que o cliente assine o termo de compromisso de parcelamento (carnê/promissória) digitalmente.

### 2.4 Esteira de Crédito (`CreditAnalysis.tsx`)
*   **Estado Atual:**
    *   Formulário de homologação, classificação de risco (Premium, Standard, Flex), motor de decisão baseado nos dados analíticos do SCR Banco Central obtidos via API Direct Data e notificações de alertas no WhatsApp.
*   **Análise Detalhada de Componentes:**
    *   *Painel de Dados SCR Bacen:* Traz o consolidado (a vencer, vencido e prejuízo) em tempo real da API Direct Data.
*   **Roadmap de Melhorias:**
    *   **[Cache Database]** Implementar cache de consultas SCR na tabela do Supabase. Caso o CPF tenha sido consultado nos últimos 15 dias, o sistema consome o cache local economizando o custo da API Direct Data.
    *   **[Notificação de Score]** Criar o componente `<CreditBadge />` com gradiente de cor dinâmico (Verde a Vermelho) baseado no score interno do cliente para dar feedback visual instantâneo ao operador.

---

## 🔧 3. Serviços & Estoque

### 3.1 Estoque (`Inventory.tsx`)
*   **Estado Atual:**
    *   Listagem de aparelhos e peças com badges de categoria, controle de condições (Novo, Vitrine, Usado), filtros de estoque crítico e valores agregados.
*   **Análise Detalhada de Componentes:**
    *   *InventoryForm:* Formulário completo de cadastro de IMEI/Serial.
*   **Roadmap de Melhorias:**
    *   **[Automação XML]** Adicionar componente de importação `<NfeImportXml />` para que a entrada de novos estoques de celulares ou peças seja feita apenas arrastando o XML de compra da nota do fornecedor.
    *   **[Controle de IMEI]** Adicionar validação automática de tamanho e dígito verificador do IMEI para evitar cadastros incorretos de aparelhos.

### 3.2 Assistência Técnica (OS) (`ServiceOrders.tsx`)
*   **Estado Atual:**
    *   Página de alta complexidade (~74KB). Controla a entrada de aparelhos, checklists de testes (POST, HD, LCD, Carga), peças consumidas, estimativas e disparadores de webhooks do WhatsApp (Entrada, Orçamento, Conclusão).
*   **Análise Detalhada de Componentes:**
    *   *Fila Lateral de OS:* Renderiza a lista de todos os serviços.
    *   *Bancada de Diagnóstico:* Checklist interativo.
    *   *Tabela de Peças:* Adiciona itens do estoque em tempo real.
*   **Roadmap de Melhorias:**
    *   **[ARQUITETURA - CRÍTICO]** Desmembrar o arquivo gigante de 1300+ linhas em componentes isolados para garantir manutenibilidade de longo prazo:
        *   `components/layout/OsSidebar.tsx` (Fila lateral com buscas)
        *   `components/layout/OsTechWorkbench.tsx` (Área de testes de bancada)
        *   `components/layout/OsPartsLogistics.tsx` (Consumo de peças)
        *   `components/layout/OsPrintReceipt.tsx` (Componente de renderização de PDF oculto para impressão limpa)
    *   **[UX/UI]** Timeline interativa exibindo o progresso visual da ordem de serviço em tempo real para o cliente final.

---

## 💬 4. Canais & WhatsApp

### 4.1 Canais & Conexões (`Connections.tsx`)
*   **Estado Atual:**
    *   Gerenciamento completo de canais (Evolution API + Chatwoot). Pareamento instantâneo por QR Code via Polling e sincronização de banco de dados do Supabase.
*   **Análise Detalhada de Componentes:**
    *   *QR Code Modal:* Renderiza o QR Code dinâmico em Base64 obtido na API da Evolution.
*   **Roadmap de Melhorias:**
    *   **[Monitoramento]** Implementar monitoramento de qualidade de sinal do celular sincronizado (Bateria e Ping de latência de rede com a Evolution API) e exibir graficamente no card.
    *   **[Auto-Recuperação]** Lógica de failover para tentar auto-reconectar a instância do WhatsApp de forma silenciosa caso sofra desconexão por rede.

### 4.2 Automações & Campanhas (`Automation.tsx`)
*   **Estado Atual:**
    *   Exibe e configura disparos automáticos e campanhas.
*   **Roadmap de Melhorias:**
    *   **[Dashboard de Campanhas]** Gráficos simples exibindo taxa de entrega (`delivered`), leitura (`read`) e rejeição de mensagens disparadas pelo n8n, melhorando a rastreabilidade comercial.

---

## 💳 5. Financeiro & Fiscal

### 5.1 Financeiro (`Finance.tsx`)
*   **Estado Atual:**
    *   Controle de caixa, fluxo de receitas e despesas por filial.
*   **Análise Detalhada de Componentes:**
    *   *Fluxo de Caixa:* Lançamento de despesas manuais.
*   **Roadmap de Melhorias:**
    *   **[Pix Dinâmico]** Integrar API do Asaas/Efí para gerar QR Codes PIX dinâmicos diretamente na tela de checkout do cliente. Webhook de baixa automática do Supabase ao receber a confirmação do pagamento.

### 5.2 Fiscal (`Fiscal.tsx`)
*   **Estado Atual:**
    *   Mapeamento para emissão de Notas Fiscais (NFe e NFSe).
*   **Roadmap de Melhorias:**
    *   **[Envio no WhatsApp]** Integrar disparo automático do PDF da nota gerada diretamente para o WhatsApp do cliente através da conexão ativa da Evolution.

---

## ⚙️ 6. Configurações (`Settings.tsx`)
*   **Estado Atual:**
    *   Ajustes globais do CRM, controle de usuários e filiais.
*   **Roadmap de Melhorias:**
    *   **[Gestão de Permissões (RBAC)]** Componente visual completo para editar permissões de grupos de usuários (Vendedores, Técnicos, Gerentes, Administradores) diretamente no sistema.

---

## 📅 Matriz de Prioridade & Fases de Entrega

| Fase | Foco Principal | Componentes Envolvidos | Status |
| :--- | :--- | :--- | :--- |
| **Fase 1** | **Manutenibilidade & Arquitetura** | • Modularização do `ServiceOrders.tsx` <br> • Integração do ViaCEP no `Customers.tsx` <br> • Proteção SCR Cache no `CreditAnalysis.tsx` | ⏳ A Fazer |
| **Fase 2** | **UX Fluido & Automação** | • Drag & Drop no Kanban de `Leads.tsx` <br> • Importação de XML de Notas no `Inventory.tsx` <br> • Notificações robustas no `Automation.tsx` | ⏳ A Fazer |
| **Fase 3** | **Recursos Premium & Fechamento** | • Assinatura Eletrônica em Tela no `Sales.tsx` <br> • PIX Dinâmico com baixa no `Finance.tsx` <br> • Modo escuro otimizado | ⏳ A Fazer |
