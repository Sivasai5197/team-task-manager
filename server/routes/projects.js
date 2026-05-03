import express from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const colorPattern = /^#[0-9a-fA-F]{6}$/;

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Error fetching projects' });
  }
});

// Create project
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });
    if (name.trim().length > 80) return res.status(400).json({ error: 'Project name must be 80 characters or fewer' });
    if (description && description.length > 500) return res.status(400).json({ error: 'Project description must be 500 characters or fewer' });
    if (color && !colorPattern.test(color)) return res.status(400).json({ error: 'Project color must be a valid hex value' });

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        color: color || '#6366f1',
        createdById: req.user.id
      }
    });
    res.status(201).json({ project });
  } catch {
    res.status(500).json({ error: 'Error creating project' });
  }
});

// Delete project
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.project.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Project not found' });
    res.status(500).json({ error: 'Error deleting project' });
  }
});

export default router;
