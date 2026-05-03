import express from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const statuses = new Set(['pending', 'in-progress', 'completed']);
const priorities = new Set(['low', 'medium', 'high']);

const taskInclude = {
  project: {
    select: { id: true, name: true, color: true },
  },
  assignedTo: {
    select: { id: true, name: true, email: true, role: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true, role: true },
  },
};

const parseDueDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? false : date;
};

const ensureProject = async (projectId) => {
  if (!projectId) return null;
  return prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
};

const ensureUser = async (userId) => {
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
};

// Get tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, assignedTo, assignedToId, status } = req.query;
    const where = req.user.role === 'admin' ? {} : { assignedToId: req.user.id };
    const assignee = assignedToId || assignedTo;

    if (projectId) where.projectId = projectId;
    if (assignee && req.user.role !== 'admin' && assignee !== req.user.id) {
      return res.status(403).json({ error: 'Members can only view their own assigned tasks' });
    }
    if (assignee) where.assignedToId = assignee;
    if (status && !statuses.has(status)) return res.status(400).json({ error: 'Invalid task status' });
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// Create task
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, projectId, assignedToId, status, priority, dueDate } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Task title required' });
    if (title.trim().length > 120) return res.status(400).json({ error: 'Task title must be 120 characters or fewer' });
    if (description && description.length > 1000) return res.status(400).json({ error: 'Task description must be 1000 characters or fewer' });
    if (!projectId) return res.status(400).json({ error: 'Project required' });
    if (!(await ensureProject(projectId))) return res.status(404).json({ error: 'Project not found' });
    if (assignedToId && !(await ensureUser(assignedToId))) return res.status(404).json({ error: 'Assigned user not found' });
    if (status && !statuses.has(status)) return res.status(400).json({ error: 'Invalid task status' });
    if (priority && !priorities.has(priority)) return res.status(400).json({ error: 'Invalid task priority' });

    const parsedDueDate = parseDueDate(dueDate);
    if (parsedDueDate === false) return res.status(400).json({ error: 'Invalid due date' });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        projectId,
        assignedToId: assignedToId || null,
        status: status || 'pending',
        priority: priority || 'medium',
        dueDate: parsedDueDate === undefined ? null : parsedDueDate,
        createdById: req.user.id,
      },
      include: taskInclude,
    });
    res.status(201).json({ task });
  } catch {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// Update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: { id: true, assignedToId: true },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (req.user.role !== 'admin') {
      if (task.assignedToId !== req.user.id) {
        return res.status(403).json({ error: 'Members can only update their own assigned tasks' });
      }
      if (Object.keys(req.body).some((key) => key !== 'status')) {
        return res.status(403).json({ error: 'Members can only update task status' });
      }
      if (!statuses.has(req.body.status)) return res.status(400).json({ error: 'Invalid task status' });

      const updatedTask = await prisma.task.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
        include: taskInclude,
      });
      return res.json({ task: updatedTask });
    }

    const updateData = {};
    const { title, description, projectId, assignedToId, status, priority, dueDate } = req.body;

    if (title !== undefined) {
      if (!title?.trim()) return res.status(400).json({ error: 'Task title required' });
      if (title.trim().length > 120) return res.status(400).json({ error: 'Task title must be 120 characters or fewer' });
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (description && description.length > 1000) return res.status(400).json({ error: 'Task description must be 1000 characters or fewer' });
      updateData.description = description?.trim() || '';
    }

    if (projectId !== undefined) {
      if (!projectId) return res.status(400).json({ error: 'Project required' });
      if (!(await ensureProject(projectId))) return res.status(404).json({ error: 'Project not found' });
      updateData.projectId = projectId;
    }

    if (assignedToId !== undefined) {
      if (assignedToId && !(await ensureUser(assignedToId))) return res.status(404).json({ error: 'Assigned user not found' });
      updateData.assignedToId = assignedToId || null;
    }

    if (status !== undefined) {
      if (!statuses.has(status)) return res.status(400).json({ error: 'Invalid task status' });
      updateData.status = status;
    }

    if (priority !== undefined) {
      if (!priorities.has(priority)) return res.status(400).json({ error: 'Invalid task priority' });
      updateData.priority = priority;
    }

    const parsedDueDate = parseDueDate(dueDate);
    if (parsedDueDate === false) return res.status(400).json({ error: 'Invalid due date' });
    if (parsedDueDate !== undefined) updateData.dueDate = parsedDueDate;

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: taskInclude,
    });
    res.json({ task: updatedTask });
  } catch {
    res.status(500).json({ error: 'Error updating task' });
  }
});

// Delete task
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.task.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Task not found' });
    res.status(500).json({ error: 'Error deleting task' });
  }
});

export default router;
