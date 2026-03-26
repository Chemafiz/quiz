function q(selector){ return document.querySelector(selector); }

function getSlug(){
  const params = new URLSearchParams(window.location.search);
  return params.get('slug') || 'kategoria-1';
}

function loadJSON(path){
  return fetch(path).then(r=>{ if(!r.ok) throw new Error('Not found'); return r.json(); });
}

function answeredKey(slug){ return `answered_${slug}`; }

async function init(){
  const slug = getSlug();
  q('#cat-title').textContent = slug.replace(/-/g,' ').replace(/kategoria/,'Kategoria');
  const jsonPath = `./${slug}/${slug}.json`;
  let data = {title:slug, version:0, questions:[]};
  try{ data = await loadJSON(jsonPath); }catch(e){ console.warn('Could not load', jsonPath); }

  // If JSON version changed on server, clear answered state so questions become enabled
  const ver = data.version || 0;
  const verKey = `category_version_${slug}`;
  const storedVer = localStorage.getItem(verKey);
  if(String(storedVer) !== String(ver)){
    localStorage.removeItem(answeredKey(slug));
    localStorage.setItem(verKey, String(ver));
  }

  // also compute a simple hash of content; if content differs, clear answered state
  try{
    const hash = JSON.stringify(data.questions || []);
    const hashKey = `category_hash_${slug}`;
    const storedHash = localStorage.getItem(hashKey);
    if(storedHash !== hash){
      localStorage.removeItem(answeredKey(slug));
      localStorage.setItem(hashKey, hash);
    }
  }catch(e){ /* ignore */ }

  const grid = q('#questions-grid');
  grid.innerHTML='';

  const answered = new Set(JSON.parse(localStorage.getItem(answeredKey(slug))||'[]'));

  data.questions.forEach((qt, idx)=>{
    // create a link to a dedicated question page
    const link = document.createElement('a');
    link.className = 'q-card';
    // For special categories, hide real task text and show generic labels
    if(slug === '1vs1') link.textContent = `zadanie${idx+1}`;
    else if(slug.toLowerCase() === 'licytacje') link.textContent = `Licytacja ${idx+1}`;
    else link.textContent = qt.title || `Pytanie ${idx+1}`;
    link.href = `question.html?slug=${encodeURIComponent(slug)}&q=${idx}`;
    // store q index and slug on the element for reliable matching
    link.dataset.q = String(idx);
    link.dataset.slug = slug;
    if(answered.has(idx)) link.classList.add('answered');
    grid.appendChild(link);
  });
  // --- special 1vs1 duel UI ---

  // attach per-category reset button behavior
  const resetBtn = document.getElementById('cat-reset');
  if(resetBtn){
    resetBtn.addEventListener('click', (ev)=>{
      if(!ev.shiftKey){
        alert('Hold Shift while clicking to reset this category');
        return;
      }
      const answeredKey = `answered_${slug}`;
      const verKey = `category_version_${slug}`;
      const hashKey = `category_hash_${slug}`;
      localStorage.removeItem(answeredKey);
      localStorage.removeItem(verKey);
      localStorage.removeItem(hashKey);
      // notify other tabs/pages
      try{ localStorage.setItem('reset_signal', Date.now().toString()); }catch(e){}
      // clear UI immediately
      document.querySelectorAll('.q-card').forEach(el=>el.classList.remove('disabled'));
      alert('Category reset');
    });
  }
}


function markAnswered(slug, idx){
  const key = answeredKey(slug);
  const arr = JSON.parse(localStorage.getItem(key)||'[]');
  if(!arr.includes(idx)) arr.push(idx);
  localStorage.setItem(key, JSON.stringify(arr));
}

function reloadGridState(slug){
  const answered = new Set(JSON.parse(localStorage.getItem(answeredKey(slug))||'[]'));
  document.querySelectorAll('.q-card').forEach((el)=>{
    const qidx = parseInt(el.dataset.q, 10);
    if(Number.isFinite(qidx) && answered.has(qidx)) el.classList.add('answered'); else el.classList.remove('answered');
  });
}

function closeModal(){ q('#modal').classList.add('hidden'); }

q('#close-modal')?.addEventListener('click', closeModal);
q('#modal')?.addEventListener('click', (e)=>{ if(e.target.id==='modal') closeModal(); });

// listen for storage changes (reset from main page or other tabs)
window.addEventListener('storage', (e)=>{
  if(!e.key) return;
  const slug = getSlug();
  if(e.key === 'reset_signal' || e.key === 'answered_signal'){
    // global reset: clear visual disabled marks
    try{ reloadGridState(slug); }catch(err){}
    return;
  }
  if(e.key.startsWith('answered_') || e.key.startsWith(`category_hash_${slug}`) || e.key.startsWith(`category_version_${slug}`)){
    // rerender grid state to reflect cleared answers
    try{ reloadGridState(slug); }catch(err){ /* ignore */ }
    // if the answered list was removed, also refresh the whole page to clear visual states
    if(e.newValue === null) location.reload();
  }
    // on global reset signal, or when this category's answered list changes, refresh UI
    if(e.key === 'reset_signal' || (e.key && e.key.startsWith(`answered_${slug}`)) || (e.key && e.key.startsWith(`category_hash_${slug}`)) || (e.key && e.key.startsWith(`category_version_${slug}`))){
      reloadGridState(slug);
      // also remove any lingering disabled classes
      document.querySelectorAll('.q-card').forEach(el=>el.classList.remove('disabled'));
    }
});

// Ensure grid state refreshes when returning to the category page (back button, bfcache)
window.addEventListener('pageshow', (e)=>{ try{ reloadGridState(getSlug()); }catch(_){} });
window.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') try{ reloadGridState(getSlug()); }catch(_){} });
window.addEventListener('focus', ()=>{ try{ reloadGridState(getSlug()); }catch(_){} });

init();

// small unobtrusive per-category reset button (Shift+Click to avoid accidents)
const catResetBtn = document.getElementById('cat-reset');
if(catResetBtn){
  catResetBtn.addEventListener('click', (e)=>{
    if(!e.shiftKey){ alert('Przytrzymaj Shift i kliknij, aby zresetować tę kategorię.'); return; }
    const slug = getSlug();
    const keys = Object.keys(localStorage);
    keys.forEach(k=>{ if(k.includes(slug) && (k.startsWith('answered_')||k.startsWith('category_version_')||k.startsWith('category_hash_'))) localStorage.removeItem(k); });
    try{ localStorage.setItem('reset_signal', String(Date.now())); }catch(err){}
    reloadGridState(slug);
    alert('Zresetowano tę kategorię.');
  });
}
