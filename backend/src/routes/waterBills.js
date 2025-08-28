const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// CREATE water bill
router.post('/', async (req, res) => {
  try {
    const { tenantId, currentReading, dueDate, status } = req.body;

    if (!tenantId || !currentReading || !dueDate) {
      return res.status(400).json({ error: 'Tenant ID, current reading, and due date are required' });
    }

    // 1. Get last water bill for this tenant
    const lastBill = await prisma.waterBill.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    const previousReading = lastBill ? lastBill.currentReading : 0;

    // 2. Calculate usage
    const unitsUsed = currentReading - previousReading;
    if (unitsUsed < 0) {
      return res.status(400).json({ error: 'Current reading must be >= previous reading' });
    }

    // 3. Apply rate (hardcoded for now, later move to config or DB)
    const ratePerUnit = 350; // e.g. 50 currency units per unit
    const amount = unitsUsed * ratePerUnit;

    // 4. Save to DB
    const waterBill = await prisma.waterBill.create({
      data: {
        tenantId,
        previousReading,
        currentReading,
        unitsUsed,
        amount,
        dueDate: new Date(dueDate),
        status: status || 'pending'
      }
    });

    res.status(201).json(waterBill);
  } catch (error) {
    console.error(error);
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
