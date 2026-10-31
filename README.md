# Rocket - frontend

Rocket is a web platform built at Keus S.r.l. to run a catalogue of proprietary SaaS products from one place: orders, licences, contracts, invoices and the metrics of every product. This repository holds its web interface. It accompanies the master's thesis *Design and Development of a Scalable Web Platform for Proprietary Software Product Tracking and Management Using Enterprise-Level Frameworks and Cloud Architecture* (Damiano Caon, University of Padua, Department of Information Engineering).

The code is a copy of the one Keus runs, prepared for public consultation. It runs in demo mode: no external service is called, and every change made for that purpose carries the comment `Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.`

Live demo: <https://d2c8lp2zkatd89.cloudfront.net>

The other two parts of the platform:
- [rocket-be-thesis-demo](https://github.com/dcaon01/rocket-be-thesis-demo): the NestJS backend;
- [rocket-infra-thesis-demo](https://github.com/dcaon01/rocket-infra-thesis-demo): the AWS infrastructure, in OpenTofu.

## Demo accounts

The demo holds fictional data: three products (Nquadro, Genio, Pagai) with their plans, two resellers, ten customer companies, and orders in every state, from draft to closed, with the tenants, users, contracts and invoices they produced. Every account below uses the password `RocketDemo2026!`.

| Email | Profile |
|---|---|
| admin@example.com | Keus administrator |
| sales@example.com | Keus sales |
| accounting@example.com | Keus accounting |
| backoffice@example.com | Keus back office |
| nordigi.owner@example.com | Owner of the reseller NORDIGI |
| nordigi.sales@example.com | Sales of the reseller NORDIGI |
| sudsoft.owner@example.com | Owner of the reseller SUDSOFT |

The accounts are shared, so anything you change is visible to the next visitor. The data is restored periodically.

## Stack

Angular 21 with standalone components and signals, the spartan/ui component library on top of Tailwind CSS 4, ECharts for the dashboards, and `amazon-cognito-identity-js` for the login against Cognito. The API client in `libs/api` is generated from the backend's OpenAPI documents with `ng-openapi-gen` and is never edited by hand.

## How the interface is organised

The interface follows the three perimeters described in the thesis:
- the whole portfolio, for Keus staff: products, companies, resellers, orders, contracts, invoices and the aggregated metrics;
- the single product, opened from the product selector in the top bar: its plans, tenants, users and dashboards;
- the single reseller, which sees only its own customers, orders and contracts.

What a user can see and do depends on the Cognito group of the account, and the backend enforces the same scope on every request.

The code lives under `src/app`:
- `auth/`: login, first access and password reset;
- `core/modules/`: one folder per feature, with routed pages in `pages/` and forms in `components/`;
- `core/services/`: API wrappers, caches and shared state;
- the other folders of `core/`: enums, pipes, directives, guards, validators and constants shared across features.

## Demo mode

The `demo` build configuration in `angular.json` swaps in `src/environments/environment.demo.ts`, which points to the demo backend and sets `integrationsEnabled: false`. With that flag the interface hides what depends on Stripe, Sibill, HubSpot, Intercom and Mixpanel, such as payment steps, electronic invoicing columns and support links. The charts that would read those services live show a short notice in their place.

## Running it

The interface needs a Rocket backend and a Cognito user pool, so on its own it shows only the login page.

```bash
npm ci
npx ng serve --configuration=demo   # http://localhost:4200, against the demo backend
npx ng build --configuration=demo   # production build in dist/
```

The demo backend accepts requests from its CloudFront address and from `http://localhost:4200`. On any other port the interface loads but stays empty.

## Deployment

The `ci` workflow builds the `demo` configuration on every push to `main`, syncs it to the S3 bucket behind CloudFront and invalidates the cache. It signs in to AWS through GitHub's OIDC provider, so the repository holds no AWS key. The role, the bucket and the distribution come from the repository variables `AWS_REGION`, `DEV_AWS_IAM_ROLE_ARN`, `DEV_S3_BUCKET` and `DEV_CLOUDFRONT_ID`.
