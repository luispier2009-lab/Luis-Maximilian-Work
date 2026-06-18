'use strict';

const STORAGE_KEY = 'lm_alessandro_hub_v11';
const SESSION_KEY = 'lm_alessandro_current_user_id';

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

const PAGE_PERMISSIONS = {
  dashboard: ['dashboard'],
  tickets: ['tickets.view'],
  'ticket-new': ['tickets.create'],
  ideas: ['ideas.view'],
  'idea-new': ['ideas.create'],
  commands: ['commands.view'],
  'command-edit': ['commands.manage'],
  code: ['code.view'],
  'code-edit': ['code.manage'],
  users: ['users.manage'],
  'user-edit': ['users.manage'],
  settings: ['settings.manage']
};


const NAV_PARENT = {
  'ticket-new': 'tickets',
  'idea-new': 'ideas',
  'command-edit': 'commands',
  'code-edit': 'code',
  'user-edit': 'users'
};

const PAGE_URLS = {
  dashboard: 'dashboard.html',
  tickets: 'tickets.html',
  ideas: 'ideas.html',
  commands: 'commands.html',
  code: 'code.html',
  users: 'users.html',
  settings: 'settings.html'
};

let state = loadState();
let currentUser = null;

function $(id) {
  return document.getElementById(id);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultState() {
  return {
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
        permissions: rolePermissions('Owner')
      }
    ],
    tickets: [],
    ideas: [],
    commands: [
      { id: makeId(), name: '/help', category: 'General', status: 'Active', description: 'Shows the command overview for users.', usage: '/help', createdBy: 'owner' },
      { id: makeId(), name: '/ticket', category: 'Support', status: 'Active', description: 'Creates a support ticket inside the Discord server.', usage: '/ticket reason:...', createdBy: 'owner' },
      { id: makeId(), name: '/ping', category: 'Status', status: 'Active', description: 'Checks bot response time.', usage: '/ping', createdBy: 'owner' }
    ],
    codeTabs: []
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('Could not save workspace:', error);
    alert('Data could not be saved in this browser. Please allow localStorage or test the site with Live Server/GitHub Pages.');
    return false;
  }
}

function loadState() {
  const base = defaultState();
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not read localStorage:', error);
  }
  if (!saved) return base;

  try {
    const parsed = JSON.parse(saved);
    const next = { ...base, ...parsed };
    next.users = Array.isArray(parsed.users) && parsed.users.length ? parsed.users.map(normalizeUser) : base.users;
    if (!next.users.some(user => user.role === 'Owner')) next.users.unshift(base.users[0]);
    next.tickets = Array.isArray(parsed.tickets) ? parsed.tickets.map(normalizeTicket) : [];
    next.ideas = Array.isArray(parsed.ideas) ? parsed.ideas.map(normalizeIdea) : [];
    next.commands = Array.isArray(parsed.commands) && parsed.commands.length ? parsed.commands.map(normalizeCommand) : base.commands;
    next.codeTabs = Array.isArray(parsed.codeTabs) ? parsed.codeTabs.map(normalizeCodeTab) : [];
    return next;
  } catch (error) {
    console.error('Saved workspace was invalid. Restoring defaults.', error);
    return base;
  }
}

function rolePermissions(role) {
  return ROLE_PRESETS[role] ? [...ROLE_PRESETS[role]] : [...ROLE_PRESETS.User];
}

function normalizeUser(user) {
  const role = ['Owner', 'Admin', 'Staff', 'User'].includes(user.role) ? user.role : 'User';
  const permissions = Array.isArray(user.permissions)
    ? user.permissions.filter(permission => PERMISSIONS.includes(permission))
    : [];
  return {
    id: user.id || makeId(),
    username: String(user.username || 'user').trim() || 'user',
    email: String(user.email || '').trim(),
    password: String(user.password || 'password'),
    role,
    status: role === 'Owner' ? 'Active' : (user.status === 'Suspended' ? 'Suspended' : 'Active'),
    createdAt: user.createdAt || new Date().toISOString(),
    lastLogin: user.lastLogin || '',
    permissions: role === 'Owner' ? rolePermissions('Owner') : (permissions.length ? permissions : rolePermissions(role))
  };
}

