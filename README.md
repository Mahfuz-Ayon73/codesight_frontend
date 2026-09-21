# CodeSight — Frontend

The Next.js web application for CodeSight. Lets teams upload codebases, visualize dependency graphs, explore clusters, and collaborate on code understanding.

## Tech Stack

- **Next.js 16** (App Router, React Server Components)
- **React 19**
- **Tailwind CSS v4**
- **React Flow (@xyflow/react)** — interactive graph canvas
- **D3.js** — graph layout
- **TypeScript**

## Prerequisites

- Node.js 18+
- The CodeSight backend running on port `8081`

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8081
```

### 3. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, signup, password reset
│   ├── (dashboard)/        # Main app (workspace, projects, profile)
│   │   └── organizations/
│   │       └── [organizationId]/
│   │           └── projects/
│   │               ├── page.tsx          # Project list
│   │               ├── new/page.tsx      # Create project
│   │               └── [projectId]/      # Project detail & canvas
│   ├── onboarding/         # New user org/project setup flow
│   ├── invitations/        # Team invite acceptance
│   └── api/                # Next.js API routes (proxy to backend)
├── components/             # Reusable UI components
│   ├── canvas/             # Blueprint graph canvas & tour
│   ├── project/            # Project-specific components
│   ├── navbar/             # Top navigation
│   └── sidebar/            # Left navigation
├── actions/                # Next.js Server Actions
├── services/               # API service layer
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript types/schemas
└── lib/                    # Utilities and middleware
```

## Key Features

- **Codebase Graph** — interactive cluster map of your project's architecture
- **Code Tour** — step-by-step walkthrough of the dependency flow from any entry point
- **Commit History** — diff-based timeline showing how the architecture evolved
- **Smart Merge** — merge clusters directly on the canvas
- **Project Members** — invite teammates and manage roles (Owner / Admin / Member)
- **Multi-org support** — switch between organizations from the sidebar

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Authentication

Auth is cookie-based (JWT stored in an HTTP-only cookie). The middleware at `src/proxy.ts` protects all dashboard routes and redirects unauthenticated users to `/login`.
