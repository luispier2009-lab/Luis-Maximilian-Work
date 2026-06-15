const STORE_KEY = "lm_alessandro_webhub_v1";
const OWNER = { username: "owner", password: "owner123" };

const starterData = {
  users: [
    { id: crypto.randomUUID(), username: "Alessandro", role: "Owner", status: "Aktiv" },
    { id: crypto.randomUUID(), username: "Support Team", role: "Staff", status: "Aktiv" }
  ],
  profiles: [
    { id: crypto.randomUUID(), name: "Bot Commands", category: "Discord Tool", description: "Verwalte Commands, Kategorien und Zugriffsbereiche direkt auf der Website." },
    { id: crypto.randomUUID(), name: "Code Tabs", category: "Workspace", description: "Sammle Code-Snippets, Notizen und wichtige Projektbereiche als Web-Profile." },
    { id: crypto.randomUUID(), name: "Team Access", category: "Management", description: "Owner, Staff und Member werden sauber getrennt und übersichtlich angezeigt." }
  ],
  tickets: [
    { id: crypto.randomUUID(), name: "System", type: "Idee", title: "Website statt Programm", message: "Downloadbereich wurde in Profile und Webfunktionen umgewandelt.", status: "Offen", created: new Date().toLocaleString("de-DE") }
  ]
};

let data = loadData();
let loggedIn = sessionStorage.getItem("lm_owner") === "true";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function loadData() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    localStorage.setItem(STORE_KEY, JSON.stringify(starterData));
    return structuredClone(starterData);
  }
  try { return JSON.parse(saved); } catch { return structuredClone(starterData); }
}

function saveData() {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

function renderStats() {
  const openTickets = data.tickets.filter(t => t.status !== "Erledigt").length;
  const ideas = data.tickets.filter(t => t.type === "Idee").length;
  $("#statUsers").textContent = data.users.length;
  $("#statTickets").textContent = data.tickets.length;
  $("#statIdeas").textContent = ideas;
  $("#miniUsers").textContent = data.users.length;
  $("#miniOpen").textContent = openTickets;

  const latest = data.tickets.slice(-3).reverse();
  $("#previewList").innerHTML = latest.map(ticket => `
    <div class="preview-item"><strong>${escapeHtml(ticket.title)}</strong>${escapeHtml(ticket.type)} · ${escapeHtml(ticket.status)}</div>
  `).join("") || `<div class="preview-item"><strong>Noch keine Tickets</strong>Warte auf neue Meldungen.</div>`;
}

function renderProfiles() {
  $("#profileGrid").innerHTML = data.profiles.map(profile => `
    <article class="profile-card">
      <span class="badge">${escapeHtml(profile.category)}</span>
      <h3>${escapeHtml(profile.name)}</h3>
      <p>${escapeHtml(profile.description)}</p>
      <div class="profile-meta"><span>Website Profil</span><span>Aktiv</span></div>
    </article>
  `).join("");
}

function renderAdmin() {
  $("#ownerLocked").classList.toggle("hidden", loggedIn);
  $("#ownerPanel").classList.toggle("hidden", !loggedIn);
  $("#openLogin").textContent = loggedIn ? "Owner aktiv" : "Login";

  if (!loggedIn) return;

  $("#userList").innerHTML = data.users.map(user => `
    <div class="list-row">
      <div><strong>${escapeHtml(user.username)}</strong><p>${escapeHtml(user.role)} · ${escapeHtml(user.status)}</p></div>
      <button class="icon-button" data-delete-user="${user.id}" title="User löschen">×</button>
    </div>
  `).join("");

  $("#ticketList").innerHTML = data.tickets.slice().reverse().map(ticket => `
    <div class="list-row">
      <div><strong>${escapeHtml(ticket.title)}</strong><p>${escapeHtml(ticket.type)} von ${escapeHtml(ticket.name)} · ${escapeHtml(ticket.created)}<br>${escapeHtml(ticket.message)}</p></div>
      <button class="icon-button" data-delete-ticket="${ticket.id}" title="Ticket löschen">×</button>
    </div>
  `).join("");
}

function renderAll() {
  renderStats();
  renderProfiles();
  renderAdmin();
}

function openLoginModal() { $("#loginModal").classList.remove("hidden"); $("#loginNote").textContent = ""; }
function closeLoginModal() { $("#loginModal").classList.add("hidden"); }

$("#menuToggle").addEventListener("click", () => $("#nav").classList.toggle("open"));
$$("#nav a").forEach(link => link.addEventListener("click", () => $("#nav").classList.remove("open")));

["#openLogin", "#heroLogin", "#lockedLogin"].forEach(id => $(id).addEventListener("click", openLoginModal));
$("#closeLogin").addEventListener("click", closeLoginModal);
$("#loginModal").addEventListener("click", event => { if (event.target.id === "loginModal") closeLoginModal(); });

$("#loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (form.get("username") === OWNER.username && form.get("password") === OWNER.password) {
    loggedIn = true;
    sessionStorage.setItem("lm_owner", "true");
    closeLoginModal();
    renderAll();
    location.hash = "owner";
  } else {
    $("#loginNote").textContent = "Login falsch. Nutze owner / owner123.";
    $("#loginNote").style.color = "#ff9aad";
  }
});

$("#logoutBtn").addEventListener("click", () => {
  loggedIn = false;
  sessionStorage.removeItem("lm_owner");
  renderAll();
});

$("#ticketForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  data.tickets.push({
    id: crypto.randomUUID(),
    name: form.get("name"),
    type: form.get("type"),
    title: form.get("title"),
    message: form.get("message"),
    status: "Offen",
    created: new Date().toLocaleString("de-DE")
  });
  saveData();
  event.currentTarget.reset();
  $("#ticketNote").textContent = "Ticket wurde gespeichert.";
  renderAll();
});

$("#userForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  data.users.push({ id: crypto.randomUUID(), username: form.get("username"), role: form.get("role"), status: form.get("status") });
  saveData();
  event.currentTarget.reset();
  renderAll();
});

$("#profileForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  data.profiles.push({ id: crypto.randomUUID(), name: form.get("name"), category: form.get("category"), description: form.get("description") });
  saveData();
  event.currentTarget.reset();
  renderAll();
});

document.addEventListener("click", event => {
  const userId = event.target.dataset.deleteUser;
  const ticketId = event.target.dataset.deleteTicket;
  if (userId) data.users = data.users.filter(user => user.id !== userId);
  if (ticketId) data.tickets = data.tickets.filter(ticket => ticket.id !== ticketId);
  if (userId || ticketId) { saveData(); renderAll(); }
});

renderAll();
