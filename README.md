# MONSTRÃO

Uma operação da G.M.S.: sobrevivência em tempo real na Mata Viva. Jogo estático em Three.js, TypeScript e Vite, sem servidor ou credenciais.

## Executar

Node.js 22.12+ (validado com 24.22.1).

```sh
npm ci --cache /tmp/monstrao-npm
npm run dev -- --port 5173
```

## Build e Vercel

```sh
npm run build
npm run preview -- --port 4173
```

Importe este repositório na Vercel, selecione Vite, comando `npm run build`, diretório de saída `dist`. Instalação: `npm ci`. Não há variáveis de ambiente. A integração da Vercel pode gerar um deploy a cada push na branch vinculada. Os assets ficam no próprio build; não há fontes ou imagens de terceiros carregadas em execução.

## Jogar

WASD/setas ou joystick movimentam. No celular, o joystick fica na parte inferior, centralizado na horizontal. Esc pausa/continua; roda do mouse ajusta o zoom. Escolha Lobisomem, Górgona ou Saci no menu. Cada espécie começa com **um ataque básico automático**, voltado à criatura mais próxima dentro do alcance. Górgona e Saci também possuem uma passiva inata. Os instintos ofensivos são aprendidos nas escolhas de nível e usados **automaticamente** quando há ameaças próximas. A Esquiva é passiva: dá uma chance de evitar cada golpe recebido, sem deslocar o personagem. Os antigos atalhos Q/E/R/Espaço não ativam habilidades; o HUD mostra apenas as habilidades adquiridas, com Essência e recarga ou a chance passiva de esquiva.

## XP, itens e instintos

Cada criatura deixa um fragmento com XP configurável em `ENEMY_XP`, em `src/config.ts`: raízes **5**, espectros **8**, brutos **16**, chefe **100**. Cada fragmento é um cristal luminoso com uma etiqueta **XP**, salta ao cair e permanece visível até a coleta. A barra inferior mostra nível, XP atual e meta; preenche com a coleta e reinicia com a próxima meta ao subir de nível. O ganho aparece como **+X XP** junto à barra. O círculo sutil ao redor do agente mostra o raio inicial de coleta de **2,8 m**. Fragmentos entram em atração ao cruzar esse raio e concedem XP ao chegar ao personagem, sem precisar clicar. Itens podem aumentar o raio e o XP recebido; o Faro também amplia temporariamente a coleta. O XP só é recebido pela coleta, não pela morte da criatura.

Cada nível pausa o jogo e oferece **três opções distintas**, entre **12 itens passivos** e os **instintos da espécie escolhida**. Exemplos: Colete reforçado, Talismã de combate, Luvas do predador, Botas de patrulha, Ímã de fragmentos, proteção, regeneração e aumento do ganho de XP. A primeira escolha de um instinto desbloqueia a habilidade; escolhas seguintes aumentam sua potência. Nenhum desbloqueio passa para a partida seguinte. Consulte o equipamento adquirido na pausa.

Raridades: Comum (55%), Incomum (27%), Raro (12%), Épico (5%) e Lendário (1%). Qualidades: Padrão (65%), Superior (28%) e Obra-prima (7%). Ambas são sorteadas independentemente e multiplicam os **valores reais** do efeito: uma opção rara de qualidade superior concede um benefício maior. As cartas mostram nome, categoria, raridade, qualidade, efeito numérico e limite de nível. Cada opção tem um ícone local próprio. O sorteio usa o histórico dos dois últimos níveis, reduz repetição e garante pelo menos duas opções diferentes do nível anterior quando o catálogo permite. Também procura misturar itens e habilidades. Opções esgotadas saem do sorteio. Itens de Essência e recarga entram no sorteio após aprender o primeiro instinto ofensivo, quando passam a ter uso. Se o catálogo se esgotar, três treinamentos permanentes e repetíveis garantem uma escolha efetiva a cada nível. Regras, catálogo, limites e aplicação dos efeitos estão em `src/progression.ts`; probabilidades e multiplicadores em `LOOT`, `src/config.ts`.

