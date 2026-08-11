---
name: crm-mdr-backend-frontend
description: Mapeamento detalhado dos endpoints da API Node.js/Express e das páginas/componentes React do CRM MDR.
---

# MDR CRM — Mapeamento Backend & Frontend

Esta skill sumariza os módulos do Backend (Express) e componentes do Frontend (React).

---

## ⚙️ 1. Rotas do Backend (`server/routes/`)

- `sales.ts`: Geração de vendas, cancelamento, impressão de contratos e carnês.
- `customers.ts`: Análise de risco do cliente, limite disponível, histórico de compras.
- `inventory.ts`: Entrada de estoque (novos/seminovos), movimentação entre lojas, conferência de IMEI.
- `cashier.ts`: Movimentação de caixa (dinheiro, PIX, cartão), sangria e fechamento.
- `service_orders.ts`: Abertura de OS, inclusão de peças utilizadas, orçamento e aprovação.
- `scp.ts`: Cálculo de rendimentos contratuais para investidores e controle de aportes.

---

## 🎨 2. Estrutura Frontend (`src/`)

- `src/pages/Sales.tsx`: Tela principal de vendas e PDV.
- `src/pages/Customers.tsx`: Cadastro e consulta de clientes e fiadores.
- `src/pages/Financial.tsx`: Gestão de boletos, carnês e inadimplência.
- `src/pages/ServiceOrders.tsx`: Kanban de assistência técnica.
- `src/components/sales/ContractPrint.tsx`: Componente de layout para impressão de contratos e promissórias.
