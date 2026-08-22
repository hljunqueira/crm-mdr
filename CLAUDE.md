# crm-mdr

## [Visão Geral & Arquitetura]
- **Propósito**: Aplicação / Serviço crm-mdr
- **Stack**: React (TypeScript), Drizzle, Tailwind CSS, Docker
- **Estrutura Mapeada**:
- `/.agent`
- `/.github`
- `/.vscode`
- `/automacao`
- `/dist-electron`
- `/dist-server`
- `/docs`
- `/electron`
- `/public`
- `/scratch`
- `/scripts`
- `/server`
- `/src`
- `/supabase`

## [Comandos Essenciais]
- **Desenvolvimento**: `npm run dev`
- **Build**: `npm run build`
- **Linter**: `npm run lint`
- **Testes**: `Nenhum configurado`
- **Docker**: `docker-compose up -d`

## [Skills & Protocolos de Execução Obrigatórios]

### 1. Skill: Grill Me & Quebrar Plano
- Se o pedido do usuário for ambíguo ou amplo, faça **1 a 3 perguntas diretas** antes de codificar.
- Decomponha qualquer tarefa grande em passos atômicos (um arquivo/função por vez).

### 2. Skill: Mapa de Contexto & Arquivos Protegidos
- Identifique e liste os arquivos que serão alterados antes de iniciar a edição.
- **Proibido alterar sem autorização**: arquivos \.env*\, configs de build (\
ext.config.js\, \	sconfig.json\) e credenciais.

### 3. Skill: Systematic Debugging (Zero Tentativa e Erro)
- Em caso de bug ou falha:
  1. Reproduza o erro e colete o log/mensagem exata.
  2. Isole a causa raiz e formule uma hipótese.
  3. Aplique a correção mínima necessária e valide.

### 4. Skill: Verification Before Completion (Sem "Pronto" Falso)
- NUNCA declare uma tarefa concluída sem rodar a validação fresca (linter/testes/build).
- Apresente a evidência do teste/comando executado na resposta.

### 5. Skill: Minto Pyramid & Comunicação
- Responda primeiro com a alteração/código final.
- Evite explicações teóricas desnecessárias; foque apenas nas justificativas técnicas indispensáveis.
- Mantenha o arquivo \SCRATCHPAD.md\ sincronizado com o status do trabalho.

## [Skill: UI/UX Pro Max, Motion & Design]
- **Hierarquia & Acabamento**: Não aceite interfaces genéricas. Aplique espaçamento consistente (grid 4/8px), contraste correto e microinterações em todos os elementos clicáveis.
- **Cinematic Scroll & GSAP/Framer**: Em componentes dinâmicos, use interpolação suave, revelação progressiva e aceleração via GPU (\	ransform\, \opacity\).
- **Acessibilidade**: Respeite sempre \prefers-reduced-motion\ e tags semânticas ARIA.