function normalizeTicket(ticket) {
  return {
    id: ticket.id || makeId(),
    type: ticket.type || 'Support',
    priority: ticket.priority || 'Medium',
    title: ticket.title || 'Untitled ticket',
    text: ticket.text || '',
    status: ['Open', 'In Progress', 'Resolved', 'Closed'].includes(ticket.status) ? ticket.status : 'Open',
    createdBy: ticket.createdBy || 'unknown',
    createdAt: ticket.createdAt || new Date().toISOString()
  };
}

function normalizeIdea(idea) {
  return {
    id: idea.id || makeId(),
    title: idea.title || 'Untitled idea',
    text: idea.text || '',
    status: ['New', 'In Review', 'Planned', 'Done', 'Rejected'].includes(idea.status) ? idea.status : 'New',
    createdBy: idea.createdBy || 'unknown',
    createdAt: idea.createdAt || new Date().toISOString()
  };
}

function normalizeCommand(command) {
  return {
    id: command.id || makeId(),
    name: command.name || '/command',
    category: command.category || 'General',
    status: ['Active', 'Paused', 'Draft'].includes(command.status) ? command.status : 'Active',
    description: command.description || '',
    usage: command.usage || '',
    createdBy: command.createdBy || 'owner'
  };
}

function normalizeCodeTab(tab) {
  return {
    id: tab.id || makeId(),
    title: tab.title || 'Untitled tab',
    text: tab.text || '',
    createdBy: tab.createdBy || 'owner'
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function can(permission, user = currentUser) {
  if (!user) return false;
  return user.role === 'Owner' || (Array.isArray(user.permissions) && user.permissions.includes(permission));
}

function canAny(permissions, user = currentUser) {
  return permissions.some(permission => can(permission, user));
}

function pageAllowed(page, user = currentUser) {
  return canAny(PAGE_PERMISSIONS[page] || ['dashboard'], user);
}

function firstAllowedPage(user = currentUser) {
  return ['dashboard', 'tickets', 'ideas', 'commands', 'code', 'users', 'settings'].find(page => pageAllowed(page, user)) || 'dashboard';
}

function firstAllowedUrl(user = currentUser) {
  return PAGE_URLS[firstAllowedPage(user)] || 'dashboard.html';
}

function getCurrentUserFromSession() {
  let id = '';
  try {
    id = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || '';
  } catch (error) {
    console.warn('Could not read session:', error);
  }
  const user = state.users.find(item => item.id === id);
  if (!user || user.status === 'Suspended') return null;
  return user;
}

function setCurrentUser(user) {
  currentUser = user;
  try {
    sessionStorage.setItem(SESSION_KEY, user.id);
    localStorage.setItem(SESSION_KEY, user.id);
  } catch (error) {
    console.warn('Could not write session:', error);
  }
}

function clearCurrentUser() {
  currentUser = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('Could not clear session:', error);
  }
}

function redirect(url) {
  window.location.href = url;
}

function requireLogin(page) {
  currentUser = getCurrentUserFromSession();
  if (!currentUser) {
    redirect('index.html?login=required#login');
    return false;
  }
  if (!pageAllowed(page)) {
    redirect(firstAllowedUrl(currentUser));
    return false;
  }
  return true;
}

function searchMatch(search, ...values) {
  const needle = String(search || '').trim().toLowerCase();
  if (!needle) return true;
  return values.some(value => String(value || '').toLowerCase().includes(needle));
}

function metaHtml(items) {
  return `<div class="item-meta">${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
}

function renderList(targetId, items, emptyText, mapper) {
  const target = $(targetId);
  if (!target) return;
  target.innerHTML = items.length ? items.map(mapper).join('') : `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
}

function setMessage(id, text, good = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('success-message', good);
}

function initPublic() {
  const loginForm = $('loginForm');
  const existingUser = getCurrentUserFromSession();
  if (existingUser && $('loginMessage')) {
    $('loginMessage').innerHTML = `Already signed in as <strong>${escapeHtml(existingUser.username)}</strong>. <a href="${firstAllowedUrl(existingUser)}">Open dashboard</a>`;
    $('loginMessage').classList.add('success-message');
  }

  loginForm?.addEventListener('submit', event => {
    event.preventDefault();
    const username = $('loginUsername').value.trim().toLowerCase();
    const password = $('loginPassword').value.trim();
    const user = state.users.find(item =>
      (String(item.username || '').toLowerCase() === username || String(item.email || '').toLowerCase() === username) &&
      String(item.password || '').trim() === password
    );

    if (!user) {
      setMessage('loginMessage', 'Wrong username or password. Check if the account was created on this same domain/browser.');
      return;
    }
    if (user.status === 'Suspended') {
      setMessage('loginMessage', 'This account is suspended.');
      return;
    }

    user.lastLogin = new Date().toISOString();
    setCurrentUser(user);
    saveState();
    loginForm.reset();
    redirect(firstAllowedUrl(user));
  });
}

function initApp(page) {
  if (!requireLogin(page)) return;
  saveState();
  renderChrome(page);
  bindCommonActions();

  const renderers = {
    dashboard: renderDashboard,
    tickets: initTicketsPage,
    'ticket-new': initTicketForm,
    ideas: initIdeasPage,
    'idea-new': initIdeaForm,
    commands: initCommandsPage,
    'command-edit': initCommandForm,
    code: initCodePage,
    'code-edit': initCodeForm,
    users: initUsersPage,
    'user-edit': initUserForm,
    settings: initSettingsPage
  };
  const render = renderers[page];
  if (render) render();
}

function renderChrome(page) {
  const hubWelcome = $('hubWelcome');
  const accountPill = $('accountPill');
  if (hubWelcome) hubWelcome.textContent = `Welcome back, ${currentUser.username}.`;
  if (accountPill) accountPill.textContent = `${currentUser.role} · ${currentUser.status}`;

  document.querySelectorAll('[data-nav]').forEach(link => {
    const navPage = link.dataset.nav;
    const activePage = NAV_PARENT[page] || page;
    link.classList.toggle('active', navPage === activePage);
  });
  document.querySelectorAll('[data-gate]').forEach(link => {
    link.hidden = !pageAllowed(link.dataset.gate);
  });
}

function bindCommonActions() {
  $('logoutButton')?.addEventListener('click', () => {
    clearCurrentUser();
    redirect('index.html#login');
  });
}

function renderDashboard() {
  const openTickets = state.tickets.filter(ticket => !['Resolved', 'Closed'].includes(ticket.status)).length;
  const pendingIdeas = state.ideas.filter(idea => !['Done', 'Rejected'].includes(idea.status)).length;
  const isManager = can('tickets.manage') || can('ideas.manage') || can('users.manage');
  const ownTickets = state.tickets.filter(ticket => ticket.createdBy === currentUser.username).length;
  const ownIdeas = state.ideas.filter(idea => idea.createdBy === currentUser.username).length;

  $('openTicketCount') && ($('openTicketCount').textContent = openTickets);
  $('pendingIdeaCount') && ($('pendingIdeaCount').textContent = pendingIdeas);
  $('commandCount') && ($('commandCount').textContent = state.commands.length);
  $('userCount') && ($('userCount').textContent = state.users.length);
  $('dashboardTitle') && ($('dashboardTitle').textContent = isManager ? 'Workspace Overview' : 'My Workspace');
  $('dashboardCardTitle') && ($('dashboardCardTitle').textContent = isManager ? 'Management Dashboard' : 'Account Dashboard');
  $('dashboardCardText') && ($('dashboardCardText').textContent = isManager
    ? 'Review open work, manage content and control user access from the available pages.'
    : 'Create tickets or ideas and view the command information that is available to your account.');
  $('dashboardQuickStatus') && ($('dashboardQuickStatus').textContent = isManager
    ? `${openTickets} open tickets and ${pendingIdeas} pending ideas are currently in the workspace.`
    : `You have submitted ${ownTickets} ticket(s) and ${ownIdeas} idea(s).`);
  $('accountSummary') && ($('accountSummary').textContent = `${currentUser.role} account · ${currentUser.status}`);

  const stats = $('adminStats');
  if (stats) stats.hidden = !isManager;
}

function visibleTickets() {
  let items = can('tickets.manage') ? [...state.tickets] : state.tickets.filter(ticket => ticket.createdBy === currentUser.username);
  const status = $('ticketFilter')?.value || 'all';
  const search = $('ticketSearch')?.value || '';
  if (status !== 'all') items = items.filter(ticket => ticket.status === status);
  return items.filter(ticket => searchMatch(search, ticket.title, ticket.text, ticket.type, ticket.priority, ticket.createdBy));
}

function initTicketsPage() {
  renderTickets();
  ['ticketSearch', 'ticketFilter'].forEach(id => $(id)?.addEventListener('input', renderTickets));
  ['ticketFilter'].forEach(id => $(id)?.addEventListener('change', renderTickets));
  document.addEventListener('change', handleTicketStatusChange);
  document.addEventListener('click', handleTicketDelete);
}

function renderTickets() {
  const newLink = $('newTicketLink');
  if (newLink) newLink.hidden = !can('tickets.create');
  const tools = $('ticketTools');
  if (tools) tools.hidden = !can('tickets.manage') && state.tickets.filter(ticket => ticket.createdBy === currentUser.username).length < 2;

  renderList('ticketList', visibleTickets(), can('tickets.manage') ? 'No tickets yet.' : 'You have not created any tickets yet.', ticket => {
    const managerActions = can('tickets.manage') ? `
      <select class="inline-select" data-ticket-status="${escapeHtml(ticket.id)}">
        ${['Open','In Progress','Resolved','Closed'].map(status => `<option ${ticket.status === status ? 'selected' : ''}>${status}</option>`).join('')}
      </select>
      <button class="small-button danger" type="button" data-delete-ticket="${escapeHtml(ticket.id)}">Delete</button>` : '';
    return `<article class="item-card">
      ${metaHtml([ticket.type, ticket.priority || 'Medium', ticket.status || 'Open', can('tickets.manage') ? `By ${ticket.createdBy}` : 'Your ticket', formatDate(ticket.createdAt)])}
      <h3>${escapeHtml(ticket.title)}</h3><p>${escapeHtml(ticket.text)}</p>
      ${managerActions ? `<div class="card-actions">${managerActions}</div>` : ''}
    </article>`;
  });

}

function handleTicketStatusChange(event) {
  const target = event.target;
  if (!target.matches('[data-ticket-status]') || !can('tickets.manage')) return;
  const ticket = state.tickets.find(item => item.id === target.dataset.ticketStatus);
  if (!ticket) return;
  ticket.status = target.value;
  saveState();
  renderTickets();
}

function handleTicketDelete(event) {
  const target = event.target;
  if (!target.matches('[data-delete-ticket]') || !can('tickets.manage')) return;
  if (!confirm('Delete this ticket?')) return;
  state.tickets = state.tickets.filter(item => item.id !== target.dataset.deleteTicket);
  saveState();
  renderTickets();
}

function initTicketForm() {
  const form = $('ticketForm');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!can('tickets.create')) return;
    const title = $('ticketTitle').value.trim();
    const text = $('ticketText').value.trim();
    if (!title || !text) {
      setMessage('ticketMessage', 'Title and text are required.');
      return;
    }
    state.tickets.unshift({
      id: makeId(),
      type: $('ticketType').value,
      priority: $('ticketPriority').value,
      title,
      text,
      status: 'Open',
      createdBy: currentUser.username,
      createdAt: new Date().toISOString()
    });
    saveState();
    redirect('tickets.html');
  });
}

