# unificando o midaz: nossa jornada para um monorepo com go e next.js

## introdução

em um mundo onde a fragmentação de código em múltiplos repositórios se tornou quase um dogma, decidimos nadar contra a corrente. enquanto muitos projetos continuam dividindo suas bases de código em microsserviços cada vez menores e mais isolados, no midaz estamos voltando às origens: unificando nosso backend (go) e frontend (next.js) em um único monorepo.

esta decisão pode parecer antiquada para alguns, como se estivéssemos regredindo a uma era pré-microsserviços. mas às vezes, o caminho para a inovação está em questionar tendências dominantes e avaliar o que realmente funciona para o seu contexto. para o midaz, um sistema financeiro complexo, a coesão e a visão holística do produto se mostraram mais valiosas que a separação artificial entre camadas.

## contexto e antecedentes

como muitos sistemas modernos, o midaz nasceu com repositórios separados: um para nossa lógica financeira backend em go e outro para nosso console administrativo em next.js. inicialmente, essa divisão fazia sentido. engenheiros de backend podiam se concentrar na implementação de contabilidade de dupla entrada, processamento de transações e outras lógicas complexas de domínio financeiro sem se preocupar com gerenciamento de estado na ui. desenvolvedores frontend podiam iterar rapidamente na experiência do console sem mergulhar nas complexidades do processamento de transações financeiras.

no entanto, conforme o midaz amadurecia, essa separação começou a gerar atritos. quando um contrato de api mudava no backend, a equipe de frontend inevitavelmente descobria breaking changes somente após a integração. novos recursos exigiam coordenação entre repositórios, desacelerando entregas e complicando releases. a documentação explicando como os sistemas interagiam vivia em múltiplos lugares, às vezes se tornando inconsistente ou desatualizada.

talvez o mais preocupante fosse a divisão emergente em nossa comunidade open source. contribuidores frequentemente se especializavam em frontend ou backend, raramente compreendendo como seu trabalho se encaixava no sistema midaz completo. essa especialização, embora eficiente para tarefas de curto prazo, comprometia nosso objetivo de construir uma comunidade de desenvolvedores que entendessem profundamente sistemas financeiros de ponta a ponta.

## por que escolhemos a abordagem monorepo

nossa decisão de consolidar em um monorepo não foi tomada levianamente. muitas equipes experimentaram monorepos apenas para depois reverter o curso devido à complexidade de build, inchaço do repositório ou limitações de ferramentas. avaliamos cuidadosamente esses riscos contra os benefícios que esperávamos alcançar.

a principal vantagem que buscávamos era forçar uma visão mais integrada do nosso produto. quando um desenvolvedor faz uma alteração em um endpoint de api de transação, ele deve imediatamente ver como isso impacta a visualização da lista de transações ou componentes de formulário no console. esse feedback loop ajuda a prevenir desconexões entre recursos do backend e implementações de frontend.

mudanças atômicas entre sistemas se tornaram outro benefício convincente. com um monorepo, podemos implementar um recurso que afeta tanto a lógica de processamento do backend quanto os componentes de ui do frontend em um único pull request. os revisores de código veem o quadro completo, garantindo que o recurso funcione de ponta a ponta antes do merge.

para contribuidores open source, um monorepo simplifica drasticamente o processo de onboarding. em vez de clonar múltiplos repositórios, configurar ambientes de desenvolvimento separados e entender como conectá-los, os contribuidores podem colocar o sistema inteiro para funcionar com um único checkout e processo de configuração. essa barreira de entrada mais baixa torna contribuições casuais mais prováveis e encoraja os contribuidores a entender o sistema holisticamente.

## implementação técnica

No nosso monorepo, o código está organizado da seguinte forma:

```
.
├── midaz/                # backend e CLI em Go
│   ├── components/       # microserviços Go de domínio financeiro
│   │   ├── onboarding/   # serviço de organizações, ledgers e contas
│   │   └── transaction/  # serviço de processamento de transações
│   ├── components/mdz/   # CLI Midaz em Go
│   ├── components/infra/ # infraestrutura local (PostgreSQL, MongoDB, RabbitMQ)
│   ├── pkg/              # pacotes Go compartilhados
│   ├── scripts/          # scripts de build, testes e geração de docs
│   └── postman/          # coleções Postman para testes de API
├── midaz-console/        # aplicação Next.js (console administrativo)
│   ├── src/              # código-fonte React/Next.js
│   ├── public/           # ativos estáticos (imagens, SVGs)
│   ├── scripts/          # scripts de i18n e configuração local
│   └── ...               # testes, configurações de CI, etc.
├── midaz-sdk-golang/     # SDK Go para integração com Midaz
├── midaz-sdk-typescript/ # SDK TypeScript para integração com Midaz
└── plugins/              # plugins (auth, CRM, identity, etc.)
```

