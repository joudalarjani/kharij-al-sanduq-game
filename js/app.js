/*
  ══════════════════════════════════════════════════════════════
  خارج الصندوق — نقطة الإقلاع
  ابدأ من الصفحة مباشرة: سلامة كل الأجزاء تأتي من الوحدات أعلاه.
  ══════════════════════════════════════════════════════════════
*/

import { initLanding } from './ui/landing.js';
import { startGame } from './ui/game.js';
import { showResult } from './ui/result.js';
import { bindLeaderboardControls } from './ui/leaderboard.js';

function boot() {
  bindLeaderboardControls();
  initLanding((name) => {
    startGame(name, (session) => showResult(session));
  });
}

boot();