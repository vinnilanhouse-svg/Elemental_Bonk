# Revisão da experiência MONSTRÃO / G.M.S.

Este relatório registra a revisão anterior de experiência. A ampliação posterior para oito agentes está documentada em [NEW_AGENTS.md](NEW_AGENTS.md).

Trabalho sobre o projeto existente, no template **Clareira Minimalista** escolhido. **Não foi feito push nem deploy.** As alterações ficam locais para revisão. A referência funcional inicial é o commit `9f94237`, último publicado anteriormente.

## Verificação antes de alterar

- Os 35 testes de regras anteriores e o fluxo de navegador anterior passaram no código inicial.
- A transparência por oclusão, ataques automáticos, escolha de três melhorias, pausa, itens e resultado já existiam; foram preservados e aprimorados.
- O cenário tinha uma elevação contínua no noroeste, mas o rio era uma faixa reta e a maior parte do chão permanecia plana.
- A saída ao sul com o Saci ocorreu em **1,08 s** no teste de movimento. O raio de geração de inimigos (13–19 m) excedia o raio inicial da área segura (10 m), permitindo criaturas com atributos de regiões avançadas no início.
- O HUD anterior mantinha cartões altos e descrições pouco específicas de “potência”. Notificações de região e coleta usavam áreas diferentes e podiam competir.

Os dados iniciais estão em `baseline.json`. O cenário usa semente 2718, movimento programado em círculo de raio 3 e escolhas automáticas. É uma comparação reproduzível de regras, não uma avaliação humana de habilidade.

## Implementação e evidência

| Pedido | Resultado no projeto | Verificação principal |
| --- | --- | --- |
| 1. Visibilidade | Fade localizado existente preservado; contorno de oito amostras da própria silhueta quando oculto; anel discreto nos pés; sinais de ataques desenhados após o cenário | `map-browser.cjs`, `experience-browser.cjs` |
| 2. Terreno | Mundo 120 × 112 m; malha de terreno deformada, platôs, faces de barranco rochosas, rampa do bosque, elevação no outono e ruínas; margens curvas e largura variável; altura e colisão compartilhadas | `experience.test.ts`, `map-browser.cjs` |
| 3. Cenário | Árvores menores, escala menos variável, clareira inicial de combate e rotas desobstruídas; vegetação espalhada em área maior, clareiras nos centros de região, sombras de contato em uma malha única | Inspeção visual e regiões alcançáveis |
| 4. Regiões | Clareira inicial elíptica maior; avisos até 10 m antes da fronteira, placas, mudanças ambientais e minimapa na mesma regra espacial; sem portões artificiais | Saída sul do Saci em **6,08 s**; testes de fronteira e conectividade |
| 5. Combate | Flash de dano preservado; seta da origem; números limitados e reutilizados; textos `ERROU`, `ESQUIVOU`, `PROT.`; projéteis com núcleo claro e contorno escuro; som de acerto e proteção com limitação de frequência | `browser.cjs`, `enemies-browser.cjs`, `stability-browser.cjs`, `experience-browser.cjs` |
| 6. Alvos | Alvo mantido enquanto válido; linha de visão testa obstáculos e o perfil do terreno; orientação travada durante golpe; impacto único; projéteis testam o segmento antes de acertar | Testes de seleção, obstáculos e impacto |
| 7. HUD | Ícones compactos, contagem e preenchimento de recarga, descrições em hover/foco e pausa, vitais maiores, cabeçalho institucional retirado da área de combate, XP dentro da tela | Capturas desktop, 390 × 844, 320 × 568 e 740 × 390 |
| 8. Avisos | Fila com categoria, prioridade, duração, limite e deduplicação; perigo e chefe interrompem avisos menores; uma única área de leitura | `experience.test.ts`, `experience-browser.cjs` |
| 9. Minimap | Geometria do rio compartilhada, ponte, base, perigo, seta do agente e direção, itens em losango, ameaças próximas em cruz, chefe em círculo; limites de pontos e legenda | `map-browser.cjs`, `experience-browser.cjs` |
| 10. Níveis | Efeito explicado antes dos números, valores atuais e posteriores, distinção entre desbloqueio/evolução/item; raridade e qualidade apresentadas como valores finais já calculados; pausa e níveis acumulados preservados | `progression.test.ts`, `experience.test.ts`, fluxos de nível |
| 11. Itens | Sete formatos preservados; nome e efeito só perto do agente; risco da relíquia explícito; emboscada com sinais e atraso de 1,2 s; sem geração em cima do jogador | `field-items-browser.cjs`, conectividade dos pontos |
| 12. Sprites | 108 recortes dos agentes auditados; pivôs do torso alinhados, pés e escala de pixel preservados; cauda e perna única mantidas, PNGs originais não redesenhados; prioridade de dano/ataque ajustada | `sprite-audit.json`, `audit_agent_frames.py`, testes dos atlas |
| 13. Equilíbrio | Corrigida a exposição involuntária a atributos avançados; Górgona de 18 para 20 de dano básico, com motivo registrado abaixo; imunidade breve à reaplicação de raízes; atributos de inimigos centralizados | `baseline.json`, `opener-current.json`, `opener-final.json` |
| 14. Missão | Cronômetro de 480 s simulado, chefe nas Ruínas, vitória só após derrota do chefe, resultado e recorde persistidos; HUD explica `CHEFE` e a barra de vida do chefe | `experience-browser.cjs`, `browser.cjs`, padrões do chefe em `enemies-browser.cjs` |
| 15. Menu/pausa | Fundo limpo extraído do conceito aprovado, personagens originais selecionáveis, prévia das cinco regiões, jogar acessível em telas baixas, ajuda por espécie, acervo dos três agentes e pausa com níveis/efeitos/itens | Testes de cinco tamanhos de menu e foco |
| 16. Celular/acessibilidade | Joystick inferior central preservado, ícones fora da área do joystick, foco visível, ciclo de foco dos diálogos, teclado nos campos de ajustes, toques sem rolagem do jogo, margens superiores/inferiores de área segura e opção de reduzir efeitos | `experience-browser.cjs` e testes móveis anteriores |
| 17. Estabilidade | Simulação por passos de 1/60 s, HUD atualizado a 10 Hz, fila e entidades limitadas, números em pool de 24, sombras estáticas atualizadas uma vez, nenhuma renderização do mundo 3D sob o menu opaco | `performance-browser.cjs`, `performance.json` |
| 18. Persistência | Preferências antigas v1 aceitas; dados inválidos/infinitos tratados; preferência de efeitos persistida; reinício limpa inimigos, efeitos, itens, avisos, emboscadas e recursos; listeners não são registrados novamente | Testes de salvamento, reinício e recarga |

