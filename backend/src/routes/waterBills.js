const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// CREATE water bill
router.post('/', async (req, res) => {
  try {
    const { tenantId, unitsUsed, amount, dueDate, status } = req.body;

    if (!tenantId || !unitsUsed || !amount || !dueDate) {
      return res.status(400).json({ error: 'Tenant ID, units used, amount, and due date are required' });
    }

    const waterBill = await prisma.waterBill.create({
      data: { tenantId, unitsUsed, amount, dueDate: new Date(dueDate), status }
    });

    res.status(201).json(waterBill);
  } catch (error) {
    res.status(500).json({ error: 'Error creating water bill' });
  }
});

// READ all water bills
router.get('/', async (req, res) => {
  try {
    const waterBills = await prisma.waterBill.findMany({
      include: { tenant: true }
    });
    res.json(waterBills);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching water bills' });
  }
});

// READ water bill by ID
router.get('/:id', async (req, res) => {
  try {
    const waterBill = await prisma.waterBill.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { tenant: true }
    });

    if (!waterBill) return res.status(404).json({ error: 'Water bill not found' });

    res.json(waterBill);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching water bill' });
  }
});

// UPDATE water bill
router.put('/:id', async (req, res) => {
  try {
    const { unitsUsed, amount, dueDate, status } = req.body;

    const waterBill = await prisma.waterBill.update({
      where: { id: parseInt(req.params.id) },
      data: { unitsUsed, amount, dueDate: dueDate ? new Date(dueDate) : undefined, status }
    });

    res.json(waterBill);
  } catch (error) {
    res.status(500).json({ error: 'Error updating water bill' });
  }
});

// DELETE water bill
router.delete('/:id', async (req, res) => {
  try {
    await prisma.waterBill.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Water bill deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting water bill' });
  }
});

module.exports = router;
