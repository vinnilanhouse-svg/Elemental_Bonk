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

Importe este repositório na Vercel, selecione Vite, comando `npm run build`, diretório de saída `dist`. Instalação: `npm ci`. Não há variáveis de ambiente. Nenhuma publicação foi feita automaticamente. Os assets ficam no próprio build; não há fontes ou imagens de terceiros carregadas em execução.

## Jogar

WASD/setas ou joystick movimentam. Esc pausa/continua; roda do mouse ajusta o zoom. Você começa **somente com garras automáticas**, que se orientam para a criatura mais próxima dentro do alcance. Todas as demais habilidades são aprendidas nas escolhas de nível e usadas **automaticamente** quando há ameaças próximas. Os antigos atalhos Q/E/R/Espaço não ativam habilidades; o HUD mostra desbloqueio, Essência e recarga.

## XP, itens e instintos

Cada criatura deixa um fragmento com XP configurável em `ENEMY_XP`, em `src/config.ts`: raízes **5**, espectros **8**, brutos **16**, chefe **100**. O círculo sutil ao redor do agente mostra o raio inicial de coleta de **2,8 m**. Fragmentos entram em atração ao cruzar esse raio e concedem XP ao chegar ao personagem, sem precisar clicar. Itens podem aumentar o raio e o XP recebido; o Faro também amplia temporariamente a coleta. O XP só é recebido pela coleta, não pela morte da criatura.

Cada nível pausa o jogo e oferece **três opções distintas**, entre **12 itens passivos** e **quatro instintos**. Exemplos: Colete reforçado, Amolador de garras, Luvas do predador, Botas de patrulha, Ímã de fragmentos, proteção, regeneração e aumento do ganho de XP. A primeira escolha de um instinto desbloqueia a habilidade; escolhas seguintes aumentam sua potência. Nenhum desbloqueio passa para a partida seguinte. Consulte o equipamento adquirido na pausa.

Raridades: Comum (55%), Incomum (27%), Raro (12%), Épico (5%) e Lendário (1%). Qualidades: Padrão (65%), Superior (28%) e Obra-prima (7%). Ambas são sorteadas independentemente e multiplicam os **valores reais** do efeito: uma opção rara de qualidade superior concede um benefício maior. As cartas mostram nome, categoria, raridade, qualidade, efeito numérico e limite de nível. Opções esgotadas saem do sorteio. Itens de Essência e recarga entram no sorteio após aprender o primeiro instinto, quando passam a ter uso. Se o catálogo se esgotar, três treinamentos permanentes e repetíveis garantem uma escolha efetiva a cada nível. Regras, catálogo, limites e aplicação dos efeitos estão em `src/progression.ts`; probabilidades e multiplicadores em `LOOT`, `src/config.ts`.

Os instintos têm dano, alcance, custo de Essência e recarga separados em `SKILLS`. Valores básicos, antes de melhorias:

| Habilidade automática | Dano | Intervalo | Ativação e efeito                                                           |
| --------------------- | ---- | --------- | --------------------------------------------------------------------------- |
| Sopro de Repulsão     | 28   | 9 s       | Cone voltado à ameaça mais próxima a até 6 m; empurra e desacelera          |
| Faro                  | 12   | 14 s      | Pulso a até 7 m; realça ameaças e amplia a coleta por 6 s                   |
| Fúria                 | 40   | 26 s      | Uivo a até 4 m; aumenta dano e cadência por 7 s                             |
| Esquiva               | 16   | 6 s       | Contra-ataque a até 2,5 m seguido de deslocamento e invulnerabilidade breve |

A esquiva segue a direção de movimento; parado, o agente se afasta da ameaça. Não atravessa obstáculos. Nenhuma habilidade é usada sem alvo ao alcance, sem desbloqueio, durante recarga ou sem Essência suficiente. Cada habilidade controla sua própria recarga; o jogo prioriza Sopro, Faro, Fúria e Esquiva quando várias ficam prontas juntas. Raridade, qualidade e níveis aumentam sua potência; o Cronômetro tático reduz os intervalos. Faro e Fúria agora também causam dano no instante da ativação — adaptações desta versão de combate automático.

Sobreviva por oito minutos e derrote o Coração da Corrupção. Colete fragmentos dos inimigos e escolha uma melhoria em cada nível. O chefe sinaliza sua área antes de golpear, dispara projéteis radiais e invoca raízes. Atravesse o rio pela ponte. O terreno a noroeste sobe continuamente até o platô. Configurações, recordes e resultados são salvos em localStorage; armazenamento indisponível não impede jogar.

