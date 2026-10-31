export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  motivational: boolean;
  pace: 'relaxed' | 'steady' | 'intensive';
  dailyReminders: boolean;
  weeklyReminders: boolean;
  emailAnnouncements: boolean;
  emailProgress: boolean;
  weeklyGoal: number;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  occupation: string;
  bio: string;
  avatar: string;
  role: 'student' | 'instructor';
  level: LevelKey;
  createdAt: string;
  preferences: Preferences;
}

export type LevelKey = 'easy' | 'moderate' | 'challenging' | 'tough';

export interface Badge {
  slug: string;
  name: string;
  level: LevelKey;
  description: string;
  condition: string;
  icon: string;
  tone: string;
  certificateRequired?: boolean;
  earned?: boolean;
  earnedAt?: string | null;
}

export interface DashboardData {
  user: User;
  level: LevelKey;
  levelConfig: {
    key: LevelKey;
    name: string;
    tagline: string;
    accent: string;
    timerSeconds: number | null;
    lives: number | null;
    hintMode: string;
    hintPenalty: number;
  };
  stats: {
    lessonsCompleted: number;
    totalLessons: number;
    percent: number;
    badges: number;
    totalBadges: number;
    levelBadges: number;
    levelBadgeTotal: number;
    streak: number;
    longestStreak: number;
    weeklyGoal: number;
    weeklyProgress: number;
    minutesLearned: number;
    totalMinutes: number;
    unreadNotifications: number;
  };
  concepts: { slug: string; title: string; accent: string; completed: number; total: number; percent: number }[];
  nextLesson: { slug: string; title: string; section: string; minutes: number } | null;
  scores: {
    pretest: { best: number; total: number; passed: boolean } | null;
    posttest: { best: number; total: number; passed: boolean } | null;
  };
  recentEvents: { id: number; type: string; title: string; detail: string; points: number; createdAt: string }[];
  recentBadges: Badge[];
  announcements: { id: number; title: string; body: string; author: string; createdAt: string }[];
}

export interface LessonSummary {
  slug: string;
  title: string;
  minutes: number;
  concept: string;
  completion: 'button' | 'activity' | 'posttest';
  completed: boolean;
}

export interface ModulesData {
  lessonCount: number;
  minutes: number;
  completed: number;
  percent: number;
  sections: {
    slug: string;
    title: string;
    accent: string;
    badge: Badge | null;
    lessons: LessonSummary[];
    completed: number;
    total: number;
    percent: number;
  }[];
}

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; code: string; caption?: string }
  | { type: 'output'; lines: string[] }
  | { type: 'quote'; text: string }
  | { type: 'keypoints'; items: string[] }
  | { type: 'callout'; tone: 'info' | 'warn' | 'success'; title: string; text: string }
  | { type: 'objectives'; items: string[] }
  | { type: 'note'; title: string; items: string[] };

export interface LessonDetail {
  lesson: {
    slug: string;
    title: string;
    section: string;
    sectionSlug: string;
    minutes: number;
    concept: string;
    objectives?: string[];
    blocks: Block[];
    completion: 'button' | 'activity' | 'posttest';
  };
  completed: boolean;
  activity: { key: string; passed: boolean; score: number | null; total: number } | null;
  posttest: { key: string; passed: boolean; score: number | null; total: number } | null;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  section: { slug: string; title: string; badge?: string; accent: string } | null;
  level: LevelKey;
}

export interface AssessmentMeta {
  key: string;
  kind: 'pretest' | 'posttest';
  level: LevelKey;
  title: string;
  intro: string[];
  questionCount: number;
  timerSeconds: number | null;
  perQuestionSeconds: number | null;
  lives: number | null;
  hintMode: 'unlimited' | 'single' | 'none';
  hintPenalty: number;
  passScore: number;
  levelLabel: string;
  isCurrentLevel: boolean;
  best: { attemptId: number; score: number; total: number; passed: boolean; finishedAt: string } | null;
  activeAttempt: { id: number; startedAt: string } | null;
}

export interface AttemptInfo {
  id: number;
  kind: string;
  refKey: string;
  level: LevelKey;
  startedAt: string;
  deadline: string | null;
  secondsRemaining: number | null;
  timerSeconds: number | null;
  lives: number | null;
  livesLeft: number | null;
  hintMode: 'unlimited' | 'single' | 'none';
  hintPenalty: number;
  hintsUsed: number;
}

export interface Question {
  key: string;
  prompt: string;
  code: string | null;
  choices: string[];
  concept: string;
}

export interface AssessmentResult {
  id: number;
  kind: string;
  level: LevelKey;
  title: string;
  score: number;
  rawScore: number;
  total: number;
  passed: boolean;
  expired: boolean;
  hintsUsed: number;
  penalty: number;
  livesLeft: number | null;
  livesLost: number;
  questionsAnswered: number;
  newBadges: Badge[];
  review: {
    key: string;
    prompt: string;
    code: string | null;
    choices: string[];
    selected: number | null;
    answer: number;
    isCorrect: boolean;
    explanation: string;
    hint: string;
    concept: string;
  }[];
  finishedAt: string;
}

export interface ActivityMeta {
  key: string;
  level: LevelKey;
  concept: string;
  title: string;
  brief: string;
  instructions: string[];
  code: string;
  blocks: string[];
  blankCount: number;
  hintCount: number;
  timerSeconds: number | null;
  lives: number | null;
  hintMode: 'unlimited' | 'single' | 'none';
  hintPenalty: number;
  badge: Badge | null;
  earned: boolean;
  best: { score: number; total: number; passed: boolean; finishedAt: string } | null;
  lessonSlug: string | null;
}

export interface ActivityResult {
  id: number;
  passed: boolean;
  score: number;
  rawScore: number;
  total: number;
  expired: boolean;
  hintsUsed: number;
  penalty: number;
  livesLeft: number | null;
  results: { index: number; correct: boolean; expected: string; given: string }[];
  newBadges: Badge[];
  sectionBadges: Badge[];
  badge: Badge | null;
  lessonSlug: string | null;
}