function visibleIdeas() {
  let items = can('ideas.manage') ? [...state.ideas] : state.ideas.filter(idea => idea.createdBy === currentUser.username);
  const status = $('ideaFilter')?.value || 'all';
  const search = $('ideaSearch')?.value || '';
  if (status !== 'all') items = items.filter(idea => idea.status === status);
  return items.filter(idea => searchMatch(search, idea.title, idea.text, idea.createdBy, idea.status));
}

function initIdeasPage() {
  renderIdeas();
  ['ideaSearch', 'ideaFilter'].forEach(id => $(id)?.addEventListener('input', renderIdeas));
  ['ideaFilter'].forEach(id => $(id)?.addEventListener('change', renderIdeas));
  document.addEventListener('change', handleIdeaStatusChange);
  document.addEventListener('click', handleIdeaDelete);
}

function renderIdeas() {
  const newLink = $('newIdeaLink');
  if (newLink) newLink.hidden = !can('ideas.create');
  const tools = $('ideaTools');
  if (tools) tools.hidden = !can('ideas.manage') && state.ideas.filter(idea => idea.createdBy === currentUser.username).length < 2;

  renderList('ideaList', visibleIdeas(), can('ideas.manage') ? 'No ideas yet.' : 'You have not submitted any ideas yet.', idea => {
    const managerActions = can('ideas.manage') ? `
      <select class="inline-select" data-idea-status="${escapeHtml(idea.id)}">
        ${['New','In Review','Planned','Done','Rejected'].map(status => `<option ${idea.status === status ? 'selected' : ''}>${status}</option>`).join('')}
      </select>
      <button class="small-button danger" type="button" data-delete-idea="${escapeHtml(idea.id)}">Delete</button>` : '';
    return `<article class="item-card">
      ${metaHtml([idea.status || 'New', can('ideas.manage') ? `By ${idea.createdBy}` : 'Your idea', formatDate(idea.createdAt)])}
      <h3>${escapeHtml(idea.title)}</h3><p>${escapeHtml(idea.text)}</p>
      ${managerActions ? `<div class="card-actions">${managerActions}</div>` : ''}
    </article>`;
  });

}

