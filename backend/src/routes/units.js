const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all units
router.get('/', async (req, res) => {
  try {
    const units = await prisma.unit.findMany({ include: { tenant: true } });
    res.json(units);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Error fetching units' });
  }
});

// GET unit by ID
router.get('/:id', async (req, res) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { tenant: true }
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    res.json(unit);
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ error: 'Error fetching unit' });
  }
});

// CREATE unit
router.post('/', async (req, res) => {
  try {
    const unit = await prisma.unit.create({ data: req.body });
    res.status(201).json(unit);
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ error: 'Error creating unit' });
  }
});

// UPDATE unit
router.put('/:id', async (req, res) => {
  try {
    const unit = await prisma.unit.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(unit);
  } catch (error) {
    console.error('Error updating unit:', error);
    res.status(500).json({ error: 'Error updating unit' });
  }
});

// DELETE unit
router.delete('/:id', async (req, res) => {
  try {
    await prisma.unit.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Unit deleted' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: 'Error deleting unit' });
  }
});

module.exports = router;
