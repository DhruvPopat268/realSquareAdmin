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
- Property edit forms must bind fields to the category-specific payload object used by the API (for example, residential plots use `plotDetails`, while commercial plots use `commercialDetails`).

## API boundary

- The admin frontend calls the backend under `/api/admin/...` through its shared API client.
- The backend owns authentication, validation, business rules, and persistence. Keep those responsibilities in the established route, middleware, validator, controller, and model layers.
- When a controller normalizes database records into a response shape, include selected fields explicitly in that normalizer; query projections alone do not guarantee that fields reach the API response.


### Virtual Space Benefits and Coworking Listings
- Admins manage titled virtual-space benefit sets through `/api/admin/virtual-space-benefits`; each set contains benefit strings and an active flag. Authenticated listing users fetch active sets from `/api/mixed/property-listings/active-virtual-space-benefits`.
- Coworking workspaces support `cabin`, `hall`, and `virtualSpace`. Virtual Space stores monthly rent on each selected benefit snapshot, grouped by master `_id` and title. Create and update validation check plan rents and selected benefit strings, and the controllers save canonical title and benefit snapshots.