## Organização

- `src/game.ts`: ciclo, estados, ondas e progressão.
- `src/input.ts`, `camera.ts`, `map.ts`, `navigation.ts`: controles, câmera, cenário, colisões e navegação.
- `src/combat.ts`, `skills.ts`, `enemies.ts`: regras de combate, disponibilidade das habilidades e entidades.
- `src/animation.ts`, `audio.ts`, `ui.ts`, `save.ts`: apresentação, áudio sintetizado, interface e persistência.
- `src/config.ts`: duração, recursos, dano, cadência, habilidades, XP por inimigo e probabilidades de raridade/qualidade. Atributos de inimigos e padrões do chefe estão em `Game.spawn` e `Game.update`.

## Sprites e autoria

O arquivo PNG original foi extraído de **Folha de sprites do lobisomem chibi.rar**, fornecido pelo usuário. `public/wolf-source.png` preserva o original. Após inspeção, cada região de 209 × 209 foi recortada pelo canal alpha e reposicionada numa célula de 256 × 256, sem redimensionar a arte. O atlas `wolf-atlas.png` usa pivô dos pés em (128, 240), filtro nearest e margem transparente para impedir vazamento. Os 36 retângulos originais, pivôs e durações estão em `public/wolf-frames.json`. `Animator` seleciona direção, idle, caminhada, ataque, dano, uivo e morte. Para ajustar recortes, gere novamente o atlas mantendo o contrato de 6 × 6 células e o pivô, ou adapte `Animator`. O retrato usa o primeiro frame.

Inimigos, cenário e sons foram criados proceduralmente para este projeto. A folha fornecida continua sujeita aos direitos do seu autor; confirme a autorização de publicação dos assets fornecidos.

## Regras e adaptações

As habilidades e identidade foram implementadas a partir do pedido: “E os 3 Porquinhos” inspira o sopro, sentidos aguçados inspiram o faro, “Não Tão Fofo” inspira a fúria. Alcance, arcos, segundos de recarga, invulnerabilidade e Essência regenerativa são adaptações desta versão em tempo real, sem rolagens de d20. Não representam transcrição confirmada do sistema original.

O PDF e `Downloads.rar` excederam o limite de transferência de 32 MiB. Os sites PokeBonk, G.M.S. e o Google Docs enviado responderam com bloqueio HTTP 403 do proxy. Seu conteúdo não pôde ser consultado; a identidade segue as especificações textuais do pedido. Nenhum recurso do PokeBonk foi utilizado. A documentação disponível no pacote oficial Three.js instalado foi consultada; a documentação online não estava acessível.

## Validação

```sh
npm test
# Com npm run dev na porta 5173 em outro terminal:
node tests/browser.cjs
```

O teste de navegador usa Chromium em `/usr/bin/chromium`, substituível por `CHROMIUM_PATH`. Em outra máquina, instale Chromium ou adapte para o browser Playwright instalado. O parâmetro `?test` expõe o estado **somente em desenvolvimento** para cenários determinísticos. Os testes verificam movimentos por teclado, pausa real, combate automático, desbloqueio e ativação automática de cada habilidade, XP por espécie e coleta, níveis acumulados, chefe, vitória, derrota, limpeza no reinício, joystick e cartas de escolha em viewport móvel. Cenários de chefe e resultado aceleram o cronômetro/injetam dano para exercitar os estados; não equivalem a uma partida humana completa de oito minutos. A apresentação foi inspecionada em desktop e móvel. `npm test` cobre normalização, colisões, ponte, altura, arcos, custo/recarga e limites das melhorias, efeitos de raridade e qualidade e reinício sem habilidades.

## Limitações

Primeira missão compacta: um mapa, uma espécie, sem multiplayer e sem salvamento da partida em andamento. Sem minimapa opcional. Navegação em grade com busca limitada; grandes grupos podem se aglomerar nos gargalos. O chefe reutiliza uma variante ampliada da arte do bruto. O balanceamento precisa de sessões humanas completas, especialmente em celulares físicos. A arte tem oclusão por profundidade, mas sprites não projetam sombras individuais. Qualidade baixa desliga sombras e reduz resolução. WebGL 2 e aceleração gráfica são necessários; há aviso quando o renderer não pode iniciar.
