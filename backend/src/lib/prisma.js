// CommonJS syntax since your app.js uses require()
const { PrismaClient } = require('@prisma/client');

// Create ONE shared instance
const prisma = new PrismaClient();

module.exports = prisma;
