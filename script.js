// categories list will be loaded from `categories/index.json` (array of slugs)
let categories = [];

async function loadCategoryList(){
  try{
    const res = await fetch('./categories/index.json');
    if(!res.ok) throw new Error('no index');
    categories = await res.json();
  }catch(e){
    // fallback: generate placeholder names
    categories = [];
    for (let r=1;r<=3;r++) for (let c=1;c<=5;c++) categories.push(`kategoria-${ (r-1)*5 + c }`);
  }
}

const grid = document.getElementById('category-grid');
const participantsTableBody = document.querySelector('#participants-table tbody');
// no inline add form on main page; users add themselves via add_user.html
const pointsHeader = document.getElementById('points-header');

let sortOrder = 'desc'; // 'desc' or 'asc'

if(pointsHeader){
  pointsHeader.addEventListener('click', ()=>{ sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'; updateSortIndicator(); renderParticipants(); });
}

function updateSortIndicator(){
  if(!pointsHeader) return;
  pointsHeader.textContent = `Punkty ${ sortOrder==='desc' ? '▲' : '▼' }`;
}

function makeCategoryLink(slug){
  const a = document.createElement('a');
  a.href = `categories/category.html?slug=${encodeURIComponent(slug)}`;
  a.textContent = slug; // display the json filename (slug)
  a.className = 'cat-link';
  a.dataset.slug = slug;
  return a;
}

function renderCategories(){
  grid.innerHTML='';
  categories.forEach(slug=> grid.appendChild(makeCategoryLink(slug)));
}

function loadParticipantsLocal(){
  try{ return JSON.parse(localStorage.getItem('participants')||'[]'); }catch(e){return []}
}

function saveParticipantsLocal(list){ localStorage.setItem('participants', JSON.stringify(list)); }

function renderParticipants(){
  const list = loadParticipantsLocal();
  // sort
  list.sort((a,b)=>{
    const pa = parseInt(a.points)||0; const pb = parseInt(b.points)||0;
    return sortOrder==='desc' ? pb-pa : pa-pb;
  });

  participantsTableBody.innerHTML='';
  const maxPoints = Math.max(1, ...list.map(p=>parseInt(p.points)||0));

  list.forEach((p, idx)=>{
    const tr = document.createElement('tr');

    const tdAvatar = document.createElement('td');
    const img = document.createElement('img');
    img.src = p.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23333"/></svg>';
    tdAvatar.appendChild(img);

    const tdName = document.createElement('td');
    tdName.textContent = p.name;

    const tdPoints = document.createElement('td');
    tdPoints.className='points points-cell';
    tdPoints.contentEditable = true;
    tdPoints.textContent = p.points||0;
    tdPoints.addEventListener('blur', ()=>{
        const val = parseInt(tdPoints.textContent) || 0;
        p.points = val;
        const localList = loadParticipantsLocal();
        // find original index in unsorted local list by matching name+avatar
        const origIdx = localList.findIndex(x => x && x.name === p.name && x.avatar === p.avatar);
        if(origIdx >= 0) localList[origIdx] = p; else localList[idx] = p;
        saveParticipantsLocal(localList);
        renderParticipants();
    });

    // visualization bar
    const tdBar = document.createElement('td');
    const barWrap = document.createElement('div'); barWrap.className='bar-wrap';
    const bar = document.createElement('div'); bar.className='bar';
    const pct = Math.round(((parseInt(p.points)||0) / maxPoints) * 100);
    bar.style.width = pct + '%';
    barWrap.appendChild(bar);
    const label = document.createElement('span'); label.className='bar-label'; label.textContent = (p.points||0)+" pts";
    tdBar.appendChild(barWrap); tdBar.appendChild(label);

    const tdActions = document.createElement('td');
    tdActions.className='actions';
    const inc = document.createElement('button'); inc.textContent='+'; inc.className='btn-inc';
    inc.addEventListener('click', ()=>{
      p.points = (p.points||0)+1;
      const localList = loadParticipantsLocal();
      const origIdx = localList.findIndex(x => x && x.name === p.name && x.avatar === p.avatar);
      if(origIdx >= 0) localList[origIdx] = p; else localList[idx] = p;
      saveParticipantsLocal(localList);
      renderParticipants();
    });
    const dec = document.createElement('button'); dec.textContent='-'; dec.className='btn-dec';
    dec.addEventListener('click', ()=>{
      p.points = (p.points||0)-1;
      const localList = loadParticipantsLocal();
      const origIdx = localList.findIndex(x => x && x.name === p.name && x.avatar === p.avatar);
      if(origIdx >= 0) localList[origIdx] = p; else localList[idx] = p;
      saveParticipantsLocal(localList);
      renderParticipants();
    });
    const del = document.createElement('button'); del.textContent='Usuń'; del.className='btn-del';
    del.addEventListener('click', ()=>{
      const localList = loadParticipantsLocal();
      const origIdx = localList.findIndex(x => x && x.name === p.name && x.avatar === p.avatar);
      if(origIdx >= 0) localList.splice(origIdx,1); else localList.splice(idx,1);
      saveParticipantsLocal(localList);
      renderParticipants();
    });
    tdActions.appendChild(inc); tdActions.appendChild(dec); tdActions.appendChild(del);

    tr.appendChild(tdAvatar); tr.appendChild(tdName); tr.appendChild(tdPoints); tr.appendChild(tdBar); tr.appendChild(tdActions);
    participantsTableBody.appendChild(tr);
  });
}



function readFileAsDataURL(file){
  return new Promise((res,rej)=>{
    const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror=rej; r.readAsDataURL(file);
  });
}

// initialize
(async function(){
  await loadCategoryList();
  renderCategories();
  await renderParticipants();
})();

// refresh participants periodically from server
setInterval(async ()=>{ await renderParticipants(); updateCategoryStates(); }, 4000);

// update category state to show when all questions are answered
async function updateCategoryStates(){
  const links = document.querySelectorAll('.cat-link');
  for (const a of links){
    const slug = a.dataset.slug;
    if(!slug) continue;
    try{
      const res = await fetch(`./categories/${slug}/${slug}.json`);
      if(!res.ok){ a.classList.remove('answered'); continue; }
      const data = await res.json();
      const total = (data.questions && data.questions.length) || 0;
      const answered = JSON.parse(localStorage.getItem(`answered_${slug}`) || '[]').length;
      if(total > 0 && answered >= total) a.classList.add('answered'); else a.classList.remove('answered');
    }catch(e){ a.classList.remove('answered'); }
  }
}

// run after rendering categories
setTimeout(updateCategoryStates, 300);
// listen for storage changes from other tabs/windows
window.addEventListener('storage', (e)=>{ if(e.key && e.key.startsWith('answered_')) updateCategoryStates(); });

// reset all answered state (button)
const resetAllBtn = document.getElementById('reset-all');
if(resetAllBtn){
  resetAllBtn.addEventListener('click', (e)=>{
    // require Shift+Click to avoid accidental use
    if(!e.shiftKey){
      alert('Przytrzymaj Shift i kliknij ten przycisk, aby zresetować odpowiedzi.');
      return;
    }
    if(!confirm('Na pewno zresetować wszystkie zapisane odpowiedzi?')) return;
    Object.keys(localStorage).forEach(k=>{
      if(k.startsWith('answered_') || k.startsWith('category_version_') || k.startsWith('category_hash_')) localStorage.removeItem(k);
    });
    updateCategoryStates();
    // signal other tabs/pages to clear UI immediately
    try{ localStorage.setItem('reset_signal', String(Date.now())); }catch(e){}
    alert('Zresetowano odpowiedzi.');
  });
}