function handleIdeaStatusChange(event) {
  const target = event.target;
  if (!target.matches('[data-idea-status]') || !can('ideas.manage')) return;
  const idea = state.ideas.find(item => item.id === target.dataset.ideaStatus);
  if (!idea) return;
  idea.status = target.value;
  saveState();
  renderIdeas();
}

function handleIdeaDelete(event) {
  const target = event.target;
  if (!target.matches('[data-delete-idea]') || !can('ideas.manage')) return;
  if (!confirm('Delete this idea?')) return;
  state.ideas = state.ideas.filter(item => item.id !== target.dataset.deleteIdea);
  saveState();
  renderIdeas();
}

function initIdeaForm() {
  const form = $('ideaForm');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!can('ideas.create')) return;
    const title = $('ideaTitle').value.trim();
    const text = $('ideaText').value.trim();
    if (!title || !text) {
      setMessage('ideaMessage', 'Title and text are required.');
      return;
    }
    state.ideas.unshift({
      id: makeId(),
      title,
      text,
      status: 'New',
      createdBy: currentUser.username,
      createdAt: new Date().toISOString()
    });
    saveState();
    redirect('ideas.html');
  });
}

function initCommandsPage() {
  const newLink = $('newCommandLink');
  if (newLink) newLink.hidden = !can('commands.manage');
  renderCommands();
  ['commandSearch', 'commandCategoryFilter'].forEach(id => $(id)?.addEventListener('input', renderCommands));
  $('commandCategoryFilter')?.addEventListener('change', renderCommands);
  document.addEventListener('click', handleCommandDelete);
}