Os instintos têm dano, alcance, custo de Essência e recarga separados em `src/species.ts` (`SKILLS` mantém os valores do Lobisomem). Valores básicos, antes de melhorias:

| Habilidade automática | Dano | Intervalo | Ativação e efeito                                                  |
| --------------------- | ---- | --------- | ------------------------------------------------------------------ |
| Sopro de Repulsão     | 28   | 9 s       | Cone voltado à ameaça mais próxima a até 6 m; empurra e desacelera |
| Faro                  | 12   | 14 s      | Pulso a até 7 m; realça ameaças e amplia a coleta por 6 s          |
| Fúria                 | 40   | 26 s      | Uivo a até 4 m; aumenta dano e cadência por 7 s                    |
| Esquiva               | 0    | Passiva   | Chance de evitar o golpe recebido; sem movimento ou contra-ataque  |

A Esquiva **nunca move o jogador**, não causa dano e não concede invulnerabilidade garantida ao ativar. Cada golpe recebido faz um sorteio independente: a primeira escolha comum dá **12%** de chance, e as melhorias aumentam essa chance até o limite de **50%** (`CFG.evasionBase`, `evasionPerPower`, `evasionCap`). Um sucesso preserva a vida e mostra “ESQUIVOU” com um círculo verde; uma falha aplica o dano normal e a proteção breve após dano. Sopro, Faro e Fúria continuam com recargas e custos independentes. Faro e Fúria também causam dano no instante da ativação — adaptações deste combate automático.

Sobreviva por oito minutos e derrote o Coração da Corrupção. Colete fragmentos dos inimigos e escolha uma melhoria em cada nível. O chefe sinaliza sua área antes de golpear, dispara projéteis radiais e invoca raízes. Atravesse o rio pela ponte. O terreno a noroeste sobe continuamente até o platô. Configurações, recordes e resultados são salvos em localStorage; armazenamento indisponível não impede jogar.

## Organização

- `src/game.ts`: ciclo, estados, ondas e progressão.
- `src/input.ts`, `camera.ts`, `map.ts`, `navigation.ts`: controles, câmera, cenário, colisões e navegação.
- `src/combat.ts`, `skills.ts`, `enemies.ts`: regras de combate, disponibilidade das habilidades e entidades.
- `src/animation.ts`, `audio.ts`, `ui.ts`, `save.ts`: apresentação, áudio sintetizado, interface e persistência.
- `src/config.ts`: duração, recursos, dano, cadência, habilidades, XP por inimigo e probabilidades de raridade/qualidade. Atributos de inimigos e padrões do chefe estão em `Game.spawn` e `Game.update`.

## Sprites e autoria

O arquivo PNG original foi extraído de **Folha de sprites do lobisomem chibi.rar**, fornecido pelo usuário. `public/wolf-source.png` preserva o original. Após inspeção, cada região de 209 × 209 foi recortada pelo canal alpha e reposicionada numa célula de 256 × 256, sem redimensionar a arte. O atlas `wolf-atlas.png` usa pivô dos pés em (128, 240), filtro nearest e margem transparente para impedir vazamento. Os 36 retângulos originais, pivôs e durações estão em `public/wolf-frames.json`. `Animator` seleciona direção, idle, caminhada, ataque, dano, uivo e morte. Para ajustar recortes, gere novamente o atlas mantendo o contrato de 6 × 6 células e o pivô, ou adapte `Animator`. O retrato usa o primeiro frame.

Os quatro inimigos agora têm arte original gerada para este projeto, seguindo a prancha aprovada pelo usuário. Os PNGs completos ficam em `public/enemies/{crawler,specter,brute,boss}.png`; o chefe possui sua própria arte. Cada folha tem **36 poses**, totalizando **144**, distribuídas assim:

- Linhas 1–4: frente, costas, esquerda, direita; cada uma contém repouso, três passos, preparação e ataque.
- Linha 5: quatro poses de dano e duas de conjuração/habilidade especial.
- Linha 6: seis poses de queda/dissolução.

