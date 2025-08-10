const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// CREATE rent bill
router.post('/', async (req, res) => {
  try {
    const { tenantId, amount, dueDate, status } = req.body;

    if (!tenantId || !amount || !dueDate) {
      return res.status(400).json({ error: 'Tenant ID, amount, and due date are required' });
    }

    const rentBill = await prisma.rentBill.create({
      data: { tenantId, amount, dueDate: new Date(dueDate), status }
    });

    res.status(201).json(rentBill);
  } catch (error) {
    res.status(500).json({ error: 'Error creating rent bill' });
  }
});

// READ all rent bills
router.get('/', async (req, res) => {
  try {
    const rentBills = await prisma.rentBill.findMany({
      include: { tenant: true }
    });
    res.json(rentBills);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching rent bills' });
  }
});

// READ rent bill by ID
router.get('/:id', async (req, res) => {
  try {
    const rentBill = await prisma.rentBill.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { tenant: true }
    });

    if (!rentBill) return res.status(404).json({ error: 'Rent bill not found' });

    res.json(rentBill);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching rent bill' });
  }
});

// UPDATE rent bill
router.put('/:id', async (req, res) => {
  try {
    const { amount, dueDate, status } = req.body;

    const rentBill = await prisma.rentBill.update({
      where: { id: parseInt(req.params.id) },
      data: { amount, dueDate: dueDate ? new Date(dueDate) : undefined, status }
    });

    res.json(rentBill);
  } catch (error) {
    res.status(500).json({ error: 'Error updating rent bill' });
  }
});

// DELETE rent bill
router.delete('/:id', async (req, res) => {
  try {
    await prisma.rentBill.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Rent bill deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting rent bill' });
  }
});

module.exports = router;
