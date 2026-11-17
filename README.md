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

WASD/setas movimentam. Garras atacam automaticamente em arco contra inimigos próximos. Q: sopro que empurra e desacelera; E: faro que realça ameaças e fragmentos em losango; R: fúria que amplia dano e cadência; Espaço: esquiva curta com invulnerabilidade. Esc pausa/continua. Roda do mouse ajusta o zoom. No celular, use o joystick e os quatro botões. Perder o foco pausa a missão.

Sobreviva por oito minutos e derrote o Coração da Corrupção. Colete fragmentos dos inimigos e escolha uma melhoria em cada nível. O chefe sinaliza sua área antes de golpear, dispara projéteis radiais e invoca raízes. Atravesse o rio pela ponte. O terreno a noroeste sobe continuamente até o platô. Configurações, recordes e resultados são salvos em localStorage; armazenamento indisponível não impede jogar.

## Organização

- `src/game.ts`: ciclo, estados, ondas e progressão.
- `src/input.ts`, `camera.ts`, `map.ts`, `navigation.ts`: controles, câmera, cenário, colisões e navegação.
- `src/combat.ts`, `skills.ts`, `enemies.ts`: regras de combate, disponibilidade das habilidades e entidades.
- `src/animation.ts`, `audio.ts`, `ui.ts`, `save.ts`: apresentação, áudio sintetizado, interface e persistência.
- `src/config.ts`: duração, recursos, dano, cadência, habilidades e limites de melhorias. Atributos de inimigos e padrões do chefe estão em `Game.spawn` e `Game.update`.

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

O teste de navegador usa Chromium em `/usr/bin/chromium`, substituível por `CHROMIUM_PATH`. Em outra máquina, instale Chromium ou adapte para o browser Playwright instalado. O parâmetro `?test` expõe o estado **somente em desenvolvimento** para cenários determinísticos. Os testes verificam movimentos por teclado, pausa real, combate automático, habilidades, níveis acumulados, chefe, vitória, derrota, limpeza no reinício, joystick e botões em viewport móvel. Cenários de chefe e resultado aceleram o cronômetro/injetam dano para exercitar os estados; não equivalem a uma partida humana completa de oito minutos. A apresentação foi inspecionada em desktop e móvel. `npm test` cobre normalização, colisões, ponte, altura, arcos, custo/recarga e limites das melhorias.

## Limitações

Primeira missão compacta: um mapa, uma espécie, sem multiplayer e sem salvamento da partida em andamento. Sem minimapa opcional. Navegação em grade com busca limitada; grandes grupos podem se aglomerar nos gargalos. O chefe reutiliza uma variante ampliada da arte do bruto. O balanceamento precisa de sessões humanas completas, especialmente em celulares físicos. A arte tem oclusão por profundidade, mas sprites não projetam sombras individuais. Qualidade baixa desliga sombras e reduz resolução. WebGL 2 e aceleração gráfica são necessários; há aviso quando o renderer não pode iniciar.
