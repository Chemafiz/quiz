import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://gwxqmnrukgnffwqsxytp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eHFtbnJ1a2duZmZ3cXN4eXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTU0MTcsImV4cCI6MjA4NzE5MTQxN30.XdrNfQqSC-r7IVI-I17shvdkiDuZZ631FedMIZ571Uw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let participants = []; // local cache
let categories = [];

// === UI SELECTORS ===
const participantsTableBody = document.querySelector('#participants-table tbody');
const categoryGrid = document.getElementById('category-grid');
const deleteAllBtn = document.getElementById('delete-all');

// === HELPERS ===
function loadParticipantsLocal() {
  try { return JSON.parse(localStorage.getItem('participants') || '[]'); }
  catch(e) { return []; }
}

function saveParticipantsLocal(list) {
  localStorage.setItem('participants', JSON.stringify(list));
}

function renderParticipants() {
  const localList = loadParticipantsLocal();
  participantsTableBody.innerHTML = '';
  const maxPoints = Math.max(1, ...localList.map(p => p.points || 0));

  localList.forEach((p, idx) => {
    const tr = document.createElement('tr');

    const tdAvatar = document.createElement('td');
    const img = document.createElement('img');
    img.src = p.avatar_url;
    img.style.width = "32px";
    img.style.height = "32px";
    img.style.borderRadius = "50%";
    tdAvatar.appendChild(img);

    const tdName = document.createElement('td');
    tdName.textContent = p.name;

    const tdPoints = document.createElement('td');
    tdPoints.contentEditable = true;
    tdPoints.textContent = p.points || 0;
    tdPoints.addEventListener('blur', () => {
      p.points = parseInt(tdPoints.textContent) || 0;
      const list = loadParticipantsLocal();
      list[idx] = p;
      saveParticipantsLocal(list);
      renderParticipants();
    });

    const tdBar = document.createElement('td');
    const barWrap = document.createElement('div');
    barWrap.className = 'bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'bar';
    const pct = Math.round(((p.points || 0)/maxPoints)*100);
    bar.style.width = pct + '%';
    barWrap.appendChild(bar);
    const label = document.createElement('span');
    label.className = 'bar-label';
    label.textContent = (p.points || 0) + ' pts';
    tdBar.appendChild(barWrap);
    tdBar.appendChild(label);

    const tdActions = document.createElement('td');
    const inc = document.createElement('button'); inc.textContent = '+'; inc.className='btn-inc';
    const dec = document.createElement('button'); dec.textContent = '-'; dec.className='btn-dec';
    const del = document.createElement('button'); del.textContent = 'Usuń'; del.className='btn-del';

    inc.addEventListener('click', () => { p.points = (p.points || 0) + 1; const list = loadParticipantsLocal(); list[idx]=p; saveParticipantsLocal(list); renderParticipants(); });
    dec.addEventListener('click', () => { p.points = (p.points || 0) - 1; const list = loadParticipantsLocal(); list[idx]=p; saveParticipantsLocal(list); renderParticipants(); });
    del.addEventListener('click', async () => {
      const list = loadParticipantsLocal();
      list.splice(idx, 1);
      saveParticipantsLocal(list);
      // usuń z supabase
      await supabase.from('participants').delete().eq('name', p.name).eq('avatar_url', p.avatar_url);
      renderParticipants();
    });

    tdActions.appendChild(inc); tdActions.appendChild(dec); tdActions.appendChild(del);

    tr.appendChild(tdAvatar); tr.appendChild(tdName); tr.appendChild(tdPoints); tr.appendChild(tdBar); tr.appendChild(tdActions);
    participantsTableBody.appendChild(tr);
  });
}

// === LOAD CATEGORIES ===
async function loadCategoryList() {
  try {
    const res = await fetch('./categories/index.json');
    if(!res.ok) throw new Error('No index');
    categories = await res.json();
  } catch(e) {
    categories = [];
    for(let r=1;r<=3;r++) for(let c=1;c<=5;c++) categories.push(`kategoria-${(r-1)*5+c}`);
  }
  renderCategories();
}

function renderCategories() {
  categoryGrid.innerHTML = '';
  categories.forEach(slug => {
    const a = document.createElement('a');
    a.href = `categories/category.html?slug=${encodeURIComponent(slug)}`;
    a.textContent = slug;
    a.className='cat-link';
    a.dataset.slug = slug;
    categoryGrid.appendChild(a);
  });
}

// === LOAD PARTICIPANTS FROM SUPABASE ===
async function fetchParticipants() {
  const { data, error } = await supabase.from('participants').select('*');
  if(error) { console.error(error); return; }
  participants = data.map(u => ({ ...u, points: 0 })); // reset points locally
  saveParticipantsLocal(participants);
  renderParticipants();
}

// === DELETE ALL ===
if(deleteAllBtn){
  deleteAllBtn.addEventListener('click', async () => {
    if(!confirm('Na pewno usunąć wszystkich uczestników?')) return;
    await supabase.from('participants').delete();
    saveParticipantsLocal([]);
    renderParticipants();
  });
}

// === INITIALIZE ===
(async function(){
  await loadCategoryList();
  await fetchParticipants();
})();