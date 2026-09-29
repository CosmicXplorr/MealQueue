# Campus Meal Queue Manager

Campus Meal Queue Manager is an individual Cloud Computing and DevOps CCA 2 project. It is a dynamic Express application for canteen meal reservations. Students choose a meal and pickup slot; the server records the order, assigns a live queue position, and lets staff mark an order ready for pickup.

## Features

- Server-rendered home page that displays current orders and summary counts.
- Validated form for a student's name, meal, pickup slot, and optional note.
- Live queue positions for pending orders.
- Staff action to move an order from **Pending** to **Ready**.
- Pickup-slot filter on the home page.
- JSON API at `/api/orders`.
- Health endpoint at `/health`.
- Deployed commit ID displayed in the footer.

## Architecture and pipeline

```text
Browser -> Express application -> in-memory order data
                     |
GitHub push -> GitHub Actions: lint -> test -> Docker build and health check -> Render deploy hook -> Live application
```

The `deploy` job needs the `build` job. The `build` job needs the quality job, so a failed lint or test prevents a deploy.

## Run locally

Use Node.js 22 or newer.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run lint
pnpm test
pnpm start
```

Open `http://localhost:3000`. The health response is available at `http://localhost:3000/health` and the JSON API is at `http://localhost:3000/api/orders`.

## Docker

```bash
docker build --build-arg GIT_SHA=local-demo -t campus-meal-queue-manager .
docker run --rm -p 3000:3000 campus-meal-queue-manager
```

## GitHub Actions and Render setup

1. Create a **public** repository under your own GitHub account and push this project to the `main` branch.
2. On Render, create a Web Service from the repository. Select **Docker**, set the health check path to `/health`, and switch **Auto-Deploy** off.
3. In the Render service settings, create a Deploy Hook and copy its URL.
4. In GitHub, open **Settings -> Secrets and variables -> Actions** and create `RENDER_DEPLOY_HOOK` with that URL. Never place the hook URL in this repository.
5. Push to `main` and watch the **Actions** page. The app deploys only after lint, tests, Docker build, and the container health check succeed.

## Evidence to capture for the report

- A live-site screenshot with the full Render URL visible and at least one order in the table.
- A screenshot after using **Mark ready**, showing the changed status.
- A green Actions run where all three jobs completed.
- A deliberately failed Actions run on a branch, where the `deploy` job is skipped.
- The repository, live application, and Actions URLs, plus the number of commits.

## Suggested honest commit sequence

Do not make a single final upload. Read and run each stage before committing it from your own account.

1. `chore: initialise Express project and ignore dependencies`
2. `feat: add server-rendered meal reservation page`
3. `feat: validate and store meal reservations`
4. `feat: add orders API and health route`
5. `feat: show queue positions and order metrics`
6. `feat: let staff mark an order ready`
7. `feat: add pickup-slot filter and responsive styling`
8. `test: cover health route and valid reservation`
9. `test: reject invalid reservations and update order status`
10. `chore: add ESLint quality check`
11. `build: containerise the application with Docker`
12. `ci: add lint test build and Render deploy workflow`

Create a small branch such as `feature/slot-filter`, open a pull request, wait for the checks to pass, then merge it. This provides the required merged pull request evidence.

## Failure demo

On a separate branch, temporarily change one expected value in `test/app.test.js`, commit and push it, and capture the red Actions run. Do not merge the broken branch. Restore the correct test, push the fix, and merge only after the checks are green. The workflow's `needs` rules will make the deploy job skip the failed run.