Cada projeto mantém seu próprio gerenciador de dependências: Go Modules (`go.mod`) nos serviços Go e npm/Yarn (`package.json`) no console e nos SDKs. Essa separação permite builds e testes isolados, evitando conflitos entre linguagens.

Para desenvolvimento local, usamos Docker Compose em cada componente:
- No **midaz**, executamos `docker compose` em `midaz/components/infra` para subir bancos e serviços de mensageria.
- No **midaz-console**, executamos `npm run docker-up` ou `docker compose` no diretório raiz.

A comunicação REST entre frontend e backend é definida por especificações OpenAPI mantidas no repositório. No CI, validamos continuamente esses contratos e usamos Zod no frontend para validar respostas de API, garantindo segurança de tipos. Os mapeadores em `src/core/application/mappers` convertem dados brutos em DTOs usados pela aplicação.

No backend, padronizamos formatação e lint com:
- Go: `gofmt`, `go vet` e `revive` (via `make lint`).
- Node (scripts de documentação): `ESLint` e `Prettier` em microserviços OpenAPI.

No frontend, adotamos Husky para hooks de Git, rodando Prettier, ESLint e Commitlint para validar mensagens de commit e garantir qualidade antes dos push.

## ci/cd no mundo monorepo

Para manter pipelines ágeis em um monorepo, adotamos GitHub Actions com filtros de caminho. alterações em `midaz/**` disparam apenas o pipeline de backend, enquanto `midaz-console/**` dispara o pipeline do console.

Exemplo simplificado de workflow:

```yaml
name: CI

on:
  push:
    paths:
      - 'midaz/**'
  pull_request:
    paths:
      - 'midaz/**'

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build & Test Backend
        run: make -C midaz test

on:
  push:
    paths:
      - 'midaz-console/**'
  pull_request:
    paths:
      - 'midaz-console/**'

jobs:
  console:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install & Test Console
        run: |
          npm ci --prefix midaz-console
          npm test --prefix midaz-console
```

Também aproveitamos cache de dependências e artefatos para acelerar builds subsequentes. Para releases, mantemos versionamento semântico independente e usamos `semantic-release` para publicar componentes isolados ou coordenados quando há breaking changes.

## melhores práticas para gerenciamento de monorepo

através de nossa jornada de implementação, descobrimos várias práticas que ajudam a manter a saúde do monorepo:

**estabeleça limites claros de propriedade.** mesmo em um repositório unificado, diferentes equipes ou indivíduos devem ter responsabilidades claras por componentes específicos. usamos arquivos CODEOWNERS para garantir que os revisores certos vejam mudanças em suas áreas de expertise.

**padronize onde possível, personalize onde necessário.** estabelecemos padrões consistentes para operações comuns como logging, tratamento de erros e configuração entre todos os componentes. no entanto, permitimos idiomatismos e ferramentas específicas de linguagem onde fazem sentido—forçar código go a parecer com typescript ou vice-versa seria contraproducente.

**invista na experiência do desenvolvedor.** monorepos requerem ferramentas mais sofisticadas para permanecerem produtivos. desenvolvemos scripts personalizados para tarefas comuns e documentamos extensivamente fluxos de trabalho de desenvolvimento. tempo investido em ferramentas paga dividendos através do aumento da produtividade do desenvolvedor.

**documente fluxos de trabalho entre componentes.** quando um recurso abrange múltiplos componentes, documentamos a implementação de ponta a ponta em um local central. esta documentação ajuda desenvolvedores a entender como sua peça se encaixa no sistema maior e serve como um valioso recurso de onboarding.

**monitore métricas do repositório.** acompanhamos métricas como tempos de build, tamanho do repositório e cobertura de testes para identificar potenciais problemas antes que se tornem grandes. tarefas regulares de manutenção como atualizações de dependências e remoção de código depreciado ajudam a manter o repositório saudável.

## impacto no engajamento open source

um dos resultados mais positivos de nossa transição para monorepo tem sido seu efeito em nossa comunidade open source. com uma base de código unificada, contribuidores podem entender mais facilmente como suas contribuições se encaixam no ecossistema midaz mais amplo.

