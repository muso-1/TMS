const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// CREATE tenant
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const tenant = await prisma.tenant.create({
      data: { name, email, phone }
    });

    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Error creating tenant' });
  }
});

// READ all tenants
router.get('/', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { units: true }
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tenants' });
  }
});

// READ tenant by ID
router.get('/:id', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { unit: true }
    });

    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tenant' });
  }
});

// UPDATE tenant
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(req.params.id) },
      data: { name, email, phone }
    });

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Error updating tenant' });
  }
});

// DELETE tenant
//router.delete('/:id', async (req, res) => {
//  try {
//    await prisma.tenant.delete({
//      where: { id: parseInt(req.params.id) }
//    });

//    res.json({ message: 'Tenant deleted' });
//  } catch (error) {
//    res.status(500).json({ error: 'Error deleting tenant' });
//  }
//});

module.exports = router;
