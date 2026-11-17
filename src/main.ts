import "./style.css";
import { UI } from "./ui";
import { Game } from "./game";

try {
  const game = new Game(document.querySelector<HTMLCanvasElement>("#world")!);
  new UI(game);
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("test"))
    (window as any).__game = game;
} catch (error) {
  document.querySelector("#interface")!.innerHTML =
    '<div class="modal-shade"><section class="modal"><h2>WebGL indisponível</h2><p>Ative a aceleração gráfica do navegador e recarregue para iniciar a operação.</p></section></div>';
  console.error(error);
}
