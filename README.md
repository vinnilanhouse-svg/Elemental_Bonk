# MONSTRÃO · Uma operação da G.M.S.

Survivor de navegador em Three.js, TypeScript e Vite. Oito agentes — Lobisomem, Górgona, Saci, Curupira, Vampiro, Múmia, Constructo de Metal e Fada — enfrentam criaturas com ataques e habilidades automáticos, coletam XP e escolhem uma de três melhorias por nível.

A revisão atual usa o menu **Clareira Minimalista** e melhora visibilidade, leitura do combate, HUD, terreno e progressão espacial. [Relatório de implementação e validação](reports/IMPLEMENTATION.md).

## Executar e compilar

Node.js 22.12 ou superior.

```sh
npm ci --cache /tmp/monstrao-npm
npm run dev -- --port 5173
npm run build
npm run preview -- --port 4173
```

Vercel: preset Vite, instalação `npm ci`, build `npm run build`, saída `dist`. Sem servidor ou variáveis de ambiente. **Publicação autorizada pelo usuário em 17/11/2026, via integração GitHub → Vercel.**

## Controles e missão

- WASD/setas ou joystick inferior central: movimento.
- Esc: pausa/continua. Os menus e ajustes aceitam Tab, Enter e Espaço; os campos mantêm seus atalhos nativos.
- Roda do mouse: aproxima/afasta a câmera.
- Ataques e habilidades são automáticos. Os ícones mostram estado e recarga; hover ou foco revela a descrição, também disponível na pausa.

A missão começa na Mata Viva. Explore cinco regiões conectadas, atravesse o rio pela ponte e suba o bosque pela rampa. O perigo cresce fora da clareira inicial. Avisos antecipam fronteiras e o minimapa usa a mesma regra espacial do terreno. **Sobreviver por oito minutos não basta:** o Coração da Corrupção surge nas Ruínas e precisa ser derrotado.

Cada agente começa com um ataque básico. Cada espécie mantém seus traços inatos; os outros poderes são aprendidos nas escolhas de nível. Os ápices dos cinco novos agentes exigem nível 6 e pelo menos dois poderes distintos aprendidos. A Esquiva do Lobisomem é uma chance por golpe e nunca desloca o jogador. Saci aprende seu teleporte direcionado pelo movimento. Spider Múmia busca uma rota e um destino seguros quando cercada; nenhum deles atravessa obstáculos.

## XP e melhorias

Criaturas deixam cristais físicos identificados como XP. O círculo sutil ao redor do agente indica a coleta; os fragmentos atraídos precisam chegar ao jogador para conceder experiência. Valores-base por criatura em `ENEMY_XP`: raiz 5, espectro 8, bruto 16, chefe 100, multiplicados pela região. A barra mostra nível e meta crescente.

A cada nível, o jogo pausa para escolher **uma entre três opções distintas**, entre itens passivos e habilidades da espécie. As cartas explicam o efeito e comparam valores atuais e novos. Raridade e qualidade multiplicam os valores finais mostrados; escolhas repetidas recentes têm peso menor, e opções esgotadas ou sem efeito saem do catálogo. Níveis acumulados são processados em sequência. As melhorias da missão terminam no reinício.

Raridades: Comum 55%, Incomum 27%, Raro 12%, Épico 5%, Lendário 1%. Qualidades: Padrão 65%, Superior 28%, Obra-prima 7%. Consulte `src/progression.ts`, `src/skill-details.ts` e `LOOT` em `src/config.ts`.

## Agentes e balanceamento

| Agente | Ataque inicial | Vida | Dano básico | Intervalo |
| --- | --- | --- | --- | --- |
| Lobisomem | Garras próximas | 120 | 22 | 0,7 s |
| Górgona | Bote das Serpentes | 110 | 20 | 0,8 s |
| Saci | Rajada Travessa à distância | 95 | 16 | 0,8 s |
| Curupira | Golpe Primata | 135 | 25 | 0,85 s |
| Vampiro | Garras Noturnas | 100 | 19 | 0,58 s |
| Múmia | Chicote de Faixas | 125 | 21 | 0,85 s |
| Constructo de Metal | Punho Mecânico | 155 | 32 | 1,05 s |
| Fada | Disparo Elemental | 85 | 15 | 0,8 s |

- Lobisomem aprende Sopro, Faro, Fúria e Esquiva.
- Górgona possui Ssssssscamas e aprende veneno, olhar canalizado, petrificação em área e defesa por troca de pele. A cauda de serpente é preservada.
- Saci possui Me Pegue se Puder e aprende cone de vento, teleporte, tornado, armadilha e Viva o SUS. A única perna é preservada.

