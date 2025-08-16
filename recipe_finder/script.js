const API = 'https://www.themealdb.com/api/json/v1/1/';

const el = {
  q: document.getElementById('q'),
  go: document.getElementById('go'),
  results: document.getElementById('results'),
  meta: document.getElementById('meta'),
  modal: document.getElementById('modal'),
  closeModal: document.getElementById('closeModal'),
  mImg: document.getElementById('mImg'),
  mTitle: document.getElementById('mTitle'),
  mTags: document.getElementById('mTags'),
  mIngr: document.getElementById('mIngr'),
  mInst: document.getElementById('mInst'),
};

function getMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function setLoading(isLoading, label = 'Searching') {
  if (isLoading) {
    el.meta.innerHTML = `<span class="loader" aria-hidden="true"></span> ${label}…`;
    el.go.disabled = true;
  } else {
    el.meta.textContent = '';
    el.go.disabled = false;
  }
}

function tmdbUrl(query, mode) {
  const q = encodeURIComponent(query.trim());
  if (mode === 'ingredient') return `${API}filter.php?i=${q}`;
  return `${API}search.php?s=${q}`; // by name
}

async function search(query, mode) {
  if (!query.trim()) {
    el.results.innerHTML = `<div class="empty">Type something to search.</div>`;
    return;
  }
  setLoading(true);
  try {
    const res = await fetch(tmdbUrl(query, mode));
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    const items = data.meals || [];
    renderResults(items, mode, query);
  } catch (err) {
    console.error(err);
    el.results.innerHTML = `<div class="error">Could not load recipes. Check your connection and try again.</div>`;
  } finally {
    setLoading(false);
  }
}

function renderResults(items, mode, query) {
  if (!items.length) {
    el.results.innerHTML = `<div class="empty">No results for <strong>${escapeHtml(query)}</strong>.</div>`;
    return;
  }

  const cards = items.map(m => {
    const id = m.idMeal;
    const name = m.strMeal;
    const img = m.strMealThumb;
    const cat = m.strCategory || '';
    const area = m.strArea || '';
    const tags = (m.strTags || '').split(',').filter(Boolean);
    return `
      <article class="card" tabindex="0" data-id="${id}" aria-label="Open ${escapeHtml(name)}">
        <div class="thumb"><img loading="lazy" src="${img}" alt="${escapeHtml(name)}" /></div>
        <div class="content">
          <div class="name">${escapeHtml(name)}</div>
          <div class="tags">${[cat && tag(cat), area && tag(area), ...tags.slice(0,2).map(tag)].filter(Boolean).join('')}</div>
          <div class="actions">
            <button class="btn btn-view" data-view="${id}" aria-label="View ${escapeHtml(name)}">View</button>
            <button class="btn btn-similar" data-similar="${id}" aria-label="Find similar recipe">Similar</button>
          </div>
        </div>
      </article>`;
  }).join('');
  el.results.innerHTML = `<div class="grid">${cards}</div>`;

  // View button
  el.results.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    const id = btn.getAttribute('data-view');
    openDetails(id);
  }));

  // Similar button (kept as "random" discovery for now)
  el.results.querySelectorAll('[data-similar]').forEach(btn => btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const r = await fetch(`${API}random.php`).then(r => r.json());
    const meal = r.meals?.[0];
    if (meal) openDetails(meal.idMeal);
  }));

  // Keyboard: open on Enter
  el.results.querySelectorAll('.card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const id = card.getAttribute('data-id');
        openDetails(id);
      }
    });
  });
}

async function openDetails(id) {
  setLoading(true, 'Loading recipe');
  try {
    const res = await fetch(`${API}lookup.php?i=${id}`);
    const data = await res.json();
    const meal = data.meals?.[0];
    if (!meal) return;
    fillModal(meal);
    el.modal.showModal();
  } catch (e) {
    console.error(e);
    alert('Failed to load recipe details.');
  } finally {
    setLoading(false);
  }
}

function fillModal(m) {
  el.mImg.src = m.strMealThumb;
  el.mImg.alt = m.strMeal;
  el.mTitle.textContent = m.strMeal;

  const pills = [];
  if (m.strCategory) pills.push(tag(m.strCategory));
  if (m.strArea) pills.push(tag(m.strArea));
  if (m.strTags) m.strTags.split(',').filter(Boolean).slice(0,3).forEach(t => pills.push(tag(t)));
  el.mTags.innerHTML = pills.join('');

  // Ingredients -> bullet list (HTML stays <ul>, we just render items)
  const ing = collectIngredients(m);
  el.mIngr.innerHTML = ing.map(i => `<li>${escapeHtml(i.ingredient)} — <em>${escapeHtml(i.measure)}</em></li>`).join('');

  // Instructions -> numbered steps
  const steps = toSteps(m.strInstructions || '');
  el.mInst.innerHTML = `<ol class="steps">${steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`;
}

function collectIngredients(m) {
  const list = [];
  for (let i = 1; i <= 20; i++) {
    const ing = m[`strIngredient${i}`];
    const measure = m[`strMeasure${i}`];
    if (ing && ing.trim()) list.push({ ingredient: ing.trim(), measure: (measure || '').trim() });
  }
  return list;
}

/* Convert instructions text to clean step array */
function toSteps(text) {
  if (!text) return [];
  const cleaned = text.replace(/\r/g, '\n').trim();

  // First try splitting by blank lines/newlines
  let chunks = cleaned.split(/\n+/).map(s => s.trim()).filter(Boolean);

  // If it looks like one long paragraph, split into sentences
  if (chunks.length <= 1) {
    chunks = cleaned
      .split(/(?<=[\.\!\?])\s+(?=[A-Z0-9])/g) // split on sentence boundaries
      .map(s => s.trim())
      .filter(s => s.length > 1);
  }

  // Remove leading numbering like "1. " or "Step 1: "
  return chunks.map(s => s.replace(/^(step\s*\d+[:.\-\)]\s*|\d+[:.\-\)]\s*)/i, '').trim());
}

function tag(t) {
  return `<span class="tag">${escapeHtml(t)}</span>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

el.go.addEventListener('click', () => search(el.q.value, getMode()));
el.q.addEventListener('keydown', e => {
  if (e.key === 'Enter') search(el.q.value, getMode());
});

el.closeModal.addEventListener('click', () => el.modal.close());
el.modal.addEventListener('click', e => { if (e.target === el.modal) el.modal.close(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && el.modal.open) el.modal.close(); });

setTimeout(() => el.q.focus(), 200);
