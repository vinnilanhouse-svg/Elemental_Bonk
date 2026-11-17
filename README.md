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

WASD/setas ou joystick movimentam. Esc pausa/continua; roda do mouse ajusta o zoom. Você começa **somente com garras automáticas**, que se orientam para a criatura mais próxima dentro do alcance. Os instintos ofensivos são aprendidos nas escolhas de nível e usados **automaticamente** quando há ameaças próximas. A Esquiva é passiva: dá uma chance de evitar cada golpe recebido, sem deslocar o personagem. Os antigos atalhos Q/E/R/Espaço não ativam habilidades; o HUD mostra apenas as habilidades adquiridas, com Essência e recarga ou a chance passiva de esquiva.

## XP, itens e instintos

Cada criatura deixa um fragmento com XP configurável em `ENEMY_XP`, em `src/config.ts`: raízes **5**, espectros **8**, brutos **16**, chefe **100**. Cada fragmento é um cristal luminoso com uma etiqueta **XP**, salta ao cair e permanece visível até a coleta. A barra inferior mostra nível, XP atual e meta; preenche com a coleta e reinicia com a próxima meta ao subir de nível. O ganho aparece como **+X XP** junto à barra. O círculo sutil ao redor do agente mostra o raio inicial de coleta de **2,8 m**. Fragmentos entram em atração ao cruzar esse raio e concedem XP ao chegar ao personagem, sem precisar clicar. Itens podem aumentar o raio e o XP recebido; o Faro também amplia temporariamente a coleta. O XP só é recebido pela coleta, não pela morte da criatura.

Cada nível pausa o jogo e oferece **três opções distintas**, entre **12 itens passivos** e **quatro instintos**. Exemplos: Colete reforçado, Amolador de garras, Luvas do predador, Botas de patrulha, Ímã de fragmentos, proteção, regeneração e aumento do ganho de XP. A primeira escolha de um instinto desbloqueia a habilidade; escolhas seguintes aumentam sua potência. Nenhum desbloqueio passa para a partida seguinte. Consulte o equipamento adquirido na pausa.

Raridades: Comum (55%), Incomum (27%), Raro (12%), Épico (5%) e Lendário (1%). Qualidades: Padrão (65%), Superior (28%) e Obra-prima (7%). Ambas são sorteadas independentemente e multiplicam os **valores reais** do efeito: uma opção rara de qualidade superior concede um benefício maior. As cartas mostram nome, categoria, raridade, qualidade, efeito numérico e limite de nível. Cada opção tem um ícone local próprio. O sorteio usa o histórico dos dois últimos níveis, reduz repetição e garante pelo menos duas opções diferentes do nível anterior quando o catálogo permite. Também procura misturar itens e habilidades. Opções esgotadas saem do sorteio. Itens de Essência e recarga entram no sorteio após aprender o primeiro instinto ofensivo, quando passam a ter uso. Se o catálogo se esgotar, três treinamentos permanentes e repetíveis garantem uma escolha efetiva a cada nível. Regras, catálogo, limites e aplicação dos efeitos estão em `src/progression.ts`; probabilidades e multiplicadores em `LOOT`, `src/config.ts`.

Os instintos têm dano, alcance, custo de Essência e recarga separados em `SKILLS`. Valores básicos, antes de melhorias:

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

Para revisar os recortes sem redesenhar os PNGs, o script opcional `scripts/inspect_enemy_atlas.py` requer Pillow e recebe `--crawler`, `--specter`, `--brute` e `--boss`, cada um com o caminho de sua imagem original. Ele mede o alpha e os pontos de apoio, copia os PNGs e gera os metadados. Os assets e metadados já estão no repositório; **Python e Pillow não são necessários para instalar, compilar ou executar o jogo**. O carregamento inicial mostra o progresso de 0 a 4 folhas e uma mensagem com botão de nova tentativa caso falhe.

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
```

O teste de navegador usa Chromium em `/usr/bin/chromium`, substituível por `CHROMIUM_PATH`. Em outra máquina, instale Chromium ou adapte para o browser Playwright instalado. O parâmetro `?test` expõe o estado **somente em desenvolvimento** para cenários determinísticos. Os testes verificam movimentos por teclado, pausa real, combate automático, desbloqueio e ativação automática de cada habilidade, XP por espécie e coleta, níveis acumulados, chefe, vitória, derrota, limpeza no reinício, joystick e cartas de escolha em viewport móvel. Cenários de chefe e resultado aceleram o cronômetro/injetam dano para exercitar os estados; não equivalem a uma partida humana completa de oito minutos. A apresentação foi inspecionada em desktop e móvel. `npm test` cobre normalização, colisões, ponte, altura, arcos, custo/recarga e limites das melhorias, efeitos de raridade e qualidade e reinício sem habilidades. Os testes adicionais verificam os 144 recortes e pivôs, isolamento das animações, vida útil dos cadáveres, sequência visual dos ataques, etiqueta e salto do XP, preenchimento e reinício da barra em desktop e celular.

## Limitações

Primeira missão compacta: um mapa, uma espécie, sem multiplayer e sem salvamento da partida em andamento. Sem minimapa opcional. Navegação em grade com busca limitada; grandes grupos podem se aglomerar nos gargalos. As folhas de inimigos somam aproximadamente 11 MB e são carregadas antes do menu; conexões lentas podem levar alguns segundos no primeiro acesso. O balanceamento precisa de sessões humanas completas, especialmente em celulares físicos. A arte tem oclusão por profundidade, mas sprites não projetam sombras individuais. Qualidade baixa desliga sombras e reduz resolução. WebGL 2 e aceleração gráfica são necessários; há aviso quando o renderer não pode iniciar.

## Indicadores de combate

As garras mostram três arcos dourados voltados ao alvo e o cartão “ATACANDO”. Inimigos mostram uma marca laranja no chão e um sinal de alerta antes do golpe; ataques à distância também mostram a linha de disparo. A marca de impacto aparece quando o golpe é executado. A direção dos projéteis fica fixada na preparação para permitir desvio coerente com o indicador. Os sinais pausam com o jogo, têm população limitada e são descartados no reinício. Implementação: `src/combat-feedback.ts`. Ícones das melhorias: `src/reward-icons.ts`.
