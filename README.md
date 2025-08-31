🎨 CMX-UI

CMX-UI is the frontend for the Claims MotorX (CMX) platform.
It is built with [React + Vite] (or Angular if your project uses it) and communicates with the backend (CMX-BE) over GraphQL APIs.

🚀 Features

Modern frontend framework (React/Vite or Angular CLI)

GraphQL integration with Apollo Client

Environment-based config (VITE_GRAPHQL_URI, VITE_GRAPHQL_WS)

TailwindCSS for styling (if React/Vite)

Responsive dashboard for claims, policies, FNOL, surveyors

🗂 Project Structure
cmx-ui/
 ├── src/               # Main source code
 │    ├── components/   # Reusable UI components
 │    ├── graphql/      # Queries, mutations, subscriptions
 │    └── pages/        # Screens (FNOL, Policy, Dashboard, etc.)
 ├── public/            # Static assets
 ├── dist/              # Build output (generated)
 ├── package.json
 ├── vite.config.js     # (React/Vite only)
 ├── angular.json       # (Angular only)
 └── README.md

⚙️ Setup
1. Clone the repo
git clone https://github.com/<your-org>/cmx-ui.git
cd cmx-ui

2. Install dependencies
# npm
npm install

# or yarn
yarn install

🏃 Running the App
Local Development
# React/Vite
npm run dev

# Angular
ng serve


App will be available at:

http://localhost:5173   # (Vite default)
http://localhost:4200   # (Angular default)

Build for Production
npm run build


Output will be in the dist/ folder.

🔌 Configuration

The UI reads its backend connection from environment variables at build time.

Create a .env file in project root:

# GraphQL API URL (CMX-BE Cloud Run)
VITE_GRAPHQL_URI=https://cmx-be-xxxxxx-asia-southeast1.run.app/graphql

# GraphQL WebSocket endpoint (for subscriptions)
VITE_GRAPHQL_WS=wss://cmx-be-xxxxxx-asia-southeast1.run.app/graphql


For local dev, point these to http://localhost:8080/graphql.

☁️ Deployment
Cloudflare Pages (recommended)

Push repo to GitHub

In Cloudflare Dashboard → Pages → Create Project

Connect GitHub repo

Framework preset: React (Vite) or Angular

Build command:

npm run build


Build output directory:

dist


Add Environment Variables:

VITE_GRAPHQL_URI=https://cmx-be-xxxxxx-asia-southeast1.run.app/graphql

VITE_GRAPHQL_WS=wss://cmx-be-xxxxxx-asia-southeast1.run.app/graphql

Deploy → Get free HTTPS domain (https://your-ui.pages.dev)

(Optional) Add custom domain → Cloudflare Pages → Custom domains

🔒 CORS Setup

On CMX-BE, set the allowed origins:

CORS_ALLOWED_ORIGINS=https://your-ui.pages.dev,https://yourdomain.com


This ensures the frontend can call the backend APIs without CORS issues.

📊 UI Modules

Dashboard → Overview of policies, claims, surveyors

FNOL (First Notice of Loss) → Submit accident reports, upload images

Policy Inquiry → Search by policy number/status

Claim Tracking → Track claim lifecycle

Surveyor Portal → Assignments, job status, uploads

👥 Contributing

Fork the repo

Create a feature branch (git checkout -b feature/amazing-ui)

Commit changes (git commit -m 'Add new UI feature')

Push branch (git push origin feature/amazing-ui)

Create Pull Request

📜 License

MIT
 © 2025 CMX Project