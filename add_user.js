import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCQMW1MeMF27VSvc6DqnVnZCIr9mYcSsuw",
  authDomain: "quiz-8b915.firebaseapp.com",
  projectId: "quiz-8b915",
  storageBucket: "quiz-8b915.firebasestorage.app",
  messagingSenderId: "312998480487",
  appId: "1:312998480487:web:acf418cfbacfb6a418e2c2",
  measurementId: "G-DLZB3DQTD6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function readFileAsDataURL(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
}

function resizeImageFile(file, maxDim=512, quality=0.75){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const reader = new FileReader();
    reader.onload = ()=>{
      img.onload = ()=>{
        try{
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if(w > h){ if(w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; } }
          else { if(h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; } }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        }catch(err){ reject(err); }
      };
      img.onerror = (e)=> reject(new Error('Invalid image'));
      img.src = reader.result;
    };
    reader.onerror = ()=> reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function showMsg(text, ok=true){ const el=document.getElementById('msg'); el.textContent=text; el.style.color = ok? '#9ae6b4' : '#ff9aa2'; }
// preview when URL or file changes
const avatarUrlEl = document.getElementById('avatar-url');
const avatarPreview = document.getElementById('avatar-preview');
const avatarFileEl = document.getElementById('avatar-file');
function showPreview(src){ if(!src){ avatarPreview.style.display='none'; avatarPreview.src=''; return; } avatarPreview.src = src; avatarPreview.style.display='block'; }
avatarUrlEl?.addEventListener('input', (e)=>{ const v = (e.target.value||'').trim(); if(v) showPreview(v); else showPreview(''); });
avatarFileEl?.addEventListener('change', async (e)=>{ const f = e.target.files && e.target.files[0]; if(!f) return; try{ const tmp = await readFileAsDataURL(f); showPreview(tmp); }catch(err){ console.error('Preview read failed', err); showPreview(''); } });

// debug disabled
function appendDebug(){ /* no-op */ }

document.getElementById('add-user-form').addEventListener('submit', async (e)=>{
  // If the form element isn't found for some reason, attach to first form as fallback
  const formEl = document.getElementById('add-user-form') || document.querySelector('form');
  if(formEl && !formEl._hasSubmitHandler){
    formEl._hasSubmitHandler = true; // mark to avoid double attach
  } else if(!formEl){ appendDebug('No form element found on page'); }
  // (handler continues)
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const avatarUrl = avatarUrlEl ? avatarUrlEl.value.trim() : '';
  const avatarFile = (avatarFileEl && avatarFileEl.files) ? avatarFileEl.files[0] : null;
  // always log initial submit attempt so user sees something in debug panel
  appendDebug('Submit attempt', { name: name || '<empty>', hasFile: !!avatarFile, fileSize: avatarFile? avatarFile.size : 0, avatarUrlProvided: !!avatarUrl });
  if(!name) return showMsg('Wpisz imię lub nick', false);

  let avatar = '';
  // prefer uploaded file over URL (user requested no-URL); use URL only if no file
  if(avatarFile){
    appendDebug('Using uploaded file', { name: avatarFile.name, size: avatarFile.size, type: avatarFile.type });
  } else if(avatarUrl){
    appendDebug('No file uploaded; falling back to avatar URL');
  }
  if(avatarUrl && !avatarFile) avatar = avatarUrl;
  else if(avatarFile){
    if(!avatarFile.type || !avatarFile.type.startsWith('image/')){
      showMsg('Wybrany plik nie jest obrazem.', false); return;
    }
    // try to resize/compress large images to avoid localStorage quota errors
    try{
      // helper to compute approximate byte size of a base64 data URL
      function dataUrlByteSize(dataUrl){
        if(!dataUrl) return 0;
        const comma = dataUrl.indexOf(',');
        const b64 = comma >= 0 ? dataUrl.slice(comma+1) : dataUrl;
        const padding = (b64.endsWith('==')?2:(b64.endsWith('=')?1:0));
        return Math.ceil((b64.length * 3) / 4) - padding;
      }

      // try several qualities/dimensions to get a reasonable size
      const tryCompress = async (file)=>{
        const dims = [512, 420, 360, 300];
        const quals = [0.8, 0.7, 0.6, 0.5, 0.45, 0.4];
        for(const d of dims){
          for(const q of quals){
            try{
              const candidate = await resizeImageFile(file, d, q);
              const size = dataUrlByteSize(candidate);
              console.log('Compress attempt', {d,q,size});
              // prefer small enough < 300KB, otherwise continue trying
              if(size <= 300 * 1024) return candidate;
              // keep best candidate (smallest)
              if(!tryCompress.best || size < tryCompress.bestSize){ tryCompress.best = candidate; tryCompress.bestSize = size; }
            }catch(e){ console.warn('compress attempt failed', e); }
          }
        }
        return tryCompress.best || null;
      };

      const compressed = await tryCompress(avatarFile);
      if(compressed){ avatar = compressed; appendDebug('Compression produced candidate'); }
      else {
        // last resort: raw data URL
        avatar = await readFileAsDataURL(avatarFile);
        appendDebug('Compression not sufficient; using raw dataURL');
      }
      // log sizes
      try{ appendDebug('Avatar original bytes', avatarFile.size, 'result bytes approx', dataUrlByteSize(avatar)); }catch(e){}
    }catch(err){
      console.warn('Resize failed, falling back to raw data URL', err);
      try{ avatar = await readFileAsDataURL(avatarFile); }catch(err2){ console.error('Failed to read avatar file', err2); showMsg('Nie udało się odczytać pliku obrazu.', false); return; }
    }
  }

  const payload = { name, avatar, points: 0 };

  // save to Firebase Firestore
  try {
    await addDoc(collection(db, "participants"), payload);

    showMsg("Witam w grze!", true);
    document.getElementById("add-user-form").reset();

  } catch (err) {
    console.error("Firebase save error", err);
    showMsg("Nie udało się zapisać usera", false);
  }
});


