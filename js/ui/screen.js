/* التنقل بين الشاشات */

const SCREEN_IDS = {
  landing: 'landingScreen',
  game: 'gameScreen',
  result: 'resultScreen',
};

export function showScreen(id) {
  Object.values(SCREEN_IDS).forEach((sid) => {
    document.getElementById(sid).classList.toggle('active', sid === SCREEN_IDS[id]);
  });
  window.scrollTo({ top: 0 });
}

export function el(id) {
  return document.getElementById(id);
}