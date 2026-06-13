# Manual de Operações e Uso do Sistema - MDR

Este manual serve como guia de referência técnica e operacional para o uso do ecossistema CRM MDR. Ele detalha as integrações cadastrais, configuração de canais, procedimentos de segurança e a operação de todas as telas do sistema.

---

## 1. Central de Consultas Cadastrais (Direct Data & WDAPI)

O sistema conta com um motor de consultas para análise de crédito e enriquecimento cadastral de clientes.

### Funcionamento dos Créditos (Prepaid)
A API da **Direct Data** opera em um modelo **pré-pago**. Toda consulta realizada no sistema consome créditos do saldo da conta da MDR. 

#### Como Adicionar Saldo na Direct Data
Se as consultas no MDR falharem ou retornarem erros de integração, verifique e recarregue o saldo:
1. Acesse o portal administrativo da Direct Data: [app.directd.com.br/auth](https://app.directd.com.br/auth)
2. Insira as credenciais de acesso da empresa:
   * **E-mail/Usuário**: `atendimento@mdrinformaticaecelulares.com.br`
   * **Senha**: `PeBwsH@yr6CUqz5`
3. No painel principal (**Central de comando**), localize no canto superior direito o box de **Saldo** (ex: `Saldo R$ 1,34`).
4. Clique no botão verde **"Adicionar"** ao lado do valor e siga as instruções para gerar o PIX ou boleto de recarga.

### Endpoints Utilizados no Sistema
Quando você consulta as informações de um CPF, o MDR executa requisições para os seguintes serviços:
* **Cadastro Completo**: `CadastroPessoaFisicaPlus` - Retorna dados cadastrais oficiais, telefones, e-mails e endereços.
* **Score de Crédito**: `Score` - Retorna a pontuação de risco de crédito do cliente.
* **SCR Bacen**: `SCRBacen` - Consulta o histórico de endividamento e relacionamento financeiro no Sistema de Informações de Crédito do Banco Central.
* **Protestos**: `ProtestosOnline` - Pesquisa de protestos ativos em cartórios de âmbito nacional.
* **Boa Vista SCPC**: `BoaVistaAcertaCompletoPositivoPF` - Traz dados detalhados do birô Boa Vista sobre restrições financeiras.

> [!IMPORTANT]
> **Segurança e Regulação (LGPD / SCR Bacen):**
> A consulta ao relatório do **SCR Bacen** acessa informações protegidas pelo sigilo bancário. Por determinação legal e de conformidade com a LGPD, esta consulta exige a autorização expressa por escrito do cliente, a qual deve estar devidamente descrita e assinada no contrato de financiamento da MDR.

### Consulta Alternativa de CNPJ (WDAPI)
Se o documento do cliente for um **CNPJ (14 dígitos)**, o sistema ignora a Direct Data e utiliza a API gratuita da **WDAPI** (`https://wd.api.br/v1/cnpj/{CNPJ}`). Isso economiza o saldo da Direct Data em consultas corporativas.

---

## 2. Integração Multicanal (Chatwoot)

O **Chatwoot** é o sistema centralizado onde a MDR gerencia as conversas de WhatsApp, Instagram e outros canais integrados.

### Principais Recursos Operacionais
* **Caixas de Entrada (Inboxes):** Separação de conversas vindas de diferentes conexões de WhatsApp ou redes sociais.
* **Atribuição de Agentes:** Permite repassar o atendimento de um lead para um atendente ou equipe específica de forma automática ou manual.
* **Respostas Rápidas (Canned Responses):** Atalhos criados digitando `/` no chat para enviar respostas prontas, contratos e dúvidas frequentes.

### Links e Tutoriais Oficiais de Apoio
* [Visão Geral do Produto Chatwoot](https://www.chatwoot.com/docs/product)
* [Configuração de Caixas de Entrada (Canais)](https://www.chatwoot.com/docs/product/channels/overview)
* [Uso de Atalhos e Mensagens Rápidas](https://www.chatwoot.com/docs/product/features/canned-responses)
* [Gerenciamento de Agentes e Equipes](https://www.chatwoot.com/docs/product/features/agents)

---

## 3. Diretrizes de Bloqueio e Segurança (Financiamento/Crediário)

Para garantir o recebimento das parcelas das vendas realizadas no crediário, o sistema possui fluxos de travamento remoto dos dispositivos.

### A. iOS (iCloud Corporativo)
Para aparelhos Apple, a segurança é baseada no vínculo da conta corporativa iCloud da MDR.

1. **Provisionamento:** No ato da entrega do iPhone, o atendente insere o e-mail corporativo iCloud da MDR no dispositivo vendido.
2. **Procedimento de Bloqueio (Inadimplência):**
   * Se o cliente atrasar a parcela, acesse [icloud.com/find](https://www.icloud.com/find) com as credenciais corporativas.
   * Selecione o dispositivo e ative o **"Modo Perdido"** (Lost Mode).
   * Insira a mensagem padrão na tela (ex: *"Aparelho bloqueado por inadimplência. Favor entrar em contato com a MDR."*).
   * No painel do MDR, acesse o cliente e clique em **"Confirmar Bloqueio"** para registrar o status no sistema.
3. **Procedimento de Desbloqueio (Acordo/Pagamento):**
   * Acesse [icloud.com/find](https://www.icloud.com/find), selecione o aparelho e desative o Modo Perdido.
   * No painel do MDR, clique em **"Confirmar Desbloqueio"**.
4. **Remoção Definitiva (Aparelho Quitado):**
   * Quando o cliente quita todas as parcelas, o atendente deve remover fisicamente a conta iCloud da MDR do iPhone do cliente e, no sistema MDR, clicar em **"Registrar Remoção"** para fins de arquivamento seguro.

### B. Android (Google Device Lock Controller)
Para dispositivos Android, o bloqueio utiliza o recurso oficial do **Google Device Lock Controller (DLC)**, garantindo que o cliente não possa usar o aparelho em caso de atraso de pagamento.

1. **Provisionamento via QR Code (Android Enterprise):**
   * Realize o factory reset (reset de fábrica) no aparelho Android.
   * Na tela inicial de boas-vindas ("Bem-vindo"), toque repetidamente **6 vezes seguidas** na tela em uma área livre de botões.
   * O Android ativará a câmera integrada para leitura de QR Code.
   * Aponte a câmera para o QR Code de provisionamento da MDR.
   * O sistema instalará o perfil de gerenciamento e configurará o Google Device Lock Controller de forma automática e permanente.
2. **Provisionamento via Zero-Touch Enrollment (Alternativa):**
   * Se o dispositivo for homologado por distribuidor parceiro, registre o IMEI no portal do Zero-Touch para que a MDR seja definida como proprietária. O bloqueio será baixado assim que o celular se conectar à internet pela primeira vez após o reset.
3. **Registro:** Insira o IMEI correspondente do aparelho na tela de venda do MDR.
4. **Acionamento do Bloqueio:**
   * Acesse o console do Google Device Lock Controller da MDR, selecione o aparelho correspondente e envie o comando de **Bloqueio**.
   * No painel MDR, mude o status para bloqueado clicando em **"Confirmar Bloqueio"**.
5. **Acionamento do Desbloqueio:**
   * No console do Google Device Lock, envie o comando de **Desbloqueio**.
   * No painel MDR, confirme a liberação clicando em **"Confirmar Desbloqueio"**.

---

## 4. Guia de Operação das Telas do Sistema (CRM MDR)

Abaixo estão descritas as funcionalidades e o fluxo operacional de todas as telas disponíveis no painel:

* **Dashboard (`Dashboard.tsx`):** Central de indicadores gerenciais. Exibe faturamento mensal, faturamento do dia, vendas por canal, tickets médios, quantidade de OS pendentes no laboratório e gráficos de inadimplência ativa.
* **CRM / Funil de Leads (`Leads.tsx`):** Painel em formato Kanban para captação de clientes. O atendente cadastra o lead, move o card pelas colunas (Novos, Contato, Análise de Crédito, Fechados, Perdidos) e mantém o histórico de conversação sincronizado.
* **Atendimento (`Atendimento.tsx` & `Chat.tsx`):** Painel interno para visualização de filas de chat e comunicação interna.
* **Análise de Crédito (`CreditAnalysis.tsx`):** Tela para consulta integrada de CPFs no banco de dados da Direct Data (Score, SCR Bacen, etc.) ou CNPJs via WDAPI. Exibe os históricos de consultas realizadas, pontuação do cliente e permite excluir logs quando necessário.
* **PDV / Vendas de Aparelhos (`Sales.tsx`):** Frente de caixa de vendas. O atendente seleciona o cliente, o produto no estoque (celular associado a um IMEI específico, peça ou acessório), define a forma de pagamento (se parcelado via Carnê, gera o plano de financiamento) e finaliza a venda.
* **Controle de Caixa (`CashControl.tsx`):** Controle financeiro local. Permite abrir o caixa no início do turno informando o saldo inicial, registrar entradas de vendas, recebimentos de parcelas, saídas por sangrias (retiradas) ou pagamentos rápidos, e realizar o fechamento no fim do expediente.
* **Contas e Recebíveis / Financeiro (`Finance.tsx`):** Gestão geral de recebimentos e pagamentos da MDR. Permite pesquisar parcelas de carnês de clientes, realizar cobranças manuais, renegociar parcelas em aberto e cadastrar despesas (Contas a Pagar).
* **Ordens de Serviço / Laboratório (`ServiceOrders.tsx`):** Gestão da assistência técnica. Registra a entrada do aparelho, acessórios inclusos, defeito reclamado, laudo técnico, peças de reposição necessárias, valores do serviço e alteração de status (Ex: Orçamento, Aguardando Peças, Pronto para Retirada, Entregue).
* **Painel de Bloqueio de Dispositivos (`DeviceLockPanel.tsx`):** Lista todos os dispositivos vinculados a financiamentos ativos, exibindo se estão com o iCloud ou MDM ativado, permitindo visualizar o status atual da trava e registrar bloqueios ou liberações no sistema.
* **Estoque (`Inventory.tsx`):** Cadastro e monitoramento do estoque de mercadorias. Diferencia aparelhos novos/usados (controlados por IMEI) de acessórios e peças de reposição comum. Emite alertas de níveis de estoque baixos.
* **Parceiros e Comissões (`Partners.tsx`):** Gestão de influenciadores e intermediários que direcionam clientes à MDR. Controla comissões e repasses financeiros.
* **Fornecedores (`Suppliers.tsx`):** Banco de dados dos fornecedores homologados para compra de aparelhos, telas e insumos.
* **Serviços Terceirizados (`OutsourcedOrders.tsx`):** Controle de consertos enviados a laboratórios parceiros externos quando a MDR não possui os equipamentos para o reparo em sua própria sede.
* **Fiscal / Emissão de Notas (`Fiscal.tsx`):** Módulo para faturamento fiscal de produtos (NFe) ou serviços (NFSe) prestados, integrando o sistema aos órgãos estaduais e municipais.
* **Conexões (`Connections.tsx` & `Automation.tsx`):** Central de integração com a Evolution API. Permite escanear o QR Code para conectar contas de WhatsApp do sistema e configurar réguas de automação (mensagens automáticas de feliz aniversário, lembretes de vencimento de parcelas e alertas de cobrança).
* **Configurações Gerais (`Settings.tsx`):** Permite configurar as variáveis gerais, cadastrar funcionários do sistema, definir perfis de acessos (cargos/permissões) e autorizar terminais físicos aptos a abrir caixas e faturar vendas.
* **Relatórios Gerenciais (`Reports.tsx`):** Extração de dados consolidados em formato de planilha ou PDF para auditorias de vendas, despesas, rentabilidade do laboratório e taxas de inadimplência de parcelas.
* **Portal do Cliente (`CustomerOSPortal.tsx`):** Página pública e externa onde o cliente da assistência técnica da MDR digita o CPF e número da OS para consultar o andamento da manutenção de seu aparelho em tempo real, sem necessidade de contato telefônico.
