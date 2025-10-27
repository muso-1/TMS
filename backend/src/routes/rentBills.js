const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { getRentBillSummary } = require('../lib/rentBill.summary');

const prisma = new PrismaClient();
const rentBillsRouter = Router();

// 🧾 List all rent bills with summaries
rentBillsRouter.get('/', async (req, res) => {
  try {
    const bills = await prisma.rentBill.findMany({
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true,
          },
        },
        payments: true,
      },
      orderBy: { dueDate: 'desc' },
    });

    const summaries = bills.map((bill) => ({
      id: bill.id,
      amount: bill.amount,
      dueDate: bill.dueDate,
      paid: bill.paid,
      reminderSent: bill.reminderSent,
      reminderSentAt: bill.reminderSentAt,
      payments: bill.payments,
      lease: {
        id: bill.lease?.id,
        startDate: bill.lease?.startDate,
        endDate: bill.lease?.endDate,
        monthlyRent: bill.lease?.monthlyRent,
        tenant: bill.lease?.tenant
          ? {
              id: bill.lease.tenant.id,
              name: bill.lease.tenant.name,
              email: bill.lease.tenant.email,
              phone: bill.lease.tenant.phone,
            }
          : null,
        unit: bill.lease?.unit
          ? {
              id: bill.lease.unit.id,
              unitNumber: bill.lease.unit.unitNumber,
              status: bill.lease.unit.status,
            }
          : null,
      },
    }));

    res.json(summaries);
  } catch (e) {
    console.error('Error fetching rent bills:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get a single rent bill summary
rentBillsRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const bill = await prisma.rentBill.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true,
          },
        },
        payments: true,
      },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Rent bill not found' });
    }

    const summary = {
      id: bill.id,
      amount: bill.amount,
      dueDate: bill.dueDate,
      paid: bill.paid,
      reminderSent: bill.reminderSent,
      reminderSentAt: bill.reminderSentAt,
      payments: bill.payments,
      lease: {
        id: bill.lease?.id,
        startDate: bill.lease?.startDate,
        endDate: bill.lease?.endDate,
        monthlyRent: bill.lease?.monthlyRent,
        tenant: bill.lease?.tenant
          ? {
              id: bill.lease.tenant.id,
              name: bill.lease.tenant.name,
              email: bill.lease.tenant.email,
              phone: bill.lease.tenant.phone,
            }
          : null,
        unit: bill.lease?.unit
          ? {
              id: bill.lease.unit.id,
              unitNumber: bill.lease.unit.unitNumber,
              status: bill.lease.unit.status,
            }
          : null,
      },
    };

    res.json(summary);
  } catch (e) {
    console.error('Error fetching rent bill:', e);
    res.status(500).json({ error: e.message });
  }
});

// Create a new rent bill
rentBillsRouter.post('/', async (req, res) => {
  try {
    const { leaseId, dueDate } = req.body;

    if (!leaseId || !dueDate) {
      return res.status(400).json({ error: 'leaseId and dueDate are required' });
    }

    const lease = await prisma.lease.findUnique({
      where: { id: Number(leaseId) },
      include: { tenant: true, unit: true },
    });

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const bill = await prisma.rentBill.create({
      data: {
        leaseId: lease.id,
        amount: lease.monthlyRent,
        dueDate: new Date(dueDate),
        paid: false,
        reminderSent: false,
        reminderSentAt: null,
      },
    });

    const summary = await getRentBillSummary(bill.id);
    res.status(201).json(summary);
  } catch (e) {
    console.error('Error creating rent bill:', e);
    res.status(500).json({ error: e.message });
  }
});

// Update rent bill (amount or dueDate)
rentBillsRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, dueDate, paid } = req.body;

    await prisma.rentBill.update({
      where: { id },
      data: {
        amount: amount !== undefined ? Number(amount) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        paid: paid !== undefined ? Boolean(paid) : undefined,
      },
    });

    const summary = await getRentBillSummary(id);
    res.json(summary);
  } catch (e) {
    console.error('Error updating rent bill:', e);
    res.status(500).json({ error: e.message });
  }
});

// Delete rent bill (and its payments)
rentBillsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.payment.deleteMany({ where: { rentBillId: id } });
    await prisma.rentBill.delete({ where: { id } });

    res.json({ message: 'Rent bill and its payments deleted' });
  } catch (e) {
    console.error('Error deleting rent bill:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = rentBillsRouter;
