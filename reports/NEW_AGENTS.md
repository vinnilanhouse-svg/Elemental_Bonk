# Cinco agentes adicionais

Ampliação local para oito personagens, preservando a revisão Clareira Minimalista, terreno, XP, poderes automáticos e as três espécies anteriores. Preparação e validação concluídas localmente; publicação do conjunto autorizada pelo usuário em 17/11/2026.

## Personagens e poderes

| Novo agente | Ataque inicial | Evoluções automáticas |
| --- | --- | --- |
| Curupira | Golpe Primata | Isso se Enquadra em Calvície?, Fúria Primata, Fire Monkeys, SELVA!!! |
| Vampiro | Garras Noturnas | Seiva Vermelha, Mágico Coreano, Forma de Morcego, Pega Pega, A Névoa, Dois É Bom, A Sangria |
| Múmia | Chicote de Faixas | Get Over Here, Escova Esses Dentes Aí, Spider Múmia, As Pragas |
| Constructo de Metal | Punho Mecânico | Upgrade — Arma Integrada, Upgrade — Proteção, Reparo de Emergência, Sobrecarga, Auto Destruição com Reconstrução |
| Fada | Disparo Elemental | Pó de Pirlimpimpim, CALA ESSA BOCA!, Hei Michael Douglas, Quatro Estações |

Os cinco novos agentes começam apenas com o básico e traços inatos. Seus ápices exigem **nível 6 e dois poderes distintos aprendidos** antes de entrar no sorteio. Desbloqueios e evoluções usam a mesma raridade/qualidade e comparação de números do restante do catálogo. Nenhum botão ativa poderes.

- Curupira usa projéteis de fogo, queimadura, aura e fúria condicional. SELVA!!! é uma arena temporária alaranjada no terreno existente: dispersa e revela criaturas próximas, sem trocar o mapa inteiro.
- Vampiro só gasta Vida se restarem pelo menos 30% da vida máxima. Seiva Vermelha cura 35% do dano efetivo, excluindo dano além da vida restante do alvo; espectros não podem ser drenados. Hipnose não controla chefes. Névoa não afeta espectros. Dois É Bom copia agilidade, alcance ou proteção conforme a última vítima. A Sangria cria no máximo três servos por oito segundos, apenas em mortes por sangramento.
- Múmia puxa criaturas frágeis, controla brutos e limita controle de chefes. Hálito ensina imunidade a veneno. Spider Múmia confere destino, trajeto, terreno e distância das ameaças. As seis Pragas são sorteadas e anunciadas; Pedras avisa 0,8 s antes do impacto. A Morte causa dano base e bônus contra a categoria `revived`; atualmente não há inimigos revividos nas ondas normais.
- Constructo tem Energia no lugar de Essência, inclusive nos suprimentos, avisos e melhorias. Reparo e Sobrecarga são identificados como adaptações extras do GMSBonk. Auto Destruição exige ferimento grave e cerco, sinaliza por 1,2 s, protege o núcleo e reconstrói com ao menos 30% de vida; nunca é uma derrota automática.
- Fada seleciona Fogo, Água, Terra ou Ar no menu. Os disparos aplicam queimadura, lentidão, dano direto ou empurrão, respectivamente. Sua interrupção só gasta recurso quando há uma preparação inimiga válida. Meditação exige três segundos sem ameaças em dez metros. Quatro Estações executa Primavera, Verão, Outono e Inverno, dois segundos cada.

Características sociais e narrativas ficam descritas no acervo. Não foram inventados eventos de idiomas, terminais, fome, chuva ou penalidades de sol. Imunidade a medo e visão noturna são traços: a missão atual não aplica medo ou escuridão que retirem a leitura do jogador.

## Arte e interface

- Cinco atlas preparados com a ferramenta de imagem a partir das referências anexadas; cada um contém 36 poses: quatro direções, movimento, ataque, dano, conjuração e derrota.
- Os PNGs preparados são copiados sem repintura para `public/agents`. O importador calcula 180 recortes limitados às células, pivôs do torso e âncora no chão. Proveniência em `new-agent-atlases.json`.
- A forma de morcego usa uma silhueta pixelada simples e separada, com asas animadas por escala. Tornados, fogo, aura, maldições e sinais permanecem separados dos corpos.
- O carrossel mantém três agentes visíveis e percorre todos os oito. Um seletor permite acesso direto sem percorrer o carrossel. Acervo e ajuda foram ampliados; Fada recebe seletor de elemento.
- HUD mostra só habilidades aprendidas e traços iniciais. São nove ícones no conjunto completo do Vampiro, com rolagem em telas baixas para não ocupar a área do joystick. Descrições e estados completos permanecem na pausa.
- Contador de carregamento é calculado a partir do número real de atlas.

## Organização e reprodução

- Dados: `src/new-species.ts`; regras de segurança e ápice: `src/new-species-rules.ts`.
- Execução e limpeza: `src/new-species-combat.ts`, integrado ao relógio e pausa existentes.
- Nenhum inimigo aliado entra na população hostil nem recebe XP próprio. Recursos compartilhados de sprites são preservados na limpeza.

```sh
npm test
npm run build
# Com Vite rodando em 5173:
node tests/run-browser.cjs
```

`tests/new-species-browser.cjs` valida os cinco básicos, as 24 habilidades, seis Pragas, quatro elementos, reserva de Vida, cura sem excesso, reconstrução, pausa, expiração de servos, limpeza ao menu e acesso aos oito agentes. A interface é conferida em 1440×900, 390×844, 320×568 e 740×390. Evidência em `new-species-validation.json`.

Resultado final: **49 testes de regras passaram, nove suítes de navegador passaram e o build de produção passou**. Após os ajustes finais de suprimentos e HUD, as suítes dos novos agentes e de itens foram executadas novamente e passaram. A rolagem do conjunto completo do Vampiro foi conferida por foco em 320×568.

O preview local do build final também iniciou os cinco agentes, confirmou o elemento da Fada, Energia no Constructo, duas entradas iniciais no HUD, pausa e ausência do acesso de depuração e de erros de console. Evidência em `production-agents.json`; reprodução com `npm run preview -- --port 4173` e `node tests/production-agents.cjs`. Essa verificação foi feita no preview local, antes da publicação autorizada.

Prévias: [menu com novos agentes](previews/eight-agents-menu.png) e [HUD completo do Vampiro no celular](previews/vampire-mobile.png). A segunda captura é uma situação preparada de validação: as habilidades foram aprendidas pelo teste, não concedidas no início de uma partida normal.

## Limites

Os atributos e durações dos cinco novos agentes são um ponto inicial de balanceamento. Testes programados verificam funcionamento e segurança; ainda é necessário comparar partidas humanas e aparelhos físicos. O carregamento inclui cinco PNGs adicionais, cerca de 9,6 MB, e o bundle mantém o aviso de tamanho do Three.js. As artes foram preparadas a partir das imagens na conversa; não são cópias binárias de arquivos PNG originais anexados separadamente.
