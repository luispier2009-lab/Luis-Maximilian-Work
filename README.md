# LM-Alessandro Website Hub

Private static website hub with login, user management, role permissions, tickets, ideas, commands and code tabs.

## Default owner login

- Username: `owner`
- Password: `owner123`

## What changed in this version

- No more overlay/modal pages for login or user editing.
- Login is on `index.html`, then the user is redirected to a real page like `dashboard.html`.
- Every main area is a real file/page: `users.html`, `code.html`, `commands.html`, `tickets.html`, etc.
- Add/edit pages are also separate pages, for example `user-edit.html` and `code-edit.html`.
- User saving and login handling was made more robust.
- The duplicate `quickStatus` id bug was removed.
- `crypto.randomUUID()` now has a fallback for browsers/environments where it is not available.

## Important

This is still a static website. The data is stored in the browser with `localStorage`.
That means:

- Users created on one browser/computer are only available in that browser.
- Test it on GitHub Pages or with a local server/VS Code Live Server.
- Do not rely on this as secure public login, because passwords are stored in localStorage.

For real public accounts, you need a backend/database.
