const { PrismaClient } = require('@prisma/client');

// Shared prisma instance
const prisma = new PrismaClient();

module.exports = prisma;
