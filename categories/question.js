function $q(s){ return document.querySelector(s); }

function getParams(){ return new URLSearchParams(window.location.search); }

function loadJSON(path){ return fetch(path).then(r=>{ if(!r.ok) throw new Error('not found'); return r.json(); }); }

function answeredKey(slug){ return `answered_${slug}`; }

async function init(){
  const params = getParams();
  const slug = params.get('slug') || 'kategoria-1';
  const qidx = parseInt(params.get('q') || '0', 10);

  // set back link to category page
  $q('#back-cat').setAttribute('href', `category.html?slug=${encodeURIComponent(slug)}`);
  $q('#cat-title').textContent = slug.replace(/-/g,' ');

  const jsonPath = `./${slug}/${slug}.json`;
  let data = {questions:[]};
  try{ data = await loadJSON(jsonPath); }catch(e){ console.warn('Could not load', jsonPath); }

  // If JSON version changed on server, clear answered state so questions become enabled
  const ver = data.version || 0;
  const verKey = `category_version_${slug}`;
  const storedVer = localStorage.getItem(verKey);
  if(String(storedVer) !== String(ver)){
    localStorage.removeItem(answeredKey(slug));
    localStorage.setItem(verKey, String(ver));
  }

  // also clear if content hash changed
  try{
    const hash = JSON.stringify(data.questions || []);
    const hashKey = `category_hash_${slug}`;
    const storedHash = localStorage.getItem(hashKey);
    if(storedHash !== hash){
      localStorage.removeItem(answeredKey(slug));
      localStorage.setItem(hashKey, hash);
    }
  }catch(e){ }

  const qt = data.questions && data.questions[qidx];
  if(!qt){ $q('#q-title').textContent = 'Pytanie nie istnieje'; return; }

  $q('#q-title').textContent = qt.title || `Pytanie ${qidx+1}`;
  $q('#q-text').textContent = qt.text || '';

  // toggle button for special categories (e.g., 1vs1) - allows manual uncheck
  const toggleBtn = document.getElementById('toggle-answered');
  function updateToggleBtn(){
    try{
      const key = answeredKey(slug);
      const arr = JSON.parse(localStorage.getItem(key)||'[]');
      const active = arr.includes(qidx);
      if(toggleBtn){
        toggleBtn.style.display = (slug === '1vs1') ? 'inline-block' : 'none';
        if(active) toggleBtn.classList.add('active'); else toggleBtn.classList.remove('active');
        toggleBtn.title = active ? 'Odznacz pytanie (usuń z zaliczonych)' : 'Oznacz jako zaliczone';
      }
    }catch(e){ /* ignore */ }
  }
  if(toggleBtn){
    toggleBtn.addEventListener('click', ()=>{
      try{
        const key = answeredKey(slug);
        const arr = JSON.parse(localStorage.getItem(key)||'[]');
        const idx = arr.indexOf(qidx);
        if(idx >= 0){ arr.splice(idx,1); } else { arr.push(qidx); }
        localStorage.setItem(key, JSON.stringify(arr));
        // notify other tabs/pages
        try{ localStorage.setItem('answered_signal', String(Date.now())); }catch(e){}
        // update opener (category grid) if present
        try{
          if(window.opener && !window.opener.closed){
            const sel = `a.q-card[data-q="${qidx}"]`;
            const el = window.opener.document.querySelector(sel);
            if(el){ if(idx >= 0) el.classList.remove('answered'); else el.classList.add('answered'); }
          }
        }catch(e){}
      }catch(e){ console.warn('toggle failed', e); }
      updateToggleBtn();
    });
  }
  // ensure initial state is reflected
  updateToggleBtn();

  // Mark this question as answered on view (unified behavior)
  try{
    const key = answeredKey(slug);
    const arr = JSON.parse(localStorage.getItem(key)||'[]');
    if(!arr.includes(qidx)){
      arr.push(qidx);
      localStorage.setItem(key, JSON.stringify(arr));
      // notify other tabs/pages
      try{ localStorage.setItem('answered_signal', String(Date.now())); }catch(e){}
      // try to update opener category page immediately (if opened from there)
      try{
        if(window.opener && !window.opener.closed){
          const sel = `a.q-card[data-q="${qidx}"]`;
          const el = window.opener.document.querySelector(sel);
          if(el){ el.classList.add('answered'); }
        }
      }catch(e){ /* ignore cross-origin */ }
    }
  }catch(e){ /* ignore storage errors */ }

  const imgWrap = $q('#q-img-wrap'); imgWrap.innerHTML='';
  if(qt.image){ const img = document.createElement('img'); img.className='q-img'; img.src = qt.image; img.onerror = ()=>{ img.style.display='none'; }; imgWrap.appendChild(img); }

  const answersWrap = $q('#q-answers'); answersWrap.innerHTML='';
  const keys = Object.keys(qt.answers || {});
  const correctKey = qt.correct || keys[0];

  keys.forEach(k=>{
    const el = document.createElement('div'); el.className='answer'; el.textContent = `${k.toUpperCase()}: ${qt.answers[k]}`;
    el.addEventListener('click', ()=>{
      if(el._answered) return; // prevent double-click
      el._answered = true;
      if(k === correctKey) el.classList.add('correct'); else el.classList.add('wrong');
      // reveal correct
      Array.from(document.querySelectorAll('.answer')).forEach(a=>{
        if(a !== el && a.textContent.startsWith((correctKey||'').toUpperCase())) a.classList.add('correct');
      });
      // persist answered state for this question
      const arr = JSON.parse(localStorage.getItem(answeredKey(slug))||'[]');
      if(!arr.includes(qidx)) arr.push(qidx);
      localStorage.setItem(answeredKey(slug), JSON.stringify(arr));
      // notify other tabs/pages immediately
      try{ localStorage.setItem('answered_signal', String(Date.now())); }catch(e){}
      // if this page was opened from the category page (opener), try to update it directly
      try{
        if(window.opener && !window.opener.closed){
          const sel = `a.q-card[href*="q=${qidx}"]`;
          const el = window.opener.document.querySelector(sel);
          if(el){ el.classList.add('answered'); el.classList.add('disabled'); }
        }
      }catch(e){ /* ignore cross-origin or other errors */ }
      // do not redirect automatically; let host navigate back manually
    });
    answersWrap.appendChild(el);
  });
}

// listen for storage changes (reset from main page or other tabs)
window.addEventListener('storage', (e)=>{
  if(!e.key) return;
  const params = getParams();
  const slug = params.get('slug') || 'kategoria-1';
  if(e.key === 'reset_signal'){
    // clear answer styles without reload
    document.querySelectorAll('.answer.correct, .answer.wrong').forEach(el=>{ el.classList.remove('correct','wrong'); el._answered = false; });
    return;
  }
  if(e.key.startsWith('answered_') || e.key === `category_hash_${slug}` || e.key === `category_version_${slug}`){
    // reload page so visual answer marks are cleared/reset
    location.reload();
  }
});

init();
