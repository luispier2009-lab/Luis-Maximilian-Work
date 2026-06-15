const STORAGE_KEY = 'lm_alessandro_hub_v11';

const PERMISSIONS = [
  'dashboard',
  'tickets.view', 'tickets.create', 'tickets.manage',
  'ideas.view', 'ideas.create', 'ideas.manage',
  'commands.view', 'commands.manage',
  'code.view', 'code.manage',
  'users.manage', 'settings.manage'
];

const ROLE_PRESETS = {
  Owner: [...PERMISSIONS],
  Admin: ['dashboard', 'tickets.view', 'tickets.create', 'tickets.manage', 'ideas.view', 'ideas.create', 'ideas.manage', 'commands.view', 'commands.manage', 'code.view', 'code.manage', 'users.manage'],
  Staff: ['dashboard', 'tickets.view', 'tickets.create', 'tickets.manage', 'ideas.view', 'ideas.create', 'ideas.manage', 'commands.view', 'code.view'],
  User: ['dashboard', 'tickets.view', 'tickets.create', 'ideas.view', 'ideas.create', 'commands.view']
};

const defaultState = {
  users: [
    {
      id: 'owner-account',
      username: 'owner',
      email: '',
      password: 'owner123',
      role: 'Owner',
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLogin: '',
      permissions: ROLE_PRESETS.Owner
    }
  ],
  tickets: [],
  ideas: [],
  commands: [
    { id: crypto.randomUUID(), name: '/help', category: 'General', status: 'Active', description: 'Shows the command overview for users.', usage: '/help', createdBy: 'owner' },
    { id: crypto.randomUUID(), name: '/ticket', category: 'Support', status: 'Active', description: 'Creates a support ticket inside the Discord server.', usage: '/ticket reason:...', createdBy: 'owner' },
    { id: crypto.randomUUID(), name: '/ping', category: 'Status', status: 'Active', description: 'Checks bot response time.', usage: '/ping', createdBy: 'owner' }
  ],
  codeTabs: []
};

let state = loadState();
let currentUser = null;

const $ = id => document.getElementById(id);
const loginModal = $('loginModal');
const userModal = $('userModal');
const hub = $('hub');
const loginForm = $('loginForm');
const loginMessage = $('loginMessage');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function formatDate(value) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
function rolePermissions(role) { return ROLE_PRESETS[role] ? [...ROLE_PRESETS[role]] : [...ROLE_PRESETS.User]; }
function normalizeUser(user) {
  const role = ['Owner', 'Admin', 'Staff', 'User'].includes(user.role) ? user.role : 'User';
  return {
    id: user.id || crypto.randomUUID(),
    username: user.username || 'user',
    email: user.email || '',
    password: user.password || 'password',
    role,
    status: user.status || 'Active',
    createdAt: user.createdAt || new Date().toISOString(),
    lastLogin: user.lastLogin || '',
    permissions: role === 'Owner' ? rolePermissions('Owner') : (Array.isArray(user.permissions) && user.permissions.length ? user.permissions.filter(p => PERMISSIONS.includes(p)) : rolePermissions(role))
  };
}
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return clone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    const next = { ...clone(defaultState), ...parsed };
    next.users = Array.isArray(parsed.users) && parsed.users.length ? parsed.users.map(normalizeUser) : clone(defaultState.users);
    if (!next.users.some(user => user.role === 'Owner')) next.users.unshift(clone(defaultState.users[0]));
    next.tickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];
    next.ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
    next.commands = Array.isArray(parsed.commands) ? parsed.commands : clone(defaultState.commands);
    next.codeTabs = Array.isArray(parsed.codeTabs) ? parsed.codeTabs : [];
    return next;
  } catch { return clone(defaultState); }
}

function can(permission) {
  if (!currentUser) return false;
  return currentUser.role === 'Owner' || currentUser.permissions.includes(permission);
}
function canAny(...permissions) { return permissions.some(permission => can(permission)); }
function panelAllowed(panel) {
  const map = {
    dashboard: ['dashboard'], tickets: ['tickets.view'], ideas: ['ideas.view'], commands: ['commands.view'],
    code: ['code.view'], users: ['users.manage'], settings: ['settings.manage']
  };
  return canAny(...(map[panel] || []));
}
function firstPanel() { return ['dashboard', 'tickets', 'ideas', 'commands', 'code', 'users', 'settings'].find(panelAllowed) || 'dashboard'; }

