import type { Skill } from "./config";
import type { SkillDef } from "./species";

export type NewSpecies = "curupira" | "vampire" | "mummy" | "construct" | "fairy";
export type Element = "fire" | "water" | "earth" | "air";
export const ELEMENTS = {
  fire: { name: "Fogo", color: 0xffa34c, text: "Aplica queimadura por 3 s." },
  water: { name: "Água", color: 0x89dcf5, text: "Desacelera a ameaça por 2 s." },
  earth: { name: "Terra", color: 0xd9c080, text: "Causa 20% mais dano direto." },
  air: { name: "Ar", color: 0xb8f1d0, text: "Empurra inimigos comuns por 0,65 m." },
} as const;
export const NEW_CHARACTERS = {
  curupira: {
    name: "Curupira", tag: "GUARDIÃO", basic: "Golpe Primata", basicIcon: "attack",
    hp: 135, speed: 4.8, damage: 25, range: 2.6, interval: 0.85,
    description: "Fogo, força e domínio da floresta.",
    passive: "Macacão Planeta: protege a fauna e a flora. Poderes não destroem o cenário.",
    lore: "Go!Ri!La!: corpo de primata e pés virados. Cabeça Quente: sua chama representa a vida; esta versão não aplica penalidade de chuva ou água.",
  },
  vampire: {
    name: "Vampiro", tag: "NOTURNO", basic: "Garras Noturnas", basicIcon: "damage",
    hp: 100, speed: 5.3, damage: 19, range: 2.6, interval: 0.58,
    description: "Drenagem, perseguição e sobrevivência.",
    passive: "A Morte Te Dá Parabéns: cadência sobrenatural. Visão Noturna preserva a leitura nas regiões escuras.",
    lore: "A Máscara oculta sua aparência em encontros. Corujinha Verde representa conhecimento de idiomas. Restrições de sol e entrada não se aplicam nesta missão.",
  },
  mummy: {
    name: "Múmia", tag: "ANCESTRAL", basic: "Chicote de Faixas", basicIcon: "bandage",
    hp: 125, speed: 4.4, damage: 21, range: 4.3, interval: 0.85,
    description: "Bandagens, veneno e maldições.",
    passive: "O Ômega 3: não precisa comer ou respirar. Recupera sua magia como Essência.",
    lore: "Eu Me Lembro Disso: reconhece o passado. Membros soltos permanecem uma característica narrativa, sem armas independentes inventadas.",
  },
  construct: {
    name: "Constructo de Metal", tag: "CONSTRUCTO", basic: "Punho Mecânico", basicIcon: "module",
    hp: 155, speed: 4.1, damage: 32, range: 2.7, interval: 1.05,
    description: "Força, equipamentos e Energia.",
    passive: "Receita da Vovó — Metal: usa Energia. Força É Tudo: punho lento e forte.",
    lore: "Terminais e códigos são utilidades narrativas. Esta missão não impõe vulnerabilidade extra ao fogo. Reparo de Emergência e Sobrecarga são adaptações extras do GMSBonk.",
  },
  fairy: {
    name: "Fada", tag: "ELEMENTAL", basic: "Disparo Elemental", basicIcon: "element",
    hp: 85, speed: 5.4, damage: 15, range: 8, interval: 0.8,
    description: "Elementos, ilusões e controle de área.",
    passive: "Eu Me Recuso a Escrever Isso: imunidade a medo. Seu elemento altera o ataque básico.",
    lore: "Sei que Você Vai Querer Ser...: tamanho pequeno, asas e animal guia. O guia não é uma arma adicional; o voo não atravessa paredes nem o rio.",
  },
} as const;

const skill = (name: string, cost: number, cooldown: number, duration: number, damage: number, range: number, description: string, extra: Partial<SkillDef> = {}): SkillDef =>
  ({ name, cost, cooldown, duration, damage, range, description, ...extra });
