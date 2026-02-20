import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://gwxqmnrukgnffwqsxytp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eHFtbnJ1a2duZmZ3cXN4eXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTU0MTcsImV4cCI6MjA4NzE5MTQxN30.XdrNfQqSC-r7IVI-I17shvdkiDuZZ631FedMIZ571Uw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const avatarPreview = document.getElementById("avatar-preview");
const avatarFileEl = document.getElementById("avatar-file");

avatarFileEl.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  avatarPreview.src = URL.createObjectURL(file);
  avatarPreview.style.display = "block";
});

function showMsg(text, ok = true) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.style.color = ok ? "#9ae6b4" : "#ff9aa2";
}

document.getElementById("add-user-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const file = avatarFileEl.files[0];
  if (!name) return showMsg("Wpisz nick!", false);
  if (!file) return showMsg("Dodaj zdjęcie!", false);

  showMsg("Wysyłam...");

  try {
    const fileName = `${Date.now()}-${file.name}`;

    // Upload do storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);
    if (uploadError) throw uploadError;

    // Pobierz publiczny URL
    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const avatarURL = data.publicUrl;

    // Insert do bazy
    const { error: insertError } = await supabase.from("participants").insert([
      { name, avatar_url: avatarURL }
    ]);
    if (insertError) throw insertError;

    showMsg("Dodano uczestnika!");
    document.getElementById("add-user-form").reset();
    avatarPreview.style.display = "none";
  } catch (err) {
    console.error(err);
    showMsg("Błąd zapisu!", false);
  }
});