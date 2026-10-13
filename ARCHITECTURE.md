# RealSquare Architecture

## Applications

- `frontend/` is the React and TypeScript admin application. Route-level screens live in `frontend/src/pages/`, shared UI in `frontend/src/components/`, API clients in `frontend/src/services/`, and shared client setup in `frontend/src/lib/`.
- `backend/` is the Express API. `backend/server.js` configures middleware and mounts the API router. `backend/routes/index.js` composes the domain route modules under `/api`.

## Backend modules

- Feature code is grouped under `backend/modules/` by domain, including `admin/`, `mixed/`, and people-management modules.
- Keep HTTP route declarations in each feature's `routes.js`, request validation in its validator, and request handling in its controller. Persisted data shapes belong in the feature model.
- Apply the existing authentication middleware at the route boundary. Reuse shared helpers and services for behavior already implemented elsewhere rather than duplicating it.

## Frontend conventions

- Keep route-level screens in `frontend/src/pages/` and reusable UI in `frontend/src/components/`.
- Put API calls and response types in the established `frontend/src/services/` modules. Use the shared Axios client and existing error and notification patterns.
- Before adding or changing a page layout, inspect comparable pages and reuse their layout, components, and styling patterns, especially when the user names a reference page.

## API boundary

- The admin frontend calls the backend under `/api/admin/...` through its shared API client.
- The backend owns authentication, validation, business rules, and persistence. Keep those responsibilities in the established route, middleware, validator, controller, and model layers.
- When a controller normalizes database records into a response shape, include selected fields explicitly in that normalizer; query projections alone do not guarantee that fields reach the API response.
