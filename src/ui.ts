import { Game } from "./game";
import { SKILLS, type Skill } from "./config";
import { xpFor } from "./logic";
import { store } from "./save";
export const clock = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
const controls =
  '<div class="control-list"><span><kbd>W A S D</kbd> / setas</span><b>Movimentar</b><span><kbd>Q</kbd> Sopro de repulsão</span><span><kbd>E</kbd> Faro</span><span><kbd>R</kbd> Fúria</span><span><kbd>ESPAÇO</kbd> Esquiva</span><span><kbd>ESC</kbd> Pausar</span><b>Garras automáticas ao se aproximar</b></div>';
export class UI {
  last = "";
  panel = "";
  root = document.querySelector<HTMLDivElement>("#interface")!;
  constructor(public game: Game) {
    game.onUI = () => this.render();
    this.root.addEventListener("click", (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-action]",
      );
      if (!el) return;
      const a = el.dataset.action!;
      if (a === "start" || a === "retry") game.start();
      if (a === "pause") game.pause();
      if (a === "resume") game.resume();
      if (a === "menu") {
        this.panel = "";
        game.menu();
      }
      if (a === "help" || a === "settings") this.panel = a;
      if (a === "back") this.panel = "";
      if (a.startsWith("upgrade:")) game.choose(a.split(":")[1]);
      if (a.startsWith("skill:")) game.skill(a.split(":")[1] as Skill);
      this.last = "";
      this.render();
    });
    this.root.addEventListener("input", (e) => {
      const el = e.target as HTMLInputElement;
      if (el.id === "volume") {
        game.save.volume = +el.value;
        game.audio.volume = +el.value;
      }
      if (el.id === "quality") {
        game.save.quality = el.value;
        game.resize();
      }
      if (el.id === "shake") game.save.shake = el.checked;
      store(game.save);
    });
    this.render();
  }
  settings() {
    return `<label>Volume <input id="volume" type="range" min="0" max="1" step=".05" value="${this.game.save.volume}"></label><label>Qualidade <select id="quality"><option value="alta" ${this.game.save.quality === "alta" ? "selected" : ""}>Alta · sombras</option><option value="baixa" ${this.game.save.quality === "baixa" ? "selected" : ""}>Baixa · desempenho</option></select></label><label>Tremor de câmera <input id="shake" type="checkbox" ${this.game.save.shake ? "checked" : ""}></label>`;
  }
  render() {
    const g = this.game,
      p = g.player;
    const key = g.phase + this.panel;
    if (key !== this.last) {
      this.last = key;
      this.root.innerHTML = `<header><div class="brand"><span class="seal">✦</span><span>G.M.S.<small>GLOBAL MONSTER SECURITY</small></span></div><div class="header-right">DIVISÃO DE CONTENÇÃO <span class="status-dot"></span> SISTEMA ONLINE</div></header><div id="screen"></div><div class="credit">G.M.S. / OPERAÇÕES DE CAMPO <span>BUILD 01 · MATA VIVA</span></div>`;
      const screen = this.root.querySelector("#screen")!;
      if (g.phase === "menu") {
        screen.innerHTML = `<div class="menu-layout"><section class="intro"><div class="eyebrow">ARQUIVO DE OPERAÇÃO / 001</div><h1>MONSTRÃO<span>Uma operação da G.M.S.</span></h1><p class="intro-copy">A mata está viva.<br>Algo lá dentro também.</p><p class="brief">Anomalias foram detectadas nos arredores da base de pesquisa. Entre na mata, proteja o perímetro e contenha a origem da corrupção.</p><div class="mission-tag"><i></i> MATA VIVA <span>CONTENÇÃO · 8 MIN</span></div><button class="primary" data-action="start">INICIAR MISSÃO <span>↗</span></button><div class="menu-secondary"><button data-action="help">Como jogar <span>⌘</span></button><button data-action="settings">Configurações <span>⚙</span></button></div><div class="records"><span>RECORDE <b>${g.save.bestKills} abates</b></span><span>OPERAÇÕES CONCLUÍDAS <b>${g.save.wins.toString().padStart(2, "0")}</b></span></div></section><aside class="agent-card"><div class="eyebrow">AGENTE EM CAMPO <span>01 / 01</span></div><div class="agent-art"><img src="/wolf-portrait.png" alt="Lobisomem com colete tático verde" onerror="this.style.display='none'"><div class="agent-grid"></div><span class="cross tl">+</span><span class="cross br">+</span></div><div class="agent-id"><span class="tag">ESPÉCIE / LICANTROPO</span><h2>Lobisomem <span>✦</span></h2><p>Força ancestral. Instinto de proteção.</p><div class="agent-stats"><span>GARRAS <b>━━━━━</b></span><span>RESISTÊNCIA <b>━━━━╸</b></span><span>MOBILIDADE <b>━━━╸</b></span></div></div><div class="authorized"><span>● APTO PARA OPERAÇÃO</span><small>GMS–LW–001</small></div></aside></div><div class="terrain-label"><span>◈</span><div>MATA VIVA<small>SETOR 07 · BASE DE PESQUISA</small></div></div>`;
      }
      if (g.phase === "playing") {
        screen.innerHTML = `<div class="hud"><div class="vitals"><div class="portrait"><img src="/wolf-portrait.png" alt="Agente lobisomem"></div><div><div class="agent-name">LOBISOMEM <span id="level"></span></div><div class="bar health"><i id="hpbar"></i><span id="hptext"></span></div><div class="bar essence"><i id="epbar"></i><span id="eptext"></span></div></div></div><div class="mission-hud"><small>OPERAÇÃO 001 / MATA VIVA</small><strong id="timer"></strong><span id="kills"></span></div><button class="pause-button" data-action="pause" aria-label="Pausar">Ⅱ</button></div><div id="bossbar"></div><div class="xp-track"><i id="xpbar"></i></div><div id="toast"></div><div class="skills">${(Object.entries(SKILLS) as [Skill, typeof SKILLS.q][]).map(([k, s], i) => `<button data-action="skill:${k}" class="skill" id="skill-${i}"><kbd>${k === " " ? "ESPAÇO" : k.toUpperCase()}</kbd><span class="skill-icon">${["≋", "◉", "♜", "➤"][i]}</span><b>${s.name}</b><small>${s.cost ? s.cost + " ESS" : "ESQUIVA"}</small><em></em></button>`).join("")}</div><div class="auto-hint">GARRAS AUTOMÁTICAS <span>·</span> WASD PARA MOVER</div><div id="joystick"><i></i></div>`;
        this.joystick();
      }
      if (["paused", "upgrade", "victory", "defeat"].includes(g.phase)) {
        const title =
          g.phase === "paused"
            ? "Operação pausada"
            : g.phase === "upgrade"
              ? "Instinto aprimorado"
              : g.phase === "victory"
                ? "Anomalia contida"
                : "Agente extraído";
        screen.innerHTML = `<div class="modal-shade"><section class="modal ${g.phase === "upgrade" ? "wide" : ""}"><div class="eyebrow">${g.phase === "upgrade" ? "EVOLUÇÃO / NÍVEL " + p.level : "G.M.S. / RELATÓRIO DE CAMPO"}</div><h2>${title}</h2>${g.phase === "paused" ? `${controls}<div class="settings">${this.settings()}</div><button class="primary" data-action="resume">CONTINUAR OPERAÇÃO →</button>` : g.phase === "upgrade" ? `<p>Escolha uma melhoria para continuar.</p><div class="upgrades">${g.upgradeChoices.map((u, i) => `<button data-action="upgrade:${u.id}"><span>0${i + 1} / ${g.levels[u.id] || 0} DE ${u.max}</span><h3>${u.title}</h3><p>${u.text}</p><b>SELECIONAR ↗</b></button>`).join("")}</div>` : `<p>${g.phase === "victory" ? "A origem da corrupção foi neutralizada. O perímetro está seguro." : "A equipe de resgate chegou. Reorganize-se para uma nova incursão."}</p><div class="result"><span>TEMPO<b>${clock(g.time)}</b></span><span>NÍVEL<b>${p.level}</b></span><span>ABATES<b>${p.kills}</b></span></div><button class="primary" data-action="retry">JOGAR NOVAMENTE →</button>`}${g.phase !== "upgrade" ? '<button class="text-button" data-action="menu">Voltar ao menu</button>' : ""}</section></div>`;
      }
      if (this.panel) {
        screen.innerHTML += `<div class="modal-shade"><section class="modal"><div class="eyebrow">MANUAL DO AGENTE</div><h2>${this.panel === "help" ? "Como jogar" : "Configurações"}</h2>${this.panel === "help" ? `${controls}<p>Sobreviva por 8 minutos e derrote o Coração da Corrupção. Colete os fragmentos em losango e escolha melhorias. O rio só pode ser atravessado pela ponte.</p>` : `<div class="settings">${this.settings()}</div>`}<button class="primary" data-action="back">VOLTAR →</button></section></div>`;
      }
    }
    if (g.phase === "playing") {
      const set = (id: string, text: string) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      set("level", "NV. " + p.level);
      set("hptext", `${Math.ceil(p.hp)} / ${p.maxHp}`);
      set("eptext", `${Math.floor(p.essence)} / ${p.maxEssence}`);
      set("timer", clock(g.time));
      set(
        "kills",
        `${p.kills} ABATES · ${g.time < 480 ? "CONTENHA AS ANOMALIAS" : "ELIMINE O CORAÇÃO"}`,
      );
      for (const [id, n] of [
        ["hpbar", p.hp / p.maxHp],
        ["epbar", p.essence / p.maxEssence],
        ["xpbar", p.xp / xpFor(p.level)],
      ] as const)
        document.getElementById(id)!.style.width = `${n * 100}%`;
      set("toast", g.toastTime > 0 ? g.toast : "");
      (Object.keys(SKILLS) as Skill[]).forEach((k, i) => {
        const el = document.getElementById("skill-" + i)!;
        el.classList.toggle(
          "unavailable",
          g.cooldowns[k] > 0 || p.essence < SKILLS[k].cost,
        );
        el.querySelector("em")!.textContent =
          g.cooldowns[k] > 0 ? Math.ceil(g.cooldowns[k]) + "s" : "";
      });
      const boss = document.getElementById("bossbar")!;
      boss.innerHTML =
        g.boss && !g.boss.dead
          ? `<span>CORAÇÃO DA CORRUPÇÃO</span><div><i style="width:${(100 * g.boss.hp) / g.boss.maxHp}%"></i></div>`
          : "";
    }
  }
  joystick() {
    const el = document.getElementById("joystick")!;
    let pointer: number | null = null;
    const update = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(),
        x = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / 40)),
        z = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / 40));
      this.game.input.stick = { x, z };
      (el.firstElementChild as HTMLElement).style.transform =
        `translate(${x * 28}px,${z * 28}px)`;
    };
    el.addEventListener("pointerdown", (e) => {
      pointer = e.pointerId;
      el.setPointerCapture(pointer);
      update(e);
    });
    el.addEventListener("pointermove", (e) => {
      if (pointer === e.pointerId) update(e);
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      el.addEventListener(name, () => {
        pointer = null;
        this.game.input.stick = { x: 0, z: 0 };
        (el.firstElementChild as HTMLElement).style.transform = "";
      });
  }
}
