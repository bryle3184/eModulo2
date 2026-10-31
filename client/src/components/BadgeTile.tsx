import {
  ArrowUpRight,
  Award,
  Blocks,
  Brain,
  Bug,
  Code,
  Compass,
  Copy,
  Crown,
  Flame,
  Gem,
  Layers,
  Lock,
  Map,
  Medal,
  Mountain,
  Puzzle,
  Search,
  Shapes,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '../lib';

const ICONS: Record<string, LucideIcon> = {
  compass: Compass,
  sparkles: Sparkles,
  layers: Layers,
  copy: Copy,
  shield: Shield,
  lock: Lock,
  brain: Brain,
  puzzle: Puzzle,
  zap: Zap,
  shapes: Shapes,
  code: Code,
  blocks: Blocks,
  map: Map,
  trophy: Trophy,
  flame: Flame,
  'arrow-up': ArrowUpRight,
  medal: Medal,
  swords: Swords,
  mountain: Mountain,
  bug: Bug,
  search: Search,
  crown: Crown,
  gem: Gem,
  award: Award,
};

export function BadgeTile({
  icon,
  tone,
  earned = true,
  size,
  title,
}: {
  icon: string;
  tone: string;
  earned?: boolean;
  size?: number;
  title?: string;
}) {
  const Icon = ICONS[icon] ?? Award;
  return (
    <span
      className={cx('badge-tile', `tone-${tone}`, !earned && 'locked')}
      title={title}
      style={size ? { width: size, height: size, borderRadius: size / 5 } : undefined}
      aria-label={title}
    >
      <span className="badge-corner-1" />
      <span className="badge-corner-2" />
      <span className="badge-glyph">
        <Icon size={size ? size * 0.36 : 19} strokeWidth={2.1} />
      </span>
    </span>
  );
}