export const NEW_SKILLS: Record<NewSpecies, Partial<Record<Skill, SkillDef>>> = {
  curupira: {
    " ": skill("Macacão Planeta", 0, 0, 0, 0, 0, "Protege a fauna e a flora; seus poderes não destroem objetos naturais."),
    q: skill("Isso se Enquadra em Calvície?", 16, 5, 3, 30, 9, "Dispara uma bola de fogo contra uma ameaça visível e aplica queimadura."),
    e: skill("Fúria Primata", 26, 18, 5, 0, 4, "Quando há pelo menos três inimigos próximos, aumenta dano e proteção temporariamente."),
    trap: skill("Fire Monkeys", 24, 14, 5, 12, 3.6, "Aura de chamas causa dano em intervalos de 0,5 s aos inimigos próximos."),
    r: skill("SELVA!!!", 42, 32, 7, 24, 8, "Cria uma arena alaranjada temporária, dispersa inimigos e os revela dentro dela. Chefes resistem à dispersão.", { apex: true }),
  },
  vampire: {
    " ": skill("A Morte Te Dá Parabéns", 0, 0, 0, 0, 0, "A força e rapidez sobrenaturais já fazem parte dos atributos iniciais; Visão Noturna mantém a percepção."),
    q: skill("Seiva Vermelha", 12, 6, 0, 28, 3.4, "Quando ferido, drena uma criatura viva. Recupera 35% do dano efetivo, limitado pela vida da vítima."),
    e: skill("Mágico Coreano", 0, 12, 2, 0, 6, "Hipnotiza uma ameaça comum e interrompe o ataque. A Linha de Sangue gasta Vida apenas acima da reserva segura.", { healthCost: 4 }),
    mobility: skill("Forma de Morcego", 0, 18, 4, 0, 5, "Ao ser cercado, assume uma silhueta de morcego e ganha mobilidade em terreno difícil permitido, sem atravessar obstáculos.", { healthCost: 5 }),
    trap: skill("Pega Pega", 0, 10, 6, 0, 9, "Marca uma ameaça ferida, revela sua posição e prioriza essa presa enquanto a marca durar.", { healthCost: 3 }),
    mist: skill("A Névoa", 0, 20, 5, 0, 5, "Névoa em área interrompe e desorienta inimigos sem visão noturna; o cenário do jogador continua legível.", { healthCost: 5 }),
    borrow: skill("Dois É Bom", 0, 20, 6, 0, 8, "Copia uma característica limitada da última vítima: agilidade de raiz, alcance de espectro ou proteção de bruto/chefe.", { healthCost: 4 }),
    r: skill("A Sangria", 0, 32, 7, 13, 8, "Fere ameaças já machucadas, reforça a perseguição e converte mortes por sangramento em até três servos temporários.", { healthCost: 8, apex: true }),
  },
  mummy: {
    " ": skill("O Ômega 3", 0, 0, 0, 0, 0, "Não precisa de comida ou respiração. Sua magia é recuperada como Essência."),
    q: skill("Get Over Here", 18, 8, 2, 18, 7, "Faixas puxam criaturas frágeis por um caminho livre; brutos são presos e chefes sofrem controle reduzido."),
    e: skill("Escova Esses Dentes Aí", 22, 10, 5, 12, 4.5, "Ao aprender, torna-se imune a veneno. O hálito pútrido envenena inimigos em um cone."),
    mobility: skill("Spider Múmia", 18, 16, 0.5, 0, 4.5, "Quando cercada, usa faixas para alcançar uma posição segura. Confere todo o trajeto e o destino."),
    r: skill("As Pragas", 40, 28, 4, 50, 7, "Sorteia e anuncia uma das seis calamidades: Sangue, Rãs, Gafanhotos, Chuva de Pedras, Peste ou Morte. Chefes recebem controle reduzido.", { apex: true }),
  },
  construct: {
    " ": skill("Receita da Vovó — Metal", 0, 0, 0, 0, 0, "Usa Energia no lugar de Essência. Força É Tudo já está refletida no Punho Mecânico."),
    q: skill("Upgrade · Arma Integrada", 16, 5, 0, 34, 9, "Instala um módulo que dispara automaticamente contra uma ameaça visível."),
    e: skill("Upgrade · Proteção", 24, 17, 5, 0, 5, "Quando ameaçado de perto, ativa placas que reduzem o dano recebido."),
    defense: skill("Reparo de Emergência", 28, 35, 0, 0, 0, "Adaptação GMSBonk: quando a vida cai a 35% ou menos, usa Energia para reparar parte do corpo."),
    mobility: skill("Sobrecarga", 30, 16, 0, 42, 4.5, "Adaptação GMSBonk: quando cercado, consome Energia para emitir um pulso de dano e interromper ataques."),
    r: skill("Auto Destruição · Reconstrução", 50, 60, 1.2, 130, 5.5, "Ao ficar gravemente danificado e cercado, sinaliza uma explosão. Um núcleo protegido reconstrói o corpo com no mínimo 30% de vida; nunca causa derrota automática.", { apex: true }),
  },
  fairy: {
    " ": skill("Eu Me Recuso a Escrever Isso", 0, 0, 0, 0, 0, "Imune a medo. Há Muito Tempo, as Quatro Nações... define o elemento do seu disparo."),
    q: skill("Pó de Pirlimpimpim", 20, 10, 2.5, 0, 5, "Cria ilusões que desorientam criaturas comuns. Chefes resistem e sofrem apenas lentidão breve."),
    e: skill("CALA ESSA BOCA!", 14, 8, 0.7, 10, 7, "Reage a um inimigo preparando um ataque perigoso, interrompendo a preparação."),
    defense: skill("Hei Michael Douglas", 0, 12, 3, 0, 0, "Após três segundos sem ameaças em 10 m, medita e recupera Essência. Não regenera por esse poder durante combate."),
    r: skill("Quatro Estações", 38, 30, 8, 12, 6, "Executa quatro etapas: Primavera cura e prende; Verão fortalece e queima; Outono desacelera; Inverno congela. Cada estação dura dois segundos.", { apex: true }),
  },
};
export const isNewSpecies = (id: string): id is NewSpecies => id in NEW_CHARACTERS;
export const resourceName = (id: string) => id === "construct" ? "Energia" : "Essência";