- Curupira aprende bolas de fogo, Fúria Primata, Fire Monkeys e a arena temporária SELVA!!!.
- Vampiro aprende Seiva Vermelha e os cinco poderes da Linha de Sangue, além de A Sangria. Custos de Vida preservam no mínimo 30% da vida máxima; a cura usa apenas o dano efetivo. Servos de sangramento duram oito segundos, limitados a três. O morcego usa uma silhueta pixelada separada.
- Múmia aprende faixas, hálito venenoso com imunidade a veneno, Spider Múmia e as seis Pragas sorteadas e anunciadas. Pedras têm aviso antes do impacto; chefes têm controle reduzido.
- Constructo usa Energia, arma integrada, placas e reconstrução garantida na Auto Destruição. Reparo de Emergência e Sobrecarga estão identificados como adaptações extras.
- Fada escolhe Fogo, Água, Terra ou Ar antes de jogar. Aprende pó, interrupção reativa, meditação fora de combate e a sequência Primavera → Verão → Outono → Inverno.

Atributos novos são valores iniciais para balanceamento, não valores de RPG. Características sociais e narrativas ficam no acervo, sem eventos ou penalidades ambientais inventados. [Implementação dos cinco novos agentes](reports/NEW_AGENTS.md).

Atributos e poderes: `src/species.ts` e `src/new-species.ts`; regras de segurança: `src/new-species-rules.ts`; inimigos e ondas: `ENEMY_BALANCE` e `CFG`, em `src/config.ts`; multiplicadores de região: `src/zones.ts`; itens temporários: `src/field-loot.ts`. São adaptações para combate em tempo real, não uma transcrição confirmada do PDF. O relatório explica o único ajuste de dano desta revisão e os limites da avaliação automática.

## Itens e relíquias

Quinze itens são distribuídos em pontos acessíveis, três por região, mudando a cada missão. A reposição ocorre a cada 30 segundos, com até quatro por região e vinte no mapa. Encoste a até 1 m para coletar; o magnetismo de XP não ativa relíquias à distância. Kits e frascos permanecem quando o recurso está cheio.

| Item | Efeito |
| --- | --- |
| Kit médico | Recupera até 30% da vida máxima |
| Frasco de Essência | Recupera até 40% da Essência máxima |
| Presa ancestral | +30% de dano por 15 s |
| Pluma do vento | +25% de movimento por 15 s |
| Escudo espiritual | Recebe 30% menos dano por 15 s |
| Pedra magnética | +75% no raio de coleta de XP por 15 s |
| Relíquia instável | Emboscada, chuva de XP, bênção ou calmaria |

Relíquias: Emboscada 35%, XP 30%, Bênção 20%, Calmaria 15%. Emboscadas têm preparação visível de 1,2 s e surgem a 7–11 m, com limite de população. Se não há capacidade ou posição segura, o resultado vira XP. Buffs diferentes coexistem; recoletar renova a duração sem somar intensidade. Todos pausam com o jogo.

## Terreno, arte e apresentação

O mundo possui malha 3D com elevações reais, faces de barranco, rampa do bosque e rio curvo. Altura, colisões, caminhos, minimapa e posicionamento de entidades usam funções compartilhadas em `src/terrain.ts`. A vegetação mantém sprites 2D. Objetos que encobrem o jogador ficam gradualmente a 28% de opacidade; o agente ganha contorno e marcador nos pés. Ataques importantes permanecem visíveis sobre o cenário.

- O Lobisomem veio da folha fornecida em RAR; `wolf-source.png` preserva o original e `wolf-atlas.png` guarda o atlas preparado anteriormente.
- As folhas de Górgona e Saci foram preparadas com transparência a partir das referências fornecidas. Cada agente tem 36 poses. `src/agent-frames.json` contém recortes e pivôs revisados sem redesenhar os PNGs.
- Os cinco atlas novos foram preparados com a ferramenta de imagem a partir das cinco referências anexadas. Seus PNGs preparados são copiados sem alterações para `public/agents`; `scripts/import_new_agents.py` calcula recortes e pivôs sem repintar as imagens.
- Os quatro inimigos usam 144 poses originais geradas para o projeto, em `public/enemies`. Há caminhada, preparação, impacto, dano, conjuração e derrota.
- O cenário usa atlas locais em `public/scenery`; o menu usa `public/clearing-menu.png`, preparado a partir do conceito aprovado, com controles e agentes reais sobrepostos.
- O script opcional `scripts/audit_agent_frames.py` usa Pillow para auditar recortes e alinhar pivôs (`--write`). Python não é necessário para instalar ou rodar o jogo.

Som sintetizado, recursos locais e nenhum carregamento externo de fontes ou imagens durante a execução. Volume, qualidade, tremor, redução de efeitos e recordes são salvos em localStorage. Dados inválidos ou armazenamento indisponível não impedem jogar.

## Validação

```sh
npm test
npm run build
# Com o servidor Vite ativo em 5173:
node tests/run-browser.cjs
node tests/opener-benchmark.cjs reports/opener-final.json
```

Os testes usam Chromium em `/usr/bin/chromium`; alguns scripts aceitam `CHROMIUM_PATH`. O parâmetro `?test` expõe o estado apenas em desenvolvimento. Os relatórios em `reports/` registram verificações e resultados reproduzíveis. Os cenários de missão e desempenho são automatizados e não substituem equilíbrio avaliado por pessoas ou testes em aparelhos físicos.
