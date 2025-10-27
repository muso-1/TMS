const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendBillReminder } = require('../services/reminderService'); // ✅ import reminder logic

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route POST /api/waterbills
 * @desc Create one or multiple water bills manually (e.g., monthly readings)
 */
router.post('/', async (req, res) => {
  try {
    const billsData = Array.isArray(req.body) ? req.body : [req.body];

    if (billsData.length === 0) {
      return res.status(400).json({ error: 'No water bills provided.' });
    }

    const createdBills = [];

    for (const bill of billsData) {
      const { tenantId, currentReading, dueDate, status } = bill;

      if (!tenantId || !currentReading || !dueDate) {
        return res.status(400).json({
          error: 'tenantId, currentReading, and dueDate are required.',
        });
      }

      // Fetch last bill to get previous reading
      const lastBill = await prisma.waterBill.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      const previousReading = lastBill ? lastBill.currentReading : 0;

      // Calculate usage
      const unitsUsed = currentReading - previousReading;
      if (unitsUsed < 0) {
        return res.status(400).json({
          error: 'Current reading must be greater than or equal to previous reading.',
        });
      }

      // Apply rate (later make configurable)
      const ratePerUnit = 350;
      const amount = unitsUsed * ratePerUnit;

      // Create the new bill
      const newBill = await prisma.waterBill.create({
        data: {
          tenantId,
          previousReading,
          currentReading,
          unitsUsed,
          amount,
          dueDate: new Date(dueDate),
          status: status || 'pending',
          reminderSent: false,
          reminderSentAt: null,
        },
      });

      createdBills.push(newBill);
    }

    // Send reminders for the newly created bills
    const newBillIds = createdBills.map(b => b.id);
    if (newBillIds.length > 0) {
      await sendBillReminder('water', { onlyNewBills: true, newBillIds });
    }

    res.status(201).json({
      message: 'Water bills created successfully and reminders sent.',
      created: createdBills,
    });
  } catch (error) {
    console.error('Error creating water bills:', error);
    res.status(500).json({ error: 'Error creating water bills.' });
  }
});

/**
 * @route GET /api/waterbills
 * @desc Get all water bills
 */
router.get('/', async (req, res) => {
  try {
    const waterBills = await prisma.waterBill.findMany({
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(waterBills);
  } catch (error) {
    console.error('Error fetching water bills:', error);
    res.status(500).json({ error: 'Error fetching water bills.' });
  }
});

/**
 * @route GET /api/waterbills/:id
 * @desc Get a single water bill
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const waterBill = await prisma.waterBill.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!waterBill) {
      return res.status(404).json({ error: 'Water bill not found.' });
    }

    res.json(waterBill);
  } catch (error) {
    console.error('Error fetching water bill:', error);
    res.status(500).json({ error: 'Error fetching water bill.' });
  }
});

/**
 * @route PUT /api/waterbills/:id
 * @desc Update a water bill
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { currentReading, unitsUsed, amount, dueDate, status } = req.body;

    const updated = await prisma.waterBill.update({
      where: { id },
      data: {
        currentReading,
        unitsUsed,
        amount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating water bill:', error);
    res.status(500).json({ error: 'Error updating water bill.' });
  }
});

/**
 * @route DELETE /api/waterbills/:id
 * @desc Delete a water bill
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.waterBill.delete({ where: { id } });

    res.json({ message: 'Water bill deleted successfully.' });
  } catch (error) {
    console.error('Error deleting water bill:', error);
    res.status(500).json({ error: 'Error deleting water bill.' });
  }
});

module.exports = router;
