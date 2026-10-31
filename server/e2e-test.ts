/**
 * End-to-end API test for eMódulo.
 * Run with: npx tsx server/e2e-test.ts
 *
 * Uses an isolated temporary database and an ephemeral port, so it never
 * touches your development data.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'emodulo-e2e-'));
process.env.EMODULO_DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';

const { app } = await import('./index.js');
const { ASSESSMENTS } = await import('./content/assessments.js');
const { ACTIVITIES } = await import('./content/activities.js');
const { LESSONS } = await import('./content/lessons.js');

const server = app.listen(0);
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not bind test server');
const base = `http://127.0.0.1:${address.port}/api`;

let cookies = '';
let passed = 0;
const failures: string[] = [];

function assert(condition: unknown, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.error(`  ✗ ${label}`);
  }
}

async function call(
  method: string,
  pathname: string,
  body?: unknown,
): Promise<{ status: number; data: any; headers: Headers }> {
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const pair = c.split(';')[0];
    if (pair.startsWith('emodulo_session=')) cookies = pair;
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

const get = (p: string) => call('GET', p);
const post = (p: string, b?: unknown) => call('POST', p, b);
const put = (p: string, b: unknown) => call('PUT', p, b);

try {
  console.log('\n1. Health & authentication');
  const health = await get('/health');
  assert(health.status === 200 && health.data.ok, 'health endpoint responds');
  assert((await get('/dashboard')).status === 401, 'dashboard requires authentication');

  const email = `learner${Date.now()}@example.com`;
  const register = await post('/auth/register', { email, password: 'Password123', confirmPassword: 'Password123' });
  assert(register.status === 201 && register.data.user.email === email, 'student can register');
  assert(!!cookies, 'session cookie set on registration');

  const duplicate = await post('/auth/register', { email, password: 'Password123', confirmPassword: 'Password123' });
  assert(duplicate.status === 409, 'duplicate email is rejected');

  const mismatch = await post('/auth/register', { email: `x${Date.now()}@example.com`, password: 'Password123', confirmPassword: 'Password124' });
  assert(mismatch.status === 400, 'password confirmation mismatch is rejected');

  const me = await get('/auth/me');
  assert(me.status === 200 && me.data.user.email === email, 'session resolves the current user');

  const deps = await get('/profile');
  assert(deps.status === 200 && deps.data.stats.totalLessons === 27, 'profile exposes account stats');

  console.log('\n2. Course, lessons and activities (Easy)');
  const modules = await get('/modules');
  assert(modules.status === 200 && modules.data.sections.length === 5, 'modules endpoint returns five sections');
  assert(modules.data.completed === 0, 'new account starts with zero completed lessons');

  const firstLesson = await get(`/lessons/${LESSONS[0].slug}`);
  assert(firstLesson.status === 200 && firstLesson.data.lesson.blocks.length > 0, 'lesson content is served');
  assert(!JSON.stringify(firstLesson.data).includes('answer'), 'lesson payload exposes no assessment answers');

  const completeRead = await post('/lessons/course-introduction/complete');
  assert(completeRead.status === 200 && completeRead.data.completed, 'a reading lesson can be marked complete');

  const lockActivity = await post('/lessons/inheritance-activity/complete');
  assert(lockActivity.status === 400, 'activity lesson is locked until the activity is passed');

  const act = await get('/activities/easy-inheritance');
  assert(act.status === 200 && act.data.blocks.length >= act.data.blankCount, 'activity metadata includes syntax blocks');
  assert(!('answers' in act.data), 'activity payload does not include the answer key');

  const looseLevel = await post('/activities/challenging-inheritance/start');
  assert(looseLevel.status === 409, 'activities from another level cannot be started');

  const actStart = await post('/activities/easy-inheritance/start');
  assert(actStart.status === 201 && actStart.data.attempt.id, 'activity attempt starts');

  const actWrong = await post(`/attempts/${actStart.data.attempt.id}/submit-activity`, { answers: [': private', 'drive'] });
  assert(actWrong.status === 200 && actWrong.data.passed === false, 'incorrect activity submission fails');
  assert(actWrong.data.results.every((r: any) => !r.correct), 'per-blank feedback is returned after submission');

  const inheritanceActivity = ACTIVITIES.find((a) => a.key === 'easy-inheritance')!;
  const actStart2 = await post('/activities/easy-inheritance/start');
  const actOk = await post(`/attempts/${actStart2.data.attempt.id}/submit-activity`, { answers: inheritanceActivity.answers });
  assert(actOk.status === 200 && actOk.data.passed === true, 'correct activity submission passes');
  assert(actOk.data.newBadges.some((b: any) => b.slug === 'easy-junior-inheritor'), 'activity badge is awarded');

  const actLesson = await get('/lessons/inheritance-activity');
  assert(actLesson.data.activity?.passed === true, 'passing an activity is reflected on its lesson');
  assert((await post('/lessons/inheritance-activity/complete')).status === 200, 'activity lesson can then be completed');

  for (const a of ACTIVITIES.filter((x) => x.level === 'easy')) {
    if (a.key === 'easy-inheritance') continue;
    const s = await post(`/activities/${a.key}/start`);
    await post(`/attempts/${s.data.attempt.id}/submit-activity`, { answers: a.answers });
  }
  const badgesAfterActivities = await get('/badges');
  const earnedSlugs = badgesAfterActivities.data.levels.flatMap((l: any) => l.badges).filter((b: any) => b.earned).map((b: any) => b.slug);
  assert(earnedSlugs.includes('easy-data-protector') && earnedSlugs.includes('easy-essential-thinker') && earnedSlugs.includes('easy-rapid-coder'), 'all four activity badges awarded');

  console.log('\n3. Assessments, hints, lives and grading');
  const pretestMeta = await get('/assessments/pretest-easy');
  assert(pretestMeta.status === 200 && pretestMeta.data.questionCount === 5, 'assessment metadata is served');
  const pretestStart = await post('/assessments/pretest-easy/start');
  assert(pretestStart.status === 201 && pretestStart.data.questions.length === 5, 'pre-test starts with five questions');
  assert(pretestStart.data.questions.every((q: any) => !('answer' in q) && !('explanation' in q)), 'correct answers are hidden before submission');
  const attemptId = pretestStart.data.attempt.id;

  const easyQuestions = ASSESSMENTS.find((a) => a.key === 'pretest-easy')!.questions;
  const hint = await post(`/attempts/${attemptId}/hint`, { questionKey: easyQuestions[0].key });
  assert(hint.status === 200 && hint.data.hint.length > 0, 'hint is returned by the server');

  const answerFirst = await post(`/attempts/${attemptId}/answer`, { questionKey: easyQuestions[0].key, selected: easyQuestions[0].answer });
  assert(answerFirst.status === 200 && answerFirst.data.locked === true, 'first answer is accepted and locked');
  const repeat = await post(`/attempts/${attemptId}/answer`, { questionKey: easyQuestions[0].key, selected: easyQuestions[0].answer });
  assert(repeat.status === 409, 'a question cannot be answered twice');

  for (const q of easyQuestions.slice(1)) {
    await post(`/attempts/${attemptId}/answer`, { questionKey: q.key, selected: q.answer });
  }
  const pretestSubmit = await post(`/attempts/${attemptId}/submit`);
  assert(pretestSubmit.status === 200 && pretestSubmit.data.score === 5, 'perfect pre-test scores 5/5');
  assert(pretestSubmit.data.review.length === 5 && pretestSubmit.data.review[0].answer !== undefined, 'review exposes answers only after submission');
  assert(pretestSubmit.data.newBadges.some((b: any) => b.slug === 'easy-concept-explorer'), 'pre-test badge awarded');

  // Challenging level: single hint, three lives, auto-end.
  const switchRes = await post('/levels/select', { level: 'challenging' });
  assert(switchRes.status === 200, 'level can be switched');
  const lockedEasy = await post('/assessments/pretest-easy/start');
  assert(lockedEasy.status === 409, 'an assessment from the previous level is blocked');

  const challengeStart = await post('/assessments/pretest-challenging/start');
  const cAttempt = challengeStart.data.attempt;
  const cQuestions = ASSESSMENTS.find((a) => a.key === 'pretest-challenging')!.questions;
  assert(cAttempt.timerSeconds === 300 && cAttempt.lives === 3, 'challenging rules apply (5:00, 3 lives)');

  const cHint1 = await post(`/attempts/${cAttempt.id}/hint`, { questionKey: cQuestions[0].key });
  const cHint2 = await post(`/attempts/${cAttempt.id}/hint`, { questionKey: cQuestions[1].key });
  assert(cHint1.status === 200 && cHint2.status === 403, 'only one hint is allowed on challenging');

  let ended = false;
  for (const q of cQuestions) {
    const wrong = (q.answer + 1) % q.choices.length;
    const res = await post(`/attempts/${cAttempt.id}/answer`, { questionKey: q.key, selected: wrong });
    if (res.data?.ended) {
      ended = true;
      assert(res.data.result.livesLeft === 0, 'lives reach zero and the attempt ends');
      assert(res.data.result.passed === false, 'failed attempt is recorded as not passed');
      break;
    }
  }
  assert(ended, 'losing all lives ends the assessment early');

  const afterExpiry = await post(`/attempts/${cAttempt.id}/submit`);
  assert(afterExpiry.status === 400, 'a finished attempt cannot be submitted again');

  // Tough: no hints at all.
  await post('/levels/select', { level: 'tough' });
  const toughStart = await post('/assessments/pretest-tough/start');
  const toughQ = ASSESSMENTS.find((a) => a.key === 'pretest-tough')!.questions[0];
  const toughHint = await post(`/attempts/${toughStart.data.attempt.id}/hint`, { questionKey: toughQ.key });
  assert(toughHint.status === 403, 'tough pre-test offers no hints');

  console.log('\n4. Finish the module and earn the certificate');
  await post('/levels/select', { level: 'easy' });
  for (const lesson of LESSONS) {
    if (lesson.slug === 'post-test') continue;
    await post(`/lessons/${lesson.slug}/complete`);
  }
  const postStart = await post('/assessments/posttest-easy/start');
  const postQuestions = ASSESSMENTS.find((a) => a.key === 'posttest-easy')!.questions;
  for (const q of postQuestions) {
    await post(`/attempts/${postStart.data.attempt.id}/answer`, { questionKey: q.key, selected: q.answer });
  }
  const postSubmit = await post(`/attempts/${postStart.data.attempt.id}/submit`);
  assert(postSubmit.data.score === 8 && postSubmit.data.passed, 'perfect post-test scores 8/8 and passes');

  const progress = await get('/progress');
  assert(progress.data.totals.lessonsCompleted === 27, 'all 27 lessons are recorded as complete');
  assert(progress.data.streak.current >= 1, 'learning streak is tracked');

  const cert = await get('/certificate');
  assert(cert.data.eligible === true, 'certificate becomes eligible once requirements are met');
  assert(cert.data.requirements.every((r: any) => r.done), 'every certificate requirement is satisfied');

  const issue = await post('/certificate/issue', { level: 'easy' });
  assert(issue.status === 201 && /^EM-EASY-[A-Z0-9]{8}$/.test(issue.data.certificate.code), 'certificate is issued with a unique ID');

  const pdf = await get(`/certificates/${issue.data.certificate.code}/pdf`);
  assert(pdf.status === 200 && String(pdf.headers.get('content-type')).includes('application/pdf'), 'certificate PDF downloads');

  const certView = await get(`/certificates/${issue.data.certificate.code}`);
  assert(certView.status === 200 && certView.data.certificate.recipient.length > 0, 'certificate can be viewed');

  const duplicateIssue = await post('/certificate/issue', { level: 'easy' });
  assert(duplicateIssue.data.alreadyIssued === true, 'the same certificate is not issued twice');

  console.log('\n5. Notifications, messaging and account settings');
  const notifications = await get('/notifications');
  assert(notifications.data.notifications.length > 0 && notifications.data.unread > 0, 'notifications are generated');
  const firstNotif = notifications.data.notifications[0];
  await post(`/notifications/${firstNotif.id}/read`);
  const afterRead = await get('/notifications');
  assert(afterRead.data.unread === notifications.data.unread - 1, 'a notification can be marked read');
  await post('/notifications/read-all');
  assert((await get('/notifications')).data.unread === 0, 'all notifications can be marked read');

  const thread = await post('/messages/threads', { subject: 'Help with virtual functions', body: 'When should I use override?' });
  assert(thread.status === 201 && thread.data.threadId, 'student can start a conversation');
  const threads = await get('/messages/threads');
  assert(threads.data.threads.length === 1, 'thread appears in the inbox');
  const threadDetail = await get(`/messages/threads/${thread.data.threadId}`);
  assert(threadDetail.data.messages.length === 1, 'thread messages are readable');

  const studentCookie = cookies;
  cookies = '';
  const instructorLogin = await post('/auth/login', { email: 'instructor@emodulo.edu', password: 'Emodulo2025!' });
  assert(instructorLogin.status === 200 && instructorLogin.data.user.role === 'instructor', 'instructor can sign in');
  const instructorReply = await post(`/messages/threads/${thread.data.threadId}/messages`, { body: 'Use override whenever you override a virtual function.' });
  assert(instructorReply.status === 201, 'instructor can reply');
  cookies = studentCookie;
  const studentThread = await get(`/messages/threads/${thread.data.threadId}`);
  assert(studentThread.data.messages.length === 2 && studentThread.data.messages[1].senderRole === 'instructor', 'student receives the instructor reply');

  const profileUpdate = await put('/profile', {
    firstName: 'Ada',
    lastName: 'Lovelace',
    occupation: 'Computer Science Student',
    bio: 'Learning OOP with eMódulo.',
    avatar: 'violet',
  });
  assert(profileUpdate.status === 200 && profileUpdate.data.user.fullName === 'Ada Lovelace', 'profile details are persisted');

  const prefsUpdate = await put('/preferences', {
    theme: 'dark', motivational: false, pace: 'intensive',
    dailyReminders: false, weeklyReminders: true,
    emailAnnouncements: false, emailProgress: true, weeklyGoal: 7,
  });
  assert(prefsUpdate.status === 200 && prefsUpdate.data.preferences.weeklyGoal === 7, 'learning preferences are persisted');
  assert((await get('/auth/me')).data.user.preferences.theme === 'dark', 'preferences reload from the database');

  const badPassword = await put('/account/password', { currentPassword: 'wrong', newPassword: 'NewPassword123', confirmPassword: 'NewPassword123' });
  assert(badPassword.status === 400, 'wrong current password is rejected');
  const passwordChange = await put('/account/password', { currentPassword: 'Password123', newPassword: 'NewPassword123', confirmPassword: 'NewPassword123' });
  assert(passwordChange.status === 200, 'password can be changed');
  await post('/auth/logout');
  const afterLogout = await get('/auth/me');
  assert(afterLogout.status === 200 && afterLogout.data.user === null, 'logout clears the session');
  assert((await get('/progress')).status === 401, 'protected routes reject a signed-out session');
  const oldLogin = await post('/auth/login', { email, password: 'Password123' });
  assert(oldLogin.status === 401, 'old password no longer works');
  const newLogin = await post('/auth/login', { email, password: 'NewPassword123' });
  assert(newLogin.status === 200, 'new password works');

  const progressReload = await get('/progress');
  assert(progressReload.data.totals.lessonsCompleted === 27, 'progress persists across sessions');

  console.log('\n6. Password reset flow');
  const forgot = await post('/auth/forgot-password', { email });
  assert(forgot.status === 200 && typeof forgot.data.devToken === 'string', 'reset token is prepared');
  const reset = await post('/auth/reset-password', { token: forgot.data.devToken, password: 'ResetPassword123' });
  assert(reset.status === 200, 'password reset succeeds');
  const reuse = await post('/auth/reset-password', { token: forgot.data.devToken, password: 'AnotherPassword123' });
  assert(reuse.status === 400, 'reset token cannot be reused');
  assert((await post('/auth/login', { email, password: 'ResetPassword123' })).status === 200, 'reset password can sign in');

  console.log('\n7. Input validation and authorization');
  const badEmail = await post('/auth/register', { email: 'not-an-email', password: 'Password123', confirmPassword: 'Password123' });
  assert(badEmail.status === 400, 'invalid email is rejected');
  const shortPassword = await post('/auth/register', { email: `short${Date.now()}@example.com`, password: 'short', confirmPassword: 'short' });
  assert(shortPassword.status === 400, 'short password is rejected');
  const otherAttempt = await get('/attempts/99999');
  assert(otherAttempt.status === 404, 'foreign attempts are not accessible');
  const badCert = await get('/certificates/EM-FAKE-00000000/pdf');
  assert(badCert.status === 404, 'unknown certificate ID returns 404');
} catch (err) {
  failures.push(`unexpected error: ${(err as Error).message}`);
  console.error('\nUnexpected error', err);
} finally {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(`\n${passed} assertions passed, ${failures.length} failed.`);
if (failures.length > 0) {
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
process.exit(0);