## Motivo do ajuste da Górgona

Uma raiz inicial possui aproximadamente 38 de vida. O ataque básico de 18 exigia três acertos; o Lobisomem de 22 exige dois. O controle adicional da Górgona precisa ser aprendido, e o teste programado expôs dano recebido antes dessa evolução. O novo valor 20 permite dois acertos contra as primeiras raízes, sem mudar vida, velocidade ou passiva da espécie. A resistência de inimigos ainda cresce com o tempo e a região. O roteiro registrou 30,8 s de sobrevivência da Górgona na etapa intermediária e 48,4 s na versão final. Outras correções de navegação também entraram nessa comparação; ela não isola o efeito do ajuste de dano. Isso não é prova de equilíbrio final: o roteiro não para para canalizar o olhar e não busca ativamente todos os fragmentos.

A imunidade de raiz evita imobilização contínua por vários inimigos: após o efeito de 1,6 s, há 3 s sem reaplicação. As proteções existentes continuam multiplicativas e a Esquiva do Lobisomem não desloca o agente.

## Como reproduzir

```sh
npm ci --cache /tmp/monstrao-npm
npm test
npm run build
npm run dev -- --port 5173
# Em outro terminal, com o servidor ativo:
node tests/run-browser.cjs
node tests/opener-benchmark.cjs reports/opener-final.json
```

- `browser-regressions.json`: status e duração de cada suíte real de navegador.
- `experience-validation.json`: verificações integradas e retângulos do botão Jogar em cinco tamanhos.
- `performance.json`: pico de entidades, tempos de simulação/renderização e memória do renderer após oito reinícios.
- `sprite-audit.json`: auditoria aplicada sem alterar os PNGs dos agentes.
- `boss-layout.json`: barra do chefe abaixo do minimapa em 320 × 568 e 740 × 390; aviso de perigo com espaçamento mínimo de 8 px em relação ao mapa.

O teste de missão completa mantém invulnerabilidade para validar o cronômetro, geração e resultados de forma determinística, e injeta dano na conclusão do chefe. Os padrões ofensivos, preparação, alcance, morte e vitória também são exercitados separadamente. Isso não substitui uma partida humana de oito minutos para avaliar dificuldade.

## Limitações e pendências de validação

- Refinar a dificuldade com pessoas jogando, especialmente Górgona parada para canalizar e Saci buscando XP de ataques distantes. O roteiro de círculo registrou derrotas; não foi mascarado com aumentos arbitrários de vida.
- Verificar desempenho e toques em aparelhos Android/iOS físicos, incluindo recortes de tela. Os testes móveis usam viewports no Chromium; o desempenho medido usa **SwiftShader**, GPU por software, e não representa FPS de um celular real.
- O fundo do menu é um PNG estático. Personagens, controles e dados são elementos reais e interativos sobre ele.
- Árvores e construções continuam sprites 2D e usam sombras de contato. Terreno, barrancos, rampas e iluminação são tridimensionais; os sprites não projetam sombras complexas de volume.
- Sem espécies, moedas, temporadas, desbloqueios persistentes ou outros sistemas novos. A prévia de regiões no menu é informativa: a missão continua entrando pela Mata Viva, com exploração livre entre regiões.
- O empacotador ainda emite o aviso de bundle JavaScript maior que 500 kB, principalmente por Three.js. O build é estático, compatível com Vercel, sem variáveis de ambiente.

## Resultado consolidado

- Build de produção: passou.
- Testes de regras: **42 passaram**.
- Suítes de navegador: **8 passaram**, incluindo as três espécies, itens, padrões inimigos, terreno, interface e desempenho.
- Passos equivalentes a 30, 60 e 144 Hz mantiveram movimento, tempo, recargas e buffs equivalentes.
- Carga com 48 inimigos: pico de 17 projéteis, 37 efeitos e 24 números; a simulação teve mediana aproximada de 1,1 ms e percentil 95 de 3,5 ms nesta execução.
- Depois da limpeza em oito reinícios: **10 geometrias, 34 texturas, 348 filhos da cena e 12 programas**, sem crescimento entre as medições. A contagem é feita no mesmo estado vazio para evitar confundir upload tardio de ícones com vazamento.
- Indicadores concêntricos e linhas foram agrupados em uma única geometria por sinal. A captura final de carga teve 187 chamadas de desenho. O frame mediano no SwiftShader foi 200 ms; isso confirma que renderização por software é o limitante neste ambiente, sem estabelecer uma promessa de FPS em aparelhos físicos.

Prévias reais: [menu desktop](previews/menu-desktop.png), [menu móvel](previews/menu-mobile.png), [HUD móvel com chefe](previews/boss-mobile.png), [barranco do bosque](previews/terrain-cliff.png).
