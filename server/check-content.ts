/**
 * Content integrity checks for the seeded curriculum.
 * Run with: npx tsx server/check-content.ts
 */
import { LESSONS, SECTIONS } from './content/lessons.js';
import { ASSESSMENTS } from './content/assessments.js';
import { ACTIVITIES } from './content/activities.js';
import { BADGES, CERTIFICATE_BADGES } from './content/badges.js';
import { LEVELS, LEVEL_ORDER } from './content/levels.js';

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.error(`✗ ${msg}`);
};
const ok = (msg: string) => console.log(`✓ ${msg}`);

const badgeSlugs = new Set(BADGES.map((b) => b.slug));
if (badgeSlugs.size !== BADGES.length) fail('Duplicate badge slugs');
for (const level of LEVEL_ORDER) {
  const cert = CERTIFICATE_BADGES[level];
  if (cert.length !== 6) fail(`Certificate requirements for ${level} should have 6 entries`);
  for (const slug of cert) if (!badgeSlugs.has(slug)) fail(`Certificate badge missing: ${slug}`);
  if (LEVELS[level].key !== level) fail(`Level key mismatch for ${level}`);
  const levelBadges = BADGES.filter((b) => b.level === level);
  if (levelBadges.length < 9) fail(`Too few badges for ${level}`);
}
ok(`Badges: ${BADGES.length} across 4 levels`);

if (LESSONS.length !== 27) fail(`Expected 27 lessons, found ${LESSONS.length}`);
if (new Set(LESSONS.map((l) => l.slug)).size !== LESSONS.length) fail('Duplicate lesson slugs');
LESSONS.forEach((lesson, i) => {
  if (lesson.order !== i + 1) fail(`Lesson order mismatch at ${lesson.slug}`);
  if (!SECTIONS.some((s) => s.slug === lesson.sectionSlug)) fail(`Unknown section on ${lesson.slug}`);
  if (lesson.blocks.length === 0) fail(`Empty lesson ${lesson.slug}`);
  if (lesson.completion === 'activity' && !lesson.activitySlug) fail(`Activity lesson without slug: ${lesson.slug}`);
  if (lesson.completion !== 'activity' && lesson.activitySlug) fail(`Unexpected activity slug on ${lesson.slug}`);
});
for (const section of SECTIONS) {
  if (LESSONS.filter((l) => l.sectionSlug === section.slug).length === 0) fail(`Empty section ${section.slug}`);
}
ok(`Lessons: ${LESSONS.length} in ${SECTIONS.length} sections`);

if (ASSESSMENTS.length !== 8) fail(`Expected 8 assessments, found ${ASSESSMENTS.length}`);
for (const a of ASSESSMENTS) {
  const expected = a.kind === 'pretest' ? 5 : 8;
  if (a.questions.length !== expected) fail(`${a.key} has ${a.questions.length} questions (expected ${expected})`);
  const keys = new Set(a.questions.map((q) => q.key));
  if (keys.size !== a.questions.length) fail(`${a.key} has duplicate question keys`);
  for (const q of a.questions) {
    if (q.choices.length !== 4) fail(`${q.key} should have 4 choices`);
    if (q.answer < 0 || q.answer >= q.choices.length) fail(`${q.key} has an out-of-range answer`);
    if (!q.hint || !q.explanation) fail(`${q.key} is missing a hint or explanation`);
  }
  for (const rule of a.awards) {
    for (const slug of rule.badges) if (!badgeSlugs.has(slug)) fail(`${a.key} awards unknown badge ${slug}`);
  }
  const thresholds = a.awards.map((r) => r.minScore);
  if (thresholds.some((t, i) => i > 0 && t >= thresholds[i - 1])) fail(`${a.key} award thresholds are not descending`);
}
ok(`Assessments: ${ASSESSMENTS.length}`);

if (ACTIVITIES.length !== 16) fail(`Expected 16 activities, found ${ACTIVITIES.length}`);
for (const act of ACTIVITIES) {
  const placeholderCount = (act.code.match(/\{\{(\d+)\}\}/g) ?? []).length;
  if (placeholderCount !== act.answers.length) {
    fail(`${act.key} has ${placeholderCount} placeholders but ${act.answers.length} answers`);
  }
  for (const answer of act.answers) if (!act.blocks.includes(answer)) fail(`${act.key} answer "${answer}" is not a block`);
  if (act.hints.length !== act.answers.length) fail(`${act.key} needs one hint per blank`);
  if (!badgeSlugs.has(act.badge)) fail(`${act.key} references unknown badge ${act.badge}`);
  if (act.level !== LEVELS[act.level].key) fail(`${act.key} has an unknown level`);
}
for (const level of LEVEL_ORDER) {
  const count = ACTIVITIES.filter((a) => a.level === level).length;
  if (count !== 4) fail(`Expected 4 activities at ${level}, found ${count}`);
}
ok(`Activities: ${ACTIVITIES.length}`);

const certificateBadges = new Set(Object.values(CERTIFICATE_BADGES).flat());
for (const level of LEVEL_ORDER) {
  const activityBadges = ACTIVITIES.filter((a) => a.level === level).map((a) => a.badge);
  for (const badge of activityBadges) {
    if (!certificateBadges.has(badge)) fail(`Activity badge ${badge} is not part of the certificate requirements`);
  }
}
ok('Certificate mapping is consistent');

if (failures > 0) {
  console.error(`\n${failures} content problem(s) found.`);
  process.exit(1);
}
console.log('\nAll content checks passed.');