function openLogin() { loginModal.classList.add('open'); loginModal.setAttribute('aria-hidden', 'false'); $('loginUsername').focus(); }
function closeLogin() { loginModal.classList.remove('open'); loginModal.setAttribute('aria-hidden', 'true'); loginMessage.textContent = ''; }
function openHub() { hub.classList.add('open'); hub.setAttribute('aria-hidden', 'false'); document.body.classList.add('hub-open'); renderAll(); switchPanel(firstPanel()); }
function closeHub() { hub.classList.remove('open'); hub.setAttribute('aria-hidden', 'true'); document.body.classList.remove('hub-open'); currentUser = null; }

function switchPanel(panel) {
  if (!panelAllowed(panel)) return;
  document.querySelectorAll('.hub-nav button').forEach(btn => btn.classList.toggle('active', btn.dataset.panel === panel));
  document.querySelectorAll('.panel').forEach(item => item.classList.toggle('active', item.id === `panel-${panel}`));
}

function metaHtml(items) { return `<div class="item-meta">${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`; }
function renderList(targetId, items, emptyText, mapper) {
  $(targetId).innerHTML = items.length ? items.map(mapper).join('') : `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
}
function searchMatch(search, ...values) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return values.some(value => String(value || '').toLowerCase().includes(needle));
}

function visibleTickets() {
  let items = can('tickets.manage') ? [...state.tickets] : state.tickets.filter(t => t.createdBy === currentUser.username);
  const status = $('ticketFilter')?.value || 'all';
  const search = $('ticketSearch')?.value || '';
  if (status !== 'all') items = items.filter(t => t.status === status);
  return items.filter(t => searchMatch(search, t.title, t.text, t.type, t.priority, t.createdBy));
}
function visibleIdeas() {
  let items = can('ideas.manage') ? [...state.ideas] : state.ideas.filter(i => i.createdBy === currentUser.username);
  const status = $('ideaFilter')?.value || 'all';
  const search = $('ideaSearch')?.value || '';
  if (status !== 'all') items = items.filter(i => i.status === status);
  return items.filter(i => searchMatch(search, i.title, i.text, i.createdBy));
}

function updateVisibility() {
  document.querySelectorAll('[data-gate]').forEach(button => { button.style.display = panelAllowed(button.dataset.panel) ? '' : 'none'; });
  document.querySelectorAll('.manager-only').forEach(el => { el.style.display = canAny('tickets.manage', 'ideas.manage') ? '' : 'none'; });
  document.querySelectorAll('.manage-commands-only').forEach(el => { el.style.display = can('commands.manage') ? '' : 'none'; });
  document.querySelectorAll('.manage-code-only').forEach(el => { el.style.display = can('code.manage') ? '' : 'none'; });
  $('newTicketButton').style.display = can('tickets.create') ? '' : 'none';
  $('newIdeaButton').style.display = can('ideas.create') ? '' : 'none';
  $('adminStats').style.display = canAny('tickets.manage', 'ideas.manage', 'users.manage') ? '' : 'none';
}

function renderDashboard() {
  const openTickets = state.tickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length;
  const pendingIdeas = state.ideas.filter(i => !['Done', 'Rejected'].includes(i.status)).length;
  $('openTicketCount').textContent = openTickets;
  $('pendingIdeaCount').textContent = pendingIdeas;
  $('commandCount').textContent = state.commands.length;
  $('userCount').textContent = state.users.length;
  $('dashboardTitle').textContent = canAny('tickets.manage', 'users.manage') ? 'Workspace Overview' : 'My Workspace';
  $('dashboardCardTitle').textContent = canAny('tickets.manage', 'users.manage') ? 'Management Dashboard' : 'Account Dashboard';
  $('dashboardCardText').textContent = canAny('tickets.manage', 'users.manage')
    ? 'Review open work, manage content and control user access from the available sections.'
    : 'Create tickets or ideas and view the command information that is available to your account.';
  const ownTickets = state.tickets.filter(t => t.createdBy === currentUser.username).length;
  const ownIdeas = state.ideas.filter(i => i.createdBy === currentUser.username).length;
  $('quickStatus').textContent = canAny('tickets.manage', 'ideas.manage')
    ? `${openTickets} open tickets and ${pendingIdeas} pending ideas are currently in the workspace.`
    : `You have submitted ${ownTickets} ticket(s) and ${ownIdeas} idea(s).`;
  $('accountSummary').textContent = `${currentUser.role} account · ${currentUser.status}`;
}

function renderTickets() {
  renderList('ticketList', visibleTickets(), can('tickets.manage') ? 'No tickets yet.' : 'You have not created any tickets yet.', ticket => {
    const managerActions = can('tickets.manage') ? `
      <select class="inline-select" data-ticket-status="${ticket.id}">
        ${['Open','In Progress','Resolved','Closed'].map(s => `<option ${ticket.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <button class="small-button danger" type="button" data-delete-ticket="${ticket.id}">Delete</button>` : '';
    return `<article class="item-card">
      ${metaHtml([ticket.type, ticket.priority || 'Medium', ticket.status || 'Open', can('tickets.manage') ? `By ${ticket.createdBy}` : 'Your ticket'])}
      <h3>${escapeHtml(ticket.title)}</h3><p>${escapeHtml(ticket.text)}</p>
      ${managerActions ? `<div class="card-actions">${managerActions}</div>` : ''}
    </article>`;
  });
}

