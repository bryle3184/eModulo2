import type { LevelKey } from './levels.js';

export interface BadgeDef {
  slug: string;
  name: string;
  level: LevelKey;
  description: string;
  condition: string;
  icon: string;
  tone: 'gold' | 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'slate';
  certificateRequired: boolean;
}

/**
 * Badge names, groupings and award conditions are taken from the thesis deck.
 * Each level owns its own slug namespace because a few names repeat across levels
 * (e.g. "Code Warrior" appears in both Moderate and Tough).
 */
export const BADGES: BadgeDef[] = [
  // ── Easy ────────────────────────────────────────────────────────────────────
  { slug: 'easy-concept-explorer', name: 'Concept Explorer', level: 'easy', icon: 'compass', tone: 'blue',
    description: 'A flawless first run through the basics.',
    condition: 'Score 5/5 on the Easy pre-test.', certificateRequired: false },
  { slug: 'easy-starter-challenger', name: 'Starter Challenger', level: 'easy', icon: 'sparkles', tone: 'emerald',
    description: 'You showed up and finished your first assessment.',
    condition: 'Score at least 3/5 on the Easy pre-test.', certificateRequired: true },
  { slug: 'easy-junior-inheritor', name: 'Junior Inheritor', level: 'easy', icon: 'layers', tone: 'blue',
    description: 'You wired a derived class to its base class.',
    condition: 'Complete the Easy Inheritance activity.', certificateRequired: true },
  { slug: 'easy-code-reuser', name: 'Code reuser', level: 'easy', icon: 'copy', tone: 'blue',
    description: 'You finished the Inheritance section of the module.',
    condition: 'Complete every lesson in the Inheritance section.', certificateRequired: false },
  { slug: 'easy-data-protector', name: 'Data Protector', level: 'easy', icon: 'shield', tone: 'emerald',
    description: 'Private data, controlled access — exactly right.',
    condition: 'Complete the Easy Encapsulation activity.', certificateRequired: true },
  { slug: 'easy-guardian-of-code', name: 'Guardian of Code', level: 'easy', icon: 'lock', tone: 'emerald',
    description: 'You finished the Encapsulation section of the module.',
    condition: 'Complete every lesson in the Encapsulation section.', certificateRequired: false },
  { slug: 'easy-essential-thinker', name: 'Essential Thinker', level: 'easy', icon: 'brain', tone: 'violet',
    description: 'You hid the details and kept the essentials.',
    condition: 'Complete the Easy Abstraction activity.', certificateRequired: true },
  { slug: 'easy-abstract-thinker', name: 'Abstract Thinker', level: 'easy', icon: 'puzzle', tone: 'violet',
    description: 'You finished the Abstraction section of the module.',
    condition: 'Complete every lesson in the Abstraction section.', certificateRequired: false },
  { slug: 'easy-rapid-coder', name: 'Rapid Coder', level: 'easy', icon: 'zap', tone: 'amber',
    description: 'One interface, many behaviours — you made it work.',
    condition: 'Complete the Easy Polymorphism activity.', certificateRequired: true },
  { slug: 'easy-polymorph-pioneer', name: 'Polymorph Pioneer', level: 'easy', icon: 'shapes', tone: 'amber',
    description: 'You finished the Polymorphism section of the module.',
    condition: 'Complete every lesson in the Polymorphism section.', certificateRequired: false },
  { slug: 'easy-code-apprentice', name: 'Code Apprentice', level: 'easy', icon: 'code', tone: 'gold',
    description: 'A perfect post-test across all four pillars.',
    condition: 'Score 8/8 on the Easy post-test.', certificateRequired: false },
  { slug: 'easy-oop-explorer', name: 'OOP Explorer', level: 'easy', icon: 'compass', tone: 'gold',
    description: 'You explored all four OOP pillars with confidence.',
    condition: 'Score at least 7/8 on the Easy post-test.', certificateRequired: false },
  { slug: 'easy-foundation-builder', name: 'Foundation Builder', level: 'easy', icon: 'blocks', tone: 'gold',
    description: 'A solid foundation has been laid.',
    condition: 'Score at least 6/8 on the Easy post-test.', certificateRequired: true },
  { slug: 'easy-beginner-explorer', name: 'Beginner Explorer', level: 'easy', icon: 'map', tone: 'gold',
    description: 'Your OOP journey is officially underway.',
    condition: 'Score at least 5/8 on the Easy post-test.', certificateRequired: false },

  // ── Moderate ───────────────────────────────────────────────────────────────
  { slug: 'moderate-concept-challenger', name: 'Concept Challenger', level: 'moderate', icon: 'trophy', tone: 'blue',
    description: 'Perfect application of OOP basics under an 8-minute clock.',
    condition: 'Score 5/5 on the Moderate pre-test.', certificateRequired: false },
  { slug: 'moderate-resilient-learner', name: 'Resilient Learner', level: 'moderate', icon: 'flame', tone: 'blue',
    description: 'You kept your lives intact and pushed through.',
    condition: 'Score 5/5 on the Moderate pre-test.', certificateRequired: false },
  { slug: 'moderate-level-up-learner', name: 'Level-Up Learner', level: 'moderate', icon: 'arrow-up', tone: 'blue',
    description: 'You levelled up from recall to application.',
    condition: 'Score at least 3/5 on the Moderate pre-test.', certificateRequired: true },
  { slug: 'moderate-bridge-builder', name: 'Bridge builder', level: 'moderate', icon: 'layers', tone: 'emerald',
    description: 'You connected a derived class to its base class under pressure.',
    condition: 'Complete the Moderate Inheritance activity.', certificateRequired: true },
  { slug: 'moderate-data-guardian', name: 'Data Guardian', level: 'moderate', icon: 'shield', tone: 'emerald',
    description: 'Encapsulation applied correctly against the clock.',
    condition: 'Complete the Moderate Encapsulation activity.', certificateRequired: true },
  { slug: 'moderate-visionary-designer', name: 'Visionary Designer', level: 'moderate', icon: 'brain', tone: 'violet',
    description: 'You designed with abstractions instead of details.',
    condition: 'Complete the Moderate Abstraction activity.', certificateRequired: true },
  { slug: 'moderate-shape-shifter', name: 'Shape shifter', level: 'moderate', icon: 'shapes', tone: 'amber',
    description: 'Runtime polymorphism, correctly enabled.',
    condition: 'Complete the Moderate Polymorphism activity.', certificateRequired: true },
  { slug: 'moderate-oop-challenger', name: 'OOP Challenger', level: 'moderate', icon: 'medal', tone: 'gold',
    description: 'A flawless application round.',
    condition: 'Score 8/8 on the Moderate post-test.', certificateRequired: false },
  { slug: 'moderate-code-warrior', name: 'Code Warrior', level: 'moderate', icon: 'swords', tone: 'gold',
    description: 'You fought through the applications and nearly aced them.',
    condition: 'Score at least 7/8 on the Moderate post-test.', certificateRequired: false },
  { slug: 'moderate-problem-solver', name: 'Problem Solver', level: 'moderate', icon: 'puzzle', tone: 'gold',
    description: 'You can apply OOP to real problems.',
    condition: 'Score at least 6/8 on the Moderate post-test.', certificateRequired: true },

  // ── Challenging ────────────────────────────────────────────────────────────
  { slug: 'challenging-master-challenger', name: 'Master Challenger', level: 'challenging', icon: 'trophy', tone: 'amber',
    description: 'Perfect debugging under a five-minute clock.',
    condition: 'Score 5/5 on the Challenging pre-test.', certificateRequired: false },
  { slug: 'challenging-persistent-learner', name: 'Persistent Learner', level: 'challenging', icon: 'flame', tone: 'amber',
    description: 'You stayed in the fight and read the code carefully.',
    condition: 'Score at least 4/5 on the Challenging pre-test.', certificateRequired: false },
  { slug: 'challenging-on-the-climb', name: 'On the Climb', level: 'challenging', icon: 'mountain', tone: 'amber',
    description: 'You cleared the challenge threshold.',
    condition: 'Score at least 3/5 on the Challenging pre-test.', certificateRequired: true },
  { slug: 'challenging-syntax-slayer', name: 'Syntax Slayer', level: 'challenging', icon: 'code', tone: 'blue',
    description: 'Syntax errors do not survive you.',
    condition: 'Complete the Challenging Inheritance activity.', certificateRequired: true },
  { slug: 'challenging-logic-breaker', name: 'Logic Breaker', level: 'challenging', icon: 'brain', tone: 'violet',
    description: 'You reasoned through encapsulation under pressure.',
    condition: 'Complete the Challenging Encapsulation activity.', certificateRequired: true },
  { slug: 'challenging-bug-hunter', name: 'Bug Hunter', level: 'challenging', icon: 'bug', tone: 'rose',
    description: 'You found the flaw in the abstraction.',
    condition: 'Complete the Challenging Abstraction activity.', certificateRequired: true },
  { slug: 'challenging-code-survivor', name: 'Code Survivor', level: 'challenging', icon: 'shield', tone: 'emerald',
    description: 'You survived the polymorphic dispatch puzzle.',
    condition: 'Complete the Challenging Polymorphism activity.', certificateRequired: true },
  { slug: 'challenging-code-gladiator', name: 'Code Gladiator', level: 'challenging', icon: 'swords', tone: 'gold',
    description: 'A perfect score in the arena.',
    condition: 'Score 8/8 on the Challenging post-test.', certificateRequired: false },
  { slug: 'challenging-persistent-debugger', name: 'Persistent Debugger', level: 'challenging', icon: 'search', tone: 'gold',
    description: 'You tracked down almost every defect.',
    condition: 'Score at least 7/8 on the Challenging post-test.', certificateRequired: false },
  { slug: 'challenging-problem-solver', name: 'Problem Solver', level: 'challenging', icon: 'puzzle', tone: 'gold',
    description: 'Debugging is now part of your toolkit.',
    condition: 'Score at least 6/8 on the Challenging post-test.', certificateRequired: true },

  // ── Tough ──────────────────────────────────────────────────────────────────
  { slug: 'tough-oop-master', name: 'OOP Master', level: 'tough', icon: 'crown', tone: 'rose',
    description: 'A perfect run on the hardest pre-test.',
    condition: 'Score 5/5 on the Tough pre-test.', certificateRequired: false },
  { slug: 'tough-persistent-challenger', name: 'Persistent Challenger', level: 'tough', icon: 'flame', tone: 'rose',
    description: 'You climbed with almost no help and almost no lives.',
    condition: 'Score at least 4/5 on the Tough pre-test.', certificateRequired: false },
  { slug: 'tough-code-warrior', name: 'Code Warrior', level: 'tough', icon: 'swords', tone: 'rose',
    description: 'You fought the hardest questions and held your ground.',
    condition: 'Score at least 4/5 on the Tough pre-test.', certificateRequired: false },
  { slug: 'tough-advancing', name: 'Advancing', level: 'tough', icon: 'arrow-up', tone: 'rose',
    description: 'Even the toughest stage did not stop you.',
    condition: 'Score at least 3/5 on the Tough pre-test.', certificateRequired: true },
  { slug: 'tough-code-conqueror', name: 'Code Conqueror', level: 'tough', icon: 'layers', tone: 'blue',
    description: 'You conquered inheritance with the clock against you.',
    condition: 'Complete the Tough Inheritance activity.', certificateRequired: true },
  { slug: 'tough-guardian-of-syntax', name: 'Guardian of Syntax', level: 'tough', icon: 'lock', tone: 'emerald',
    description: 'You protected the data and the syntax.',
    condition: 'Complete the Tough Encapsulation activity.', certificateRequired: true },
  { slug: 'tough-logic-seeker', name: 'Logic Seeker', level: 'tough', icon: 'search', tone: 'violet',
    description: 'You found the abstract truth in the code.',
    condition: 'Complete the Tough Abstraction activity.', certificateRequired: true },
  { slug: 'tough-summit-climber', name: 'Summit Climber', level: 'tough', icon: 'mountain', tone: 'amber',
    description: 'One more summit: dynamic binding, solved.',
    condition: 'Complete the Tough Polymorphism activity.', certificateRequired: true },
  { slug: 'tough-grandmaster-of-code', name: 'Grandmaster of code', level: 'tough', icon: 'crown', tone: 'gold',
    description: 'The highest honour for a perfect final test.',
    condition: 'Score 8/8 on the Tough post-test.', certificateRequired: false },
  { slug: 'tough-iron-coder', name: 'Iron Coder', level: 'tough', icon: 'gem', tone: 'gold',
    description: 'Unbreakable focus at the summit.',
    condition: 'Score at least 7/8 on the Tough post-test.', certificateRequired: false },
  { slug: 'tough-unbreakable-spirit', name: 'Unbreakable Spirit', level: 'tough', icon: 'shield', tone: 'gold',
    description: 'You finished the hardest test in one piece.',
    condition: 'Score at least 6/8 on the Tough post-test.', certificateRequired: true },
];

export function badgesForLevel(level: LevelKey): BadgeDef[] {
  return BADGES.filter((b) => b.level === level);
}

export function getBadge(slug: string): BadgeDef | undefined {
  return BADGES.find((b) => b.slug === slug);
}

export const CERTIFICATE_BADGES: Record<LevelKey, string[]> = {
  easy: [
    'easy-starter-challenger', 'easy-junior-inheritor', 'easy-data-protector',
    'easy-essential-thinker', 'easy-rapid-coder', 'easy-foundation-builder',
  ],
  moderate: [
    'moderate-level-up-learner', 'moderate-bridge-builder', 'moderate-data-guardian',
    'moderate-visionary-designer', 'moderate-shape-shifter', 'moderate-problem-solver',
  ],
  challenging: [
    'challenging-on-the-climb', 'challenging-syntax-slayer', 'challenging-logic-breaker',
    'challenging-bug-hunter', 'challenging-code-survivor', 'challenging-problem-solver',
  ],
  tough: [
    'tough-advancing', 'tough-code-conqueror', 'tough-guardian-of-syntax',
    'tough-logic-seeker', 'tough-summit-climber', 'tough-unbreakable-spirit',
  ],
};
