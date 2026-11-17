import type { Game } from "./game";
import { CHARACTERS, SPECIES_SKILLS, SPECIES_ORDER, skillFor, type Species } from "./species";
import { ELEMENTS, isNewSpecies, NEW_CHARACTERS, resourceName, type Element } from "./new-species";
import { canPayBlood } from "./new-species-rules";
import { portraitMarkup } from "./agent-assets";
import { type Skill } from "./config";
import { xpFor } from "./logic";
import { xpProgress } from "./xp";
import { rewardIcon } from "./reward-icons";
import { evasionChance, scaleResistance, immobilizationRate } from "./skills";
import { skillDetails } from "./skill-details";
import {
  FIELD_BUFFS,
  fieldDamageMultiplier,
  type FieldBuff,
} from "./field-loot";
import { type UpgradeChoice } from "./progression";
import { ZONES, zoneAt } from "./zones";
import { Minimap } from "./minimap";
import { store } from "./save";
export const clock = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
const index: Record<Skill, number> = {
  q: 0,
  e: 1,
  r: 2,
  " ": 3,
  trap: 4,
  mobility: 5,
  defense: 6,
  mist: 7,
  borrow: 8,
};
const names: Partial<Record<Species, Partial<Record<Skill, string>>>> = {
  curupira: { q: "Bola de fogo", e: "Fúria Primata", r: "SELVA!!!", trap: "Fire Monkeys", " ": "Mata amiga" },
  vampire: { q: "Seiva", e: "Hipnose", r: "Sangria", mobility: "Morcego", trap: "Pega Pega", mist: "Névoa", borrow: "Dois É Bom", " ": "Noturno" },
  mummy: { q: "Faixas", e: "Hálito", r: "Pragas", mobility: "Spider", " ": "Ômega 3" },
  construct: { q: "Arma", e: "Placas", r: "Reconstruir", defense: "Reparo", mobility: "Sobrecarga", " ": "Metal" },
  fairy: { q: "Pirlimpimpim", e: "Silêncio", r: "Estações", defense: "Meditar", " ": "Sem medo" },
  wolf: { q: "Sopro", e: "Faro", r: "Fúria", " ": "Esquiva" },
  gorgon: {
    q: "Cabelo Maluco",
    e: "Penteado",
    r: "Medusa",
    " ": "Escamas",
    defense: "Pele vazia",
  },
  saci: {
    q: "Travessura",
    e: "Sumiço",
    r: "Tornado",
    " ": "Me Pegue",
    trap: "Armadilha",
    mobility: "Viva o SUS",
  },
};
const categories = {
  operation: "OPERAÇÃO",
  region: "REGIÃO",
  pickup: "COLETA",
  buff: "BENEFÍCIO",
  danger: "PERIGO",
  boss: "CHEFE",
};
export class UI {
  last = "";
  panel = "";
  region = 0;
  minimap = new Minimap();
  root = document.querySelector<HTMLDivElement>("#interface")!;
  constructor(public game: Game) {
    game.onUI = () => this.render();
    this.root.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")
        ?.dataset.action;
      if (!a) return;
      if (a === "start" || a === "retry") game.start();
      if (a === "pause") game.pause();
      if (a === "resume") game.resume();
      if (a === "menu") {
        this.panel = "";
        game.menu();
      }
      if (["help", "settings", "collection"].includes(a)) this.panel = a;
      if (a === "back") this.panel = "";
      if (a.startsWith("agent:")) {
        this.panel = "";
        game.selectSpecies(a.split(":")[1] as Species);
      }
      if (a.startsWith("cycle:")) {
        const all = SPECIES_ORDER;
        game.selectSpecies(
          all[
            (all.indexOf(game.selectedSpecies) + Number(a.split(":")[1]) + all.length) % all.length
          ],
        );
      }
      if (a.startsWith("region:"))
        this.region = (this.region + Number(a.split(":")[1]) + 5) % 5;
      if (a.startsWith("upgrade:")) game.choose(a.split(":")[1]);
      this.last = "";
      this.render();
    });
    this.root.addEventListener("input", (e) => {
      const el = e.target as HTMLInputElement;
      if (el.id === "agent-select") game.selectSpecies(el.value as Species);
      if (el.id === "element-select") game.selectElement(el.value as Element);
      if (el.id === "volume") {
        game.save.volume = +el.value;
        game.audio.volume = +el.value;
      }
      if (el.id === "quality") {
        game.save.quality = el.value;
        game.resize();
      }
      if (el.id === "shake") game.save.shake = el.checked;
      if (el.id === "reduced-effects") game.save.reducedEffects = el.checked;
      store(game.save);
    });
    this.root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.panel) {
        this.panel = "";
        this.last = "";
        this.render();
        e.stopPropagation();
      }
      const modal = this.root.querySelector(".modal");
      if (e.key === "Tab" && modal) {
        const focusable = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button,input,select,[tabindex="0"]',
          ),
        );
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          last?.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first?.focus();
          e.preventDefault();
        }
      }
    });
    this.render();
  }
  controls() {
    return `<div class="control-list"><span><kbd>W A S D</kbd> / setas / joystick</span><b>Movimentar</b><span><kbd>ESC</kbd></span><b>Pausar / continuar</b><span>${this.game.player.species === "wolf" ? "Garras automáticas ao se aproximar" : CHARACTERS[this.game.player.species].basic + " · ativação automática"}</span><b>Único ataque inicial</b><span>Outras habilidades automáticas</span><b>Aprenda ao subir de nível</b></div>`;
  }
  settings() {
    const s = this.game.save;
    return `<label>Volume <input id="volume" type="range" min="0" max="1" step=".05" value="${s.volume}"></label><label>Qualidade <select id="quality"><option value="alta" ${s.quality === "alta" ? "selected" : ""}>Alta · iluminação e sombras</option><option value="baixa" ${s.quality === "baixa" ? "selected" : ""}>Baixa · desempenho</option></select></label><label>Tremor de câmera <input id="shake" type="checkbox" ${s.shake ? "checked" : ""}></label><label>Reduzir efeitos intensos <input id="reduced-effects" type="checkbox" ${s.reducedEffects ? "checked" : ""}></label>`;
  }
  menu() {
    const g = this.game,
      p = g.player,
      c = CHARACTERS[p.species],
      all = SPECIES_ORDER,
      at = all.indexOf(p.species),
      order = [all[(at + all.length - 1) % all.length], p.species, all[(at + 1) % all.length]],
      zone = ZONES[this.region];
    return `<section class="clearing-menu"><label class="agent-switcher"><span>AGENTE ${at + 1} / ${all.length}</span><select id="agent-select" aria-label="Escolher entre os oito agentes">${all.map(id => `<option value="${id}" ${id === p.species ? "selected" : ""}>${CHARACTERS[id].name}</option>`).join("")}</select></label><div class="gms-mark">G.M.S.<small>GLOBAL MONSTER SECURITY</small></div><div class="clearing-content"><div class="menu-title"><h1>MONSTRÃO</h1><p>UMA OPERAÇÃO DA G.M.S.</p></div><div class="agent-stage" role="group" aria-label="Escolher agente"><button class="carousel-arrow" data-action="cycle:-1" aria-label="Agente anterior">‹</button>${order.map((id) => `<button class="agent-choice ${id === p.species ? "selected" : ""}" data-action="agent:${id}" aria-pressed="${id === p.species}"><span class="choice-art">${portraitMarkup(id, 210)}</span><strong>${CHARACTERS[id].name}</strong><small>${id === p.species ? "AGENTE SELECIONADO" : "SELECIONAR"}</small></button>`).join("")}<button class="carousel-arrow" data-action="cycle:1" aria-label="Próximo agente">›</button></div><p class="chosen-identity">${c.basic} <span>· Ataque automático</span>${p.species === "fairy" ? `<label class="element-picker">Elemento <select id="element-select" aria-label="Elemento da Fada">${Object.entries(ELEMENTS).map(([id, el]) => `<option value="${id}" ${id === p.element ? "selected" : ""}>${el.name}</option>`).join("")}</select></label>` : ""}</p><div class="region-preview"><button data-action="region:-1" aria-label="Região anterior">‹</button><div><h2>${zone.name}</h2><p>${this.region === 0 ? "Entrada da missão" : `Explore a região ${zone.id}`} · Perigo ${zone.id}/5</p></div><button data-action="region:1" aria-label="Próxima região">›</button></div><div class="menu-start"><button class="play-button" data-action="start">JOGAR</button><p>Ataques automáticos · Sobreviva e evolua</p><small>Entrada pela Mata Viva · 5 regiões conectadas</small></div><nav class="menu-links" aria-label="Menu principal"><button data-action="help">Como jogar</button><button data-action="collection">Coleção</button><button data-action="settings">Ajustes</button></nav><p class="menu-record">RECORDE ${g.save.bestKills} abates <span>·</span> ${g.save.wins} missões concluídas</p></div></section>`;
  }
  skillIcon(key: Skill) {
    const p = this.game.player.species;
    if (isNewSpecies(p)) return `${p}-${key}`;
    return p === "wolf"
      ? (
          { q: "sopro", e: "faro", r: "furia", " ": "esquiva" } as Partial<
            Record<Skill, string>
          >
        )[key] || "armor"
      : `${p}-${({ q: p === "saci" ? "wind" : "poison", e: p === "saci" ? "blink" : "gaze", r: p === "saci" ? "tornado" : "medusa", " ": p === "saci" ? "escape" : "scales", trap: "trap", mobility: "mobility", defense: "skin" } as Partial<Record<Skill, string>>)[key]}`;
  }
  skillsHTML() {
    const p = this.game.player,
      c = CHARACTERS[p.species];
    return (
      `<div class="skill basic-attack" tabindex="0" aria-label="${c.basic} · ataque automático"><span class="skill-icon">${rewardIcon(c.basicIcon)}</span><b>Básico</b><small id="claw-stats"></small><em id="claw-action" class="sr-only"></em><span class="skill-tooltip" role="tooltip"><strong>${c.basic}</strong>Ataca automaticamente uma criatura visível a até ${p.range.toFixed(1)} m. Os ícones não ativam ataques.</span></div>` +
      (Object.keys(SPECIES_SKILLS[p.species]) as Skill[])
        .filter((k) => p.skills[k] > 0)
        .map((k) => {
          const s = skillFor(p, k)!,
            d = skillDetails(p, k);
          return `<div class="skill" id="skill-${index[k]}" tabindex="0" aria-label="${s.name}"><span class="skill-icon">${rewardIcon(this.skillIcon(k))}<i class="cooldown-sweep"></i><em></em></span><b>${names[p.species]?.[k] || s.name}</b><small></small><span class="skill-tooltip" role="tooltip"><strong>${s.name} · nível ${p.skills[k]}</strong>${d.effect}<br>${d.numbers}<br>${d.interval}</span></div>`;
        })
        .join("")
    );
  }
  render() {
    const g = this.game,
      p = g.player;
    const key =
      g.phase +
      this.panel +
      p.species +
      p.element +
      p.level +
      Object.values(p.skills).join(",") +
      this.region;
    this.root.classList.toggle("in-mission", g.phase !== "menu");
    if (key !== this.last) {
      const oldPhase = this.last;
      this.last = key;
      if (g.phase === "menu") this.root.innerHTML = this.menu();
      else if (g.phase === "playing") {
        this.root.innerHTML = `<div class="hud"><section class="vitals" aria-label="Estado do agente"><div class="portrait">${portraitMarkup(p.species, 52)}</div><div><div class="agent-name">${CHARACTERS[p.species].name}<span id="level"></span></div><div class="bar health"><i id="hpbar"></i><span id="hptext"></span></div><div class="bar essence"><i id="epbar"></i><span id="eptext" title="${resourceName(p.species)}" aria-label="${resourceName(p.species)}"></span></div></div></section><div class="mission-hud"><small id="region-name"></small><strong id="timer"></strong><span id="kills"></span><span id="region-danger"></span></div><button class="pause-button" data-action="pause" aria-label="Pausar"><span class="pause-bars" aria-hidden="true"><i></i><i></i></span></button></div><div id="bossbar"></div><aside class="region-map"><span>MAPA · PERIGO 1–5</span><canvas id="region-minimap" width="160" height="148" aria-label="Minimapa das cinco regiões, jogador, itens e ameaças próximas"></canvas><small>▲ você · ◆ item · × ameaça</small></aside><aside class="notification-area" aria-label="Notificações"><div id="toast" role="status" aria-live="polite" hidden><span id="notice-category"></span><div id="field-notice"></div></div><div id="field-buffs" aria-label="Benefícios temporários"></div></aside><div id="damage-direction" hidden aria-hidden="true"><i></i></div><div id="evade-feedback" class="evade-feedback" role="status"></div><div class="skills" aria-label="Ataques automáticos e passivas">${this.skillsHTML()}</div><div id="joystick" aria-label="Controle de movimento"><i></i></div><div class="xp-panel"><div class="xp-label"><span id="xp-level"></span><span id="xp-count"></span></div><div class="xp-track" id="xp-meter" role="progressbar" aria-label="Experiência até o próximo nível" aria-valuemin="0"><i id="xpbar"></i></div><span id="xp-gain" class="xp-gain"></span></div>`;
        this.joystick();
      } else {
        const upgrade = g.phase === "upgrade",
          paused = g.phase === "paused",
          win = g.phase === "victory";
        this.root.innerHTML = `<div class="modal-shade"><section class="modal ${upgrade ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="eyebrow">${upgrade ? "EVOLUÇÃO · NÍVEL " + p.level : "G.M.S. · RELATÓRIO"}</div><h2 id="modal-title">${upgrade ? "Escolha sua melhoria" : paused ? "Operação pausada" : win ? "Missão concluída" : "Agente extraído"}</h2>${upgrade ? `<p>Escolha 1 de 3. Raridade e qualidade multiplicam os valores já mostrados nas cartas.</p><div class="upgrades">${g.upgradeChoices.map((u) => this.upgradeCard(u)).join("")}</div>` : paused ? `${this.controls()}<div class="inventory"><h3>Habilidades e efeitos ativos</h3>${this.loadout()}<h3>Itens adquiridos</h3>${this.inventory()}</div><div class="settings">${this.settings()}</div><button class="primary" data-action="resume">CONTINUAR OPERAÇÃO →</button>` : `<p>${win ? "O Coração da Corrupção foi derrotado. O perímetro está seguro e a operação foi registrada." : "A equipe de resgate chegou. Suas melhorias da partida foram encerradas; os recordes foram preservados."}</p><div class="result"><span>TEMPO<b>${clock(g.time)}</b></span><span>NÍVEL<b>${p.level}</b></span><span>ABATES<b>${p.kills}</b></span></div><button class="primary" data-action="retry">JOGAR NOVAMENTE →</button>`}${!upgrade ? '<button class="text-button" data-action="menu">Voltar ao menu</button>' : ""}</section></div>`;
      }
      if (this.panel) {
        const collection = this.panel === "collection",
          help = this.panel === "help";
        this.root.insertAdjacentHTML(
          "beforeend",
          `<div class="modal-shade"><section class="modal ${collection ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="panel-title"><div class="eyebrow">G.M.S. · ARQUIVO DO AGENTE</div><h2 id="panel-title">${help ? "Como jogar" : collection ? "Agentes disponíveis" : "Ajustes"}</h2>${
            help
              ? `${this.controls()}<p>Você começa com um ataque básico automático e a passiva da espécie, quando houver. Colete os fragmentos de XP das criaturas: a cada nível, o jogo pausa para escolher 1 de 3 melhorias. Habilidades aprendidas respeitam suas próprias recargas. ${CHARACTERS[p.species].name} usa ${resourceName(p.species)}. ${isNewSpecies(p.species) ? `Ápices exigem nível 6 e duas habilidades aprendidas. ${CHARACTERS[p.species].passive} ${p.species === "vampire" ? "Poderes da Linha de Sangue gastam Vida somente se preservarem uma reserva de 30%; Seiva Vermelha recupera vida pelo dano efetivo." : p.species === "construct" ? "Auto Destruição inclui núcleo protegido e reconstrução garantida, sem derrota automática." : p.species === "fairy" ? `Elemento atual: ${ELEMENTS[p.element].name}. ${ELEMENTS[p.element].text}` : ""}` : ""}</p><p>Sobreviva por 8 minutos e <strong>derrote o chefe nas Ruínas</strong>. O cronômetro sozinho não conclui a missão. Explore as cinco regiões conectadas; use a ponte para atravessar o rio e as rampas para subir os barrancos. Avisos antecipam regiões perigosas.</p><p>O anel sob os pés identifica seu agente. Sinais laranja antecipam ataques inimigos; a seta vermelha mostra de onde veio um golpe. Encoste nos itens para coletar. Relíquias roxas podem gerar emboscadas, sinalizadas antes de as criaturas surgirem. Buffs têm ícone e duração.</p>`
              : collection
                ? `<p>Os oito agentes estão disponíveis. Comece com um ataque e traços inatos. Os ápices dos novos agentes exigem nível 6 e duas habilidades aprendidas; os demais poderes entram nas escolhas de evolução.</p><div class="collection-grid">${(
                    Object.keys(CHARACTERS) as Species[]
                  )
                    .map(
                      (id) =>
                        `<article>${portraitMarkup(id, 120)}<h3>${CHARACTERS[id].name}</h3><p>${CHARACTERS[id].description}</p><p><strong>${CHARACTERS[id].basic}</strong> · ataque inicial</p><p>${CHARACTERS[id].passive}</p>${isNewSpecies(id) ? `<p>${NEW_CHARACTERS[id].lore}</p>` : ""}<ul>${Object.values(
                          SPECIES_SKILLS[id],
                        )
                          .filter((s) => s?.cost || s?.cooldown)
                          .map((s) => `<li>${s!.name}${s!.apex ? " · Ápice: nível 6 + 2 poderes" : ""}</li>`)
                          .join("")}</ul><button data-action="agent:${id}">SELECIONAR</button></article>`,
                    )
                    .join("")}</div>`
                : `<div class="settings">${this.settings()}</div>`
          }<button class="primary" data-action="back">VOLTAR →</button></section></div>`,
        );
      }
      if (
        g.phase === "upgrade" ||
        this.panel ||
        g.phase === "paused" ||
        g.phase === "victory" ||
        g.phase === "defeat"
      )
        requestAnimationFrame(() =>
          this.root
            .querySelector<HTMLElement>(".modal button")
            ?.focus({ preventScroll: true }),
        );
    }
    if (g.phase !== "playing") return;
    const set = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== text) el.textContent = text;
    };
    const notice = g.notifications.active,
      toast = document.getElementById("toast")!;
    toast.hidden = !notice;
    if (notice) {
      toast.className = "notice-" + notice.category;
      set("notice-category", categories[notice.category]);
      const html = `<strong>${notice.title}</strong>${notice.text ? `<p>${notice.text}</p>` : ""}`;
      const el = document.getElementById("field-notice")!;
      if (el.innerHTML !== html) el.innerHTML = html;
    }
    const buffs = document.getElementById("field-buffs")!,
      html = (Object.keys(FIELD_BUFFS) as FieldBuff[])
        .filter((k) => g.fieldItems.buffs[k] > 0)
        .map(
          (k) =>
            `<span class="field-buff" title="${FIELD_BUFFS[k].text}">${rewardIcon(FIELD_BUFFS[k].icon)}<b>${FIELD_BUFFS[k].name}</b><small>${Math.ceil(g.fieldItems.buffs[k])}s</small></span>`,
        )
        .join("") + g.speciesCombat.status().slice(0, 1).map(text => `<span class="field-buff species-buff">${text}</span>`).join("");
    if (buffs.innerHTML !== html) buffs.innerHTML = html;
    const region = zoneAt(p.x, p.z);
    set("region-name", region.name);
    set("region-danger", `REGIÃO ${region.id} · PERIGO ${region.id}/5`);
    set("level", "NV. " + p.level);
    set("hptext", `${Math.ceil(p.hp)} / ${p.maxHp}`);
    set("eptext", `${Math.floor(p.essence)} / ${p.maxEssence}${p.species === "construct" ? " EN." : ""}`);
    set("timer", g.time >= 480 ? "CHEFE" : clock(g.time));
    set("kills", `${p.kills} ABATES`);
    for (const [id, n] of [
      ["hpbar", p.hp / p.maxHp],
      ["epbar", p.essence / p.maxEssence],
      ["xpbar", xpProgress(p.xp, xpFor(p.level))],
    ] as const)
      document.getElementById(id)!.style.width = `${n * 100}%`;
    set("xp-level", `NÍVEL ${p.level}`);
    set("xp-count", `${Math.floor(p.xp)} / ${xpFor(p.level)} XP`);
    set(
      "xp-gain",
      g.xpFeedback > 0
        ? `+${Number(g.lastXP.toFixed(1)).toLocaleString("pt-BR")} XP`
        : "",
    );
    const meter = document.getElementById("xp-meter")!;
    meter.setAttribute("aria-valuenow", String(Math.floor(p.xp)));
    meter.setAttribute("aria-valuemax", String(xpFor(p.level)));
    meter.title = `Raio de coleta: ${g.collectionRadius().toFixed(1)} m`;
    this.minimap.draw(
      document.getElementById("region-minimap") as HTMLCanvasElement,
      p,
      g.boss,
      g.fieldItems.items,
      g.heading,
      g.enemies,
    );
    set(
      "claw-stats",
      `${(p.damage * fieldDamageMultiplier(g.fieldItems.buffs) * (p.empowerTime > 0 ? 1 + p.empowerDamage : 1) * (p.species === "fairy" && p.element === "earth" ? 1.2 : 1)).toFixed(1)} dano`,
    );
    set("claw-action", g.attackAnim > 0 ? "ATACANDO" : "PRONTO");
    this.root
      .querySelector(".basic-attack")
      ?.classList.toggle("attacking", g.attackAnim > 0);
    set("evade-feedback", g.evadeFeedback > 0 ? "ESQUIVOU" : "");
    for (const k of Object.keys(SPECIES_SKILLS[p.species]) as Skill[]) {
      const el = document.getElementById("skill-" + index[k]);
      if (!el) continue;
      const s = skillFor(p, k)!,
        remaining = g.cooldowns[k],
        ratio = s.cooldown
          ? Math.min(1, remaining / (s.cooldown * p.cooldown))
          : 0;
      el.style.setProperty("--cooldown", `${ratio * 100}%`);
      el.classList.toggle("unavailable", remaining > 0 || p.essence < s.cost || !canPayBlood(p, k));
      el.querySelector("em")!.textContent =
        k === " "
          ? "P"
          : remaining > 0
            ? `${Math.ceil(remaining)}`
            : p.essence < s.cost
              ? "!"
              : "";
      el.querySelector("small")!.textContent =
        k === " "
          ? p.species === "wolf"
            ? `${Math.round(evasionChance(p) * 100)}%`
            : p.species === "gorgon"
              ? `${Math.round(scaleResistance(p) * 100)}%`
              : p.species === "saci" ? `${immobilizationRate(p).toFixed(1)}×` : "Inata"
          : remaining > 0
            ? `${Math.ceil(remaining)}s`
            : p.essence < s.cost
              ? p.species === "construct" ? "Sem En." : "Sem Ess."
              : !canPayBlood(p, k) ? "Reserva" : "Pronta";
      el.setAttribute(
        "aria-label",
        `${s.name}, nível ${p.skills[k]}, ${k === " " ? "passiva" : remaining > 0 ? "recarga " + Math.ceil(remaining) + " segundos" : "automática"}`,
      );
    }
    const boss = document.getElementById("bossbar")!;
    const bossHTML =
      g.boss && !g.boss.dead
        ? `<span>CORAÇÃO DA CORRUPÇÃO · RUÍNAS</span><div><i style="width:${(100 * g.boss.hp) / g.boss.maxHp}%"></i></div>`
        : "";
    if (boss.innerHTML !== bossHTML) boss.innerHTML = bossHTML;
    const incoming = document.getElementById("damage-direction")!;
    incoming.hidden = g.damageDirectionTime <= 0 || !g.damageOrigin;
    if (g.damageOrigin)
      incoming.style.transform = `translate(-50%,-50%) rotate(${(Math.atan2(g.damageOrigin.z - p.z, g.damageOrigin.x - p.x) * 180) / Math.PI + 90}deg)`;
  }
  upgradeCard(u: UpgradeChoice) {
    return `<button class="rarity-${u.rarity.id}" data-action="upgrade:${u.id}"><div class="loot-head"><span class="loot-icon">${rewardIcon(u.id)}</span><div><span class="loot-type">${u.kind === "item" ? "ITEM PASSIVO" : u.unlock ? "NOVA HABILIDADE" : "EVOLUÇÃO DE HABILIDADE"}</span><div class="loot-rarity">${u.rarity.name}</div></div></div><h3>${u.title}</h3><span class="loot-quality">QUALIDADE / ${u.quality.name} · valores já aplicados</span><p>${u.text}</p>${u.skill && u.skill !== " " ? `<p class="loot-numbers">${skillDetails(this.game.player, u.skill).interval}</p>` : ""}<span class="loot-rank">${Number.isFinite(u.max) ? `NÍVEL ${(this.game.levels[u.id] || 0) + 1} / ${u.max}` : "TREINAMENTO CONTÍNUO"}</span><b>ESCOLHER →</b></button>`;
  }
  loadout() {
    const p = this.game.player;
    return `${this.game.speciesCombat.status().map(text => `<p>${text}</p>`).join("")}<p><strong>${CHARACTERS[p.species].basic}</strong> · ${p.damage.toFixed(1)} de dano · alcance ${p.range.toFixed(1)} m</p><ul class="loadout">${(
      Object.keys(SPECIES_SKILLS[p.species]) as Skill[]
    )
      .filter((k) => p.skills[k] > 0)
      .map((k) => {
        const d = skillDetails(p, k);
        return `<li><strong>${skillFor(p, k)!.name} · NV. ${p.skills[k]}</strong><p>${d.effect}</p><small>${d.numbers} · ${d.interval}</small></li>`;
      })
      .join("")}</ul>${(Object.keys(FIELD_BUFFS) as FieldBuff[])
      .filter((k) => this.game.fieldItems.buffs[k] > 0)
      .map(
        (k) =>
          `<p>${FIELD_BUFFS[k].name} · ${FIELD_BUFFS[k].text} · ${Math.ceil(this.game.fieldItems.buffs[k])}s restantes</p>`,
      )
      .join("")}`;
  }
  inventory() {
    return this.game.inventory.length
      ? `<ul>${this.game.inventory.map((u) => `<li><strong>${u.title}</strong> · ${u.rarity.name} · ${u.quality.name}</li>`).join("")}</ul>`
      : "<p>Nenhum item de nível adquirido nesta missão.</p>";
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