Os recortes medidos, pivôs dos pés e durações estão em `src/enemy-frames.json`. `src/enemy-animation.ts` preserva a escala de pixel entre poses, aplica as UVs de cada retângulo, usa nearest sem mipmaps e compartilha a imagem entre inimigos com transformações independentes. O teste de alpha descarta o ruído quase transparente que pode existir nas imagens geradas. As poses de preparação ficam ligadas ao tempo real de antecipação dos golpes; o dano e os projéteis saem ao entrar na pose de ataque. O chefe alterna golpe de área, rajada e invocação, usando as poses de conjuração nas duas últimas. Para evitar tremores, `stableFrames` alinha horizontalmente os passos por um ponto comum do corpo, em vez de alternar entre os pés. A troca de direção tem tolerância perto das diagonais e a reação de dano mantém uma pose estável. Os sprites vivos usam recorte de alpha com escrita de profundidade; apenas as mortes usam transparência de fade. Cadáveres animam por 0,78 segundo, sem causar dano ou bloquear o caminho, e pausam junto com a simulação. O reinício descarta materiais e instâncias sem destruir as imagens compartilhadas.

Para revisar os recortes sem redesenhar os PNGs, o script opcional `scripts/inspect_enemy_atlas.py` requer Pillow e recebe `--crawler`, `--specter`, `--brute` e `--boss`, cada um com o caminho de sua imagem original. Ele mede o alpha e os pontos de apoio, copia os PNGs e gera os metadados. Os assets e metadados já estão no repositório; **Python e Pillow não são necessários para instalar, compilar ou executar o jogo**. O carregamento inicial mostra o progresso de 0 a 9 folhas (quatro inimigos, dois atlas de cenário e três agentes) e uma mensagem com botão de nova tentativa caso falhe.

Cenário e sons continuam procedurais. A folha fornecida continua sujeita aos direitos do seu autor; confirme a autorização de publicação dos assets fornecidos.

## Regras e adaptações

As habilidades e identidade foram implementadas a partir do pedido: “E os 3 Porquinhos” inspira o sopro, sentidos aguçados inspiram o faro, “Não Tão Fofo” inspira a fúria. Alcance, arcos, segundos de recarga, invulnerabilidade e Essência regenerativa são adaptações desta versão em tempo real, sem rolagens de d20. Não representam transcrição confirmada do sistema original.

O PDF e `Downloads.rar` excederam o limite de transferência de 32 MiB. Os sites PokeBonk, G.M.S. e o Google Docs enviado responderam com bloqueio HTTP 403 do proxy. Seu conteúdo não pôde ser consultado; a identidade segue as especificações textuais do pedido. Nenhum recurso do PokeBonk foi utilizado. A documentação disponível no pacote oficial Three.js instalado foi consultada; a documentação online não estava acessível.

## Validação

```sh
npm test
# Com npm run dev na porta 5173 em outro terminal:
node tests/browser.cjs
node tests/enemies-browser.cjs
node tests/stability-browser.cjs
node tests/map-browser.cjs
node tests/species-browser.cjs
node tests/field-items-browser.cjs
```

O teste de navegador usa Chromium em `/usr/bin/chromium`, substituível por `CHROMIUM_PATH`. Em outra máquina, instale Chromium ou adapte para o browser Playwright instalado. O parâmetro `?test` expõe o estado **somente em desenvolvimento** para cenários determinísticos. Os testes verificam movimentos por teclado, pausa real, combate automático, desbloqueio e ativação automática de cada habilidade, XP por espécie e coleta, níveis acumulados, chefe, vitória, derrota, limpeza no reinício, joystick e cartas de escolha em viewport móvel. Cenários de chefe e resultado aceleram o cronômetro/injetam dano para exercitar os estados; não equivalem a uma partida humana completa de oito minutos. A apresentação foi inspecionada em desktop e móvel. `npm test` cobre normalização, colisões, ponte, altura, arcos, custo/recarga e limites das melhorias, efeitos de raridade e qualidade e reinício sem habilidades. Os testes adicionais verificam os 144 recortes e pivôs, isolamento das animações, vida útil dos cadáveres, sequência visual dos ataques, etiqueta e salto do XP, preenchimento e reinício da barra em desktop e celular.

