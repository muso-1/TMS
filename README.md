# Tenant Management System

Web app that helps landlords organize and control all rental operations in a single structured reliable system. It handles things like tenants, units, leases, rent billing, payments, deposits, and tracking who has paid and who hasn’t. Additionally, the system automates processes such as generating rent bills based on lease start dates, allocating payments correctly, and updating payment statuses, hence reducing manual work and errors.

## Stack
- Backend: Node.js + Express + PostgreSQL
- Frontend: React + Tailwind CSS

## Getting Started

```bash
cd backend
docker compose up -d
npm install
npx nodemon src/server.js

cd ../frontend
npm install
npm run dev
