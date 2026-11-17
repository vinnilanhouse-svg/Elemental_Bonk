import { skillFor } from "./species";
import { isNewSpecies, resourceName } from "./new-species";
import type { Player } from "./logic";
import type { Skill } from "./config";
import { evasionChance, scaleResistance, immobilizationRate } from "./skills";
const f = (n: number) => Number(n.toFixed(2)).toLocaleString("pt-BR");
export function skillDetails(p: Player, key: Skill) {
  const s = skillFor(p, key);
  if (!s) return { effect: "", numbers: "" };
  const power = 1 + p.skillPower[key];
  let effect = s.description || "",
    numbers = "";
  if (p.species === "wolf") {
    if (key === "q") {
      effect =
        "Sopro repele ameaças em um cone à frente, causa dano e desacelera.";
      numbers = `${f(s.damage * power)} dano · ${f(s.range * power)} m · empurrão ${f(3 * power)} m`;
    }
    if (key === "e") {
      effect =
        "Faro realça ameaças próximas, causa um pulso de dano e amplia a coleta durante o efeito.";
      numbers = `${f(s.damage * power)} dano · ${f(s.duration * power)} s · coleta ${f(p.collect * 1.5 * power)} m`;
    }
    if (key === "r") {
      effect =
        "Fúria causa um uivo de dano e aumenta temporariamente dano e cadência do ataque básico.";
      numbers = `${f(s.damage * power)} dano · ${f(s.duration * power)} s · dano básico +${f(70 * power)}% · cadência +${f(65 * power)}%`;
    }
    if (key === " ") {
      effect =
        "Chance de evitar um golpe recebido. A esquiva não desloca o agente.";
      numbers = `${f(evasionChance(p) * 100)}% de esquiva`;
    }
  } else if (p.species === "gorgon") {
    if (key === "q")
      numbers = `${f(s.damage * power)} dano + veneno ${f(8 * power)}/s por 5 s · ${s.range} m`;
    if (key === "e")
      numbers = `Canal ${f(1.2)} s · pedra ${f(Math.min(4, s.duration * power))} s · chefes até 0,9 s`;
    if (key === "r")
      numbers = `Pedra ${f(Math.min(4, s.duration * power))} s · ${s.range} m · chefes lentos por 1,5 s`;
    if (key === " ")
      numbers = `Reduz ${f(scaleResistance(p) * 100)}% de corte e perfuração`;
    if (key === "defense")
      numbers = `Redução ${f((1 - Math.max(0.15, 0.35 - p.skillPower.defense * 0.1)) * 100)}% · gatilho: golpe ≥18% da vida máxima`;
  } else if (p.species === "saci") {
    if (key === "q")
      numbers = `${f(s.damage * power)} dano · cone ${s.range} m · empurrão 3 m`;
    if (key === "e")
      numbers = `Teleporte ${f(Math.min(4.5, 2.5 * power))} m · proteção ${f(s.duration * power)} s`;
    if (key === "r")
      numbers = `${f(s.damage * power)} dano/s · ${f(s.duration * power)} s · raio ${s.range} m`;
    if (key === " ")
      numbers = `Imobilizações expiram ${f(immobilizationRate(p))}× mais rápido`;
    if (key === "trap")
      numbers = `Prende ${f(Math.min(5, s.duration * power))} s · chefe até 0,9 s · armadilha no chão até 12 s`;
    if (key === "mobility")
      numbers = `Movimento +${f(35 * power)}% · ${f(s.duration * power)} s · ignora lentidão do pântano`;
  } else if (isNewSpecies(p.species)) {
    const d = f(s.damage * power), t = f(s.duration * power);
    const details: Record<string, Partial<Record<Skill, string>>> = {
      curupira: {
        q: `${d} dano + queimadura ${f(6 * power)}/s por 3 s · ${s.range} m`,
        e: `Dano +${f(40 * power)}% · proteção ${f(Math.min(.5, .2 * power) * 100)}% · ${t} s · gatilho: 3 ameaças`,
        trap: `${d} dano/s · pulsos de 0,5 s · ${t} s · raio ${s.range} m`,
        r: `${d} dano · ${t} s · raio ${s.range} m · dispersão 3 m, exceto chefes`,
      },
      vampire: {
        q: `${d} dano · cura 35% do dano efetivo · ${s.range} m · não drena espectros`,
        e: `Hipnose ${f(Math.min(4, s.duration * power))} s · ${s.range} m · não afeta chefes`,
        mobility: `Movimento +${f(35 * power)}% · ${t} s · obstáculos preservados`,
        trap: `Marca por ${t} s · até ${s.range} m · exige alvo ferido`,
        mist: `Névoa por ${t} s · raio ${s.range} m · espectros imunes`,
        borrow: `${t} s · raiz: +20% movimento; espectro: +1,2 m alcance; bruto/chefe: 20% proteção`,
        r: `${d} dano/s por ${t} s · até ${s.range} m · máximo 3 servos por 8 s`,
      },
      mummy: {
        q: `${d} dano · prisão até ${f(Math.min(4, s.duration * power))} s · puxão até 2,8 m · chefe até 0,65 s`,
        e: `${d} dano + veneno ${f(7 * power)}/s por 5 s · ${s.range} m · imunidade a veneno ao aprender`,
        mobility: `Desloca até 3,5 m por trajeto válido · proteção ${t} s · gatilho: 3 ameaças`,
        r: `Sangue/Rãs/Gafanhotos: até ${f(Math.min(4, 4 * power))} s · Pedras/Morte: ${d} dano · Peste: ${f(14 * power)}/s por ${f(4 * power)} s`,
      },
      construct: {
        q: `${d} dano · ${s.range} m`,
        e: `Proteção ${f(Math.min(.6, .3 * power) * 100)}% · ${t} s`,
        defense: `Repara ${f(Math.min(.55, .25 * power) * 100)}% da vida máxima · gatilho: vida ≤35%`,
        mobility: `${d} dano · ${s.range} m · interrompe ataques · gatilho: 3 ameaças`,
        r: `${d} dano · raio ${s.range} m · aviso 1,2 s · vida mínima após reconstruir 30% · gatilho: vida ≤25% + 3 ameaças`,
      },
      fairy: {
        q: `Desorientação até ${f(Math.min(4, s.duration * power))} s · ${s.range} m · chefe apenas lento`,
        e: `${d} dano · interrupção até ${f(Math.min(4, s.duration * power))} s · ${s.range} m`,
        defense: `Recupera ${f(25 * power)} Essência · exige 3 s sem ameaças em 10 m`,
        r: `Primavera: cura ${f(16 * power)}; Verão: ${d} dano/s + queimadura; Outono: lentidão 3 s; Inverno: gelo ${f(Math.min(4, 1.5 * power))} s · 8 s totais`,
      },
    };
    numbers = key === " " ? "Traço inato · sem recarga" : details[p.species]?.[key] || "";
  }
  return {
    effect,
    numbers,
    interval:
      key === " "
        ? "Passiva"
        : `${f(s.cooldown * p.cooldown)} s de recarga · ${s.healthCost ? `${s.healthCost} Vida · preserva 30% da vida máxima` : `${s.cost} ${resourceName(p.species)}`}${s.apex ? " · Ápice: nível 6 + 2 poderes" : ""}`,
  };
}