function renderCommandFilters() {
  const filter = $('commandCategoryFilter');
  if (!filter) return;
  const current = filter.value || 'all';
  const categories = [...new Set(state.commands.map(command => command.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  filter.innerHTML = '<option value="all">All categories</option>' + categories.map(category => `<option value="${escapeHtml(category)}" ${current === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('');
}

function renderCommands() {
  renderCommandFilters();
  const search = $('commandSearch')?.value || '';
  const category = $('commandCategoryFilter')?.value || 'all';
  const items = state.commands.filter(command =>
    (category === 'all' || command.category === category) &&
    searchMatch(search, command.name, command.category, command.description, command.usage)
  );
  renderList('commandList', items, 'No commands found.', command => {
    const actions = can('commands.manage') ? `<div class="card-actions"><a class="small-button" href="command-edit.html?id=${encodeURIComponent(command.id)}">Edit</a><button class="small-button danger" type="button" data-delete-command="${escapeHtml(command.id)}">Delete</button></div>` : '';
    return `<article class="item-card">
      ${metaHtml([command.category, command.status || 'Active'])}
      <h3>${escapeHtml(command.name)}</h3><p>${escapeHtml(command.description)}</p><pre>${escapeHtml(command.usage)}</pre>${actions}
    </article>`;
  });
}

function initCommandForm() {
  const id = getQueryParam('id');
  const command = id ? state.commands.find(item => item.id === id) : null;
  if (id && !command) {
    setMessage('commandMessage', 'Command not found.');
    return;
  }
  if (command) {
    $('commandEditTitle').textContent = 'Edit Command';
    $('commandId').value = command.id;
    $('commandName').value = command.name;
    $('commandCategory').value = command.category;
    $('commandStatus').value = command.status || 'Active';
    $('commandDescription').value = command.description;
    $('commandUsage').value = command.usage;
  }

  $('commandForm')?.addEventListener('submit', event => {
    event.preventDefault();
    if (!can('commands.manage')) return;
    const payload = {
      name: $('commandName').value.trim(),
      category: $('commandCategory').value.trim(),
      status: $('commandStatus').value,
      description: $('commandDescription').value.trim(),
      usage: $('commandUsage').value.trim(),
      createdBy: currentUser.username
    };
    if (!payload.name || !payload.category || !payload.description || !payload.usage) {
      setMessage('commandMessage', 'Please fill every field.');
      return;
    }
    const existingId = $('commandId').value;
    if (existingId) {
      const existing = state.commands.find(item => item.id === existingId);
      if (existing) Object.assign(existing, payload);
    } else {
      state.commands.unshift({ id: makeId(), ...payload });
    }
    saveState();
    redirect('commands.html');
  });
}

function handleCommandDelete(event) {
  const target = event.target;
  if (!target.matches('[data-delete-command]') || !can('commands.manage')) return;
  if (!confirm('Delete this command?')) return;
  state.commands = state.commands.filter(item => item.id !== target.dataset.deleteCommand);
  saveState();
  renderCommands();
}

function initCodePage() {
  renderCodeTabs();
  document.addEventListener('click', handleCodeDelete);
}

function renderCodeTabs() {
  const newLink = $('newCodeLink');
  if (newLink) newLink.hidden = !can('code.manage');

  renderList('codeList', state.codeTabs, 'No code tabs yet.', tab => {
    const actions = can('code.manage') ? `<div class="card-actions"><a class="small-button" href="code-edit.html?id=${encodeURIComponent(tab.id)}">Edit</a><button class="small-button danger" type="button" data-delete-code="${escapeHtml(tab.id)}">Delete</button></div>` : '';
    return `<article class="item-card"><h3>${escapeHtml(tab.title)}</h3><pre>${escapeHtml(tab.text)}</pre>${actions}</article>`;
  });
}

function initCodeForm() {
  const id = getQueryParam('id');
  const tab = id ? state.codeTabs.find(item => item.id === id) : null;
  if (id && !tab) {
    setMessage('codeMessage', 'Code tab not found.');
    return;
  }
  if (tab) {
    $('codeEditTitle').textContent = 'Edit Code Tab';
    $('codeId').value = tab.id;
    $('codeTitle').value = tab.title;
    $('codeText').value = tab.text;
  }

  $('codeForm')?.addEventListener('submit', event => {
    event.preventDefault();
    if (!can('code.manage')) return;
    const payload = {
      title: $('codeTitle').value.trim(),
      text: $('codeText').value.trim(),
      createdBy: currentUser.username
    };
    if (!payload.title || !payload.text) {
      setMessage('codeMessage', 'Title and code text are required.');
      return;
    }
    const existingId = $('codeId').value;
    if (existingId) {
      const existing = state.codeTabs.find(item => item.id === existingId);
      if (existing) Object.assign(existing, payload);
    } else {
      state.codeTabs.unshift({ id: makeId(), ...payload });
    }
    saveState();
    redirect('code.html');
  });
}

function handleCodeDelete(event) {
  const target = event.target;
  if (!target.matches('[data-delete-code]') || !can('code.manage')) return;
  if (!confirm('Delete this code tab?')) return;
  state.codeTabs = state.codeTabs.filter(item => item.id !== target.dataset.deleteCode);
  saveState();
  renderCodeTabs();
}

function initUsersPage() {
  renderUsers();
  ['userSearch', 'roleFilter', 'userStatusFilter'].forEach(id => $(id)?.addEventListener('input', renderUsers));
  ['roleFilter', 'userStatusFilter'].forEach(id => $(id)?.addEventListener('change', renderUsers));
  document.addEventListener('click', handleUserActions);
}

function renderUsers() {
  const search = $('userSearch')?.value || '';
  const role = $('roleFilter')?.value || 'all';
  const status = $('userStatusFilter')?.value || 'all';
  const users = state.users.filter(user =>
    (role === 'all' || user.role === role) &&
    (status === 'all' || user.status === status) &&
    searchMatch(search, user.username, user.email, user.role, user.status)
  );
  renderList('userList', users, 'No users found.', user => {
    const ownerActions = user.role === 'Owner' ? '' : `
      <button class="small-button" type="button" data-toggle-user="${escapeHtml(user.id)}">${user.status === 'Suspended' ? 'Activate' : 'Suspend'}</button>
      <button class="small-button danger" type="button" data-delete-user="${escapeHtml(user.id)}">Delete</button>`;
    return `<article class="item-card user-card">
      ${metaHtml([user.role, user.status, `Created ${formatDate(user.createdAt)}`, `Last login ${formatDate(user.lastLogin)}`])}
      <h3>${escapeHtml(user.username)}</h3><p>${escapeHtml(user.email || 'No email saved')}</p>
      <div class="permission-preview">${user.permissions.map(permission => `<span>${escapeHtml(permission)}</span>`).join('')}</div>
      <div class="card-actions">
        <a class="small-button" href="user-edit.html?id=${encodeURIComponent(user.id)}">Edit</a>
        ${ownerActions}
      </div>
    </article>`;
  });
}

function handleUserActions(event) {
  const target = event.target;
  if (target.matches('[data-toggle-user]') && can('users.manage')) {
    const user = state.users.find(item => item.id === target.dataset.toggleUser);
    if (!user || user.role === 'Owner') return;
    user.status = user.status === 'Suspended' ? 'Active' : 'Suspended';
    saveState();
    renderUsers();
    return;
  }

  if (target.matches('[data-delete-user]') && can('users.manage')) {
    const user = state.users.find(item => item.id === target.dataset.deleteUser);
    if (!user || user.role === 'Owner') return;
    if (!confirm(`Delete user ${user.username}?`)) return;
    state.users = state.users.filter(item => item.id !== user.id);
    saveState();
    renderUsers();
  }
}

function initUserForm() {
  const id = getQueryParam('id');
  const user = id ? state.users.find(item => item.id === id) : null;
  if (id && !user) {
    setMessage('userMessage', 'User not found.');
    return;
  }

  if (user) {
    $('userEditTitle').textContent = 'Edit User';
    $('editUserId').value = user.id;
    $('editUsername').value = user.username;
    $('editEmail').value = user.email || '';
    $('editPassword').value = user.password || '';
    $('editRole').value = user.role;
    $('editStatus').value = user.status || 'Active';
    setPermissionChecks(user.role, user.permissions);
  } else {
    setPermissionChecks('User', rolePermissions('User'));
  }

  $('editRole')?.addEventListener('change', () => setPermissionChecks($('editRole').value, rolePermissions($('editRole').value)));

  $('userForm')?.addEventListener('submit', event => {
    event.preventDefault();
    if (!can('users.manage')) return;

    const existingId = $('editUserId').value;
    const username = $('editUsername').value.trim();
    const password = $('editPassword').value.trim();
    const role = $('editRole').value;
    const finalRole = ['Owner', 'Admin', 'Staff', 'User'].includes(role) ? role : 'User';
    const finalStatus = finalRole === 'Owner' ? 'Active' : $('editStatus').value;
    let permissions = finalRole === 'Owner' ? rolePermissions('Owner') : selectedPermissions();
    if (!permissions.length) permissions = rolePermissions(finalRole);

    if (!username || !password) {
      setMessage('userMessage', 'Username and password are required.');
      return;
    }
    if (!validateUniqueUsername(username, existingId)) {
      setMessage('userMessage', 'This username already exists.');
      return;
    }

    const payload = {
      username,
      email: $('editEmail').value.trim(),
      password,
      role: finalRole,
      status: finalStatus,
      permissions
    };

    if (existingId) {
      const existing = state.users.find(item => item.id === existingId);
      if (!existing) {
        setMessage('userMessage', 'User not found.');
        return;
      }
      Object.assign(existing, payload);
      if (existing.id === currentUser.id) setCurrentUser(existing);
    } else {
      state.users.push({
        id: makeId(),
        ...payload,
        createdAt: new Date().toISOString(),
        lastLogin: ''
      });
    }

    if (saveState()) redirect('users.html');
  });
}

function setPermissionChecks(role, permissions = []) {
  document.querySelectorAll('input[name="editPermissions"]').forEach(input => {
    input.checked = role === 'Owner' || permissions.includes(input.value);
    input.disabled = role === 'Owner';
  });
  const status = $('editStatus');
  if (status) {
    status.disabled = role === 'Owner';
    if (role === 'Owner') status.value = 'Active';
  }
}

function selectedPermissions() {
  return [...document.querySelectorAll('input[name="editPermissions"]:checked')].map(input => input.value);
}

function validateUniqueUsername(username, ignoreId = '') {
  const clean = String(username || '').trim().toLowerCase();
  return !state.users.some(user => user.id !== ignoreId && String(user.username || '').toLowerCase() === clean);
}

function initSettingsPage() {
  $('resetWorkspace')?.addEventListener('click', () => {
    if (!can('settings.manage')) return;
    if (!confirm('Reset all local workspace data?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.warn('Could not clear storage:', error);
    }
    state = defaultState();
    saveState();
    setCurrentUser(state.users[0]);
    redirect('dashboard.html');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page || 'public';
  if (page === 'public') initPublic();
  else initApp(page);
});
