const STORAGE_KEY = 'afterglow.v1';
const CURRENT_USER = { name: 'Dario', handle: 'dario', initials: 'DC' };
const SEED_POSTS = [
  { id: 'p1', author: 'Maya Chen', handle: 'maya_writes', initials: 'MC', text: 'Left the group chat on read for a day. Nothing broke.', createdAt: Date.now() - 1000 * 60 * 60 * 8, expiresAt: Date.now() + 1000 * 60 * 60 * 160, likes: 8, liked: false, comments: 2 },
  { id: 'p2', author: 'Alex Rivera', handle: 'alexr', initials: 'AR', text: 'The best ideas I had this week arrived while I was waiting for the kettle.', createdAt: Date.now() - 1000 * 60 * 60 * 31, expiresAt: Date.now() + 1000 * 60 * 60 * 137, likes: 14, liked: false, comments: 4 },
  { id: 'p3', author: 'Jo Park', handle: 'jopark', initials: 'JP', text: 'A small reminder: you are allowed to outgrow the version of you that made the plan.', createdAt: Date.now() - 1000 * 60 * 60 * 145, expiresAt: Date.now() + 1000 * 60 * 60 * 23, likes: 21, liked: false, comments: 6 },
  { id: 'p4', author: 'Dario', handle: 'dario', initials: 'DC', text: 'What is something you want to make less permanent?', createdAt: Date.now() - 1000 * 60 * 60 * 12, expiresAt: Date.now() + 1000 * 60 * 60 * 156, likes: 3, liked: true, comments: 1, mine: true }
];

let state = loadState();
let activeFilter = 'all';
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const hoursLeft = (post) => Math.max(0, (post.expiresAt - Date.now()) / 3600000);
const isAlive = (post) => post.expiresAt > Date.now();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.posts)) return saved;
  } catch (_) { /* malformed local state falls back to seed */ }
  return { posts: SEED_POSTS };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function formatExpiry(post) {
  const left = hoursLeft(post);
  if (left < 1) return 'ending soon';
  if (left < 24) return `${Math.ceil(left)}h left`;
  return `${Math.ceil(left / 24)}d left`;
}
function visiblePosts() {
  let posts = state.posts.filter(isAlive).sort((a, b) => b.createdAt - a.createdAt);
  if (activeFilter === 'ending') posts = posts.filter((post) => hoursLeft(post) <= 48);
  if (activeFilter === 'mine') posts = posts.filter((post) => post.mine);
  return posts;
}
function render() {
  const feed = $('#feed');
  const posts = visiblePosts();
  $('#empty-state').hidden = posts.length > 0;
  feed.innerHTML = posts.map((post) => {
    const age = Math.min(100, Math.max(1, (hoursLeft(post) / 168) * 100));
    return `<article class="post" data-id="${post.id}">
      <div class="post-top"><div class="avatar">${escapeHtml(post.initials)}</div><div><div class="post-author">${escapeHtml(post.author)}</div><div class="post-handle">@${escapeHtml(post.handle)}</div></div></div>
      <p class="post-copy">${escapeHtml(post.text)}</p>
      <div class="post-bottom"><div class="post-actions">
        <button class="action ${post.liked ? 'liked' : ''}" data-action="like" aria-label="Like post">♥ <span>${post.likes}</span></button>
        <button class="action" data-action="comment" aria-label="Reply to post">◌ <span>${post.comments}</span></button>
        <button class="action" data-action="share" aria-label="Share post">↗</button>
        <span class="expiry">${formatExpiry(post)}</span>
      </div><div class="life-line" aria-label="${escapeHtml(formatExpiry(post))}"><span style="width:${age}%"></span></div>
      <form class="post-comment" data-action="comment-form"><input maxlength="180" placeholder="Add a reply…" aria-label="Reply text" required /><button type="submit">Send</button></form></div>
    </article>`;
  }).join('');
  bindPostActions();
}
function bindPostActions() {
  document.querySelectorAll('.post').forEach((card) => {
    const id = card.dataset.id;
    card.querySelector('[data-action="like"]').addEventListener('click', () => {
      const post = state.posts.find((item) => item.id === id); post.liked = !post.liked; post.likes += post.liked ? 1 : -1; saveState(); render();
    });
    card.querySelector('[data-action="comment"]').addEventListener('click', () => card.querySelector('.post-comment').classList.toggle('open'));
    card.querySelector('[data-action="share"]').addEventListener('click', async () => {
      const post = state.posts.find((item) => item.id === id);
      const shareText = `${post.author}: ${post.text}`;
      try { await navigator.clipboard.writeText(shareText); } catch (_) { window.prompt('Copy this moment', shareText); }
    });
    card.querySelector('.post-comment').addEventListener('submit', (event) => {
      event.preventDefault(); const post = state.posts.find((item) => item.id === id); post.comments += 1; saveState(); render();
    });
  });
}
$('#post-text').addEventListener('input', (event) => { $('#char-count').textContent = `${event.target.value.length} / 420`; });
$('#post-form').addEventListener('submit', (event) => {
  event.preventDefault(); const text = $('#post-text').value.trim(); if (!text) return;
  const hours = Number($('#expiry-select').value);
  state.posts.push({ id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`, author: CURRENT_USER.name, handle: CURRENT_USER.handle, initials: CURRENT_USER.initials, text, createdAt: Date.now(), expiresAt: Date.now() + hours * 3600000, likes: 0, liked: false, comments: 0, mine: true });
  saveState(); event.target.reset(); $('#char-count').textContent = '0 / 420'; render();
});
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter; document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === button)); render(); }));
$('#reset-filter').addEventListener('click', () => { activeFilter = 'all'; document.querySelector('[data-filter="all"]').click(); });
$('#theme-toggle').addEventListener('click', () => { const root = document.documentElement; root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('afterglow.theme', root.dataset.theme); });
const savedTheme = localStorage.getItem('afterglow.theme'); if (savedTheme) document.documentElement.dataset.theme = savedTheme;
render();
setInterval(render, 60000);
