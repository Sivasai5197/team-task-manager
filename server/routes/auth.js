import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toSafeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!emailPattern.test(normalizedEmail)) return res.status(400).json({ error: 'Valid email is required' });
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'member',
      },
    });

    const safeUser = toSafeUser(user);
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user: safeUser, token });
  } catch {
    res.status(500).json({ error: 'Server error during signup' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail) || typeof password !== 'string') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const safeUser = toSafeUser(user);
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user: safeUser, token });
  } catch {
    res.status(500).json({ error: 'Server error during login' });
  }
});

export default router;