function renderIdeas() {
  renderList('ideaList', visibleIdeas(), can('ideas.manage') ? 'No ideas yet.' : 'You have not submitted any ideas yet.', idea => {
    const managerActions = can('ideas.manage') ? `
      <select class="inline-select" data-idea-status="${idea.id}">
        ${['New','In Review','Planned','Done','Rejected'].map(s => `<option ${idea.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <button class="small-button danger" type="button" data-delete-idea="${idea.id}">Delete</button>` : '';
    return `<article class="item-card">
      ${metaHtml([idea.status || 'New', can('ideas.manage') ? `By ${idea.createdBy}` : 'Your idea'])}
      <h3>${escapeHtml(idea.title)}</h3><p>${escapeHtml(idea.text)}</p>
      ${managerActions ? `<div class="card-actions">${managerActions}</div>` : ''}
    </article>`;
  });
}

function renderCommandFilters() {
  const current = $('commandCategoryFilter').value || 'all';
  const categories = [...new Set(state.commands.map(c => c.category).filter(Boolean))].sort();
  $('commandCategoryFilter').innerHTML = '<option value="all">All categories</option>' + categories.map(cat => `<option ${current === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('');
}
function renderCommands() {
  renderCommandFilters();
  const search = $('commandSearch').value || '';
  const category = $('commandCategoryFilter').value || 'all';
  const items = state.commands.filter(c => (category === 'all' || c.category === category) && searchMatch(search, c.name, c.category, c.description, c.usage));
  renderList('commandList', items, 'No commands found.', command => {
    const actions = can('commands.manage') ? `<div class="card-actions"><button class="small-button" type="button" data-edit-command="${command.id}">Edit</button><button class="small-button danger" type="button" data-delete-command="${command.id}">Delete</button></div>` : '';
    return `<article class="item-card">
      ${metaHtml([command.category, command.status || 'Active'])}
      <h3>${escapeHtml(command.name)}</h3><p>${escapeHtml(command.description)}</p><pre>${escapeHtml(command.usage)}</pre>${actions}
    </article>`;
  });
}

function renderCodeTabs() {
  renderList('codeList', state.codeTabs, 'No code tabs yet.', tab => {
    const actions = can('code.manage') ? `<div class="card-actions"><button class="small-button" type="button" data-edit-code="${tab.id}">Edit</button><button class="small-button danger" type="button" data-delete-code="${tab.id}">Delete</button></div>` : '';
    return `<article class="item-card"><h3>${escapeHtml(tab.title)}</h3><pre>${escapeHtml(tab.text)}</pre>${actions}</article>`;
  });
}

function renderUsers() {
  const search = $('userSearch').value || '';
  const role = $('roleFilter').value || 'all';
  const status = $('statusFilter').value || 'all';
  const users = state.users.filter(u => (role === 'all' || u.role === role) && (status === 'all' || u.status === status) && searchMatch(search, u.username, u.email, u.role, u.status));
  renderList('userList', users, 'No users found.', user => `
    <article class="item-card user-card">
      ${metaHtml([user.role, user.status, `Created ${formatDate(user.createdAt)}`, `Last login ${formatDate(user.lastLogin)}`])}
      <h3>${escapeHtml(user.username)}</h3><p>${escapeHtml(user.email || 'No email saved')}</p>
      <div class="permission-preview">${user.permissions.map(p => `<span>${escapeHtml(p)}</span>`).join('')}</div>
      <div class="card-actions">
        <button class="small-button" type="button" data-edit-user="${user.id}">Edit</button>
        <button class="small-button" type="button" data-password-user="${user.id}">Password</button>
        ${user.role !== 'Owner' ? `<button class="small-button" type="button" data-toggle-user="${user.id}">${user.status === 'Suspended' ? 'Activate' : 'Suspend'}</button><button class="small-button danger" type="button" data-delete-user="${user.id}">Delete</button>` : ''}
      </div>
    </article>`);
}

function renderAll() {
  if (!currentUser) return;
  $('hubWelcome').textContent = `Welcome back, ${currentUser.username}.`;
  $('accountPill').textContent = `${currentUser.role} · ${currentUser.status}`;
  updateVisibility();
  const active = document.querySelector('.panel.active')?.id.replace('panel-', '');
  if (active && !panelAllowed(active)) switchPanel(firstPanel());
  renderDashboard(); renderTickets(); renderIdeas(); renderCommands(); renderCodeTabs(); renderUsers();
}

function openUserModal(userId = '') {
  const isEdit = Boolean(userId);
  const user = isEdit ? state.users.find(u => u.id === userId) : { id: '', username: '', email: '', password: '', role: 'User', status: 'Active', permissions: rolePermissions('User') };
  if (!user) return;
  $('userModalTitle').textContent = isEdit ? 'Edit User' : 'Add User';
  $('editUserId').value = user.id;
  $('editUsername').value = user.username;
  $('editEmail').value = user.email || '';
  $('editPassword').value = user.password || '';
  $('editRole').value = user.role;
  $('editStatus').value = user.status || 'Active';
  setPermissionChecks(user.role, user.permissions);
  userModal.classList.add('open'); userModal.setAttribute('aria-hidden', 'false'); $('editUsername').focus();
}
function closeUserModal() { userModal.classList.remove('open'); userModal.setAttribute('aria-hidden', 'true'); }
function setPermissionChecks(role, permissions = []) {
  document.querySelectorAll('input[name="editPermissions"]').forEach(input => {
    input.checked = role === 'Owner' || permissions.includes(input.value);
    input.disabled = role === 'Owner';
  });
  $('editStatus').disabled = role === 'Owner';
}
function selectedPermissions() { return [...document.querySelectorAll('input[name="editPermissions"]:checked')].map(input => input.value); }
function validateUniqueUsername(username, ignoreId = '') { return !state.users.some(u => u.id !== ignoreId && u.username.toLowerCase() === username.toLowerCase()); }
function createUserAccount({ username, email = '', password, role = 'User', status = 'Active', permissions = null }) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();
  if (!cleanUsername || !cleanPassword) { alert('Username and password are required.'); return false; }
  if (!validateUniqueUsername(cleanUsername)) { alert('This username already exists.'); return false; }
  const finalRole = ['Owner', 'Admin', 'Staff', 'User'].includes(role) ? role : 'User';
  const finalPermissions = finalRole === 'Owner' ? rolePermissions('Owner') : (Array.isArray(permissions) && permissions.length ? permissions : rolePermissions(finalRole));
  state.users.push({
    id: crypto.randomUUID(),
    username: cleanUsername,
    email: String(email || '').trim(),
    password: cleanPassword,
    role: finalRole,
    status: finalRole === 'Owner' ? 'Active' : status,
    permissions: finalPermissions,
    createdAt: new Date().toISOString(),
    lastLogin: ''
  });
  saveState();
  renderAll();
  return true;
}
function updateCurrentUser() {
  if (!currentUser) return;
  currentUser = state.users.find(u => u.id === currentUser.id) || null;
  if (!currentUser || currentUser.status === 'Suspended') closeHub();
}
function resetForm(id) { $(id).reset(); $(id).classList.add('collapsed'); }

function editCommand(id = '') {
  const command = id ? state.commands.find(c => c.id === id) : { id: '', name: '', category: '', status: 'Active', description: '', usage: '' };
  if (!command) return;
  $('commandId').value = command.id;
  $('commandName').value = command.name;
  $('commandCategory').value = command.category;
  $('commandStatus').value = command.status || 'Active';
  $('commandDescription').value = command.description;
  $('commandUsage').value = command.usage;
  $('commandForm').classList.remove('collapsed');
  $('commandName').focus();
}
function editCode(id = '') {
  const tab = id ? state.codeTabs.find(t => t.id === id) : { id: '', title: '', text: '' };
  if (!tab) return;
  $('codeId').value = tab.id; $('codeTitle').value = tab.title; $('codeText').value = tab.text;
  $('codeForm').classList.remove('collapsed'); $('codeTitle').focus();
}

// Events
document.querySelectorAll('[data-open-login]').forEach(el => el.addEventListener('click', openLogin));
document.querySelectorAll('[data-close-login]').forEach(el => el.addEventListener('click', closeLogin));
document.querySelectorAll('[data-close-user-modal]').forEach(el => el.addEventListener('click', closeUserModal));
document.querySelectorAll('[data-cancel-form]').forEach(el => el.addEventListener('click', () => resetForm(el.dataset.cancelForm)));
$('logoutButton').addEventListener('click', closeHub);
document.querySelectorAll('.hub-nav button').forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const username = $('loginUsername').value.trim();
  const password = $('loginPassword').value;
  const user = state.users.find(u => u.username === username && u.password === password);
  if (!user) { loginMessage.textContent = 'Wrong username or password.'; return; }
  if (user.status === 'Suspended') { loginMessage.textContent = 'This account is suspended.'; return; }
  user.lastLogin = new Date().toISOString(); currentUser = user; saveState(); loginForm.reset(); closeLogin(); openHub();
});

$('newTicketButton').addEventListener('click', () => { $('ticketForm').classList.remove('collapsed'); $('ticketTitle').focus(); });
$('newIdeaButton').addEventListener('click', () => { $('ideaForm').classList.remove('collapsed'); $('ideaTitle').focus(); });
$('newCommandButton').addEventListener('click', () => editCommand());
$('newCodeButton').addEventListener('click', () => editCode());
$('showCreateUser').addEventListener('click', () => { $('quickUsername').focus(); $('quickUserForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
$('editRole').addEventListener('change', () => setPermissionChecks($('editRole').value, rolePermissions($('editRole').value)));
['userSearch','roleFilter','statusFilter','ticketSearch','ticketFilter','ideaSearch','ideaFilter','commandSearch','commandCategoryFilter'].forEach(id => $(id).addEventListener('input', renderAll));
['roleFilter','statusFilter','ticketFilter','ideaFilter','commandCategoryFilter'].forEach(id => $(id).addEventListener('change', renderAll));

$('ticketForm').addEventListener('submit', event => {
  event.preventDefault(); if (!can('tickets.create')) return;
  state.tickets.unshift({ id: crypto.randomUUID(), type: $('ticketType').value, priority: $('ticketPriority').value, title: $('ticketTitle').value.trim(), text: $('ticketText').value.trim(), status: 'Open', createdBy: currentUser.username, createdAt: new Date().toISOString() });
  saveState(); resetForm('ticketForm'); renderAll();
});
$('ideaForm').addEventListener('submit', event => {
  event.preventDefault(); if (!can('ideas.create')) return;
  state.ideas.unshift({ id: crypto.randomUUID(), title: $('ideaTitle').value.trim(), text: $('ideaText').value.trim(), status: 'New', createdBy: currentUser.username, createdAt: new Date().toISOString() });
  saveState(); resetForm('ideaForm'); renderAll();
});
$('commandForm').addEventListener('submit', event => {
  event.preventDefault(); if (!can('commands.manage')) return;
  const id = $('commandId').value;
  const payload = { name: $('commandName').value.trim(), category: $('commandCategory').value.trim(), status: $('commandStatus').value, description: $('commandDescription').value.trim(), usage: $('commandUsage').value.trim(), createdBy: currentUser.username };
  if (id) Object.assign(state.commands.find(c => c.id === id), payload); else state.commands.unshift({ id: crypto.randomUUID(), ...payload });
  saveState(); resetForm('commandForm'); renderAll();
});
$('codeForm').addEventListener('submit', event => {
  event.preventDefault(); if (!can('code.manage')) return;
  const id = $('codeId').value;
  const payload = { title: $('codeTitle').value.trim(), text: $('codeText').value.trim(), createdBy: currentUser.username };
  if (id) Object.assign(state.codeTabs.find(t => t.id === id), payload); else state.codeTabs.unshift({ id: crypto.randomUUID(), ...payload });
  saveState(); resetForm('codeForm'); renderAll();
});
$('userForm').addEventListener('submit', event => {
  event.preventDefault(); if (!can('users.manage')) return;
  const id = $('editUserId').value;
  const username = $('editUsername').value.trim();
  if (!validateUniqueUsername(username, id)) { alert('This username already exists.'); return; }
  const role = $('editRole').value;
  const payload = { username, email: $('editEmail').value.trim(), password: $('editPassword').value, role, status: role === 'Owner' ? 'Active' : $('editStatus').value, permissions: role === 'Owner' ? rolePermissions('Owner') : selectedPermissions() };
  if (!payload.permissions.length) payload.permissions = rolePermissions('User');
  if (id) {
    Object.assign(state.users.find(u => u.id === id), payload);
    saveState(); updateCurrentUser(); closeUserModal(); renderAll();
  } else if (createUserAccount(payload)) {
    closeUserModal();
  }
});

$('quickUserForm').addEventListener('submit', event => {
  event.preventDefault(); if (!can('users.manage')) return;
  const ok = createUserAccount({
    username: $('quickUsername').value,
    email: $('quickEmail').value,
    password: $('quickPassword').value,
    role: $('quickRole').value,
    status: $('quickStatus').value
  });
  if (ok) $('quickUserForm').reset();
});

$('resetWorkspace').addEventListener('click', () => {
  if (!can('settings.manage')) return;
  if (!confirm('Reset all local workspace data?')) return;
  localStorage.removeItem(STORAGE_KEY); state = clone(defaultState); currentUser = state.users[0]; saveState(); renderAll(); switchPanel('dashboard');
});

document.addEventListener('change', event => {
  const target = event.target;
  if (target.matches('[data-ticket-status]') && can('tickets.manage')) { const ticket = state.tickets.find(t => t.id === target.dataset.ticketStatus); if (ticket) ticket.status = target.value; saveState(); renderAll(); }
  if (target.matches('[data-idea-status]') && can('ideas.manage')) { const idea = state.ideas.find(i => i.id === target.dataset.ideaStatus); if (idea) idea.status = target.value; saveState(); renderAll(); }
});

document.addEventListener('click', event => {
  const target = event.target;
  if (target.matches('[data-delete-ticket]') && can('tickets.manage')) { state.tickets = state.tickets.filter(t => t.id !== target.dataset.deleteTicket); saveState(); renderAll(); }
  if (target.matches('[data-delete-idea]') && can('ideas.manage')) { state.ideas = state.ideas.filter(i => i.id !== target.dataset.deleteIdea); saveState(); renderAll(); }
  if (target.matches('[data-edit-command]') && can('commands.manage')) editCommand(target.dataset.editCommand);
  if (target.matches('[data-delete-command]') && can('commands.manage')) { state.commands = state.commands.filter(c => c.id !== target.dataset.deleteCommand); saveState(); renderAll(); }
  if (target.matches('[data-edit-code]') && can('code.manage')) editCode(target.dataset.editCode);
  if (target.matches('[data-delete-code]') && can('code.manage')) { state.codeTabs = state.codeTabs.filter(t => t.id !== target.dataset.deleteCode); saveState(); renderAll(); }
  if (target.matches('[data-edit-user]') && can('users.manage')) openUserModal(target.dataset.editUser);
  if (target.matches('[data-password-user]') && can('users.manage')) {
    const user = state.users.find(u => u.id === target.dataset.passwordUser); if (!user) return;
    const next = prompt(`New password for ${user.username}:`, user.password); if (next === null) return;
    user.password = next || user.password; saveState(); updateCurrentUser(); renderAll();
  }
  if (target.matches('[data-toggle-user]') && can('users.manage')) {
    const user = state.users.find(u => u.id === target.dataset.toggleUser); if (!user || user.role === 'Owner') return;
    user.status = user.status === 'Suspended' ? 'Active' : 'Suspended'; saveState(); updateCurrentUser(); renderAll();
  }
  if (target.matches('[data-delete-user]') && can('users.manage')) {
    const user = state.users.find(u => u.id === target.dataset.deleteUser); if (!user || user.role === 'Owner') return;
    if (!confirm(`Delete user ${user.username}?`)) return;
    state.users = state.users.filter(u => u.id !== user.id); saveState(); renderAll();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (loginModal.classList.contains('open')) closeLogin();
    if (userModal.classList.contains('open')) closeUserModal();
  }
});
