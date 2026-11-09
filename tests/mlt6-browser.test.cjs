const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { createServer } = require('node:http');
const { resolve, extname, sep } = require('node:path');
const { test } = require('node:test');
const { chromium } = require('playwright');
const { registry } = require('./mlt6-fixtures.cjs');

const projectPath = '/68K-Learning-Hub/';
const repo = resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

test('MLT 6 browser workflows', async t => {
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const filename = resolve(repo, pathname.slice(projectPath.length));
    try {
      if (!pathname.startsWith(projectPath) || !filename.startsWith(repo + sep)) throw new Error('Unknown path');
      const bytes = await readFile(filename);
      res.setHeader('content-type', (types[extname(filename)] || 'application/octet-stream') + '; charset=utf-8');
      res.end(bytes);
    } catch (_) {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ executablePath: process.env.MLT6_CHROMIUM_PATH });
  t.after(() => browser.close());
  const base = 'http://127.0.0.1:' + server.address().port + projectPath;
  const pathTo = (page, lessonId, mode) => page.goto(base + 'mlt6/demo/' + mode + '&unit=24&lesson=' + lessonId);
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const answer = (page, text) => page.locator('.choice').filter({ hasText: text }).click();
  const check = async (locator, pattern) => {
    const match = locator.filter({ hasText: pattern });
    await match.waitFor({ state: 'attached' });
    assert.match(await match.innerText(), pattern);
  };
  const freshPage = async (scope, banks) => {
    const context = await browser.newContext();
    scope.after(() => context.close());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(5000);
    if (banks) {
      await page.route('**/mlt6/banks/approved-banks.js*', route => route.fulfill({
        contentType: 'text/javascript',
        body: 'window.MLT6_APPROVED_BANKS = ' + JSON.stringify(banks)
      }));
    }
    scope.after(() => assert.deepEqual(errors, []));
    return page;
  };

  await t.test('real empty registry preserves both lesson routes and all six Comprehensive paths', async t => {
    const page = await freshPage(t);
    await page.goto(base + 'index.html');
    await page.locator('a[href="mlt6/study.html?unit=24"]').click();
    assert.deepEqual(await page.locator('.lesson-badge').allTextContents(), ['5.1', '5.2', '5.3', '5.4']);
    for (const lessonId of ['5.1', '5.2']) {
      await page.goto(base + 'mlt6/study.html?unit=24&lesson=' + lessonId);
      await check(page.locator('h1'), new RegExp('Lesson ' + lessonId));
      assert.equal(await page.locator('.mode-card[aria-disabled="true"]').count(), 6);
      await pathTo(page, lessonId, 'index.html?v=test');
      await check(page.locator('#app'), /awaiting verified textbook questions/);
      assert.equal(new URL(await page.locator('.quiz-path-links a').first().getAttribute('href')).searchParams.get('lesson'), lessonId);
    }
    await page.goto(base + 'mlt6/comprehensive.html?unit=24');
    await check(page.getByRole('status'), /0 unique approved questions/);
    const links = await page.locator('a.mode-card').evaluateAll(links => links.map(link => link.href));
    assert.equal(links.length, 6);
    for (const href of links) {
      await page.goto(href);
      await check(page.locator('#app, #exam-root, #mode-root'), /No verified course questions/);
    }
    await page.goto(base + 'mlt6/study.html?chapter=24');
    assert.equal(await page.locator('a[href="../OldTests/test24.html"]').count(), 1);
    await page.goto(base + 'mlt6/demo/index.html');
    await check(page.locator('#app h2'), /What is 1 \+ 1/);
  });

  for (const lessonId of ['5.1', '5.2']) {
    await t.test(lessonId + ' opens and exercises all six study modes', async t => {
      const page = await freshPage(t, registry);
      page.on('dialog', dialog => dialog.accept());
      await page.goto(base + 'mlt6/study.html?unit=24&lesson=' + lessonId);
      const modes = await page.locator('a.mode-card').evaluateAll(links => links.map(link => link.href));
      assert.equal(modes.length, 6);

      await page.goto(modes[0]);
      const prompt = page.locator('#app h2');
      await check(prompt, /item 1/);
      await answer(page, 'Wrong ' + lessonId + ' item 1');
      await check(page.locator('.feedback'), /Not quite/);
      await page.reload();
      await check(page.locator('.feedback'), /Not quite/);
      await button(page, 'Continue →').click();
      const multi = lessonId === '5.1' ? 2 : 3;
      if (multi === 3) {
        await answer(page, 'Same');
        await button(page, 'Continue →').click();
      }
      await answer(page, 'Second ' + lessonId + ' item ' + multi);
      await answer(page, 'Answer ' + lessonId + ' item ' + multi);
      await button(page, 'Check answers').click();
      await check(page.locator('.feedback'), /Correct!/);
      await button(page, 'Continue →').click();
      if (multi === 2) {
        await answer(page, 'Same');
        await button(page, 'Continue →').click();
      }
      await button(page, 'Start required review →').click();
      await check(prompt, /item 1/);
      await answer(page, 'Answer ' + lessonId + ' item 1');
      await check(page.locator('.feedback'), /Correct!/);

      await page.goto(modes[1]);
      await button(page, 'Start exam →').click();
      await answer(page, 'Answer ' + lessonId + ' item 1');
      await button(page, 'Next →').click();
      if (multi === 3) {
        await answer(page, 'Same');
        await button(page, 'Next →').click();
      }
      await answer(page, 'Answer ' + lessonId + ' item ' + multi);
      await answer(page, 'Second ' + lessonId + ' item ' + multi);
      await page.reload();
      assert.equal(await page.locator('.choice[aria-pressed=true]').count(), 2);
      assert.equal(await page.locator('blockquote').count(), 0);
      await button(page, 'Submit exam and view results').click();
      await check(page.locator('#exam-root'), multi === 2 ? /2 \/ 3/ : /3 \/ 3/);
      await check(page.locator('#exam-root'), /Synthetic quote — café/);

      await page.goto(modes[2]);
      await check(page.locator('blockquote'), /Synthetic quote — café/);
      await page.getByRole('button', { name: 'Bookmark question', exact: true }).click();
      await button(page, 'Next →').click();
      await page.reload();
      await check(page.locator('#mode-status'), /Question 2 of 3/);

      await page.goto(modes[3]);
      await page.locator('#direction-settings').click();
      assert.equal(await page.getByLabel('Definition → Term', { exact: true }).isDisabled(), true);
      await button(page, 'Cancel').click();
      await button(page, 'Tap to reveal answer').click();
      await check(page.locator('.flashcard-face'), /Answer .* item 1/);
      await button(page, 'Know it').click();
      await page.reload();
      await check(page.locator('#mode-status'), /1 of 3 rated/);

      await page.goto(modes[4]);
      await page.getByLabel('Your written answer').fill('My synthetic draft');
      await page.reload();
      assert.equal(await page.getByLabel('Your written answer').inputValue(), 'My synthetic draft');
      await button(page, 'Reveal answer and compare').click();
      await check(page.locator('.path-answer'), /Approved answer:/);
      await button(page, 'I got it').click();
      await page.reload();
      await check(page.locator('#mode-status'), /1 of 3 rated/);

      await page.goto(modes[5]);
      await check(page.locator('#mode-root h2'), /1 bookmarked question/);
      await page.locator('#mode-root').getByRole('link', { name: 'Review', exact: true }).click();
      await check(page.locator('#mode-status'), /Question 1 of 1/);
      assert.equal(new URL(page.url()).searchParams.get('lesson'), lessonId);
      assert.equal(await page.getByRole('button', { name: 'Remove bookmark for question' }).count(), 1);
    });
  }

  await t.test('partial Comprehensive and empty All Bookmarks link to available questions', async t => {
    const page = await freshPage(t, { '5.2': registry['5.2'] });
    await page.goto(base + 'mlt6/comprehensive.html?unit=24');
    await check(page.getByRole('status'), /3 unique approved questions currently available from 1 of 4/);
    await page.goto(base + 'mlt6/demo/exam.html?unit=24&bank=bookmarks');
    await check(page.locator('#exam-root'), /No bookmarked questions/);
    await page.goto(base + 'mlt6/demo/modes.html?mode=bookmarked&unit=24&bank=bookmarks');
    await page.getByRole('link', { name: 'Browse all questions in Review' }).click();
    await check(page.locator('#mode-status'), /Question 1 of 3/);
    assert.equal(new URL(page.url()).searchParams.get('bank'), 'unit');
  });

  await t.test('Comprehensive and All Bookmarks share deduplicated lesson bookmarks', async t => {
    const page = await freshPage(t, registry);
    await page.goto(base + 'mlt6/comprehensive.html?unit=24');
    await check(page.getByRole('status'), /5 unique approved questions currently available from 2 of 4/);
    for (const [lessonId, moves] of [['5.2', 1], ['5.1', 2]]) {
      await pathTo(page, lessonId, 'modes.html?mode=review');
      for (let i = 0; i < moves; i++) await button(page, 'Next →').click();
      await page.getByRole('button', { name: 'Bookmark question', exact: true }).click();
    }
    await page.goto(base + 'mlt6/demo/modes.html?mode=bookmarked&unit=24&bank=unit');
    await check(page.locator('#mode-root h2'), /1 bookmarked question/);
    await page.goto(base + 'mlt6/demo/modes.html?mode=bookmarked&unit=24&bank=bookmarks');
    await check(page.locator('.bookmark-item'), /Lesson 5\.1/);
    await page.getByRole('button', { name: 'Remove bookmark for question' }).click();
    await check(page.locator('#mode-root h2'), /0 bookmarked questions/);
    for (const lessonId of ['5.1', '5.2']) {
      await pathTo(page, lessonId, 'modes.html?mode=bookmarked');
      await check(page.locator('#mode-root h2'), /0 bookmarked questions/);
    }
  });
});
