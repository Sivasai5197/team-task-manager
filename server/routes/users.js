import express from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get users for assignment
router.get('/', authenticate, async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? {} : { id: req.user.id };
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

export default router;