o rastreamento de issues se tornou mais simplificado, já que usuários podem reportar problemas em um único repositório em vez de determinar qual componente contém o bug. solicitações de recursos frequentemente abrangem múltiplos componentes, e um monorepo torna a implementação desses recursos mais direta.

a abordagem consolidada também melhorou a descoberta do projeto. novos usuários encontram um único repositório github contendo tudo que precisam para entender e executar o midaz, em vez de navegar entre repositórios separados de backend e frontend. essa visão completa ajuda usuários a avaliar se o midaz atende suas necessidades antes de investir tempo significativo.

talvez o mais importante, a abordagem monorepo ajudou a construir uma comunidade mais coesa em torno de toda a stack tecnológica. contribuidores são mais propensos a ganhar expertise em componentes tanto de backend quanto de frontend, levando a melhorias mais holísticas no sistema. essa polinização cruzada de ideias já resultou em soluções criativas que talvez não tivessem surgido com equipes estritamente separadas.

## desafios e como estamos enfrentando-os

apesar dos benefícios, nossa jornada com monorepo não foi sem desafios. tamanho e desempenho do repositório foram preocupações imediatas, especialmente para desenvolvedores com largura de banda ou recursos computacionais limitados. enfrentamos isso com estratégias de clone parcial e sparse checkout no git, permitindo que desenvolvedores trabalhem apenas com os componentes de que precisam.

acomodar ferramentas específicas de linguagem dentro de um fluxo de trabalho unificado requer configuração cuidadosa. por exemplo, nossos serviços go usam gofmt para formatação, enquanto nosso código typescript usa prettier. em vez de forçar uma ferramenta em todas as linguagens, integramos ambas em nossos hooks pre-commit e pipelines ci, aplicando cada uma aos tipos de arquivo apropriados.

a curva de aprendizado para desenvolvedores que anteriormente se especializavam em uma área da stack foi mais íngreme do que antecipamos. para facilitar essa transição, investimos em documentação abrangente, sessões de pair programming e workshops de cross-training que ajudam desenvolvedores a se sentirem confortáveis em toda a stack.

resistência à nova abordagem foi outro desafio, particularmente de desenvolvedores que haviam otimizado seus fluxos de trabalho para a estrutura de repositórios separados. abordamos isso comunicando claramente os benefícios que esperávamos da mudança, solicitando ativamente feedback durante a transição e estando dispostos a adaptar nossa abordagem com base na experiência do mundo real em vez de ideais teóricos.

## lições aprendidas

vários meses em nossa jornada com monorepo, descobrimos benefícios que não antecipamos durante o planejamento. refatoração entre componentes se tornou significativamente mais fácil, permitindo-nos implementar melhorias em todo o sistema que teriam sido logisticamente desafiadoras com repositórios separados. a abordagem unificada também melhorou nossa estratégia de testes, pois podemos escrever mais facilmente testes de integração que verificam funcionalidade de ponta a ponta.

desafios iniciais revelaram a importância da migração incremental. em vez de tentar uma consolidação "big bang", deveríamos ter migrado um componente de cada vez, garantindo que cada um estivesse totalmente integrado antes de passar para o próximo. essa abordagem gradual nos permitiria refinar nossos processos com mudanças menores e mais gerenciáveis.

talvez nossa lição mais valiosa tenha sido a importância da comunicação e do buy-in da equipe. os aspectos técnicos de uma transição para monorepo são desafiadores, mas solucionáveis; os aspectos humanos requerem tanta atenção quanto. retrospectivas regulares, fóruns abertos para feedback e disposição para ajustar com base nas experiências da equipe foram cruciais para navegar com sucesso por essa transição.

## direções futuras

com nossos componentes core de backend e frontend unificados com sucesso, estamos explorando oportunidades para trazer mais componentes para o monorepo. nosso ecossistema de plugins, atualmente mantido em repositórios separados, poderia se beneficiar da mesma integração estreita com componentes core que alcançamos entre backend e frontend.

melhorias de ferramentas continuam sendo uma prioridade, particularmente em torno de desempenho de build e experiência do desenvolvedor. estamos investigando sistemas de build projetados especificamente para monorepos, como nx e turborepo, que poderiam otimizar ainda mais nossos fluxos de trabalho de desenvolvimento e ci.

a abordagem monorepo também influenciou nosso pensamento arquitetural. com integração mais estreita entre componentes, estamos reconsiderando alguns de nossos limites de serviço e explorando oportunidades para implementação de recursos mais coesa. isso não significa abandonar os princípios de clean architecture que serviram bem ao midaz, mas sim garantir que nossos limites arquiteturais se alinhem com o comportamento real do sistema em vez de divisões de equipe ou repositório.

