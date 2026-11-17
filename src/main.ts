import "./style.css";
import { UI } from "./ui";
import { Game } from "./game";
import { loadEnemyAssets } from "./enemy-animation";
import { AGENT_META, loadAgentAssets } from "./agent-assets";
import { loadSceneryAssets } from "./scenery-sprites";
const root = document.querySelector<HTMLDivElement>("#interface")!;
async function start() {
  let loadingAssets = true,
    failed = false,
    enemies = 0,
    scenery = 0,
    agents = 0;
  const progress = () => {
    if (failed) return;
    const total = 6 + Object.keys(AGENT_META).length;
    root.innerHTML = `<div class="modal-shade"><section class="modal"><div class="eyebrow">G.M.S. / PREPARAÇÃO</div><h2>Carregando a Mata Viva</h2><p>Preparando cenário e criaturas · ${enemies + scenery + agents} / ${total}</p><progress value="${enemies + scenery + agents}" max="${total}" aria-label="Carregando sprites"></progress></section></div>`;
  };
  try {
    progress();
    const [assets, mapAssets, agentAssets] = await Promise.all([
      loadEnemyAssets((n) => {
        enemies = n;
        progress();
      }),
      loadSceneryAssets(() => {
        scenery++;
        progress();
      }),
      loadAgentAssets(() => {
        agents++;
        progress();
      }),
    ]);
    loadingAssets = false;
    const game = new Game(
      document.querySelector<HTMLCanvasElement>("#world")!,
      assets,
      mapAssets,
      agentAssets,
    );
    new UI(game);
    if (import.meta.env.DEV && new URLSearchParams(location.search).has("test"))
      (window as any).__game = game;
  } catch (error) {
    failed = true;
    root.innerHTML = `<div class="modal-shade"><section class="modal"><h2>${loadingAssets ? "Falha ao carregar os sprites" : "WebGL indisponível"}</h2><p>${loadingAssets ? "Verifique sua conexão e tente carregar o jogo novamente." : "Ative a aceleração gráfica do navegador para iniciar a operação."}</p><button class="primary" id="retry-load">TENTAR NOVAMENTE</button></section></div>`;
    document.getElementById("retry-load")!.onclick = () => location.reload();
    console.error(error);
  }
}
void start();
