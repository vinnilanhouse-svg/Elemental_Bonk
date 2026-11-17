import "./style.css";
import { UI } from "./ui";
import { Game } from "./game";
import { loadEnemyAssets } from "./enemy-animation";
const root = document.querySelector<HTMLDivElement>("#interface")!;
async function start() {
  let loadingAssets = true;
  try {
    const progress = (loaded: number, total: number) => {
      root.innerHTML = `<div class="modal-shade"><section class="modal"><div class="eyebrow">G.M.S. / PREPARAÇÃO</div><h2>Carregando a Mata Viva</h2><p>Preparando os sprites dos inimigos · ${loaded} / ${total}</p><progress value="${loaded}" max="${total}" aria-label="Carregando sprites"></progress></section></div>`;
    };
    progress(0, 4);
    const assets = await loadEnemyAssets(progress);
    loadingAssets = false;
    const game = new Game(
      document.querySelector<HTMLCanvasElement>("#world")!,
      assets,
    );
    new UI(game);
    if (import.meta.env.DEV && new URLSearchParams(location.search).has("test"))
      (window as any).__game = game;
  } catch (error) {
    root.innerHTML = `<div class="modal-shade"><section class="modal"><h2>${loadingAssets ? "Falha ao carregar os sprites" : "WebGL indisponível"}</h2><p>${loadingAssets ? "Verifique sua conexão e tente carregar o jogo novamente." : "Ative a aceleração gráfica do navegador para iniciar a operação."}</p><button class="primary" id="retry-load">TENTAR NOVAMENTE</button></section></div>`;
    document.getElementById("retry-load")!.onclick = () => location.reload();
    console.error(error);
  }
}
void start();
