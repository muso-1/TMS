const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendBillReminder } = require('../services/reminderService');
const { recalcWaterBillPaidStatus } = require('../lib/recalcWaterBillPaidStatus');

const prisma = new PrismaClient();
const router = express.Router();

// CREATE water bills (manual / monthly readings)
router.post('/', async (req, res) => {
  try {
    const billsData = Array.isArray(req.body) ? req.body : [req.body];
    if (!billsData.length) {
      return res.status(400).json({ error: 'No water bills provided.' });
    }

    const createdBills = [];

    await prisma.$transaction(async (tx) => {
      for (const bill of billsData) {
        const { tenantId, currentReading, dueDate } = bill;

        if (!tenantId || currentReading == null || !dueDate) {
          throw new Error('tenantId, currentReading, and dueDate are required.');
        }

        const lastBill = await tx.waterBill.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        });

        const previousReading = lastBill ? lastBill.currentReading : 0;
        const unitsUsed = currentReading - previousReading;

        if (unitsUsed < 0) {
          throw new Error('Current reading must be >= previous reading.');
        }

        const ratePerUnit = 350;
        const amount = unitsUsed * ratePerUnit;

        const newBill = await tx.waterBill.create({
          data: {
            tenantId,
            previousReading,
            currentReading,
            unitsUsed,
            amount,
            dueDate: new Date(dueDate),
            status: 'pending',
          },
        });

        // Ensure status consistency
        await recalcWaterBillPaidStatus(newBill.id, tx);

        createdBills.push(newBill);
      }
    });

    if (createdBills.length) {
      await sendBillReminder('water', {
        onlyNewBills: true,
        newBillIds: createdBills.map(b => b.id),
      });
    }

    res.status(201).json({
      message: 'Water bills created successfully.',
      created: createdBills,
    });
  } catch (error) {
    console.error('Error creating water bills:', error);
    res.status(400).json({ error: error.message });
  }
});

// LIST water bills with payment summary
router.get('/', async (req, res) => {
  try {
    const bills = await prisma.waterBill.findMany({
      include: {
        tenant: true,
        _count: {
          select: {
            // virtual view via allocations
            paymentAllocations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bills);
  } catch (error) {
    console.error('Error fetching water bills:', error);
    res.status(500).json({ error: 'Error fetching water bills.' });
  }
});

// GET single water bill with allocations
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const bill = await prisma.waterBill.findUnique({
      where: { id },
      include: {
        tenant: true,
        paymentAllocations: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Water bill not found.' });
    }

    const totalPaid = bill.paymentAllocations.reduce(
      (sum, a) => sum + a.amount,
      0
    );

    res.json({
      ...bill,
      totalPaid,
      outstanding: Math.max(0, bill.amount - totalPaid),
    });
  } catch (error) {
    console.error('Error fetching water bill:', error);
    res.status(500).json({ error: 'Error fetching water bill.' });
  }
});

// UPDATE water bill (READS ONLY status & paidaT, NOT editable)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { currentReading, dueDate } = req.body;

    const bill = await prisma.waterBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });

    if (currentReading != null && currentReading < bill.previousReading) {
      return res.status(400).json({
        error: 'Current reading cannot be less than previous reading.',
      });
    }

    const unitsUsed =
      currentReading != null
        ? currentReading - bill.previousReading
        : bill.unitsUsed;

    const amount = unitsUsed * 350;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedBill = await tx.waterBill.update({
        where: { id },
        data: {
          currentReading,
          unitsUsed,
          amount,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        },
      });

      await recalcWaterBillPaidStatus(id, tx);
      return updatedBill;
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating water bill:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE water bill (with allocations)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.$transaction(async (tx) => {
      await tx.paymentAllocation.deleteMany({
        where: {
          billType: 'water',
          billId: id,
        },
      });

      await tx.waterBill.delete({ where: { id } });
    });

    res.json({ message: 'Water bill deleted successfully.' });
  } catch (error) {
    console.error('Error deleting water bill:', error);
    res.status(500).json({ error: 'Error deleting water bill.' });
  }
});

module.exports = router;