## Limitações

Primeira missão: um mapa contínuo com cinco regiões, três espécies, sem multiplayer e sem salvamento da partida em andamento. O minimapa mostra as regiões, o jogador, a ponte e o chefe. Navegação em grade com busca limitada; grandes grupos podem se aglomerar nos gargalos. As folhas de inimigos somam aproximadamente 11 MB e os dois atlas de cenário acrescentam cerca de 4,3 MB; são carregados antes do menu; conexões lentas podem levar alguns segundos no primeiro acesso. O balanceamento precisa de sessões humanas completas, especialmente em celulares físicos. A arte tem oclusão por profundidade, mas sprites não projetam sombras individuais. Qualidade baixa desliga sombras e reduz resolução. WebGL 2 e aceleração gráfica são necessários; há aviso quando o renderer não pode iniciar.

## Indicadores de combate

As garras mostram três arcos dourados voltados ao alvo e o cartão “ATACANDO”. Inimigos mostram uma marca laranja no chão e um sinal de alerta antes do golpe; ataques à distância também mostram a linha de disparo. A marca de impacto aparece quando o golpe é executado. A direção dos projéteis fica fixada na preparação para permitir desvio coerente com o indicador. Os sinais pausam com o jogo, têm população limitada e são descartados no reinício. Implementação: `src/combat-feedback.ts`. Ícones das melhorias: `src/reward-icons.ts`.

## Cinco regiões e cenário em sprites

Árvores, pedras, arbustos, construções, van, ponte e objetos de decoração agora são **sprites 2D pixelados**. O terreno, seus desníveis, caminhos e água continuam como superfícies do mundo 3D sob a câmera inclinada. Não há mais árvores cônicas nem prédios formados por caixas. Os assets originais gerados ficam em `public/scenery/forest-props.png` e `zone-props.png`. Há 24 recortes medidos em `src/scenery-frames.json` e `zone-scenery-frames.json`; a integração está em `src/scenery-sprites.ts`.

| Região                     | Localização             | Visual                                                | Vida dos inimigos | Dano  | XP    |
| -------------------------- | ----------------------- | ----------------------------------------------------- | ----------------- | ----- | ----- |
| 1 · Mata Viva              | Clareira central e base | Verde, luz dourada, estação de pesquisa               | ×1                | ×1    | ×1    |
| 2 · Bosque Bioluminescente | Noroeste                | Árvores azuis, cogumelos luminosos e platô            | ×1,3              | ×1,2  | ×1,25 |
| 3 · Floresta de Outono     | Nordeste                | Folhagem alaranjada, arco de pedra e samambaias secas | ×1,65             | ×1,45 | ×1,5  |
| 4 · Pântano da Névoa       | Sudeste                 | Salgueiros, juncos, poças e neblina                   | ×2,05             | ×1,75 | ×1,8  |
| 5 · Ruínas Ancestrais      | Sudoeste                | Arcos, pilares, círculo ritual e corrupção            | ×2,5              | ×2,15 | ×2,2  |

As regiões compartilham o mesmo espaço, sem teletransporte. Atravesse o rio pela ponte central para chegar ao lado leste. O nome da área e seu nível de perigo aparecem no HUD, com uma mensagem ao cruzar a fronteira. `src/zones.ts` centraliza os limites, as posições de referência e os multiplicadores. Cada criatura mantém os atributos da região em que nasceu; sair dela não enfraquece inimigos que estiverem perseguindo o jogador. Regiões avançadas introduzem espectros e brutos mais cedo. Após oito minutos, o chefe aparece nas Ruínas e é marcado no minimapa. A duração não exige completar cinco missões separadas.