## conclusão

a decisão de unificar o midaz em um monorepo abrangendo tanto nosso backend go quanto frontend next.js mudou fundamentalmente como desenvolvemos e mantemos nossa plataforma financeira. apesar dos desafios técnicos de fundir ecossistemas díspares, os benefícios para produtividade do desenvolvedor, engajamento da comunidade e coesão geral do produto validaram esta abordagem.

para equipes considerando uma transição similar, recomendamos começar com objetivos claros além de simplesmente "adotar um monorepo." entender quais problemas específicos você está tentando resolver guiará decisões de implementação e ajudará a medir o sucesso. invista cedo em ferramentas e automação para manter desempenho de build e produtividade do desenvolvedor. finalmente, reconheça que esta transição afeta não apenas sistemas técnicos, mas também fluxos de trabalho de equipe e dinâmicas de comunidade—planeje de acordo.

conforme o midaz continua a evoluir como uma plataforma financeira open source, nosso repositório unificado fornece uma base sólida tanto para recursos atuais quanto para inovação futura. a abordagem monorepo nos ajuda a cumprir nossa promessa de um sistema financeiro abrangente e integrado que permanece acessível a desenvolvedores em todo o espectro técnico.

---

## referência do outline original

### introdução
- a decisão de mesclar o backend do midaz (go) e o midaz console (next.js) em um monorepo unificado
- por que estamos desafiando a separação convencional entre codebases de backend e frontend
- como essa mudança arquitetural se alinha com nosso objetivo de integração mais profunda e experiência de desenvolvimento unificada

### contexto e antecedentes
- a arquitetura anterior: repositórios separados para backend (go) e frontend (next.js)
- desafios que enfrentamos com a abordagem separada
  - problemas de sincronização entre mudanças de api e implementações de frontend
  - fragmentação da comunidade entre contribuidores de backend e frontend
  - complexidade em coordenar releases e versionamento
- a ascensão de monorepos no desenvolvimento de software moderno

### por que escolhemos a abordagem monorepo
- forçando uma visão mais integrada do nosso produto
- permitindo mudanças atômicas entre backend e frontend
- simplificando onboarding para novos desenvolvedores e contribuidores
- unificando nossa comunidade em torno de uma única base de código
- melhorando a visibilidade do sistema completo
- facilitando desenvolvimento e teste de recursos de ponta a ponta

### implementação técnica
- estrutura e organização do repositório
- gerenciando dependências entre ecossistemas go e javascript
- configuração do sistema de build para desenvolvimento poliglota
- considerações de fluxo de trabalho de desenvolvimento
- lidando com código e tipos compartilhados entre backend e frontend

### ci/cd no mundo monorepo
- implementando triggers de build inteligentes baseados em componentes alterados
- estratégias de caching para manter tempos de build rápidos
- pipelines paralelos de teste e implantação
- estratégia de versionamento em um ambiente monorepo
- gerenciamento de release entre diferentes componentes

### melhores práticas para gerenciamento de monorepo
- padrões de organização de código
- gerenciando preocupações transversais
- documentação e descoberta
- lidando com dependências e vendoring
- equilibrando autonomia com padronização
- ferramentas que tornam o desenvolvimento em monorepo mais eficiente

### impacto no engajamento open source
- como um monorepo simplifica o onboarding de contribuidores
- rastreamento unificado de issues e solicitações de recursos
- descoberta melhorada para o projeto inteiro
- construindo uma comunidade coesa em torno de toda a stack
- facilitando para usuários entenderem o sistema completo

### desafios e como estamos enfrentando-os
- gerenciando tamanho e desempenho do repositório
- acomodando ferramentas e fluxos de trabalho específicos de linguagem
- equilibrando autonomia da equipe com coesão do repositório
- lidando com a curva de aprendizado para desenvolvedores
- enfrentando potencial resistência à nova abordagem

### lições aprendidas
- benefícios inesperados que descobrimos
- desafios iniciais que tivemos que superar
- ajustes à nossa abordagem inicial
- feedback de nossa equipe de desenvolvimento e comunidade

### direções futuras
- expandindo o monorepo para incluir mais componentes
- melhorias de ferramentas adicionais que estamos planejando
- potencial evolução de nossa arquitetura no contexto monorepo
- como essa abordagem pode influenciar nosso ecossistema de plugins

### conclusão
- recapitulação dos benefícios que vimos da abordagem monorepo
- recomendações chave para equipes considerando uma transição similar
- nossa visão para o midaz como uma plataforma financeira unificada