import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://gwxqmnrukgnffwqsxytp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eHFtbnJ1a2duZmZ3cXN4eXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTU0MTcsImV4cCI6MjA4NzE5MTQxN30.XdrNfQqSC-r7IVI-I17shvdkiDuZZ631FedMIZ571Uw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let participants = []; // local cache
let categories = [];
let pointsCache = {}; // przechowywanie punktów w localStorage

function loadPointsCache() {
  try { pointsCache = JSON.parse(localStorage.getItem('pointsCache') || '{}'); }
  catch(e) { pointsCache = {}; }
}

function savePointsCache() {
  localStorage.setItem('pointsCache', JSON.stringify(pointsCache));
}

// === UI SELECTORS ===
const participantsTableBody = document.querySelector('#participants-table tbody');
const categoryGrid = document.getElementById('category-grid');
const deleteAllBtn = document.getElementById('delete-all');

// === HELPERS ===
function renderParticipants() {
  // Sortuj po punktach malejąco
  let sorted = [...participants].sort((a, b) => (pointsCache[b.id] || 0) - (pointsCache[a.id] || 0));
  participantsTableBody.innerHTML = '';
  const maxPoints = Math.max(1, ...sorted.map(p => pointsCache[p.id] || 0));

  sorted.forEach((p) => {
    const tr = document.createElement('tr');

    const tdAvatar = document.createElement('td');
    const img = document.createElement('img');
    img.src = p.avatar_url;
    img.style.width = "100px";
    img.style.height = "100px";
    img.style.borderRadius = "50%";
    tdAvatar.appendChild(img);

    const tdName = document.createElement('td');
    tdName.textContent = p.name;

    const tdPoints = document.createElement('td');
    tdPoints.contentEditable = true;
    tdPoints.textContent = pointsCache[p.id] || 0;
    tdPoints.addEventListener('blur', async () => {
      const newPoints = parseInt(tdPoints.textContent) || 0;
      pointsCache[p.id] = newPoints;
      savePointsCache();
      renderParticipants();
    });

    const tdBar = document.createElement('td');
    const barWrap = document.createElement('div');
    barWrap.className = 'bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'bar';
    const pct = Math.round(((pointsCache[p.id] || 0)/maxPoints)*100);
    bar.style.width = pct + '%';
    barWrap.appendChild(bar);
    const label = document.createElement('span');
    label.className = 'bar-label';
    label.textContent = (pointsCache[p.id] || 0) + ' pts';
    tdBar.appendChild(barWrap);
    tdBar.appendChild(label);

    const tdActions = document.createElement('td');
    const inc = document.createElement('button'); inc.textContent = '+'; inc.className='btn-inc';
    const dec = document.createElement('button'); dec.textContent = '-'; dec.className='btn-dec';
    const del = document.createElement('button'); del.textContent = 'Usuń'; del.className='btn-del';

    inc.addEventListener('click', async () => { 
      pointsCache[p.id] = (pointsCache[p.id] || 0) + 1;
      savePointsCache();
      renderParticipants();
    });
    dec.addEventListener('click', async () => { 
      pointsCache[p.id] = (pointsCache[p.id] || 0) - 1;
      savePointsCache();
      renderParticipants();
    });
    del.addEventListener('click', async () => {
      if(!confirm(`Na pewno usunąć uczestnika ${p.name}?`)) return;
      console.log('Próba usunięcia uczestnika id=', p.id, p.name);
      const { data, error } = await supabase.from('participants').delete().match({ id: p.id });
      if(error) {
        console.error('Błąd usuwania uczestnika w Supabase:', error);
        alert('Błąd usuwania: ' + (error.message || 'sprawdź konsolę'));
        return;
      }
      console.log('Usunięto z supabase:', data);
      // Usuń lokalnie z pamięci i cache punktów
      participants = participants.filter(u => u.id !== p.id);
      delete pointsCache[p.id];
      savePointsCache();
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
  participants = data || [];
  loadPointsCache();
  renderParticipants();
}

// === DELETE ALL ===
if(deleteAllBtn){
  deleteAllBtn.addEventListener('click', async () => {
    if(!confirm('Na pewno usunąć wszystkich uczestników?')) return;
    await supabase.from('participants').delete().neq('id', '');
    await fetchParticipants();
  });
}

// === INITIALIZE ===
(async function(){
  loadPointsCache();
  await loadCategoryList();
  await fetchParticipants();
})();