`src/occlusion.ts` testa o caminho entre a câmera e partes do corpo do jogador, incluindo o alpha dos pixels do atlas. Objetos que realmente encobrem o agente ficam suavemente a **28% de opacidade**, conservam o recorte dos pixels e recuperam a opacidade quando ele sai. Uma tolerância curta evita piscadas junto às bordas das folhas. Pontas transparentes das imagens não disparam o efeito. O agente é desenhado após as camadas transparentes durante a oclusão para continuar legível mesmo entre sprites sobrepostos. As colisões continuam ativas enquanto a arte está transparente. Os testes cobrem sprites à frente, atrás e no mesmo plano do jogador, os caminhos entre todas as regiões e a escala de dificuldade.

As cinco imagens de direção visual enviadas na conversa são conceitos. O jogo aplica os cinco temas com sprites próprios e um mapa conectado; elas não são capturas do build publicado nem representam novos controles ou sistemas adicionais.

## Górgona e Saci

As novas folhas em `public/agents/{gorgon,saci}.png` foram preparadas com fundo transparente por geração/edição a partir das referências fornecidas; não são cópias intocadas dos anexos. Cada uma possui 36 poses: frente, costas, esquerda, direita, dano/conjuração e queda. `src/agent-frames.json` armazena os recortes e pivôs; `AgentAsset` mantém filtro nearest e escala de pixel constante. A escolha muda retrato, atributos, animação, ataque básico, passiva e catálogo de melhorias. O celular permite escolher a espécie mesmo sem o painel grande de retrato.

Todos os valores abaixo são adaptações iniciais para o combate automático e precisam de balanceamento. Cada habilidade desbloqueada tem recarga e custo de Essência independentes. As cartas mantêm raridade, qualidade e ícones. Habilidades não adquiridas ficam fora do HUD. As passivas inatas aparecem desde o início.

| Saci | Efeito básico |
| --- | --- |
| Rajada Travessa | Projétil automático: 16 de dano, intervalo 0,8 s, alcance 7 m |
| Me Pegue se Puder | Passiva inata: imobilizações acabam duas vezes mais rápido; melhorias aumentam essa taxa |
| Travessura do Vento | Cone de 24 de dano, empurrão e interrupção, recarga 8 s |
| Sumiço Rápido | Teleporte de 2,5 m na direção de movimento, até 4,5 m com melhorias; respeita obstáculos e rio, limpa imobilização, recarga 10 s. Só ativa em movimento e com ameaça próxima; não gasta recarga se estiver completamente bloqueado |
| Dia do Saci | Tornado animado ao redor do agente, 12 de dano/s por 4 s, atração e desorientação, recarga 18 s |
| Armadilha Natural | Dura até 12 s, arma em 0,3 s e prende apenas a primeira criatura por 3 s (chefes: até 0,9 s), recarga 11 s |
| Viva o SUS | Velocidade +35% e ignora a lentidão do pântano por 5 s; respeita colisões e rio, recarga 18 s |

| Górgona | Efeito básico |
| --- | --- |
| Bote das Serpentes | Ataque próximo automático: 18 de dano, intervalo 0,8 s |
| Ssssssscamas | Passiva inata: 20% de redução de corte e perfuração, além da armadura; melhorias limitadas a 55% |
| Dia do Cabelo Maluco | Mordida de 20 de dano e veneno de 8 de dano/s por 5 s, recarga 7 s; reaplicação renova o efeito sem empilhar múltiplos venenos |
| Penteado Diferenciado | O agente parado canaliza por 1,2 s sobre um alvo a até 7 m; petrifica por 2,5 s (chefe: até 0,9 s). Movimento, dano recebido, alvo morto ou fora de alcance cancelam; recarga 12 s |
| A Medusa | Petrifica criaturas próximas por 3 s; chefe recebe lentidão por 1,5 s; recarga 24 s |
| É Tipo Trocar de Roupa | Defesa aprendida: reduz em 65% um golpe bruto de pelo menos 18% da vida máxima e deixa uma pele vazia; recarga 30 s, melhorias aumentam redução até 85% |

