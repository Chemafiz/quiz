import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import {
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";



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
const storage = getStorage(app);



async function uploadAvatar(file) {
  const fileRef = ref(storage, `avatars/${Date.now()}-${file.name}`);

  await uploadBytes(fileRef, file);

  const url = await getDownloadURL(fileRef);

  return url;
}

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

document.getElementById("add-user-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const avatarFile = avatarFileEl.files[0];

  if (!name) return showMsg("Wpisz nick!", false);
  if (!avatarFile) return showMsg("Dodaj zdjęcie!", false);

  showMsg("Wysyłam...", true);

  try {
    // 1. Upload zdjęcia do Storage
    const avatarURL = await uploadAvatar(avatarFile);

    // 2. Zapis do Firestore
    const payload = {
      name,
      avatar: avatarURL,
      points: 0
    };

    await addDoc(collection(db, "participants"), payload);

    showMsg("Dodano uczestnika!", true);
    document.getElementById("add-user-form").reset();

    // odśwież listę
    loadParticipants();

  } catch (err) {
    console.error(err);
    showMsg("Błąd zapisu do Firebase", false);
  }
});

async function loadParticipants() {
  const listEl = document.getElementById("participants-list");
  listEl.innerHTML = "";

  const snapshot = await getDocs(collection(db, "participants"));

  snapshot.forEach((doc) => {
    const user = doc.data();

    const div = document.createElement("div");
    div.className = "user-card";

    div.innerHTML = `
      <img src="${user.avatar}" />
      <span>${user.name}</span>
    `;

    listEl.appendChild(div);
  });
}

loadParticipants();


