# Openwall Improvement Plan

## 1) Documentation and onboarding (Highest impact, low effort)
- `README.md` currently only contains the project name, so new contributors cannot quickly learn setup steps, environment variables, architecture, or deploy workflow.
- Add:
  - Local setup instructions (`npm install`, `npm run dev`, Supabase project linking)
  - Required environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  - Database migration workflow
  - Production deployment checklist

## 2) Automated testing baseline (High impact)
- `package.json` has lint/typecheck/build scripts but no unit, integration, or end-to-end tests.
- Add:
  - Unit tests for validation and utility functions
  - Component tests for critical auth and posting flows
  - End-to-end smoke tests for sign-up/sign-in/post note/request connection
  - CI workflow to run lint + typecheck + tests on every PR

## 3) Close known product gaps before scale
Based on the existing backlog, priority gaps are:
1. Real payment processing for priority posts
2. Realtime updates for notes/requests
3. In-app notification UX (not only DB tables)
4. Messaging after connection approval
5. Advanced filtering/search

## 4) Reliability and quality hardening
- The backlog lists many high-priority manual QA cases (core posting, RLS leakage checks, auth persistence, deletion behavior).
- Convert these manual checks into reproducible test cases and add staged rollout checks:
  - Regression checklist for every release
  - Error tracking and alerting for failed DB operations
  - Performance tests for large note volumes

## 5) Database and migration maintenance
- There are many sequential migrations and multiple security-fix migration files.
- Improve long-term maintainability by:
  - Adding migration documentation and naming conventions
  - Creating periodic schema snapshots for fresh environment bootstrap
  - Auditing indexes/RLS policies quarterly with a written report

## 6) Security and operational excellence
- Keep improving with practical controls:
  - Secret/environment management documentation per environment
  - Rate limiting and abuse protections for post/request endpoints
  - Backup/restore drill runbook for Supabase
  - Incident response checklist for auth/data issues

## Suggested execution order (next 2-4 weeks)
1. Expand README + onboarding docs
2. Add test infrastructure + first critical-path E2E suite
3. Implement payment flow and realtime updates
4. Ship notification UI and messaging MVP
5. Formalize reliability/security runbooks and recurring audits