Corte corresponde ao ataque das raízes; perfuração aos projéteis do chefe; golpes dos brutos/chefe são contusão e projéteis dos espectros são arcanos. A cada terceiro golpe recebido da mesma raiz, o agente fica imobilizado por 1,6 s antes das passivas. O pântano reduz movimento em 18%; Viva o SUS ignora esse terreno. Veneno e tornado causam dano sem provocar flashes a cada frame. Os controles de status, projéteis, armadilhas e efeitos são pausados e descartados no reinício. Esquiva do Lobisomem continua sem deslocamento; o teleporte pertence exclusivamente ao Saci quando aprendido.

`tests/species.test.ts` cobre catálogos isolados, passivas, dano por tipo, duração do veneno, chefes e os recortes das novas folhas. `tests/species-browser.cjs` exercita seleção real, uma escolha de nível, poderes automáticos, interrupções, recargas, pausa, reinício e layout móvel. São cenários acelerados, não avaliação de equilíbrio de uma partida completa.

## Itens pelo mapa e acontecimentos surpresa

Cada missão distribui **15 itens** aleatoriamente, três em cada uma das cinco áreas: uma relíquia e dois suprimentos sorteados. A distribuição muda ao reiniciar. Os pontos vêm de uma busca das áreas acessíveis a partir da base, incluindo a ponte; são afastados de obstáculos, da posição inicial e uns dos outros. A cada **30 segundos** de jogo, cada área com menos de quatro itens recebe até um novo, respeitando o limite global de **20**. A reposição não acontece em cima do jogador.

Os itens usam sprites 2D originais de 24 pixels, criados localmente em Canvas com filtro nearest. Há uma marca colorida no chão, uma etiqueta ao se aproximar e um ponto da mesma cor no minimapa. Encoste a até **1 m** para coletar; o magnetismo de XP não ativa relíquias à distância. Kits e frascos permanecem no mapa quando o recurso está cheio, com uma etiqueta explicando isso.

| Item | Efeito |
| --- | --- |
| Kit de primeiros socorros | Recupera até 30% da vida máxima |
| Frasco de Essência | Recupera até 40% da Essência máxima |
| Presa ancestral | +30% de dano dos ataques e habilidades por 15 s |
| Pluma do vento | +25% de movimento por 15 s |
| Escudo espiritual | Recebe 30% menos dano por 15 s, além das proteções existentes |
| Pedra magnética | +75% no raio de coleta de XP por 15 s |
| Relíquia instável | Revela um dos quatro acontecimentos abaixo ao coletar |

As relíquias sorteiam **Emboscada (35%)**, **Chuva de fragmentos (30%)**, **Bênção da mata (20%)** ou **Calmaria sobrenatural (15%)**. A emboscada tenta invocar de seis a dez criaturas, conforme a região, em posições livres a 7–11 m do agente; respeita o limite normal de inimigos e nunca invoca chefes. Se não houver espaço ou capacidade, concede a chuva de XP. A chuva cria cinco fragmentos físicos, com XP crescente por região, que precisam ser coletados normalmente. A bênção recupera parte da vida e Essência e concede proteção por 15 s. A calmaria interrompe e desacelera criaturas a até 12 m por 5 s e concede agilidade por 15 s.

Buffs aparecem com ícone e contagem regressiva. Recoletar o mesmo buff renova a duração, sem empilhar sua intensidade; buffs diferentes coexistem. As melhorias permanentes de nível continuam independentes: expirar um buff não remove atributos ganhos. Itens, efeitos e reposição pausam na pausa e nas escolhas de nível. Reiniciar ou voltar ao menu remove itens, avisos e buffs da missão anterior.

Regras e valores: `src/field-loot.ts`. Sprites, distribuição, coleta e reposição: `src/field-items.ts`. Integração com dano, movimento, XP e acontecimentos: `src/game.ts`. `tests/field-loot.test.ts` valida recursos, duração, alcance, distribuição e locais de emboscada; `tests/field-items-browser.cjs` verifica coleta única, efeitos reais, eventos, limite de população, pausa, reinício, reposição e apresentação no celular.
