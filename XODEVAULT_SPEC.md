# Project Specification: XodeVault - Zero-Knowledge E2EE Developer Secrets Manager

## 1. Project Overview
Create a lightweight, highly secure, and 100% free web application for developers to store and securely share environment variables (`.env`) and code snippets.
- **Project Name:** XodeVault
- **Constraint 1:** NO file uploads. Text data only to keep VPS storage minimal.
- **Constraint 2:** Strict End-to-End Encryption (E2EE). The server is "Zero-Knowledge".
- **Constraint 3:** Must include a Dark/Light mode toggle and an English/Spanish (EN/ES) language toggle.
- **Constraint 4:** Secure sharing mechanism. Humans can view the decrypted `.env` via a web URL (using URL hash), and machines/scripts can fetch and decrypt it locally without breaking E2EE.
- **Constraint 5:** The code will be open-sourced on GitHub to guarantee cryptographic transparency.
- **Architecture:** Monorepo with a Node.js/Express backend and a React (Vite) frontend.

## 2. Tech Stack
- **Frontend:** React (Vite), TailwindCSS, `lucide-react`.
  - **i18n:** `react-i18next` for translations (EN/ES).
  - **Theme:** Tailwind dark mode via React Context.
- **Backend:** Node.js, Express.js.
- **Database:** SQLite (using `better-sqlite3`).
- **Cryptography:** Native Web Crypto API (Client-side), `bcrypt` & `jsonwebtoken` (Server-side).

## 3. Core E2EE & Secure Sharing Flow
1. **Standard Encryption:** Frontend derives a `VaultKey` from the user's master password. Server stores AES-GCM encrypted blobs and IVs.
2. **Human Sharing (Web):**
   - Frontend generates a random `ShareKey`, re-encrypts the `.env`, and sends to `/api/share` getting a `share_id`.
   - Generates URL: `https://[domain]/share/[share_id]#key=[ShareKey]`.
   - The `/share/:id` view extracts the `#key`, fetches the encrypted blob, and decrypts it on screen.
3. **Machine Sharing (CLI on-the-fly):**
   - We must provide a zero-install CLI approach.
   - The React UI will generate a ONE-LINER command:
     `curl -s https://[domain]/api/cli/[share_id] | node - [ShareKey] > .env`
   - **How it works:** The backend endpoint `/api/cli/:id` dynamically generates and returns a pure JavaScript string. The user pipes this into `node`, passing the `ShareKey` as an argument. The script fetches the encrypted JSON, decrypts it locally, and outputs plaintext.

## 4. Database Schema (SQLite)
- `users`: `id`, `username`, `auth_hash`, `salt`
- `secrets`: `id`, `user_id`, `title` (encrypted), `content` (encrypted), `iv`, `created_at`
- `shared_secrets`: `id` (String UUID), `content` (encrypted), `iv`, `expires_at` (Timestamp), `burn_after_reading` (Boolean).

## 5. Required Features & UI components
### Frontend UI (React):
- **Global Contexts:** `ThemeContext` and `i18n` setup.
- **Screens:**
  1. **Login/Register.**
  2. **Dashboard:** List of secrets.
  3. **Editor:** Textarea for `.env`. Includes "Save" and "Share" buttons.
  4. **Share Modal:** Two tabs: "Web Link" and "Terminal / CI-CD".
  5. **Shared View (`/share/:id`):** Read-only decryption screen.
- **Header/Navbar:** Must contain XodeVault branding, Sun/Moon icon, and EN/ES toggle.

### Backend API (Express):
- `POST /api/auth/register` & `POST /api/auth/login`
- `GET`, `POST`, `PUT`, `DELETE` for `/api/secrets` (JWT protected)
- `POST /api/share`: Receives `ShareKey` encrypted payload.
- `GET /api/share/:id`: Public endpoint returning the encrypted JSON.
- `GET /api/cli/:id`: Returns a dynamically generated Plain Text JavaScript file that contains the fetch and decryption logic for the CLI pipeline.

## 6. Execution Steps for Cursor
1. Init monorepo (`/frontend`, `/backend`).
2. Set up SQLite schema including `shared_secrets`.
3. Build Express server, Auth, and routes.
4. Set up Vite + React + Tailwind + i18n + Theme toggling.
5. Implement `cryptoUtils.js` on the frontend for PBKDF2, AES-GCM.
6. Build Login, Dashboard, Editor components.
7. Implement the Share flow (Web link extraction + CLI command generation).
8. **Final Step:** Generate two markdown files in the root directory:
   - `README.md`: A highly polished, professional GitHub README explaining the E2EE architecture, Zero-Knowledge proofs, and how to self-host.
   - `QUICKSTART.md`: A concise guide for the server admin to quickly install, build, and deploy the app using PM2 on a VPS.
