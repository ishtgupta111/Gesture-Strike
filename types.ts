
export interface GameRule {
  target: string;
  avoid: string;
  category: string;
  targetEmoji: string;
  avoidEmoji: string;
}

export interface GameObject {
  id: number;
  type: 'target' | 'avoid';
  x: number;
  y: number;
  lane: 'left' | 'right';
  emoji: string;
  speed: number;
  hit: boolean;
}

export interface HandPosition {
  x: number;
  y: number;
  active: boolean;
}
