import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'url';
import { prisma } from './db.js';

const demoUsers = [
  { name: 'Admin Demo', email: 'admin@demo.com', password: 'admin123', role: 'admin' },
  { name: 'Member Demo', email: 'member@demo.com', password: 'member123', role: 'member' },
];

export const seedDemoUsers = async () => {
  const seededUsers = {};

  for (const user of demoUsers) {
    const password = await bcrypt.hash(user.password, 10);

    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password,
        role: user.role,
      },
      create: {
        name: user.name,
        email: user.email,
        password,
        role: user.role,
      },
    });

    seededUsers[user.email] = savedUser;
  }

  return seededUsers;
};

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
};

export const seedDemoWorkspace = async () => {
  const users = await seedDemoUsers();
  const admin = users['admin@demo.com'];
  const member = users['member@demo.com'];

  let project = await prisma.project.findFirst({
    where: {
      name: 'Product Launch',
      createdById: admin.id,
    },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Product Launch',
        description: 'Demo workspace for planning, assigning, and tracking launch work.',
        color: '#6366f1',
        createdById: admin.id,
      },
    });
  }

  const demoTasks = [
    {
      title: 'Finalize onboarding checklist',
      description: 'Turn launch requirements into an actionable onboarding checklist.',
      assignedToId: member.id,
      status: 'in-progress',
      priority: 'high',
      dueDate: addDays(2),
    },
    {
      title: 'Review Railway deployment',
      description: 'Confirm the production app serves the API and frontend from one live URL.',
      assignedToId: admin.id,
      status: 'pending',
      priority: 'medium',
      dueDate: addDays(5),
    },
    {
      title: 'Follow up on overdue QA notes',
      description: 'Resolve the overdue QA notes before the next review cycle.',
      assignedToId: member.id,
      status: 'pending',
      priority: 'high',
      dueDate: addDays(-1),
    },
    {
      title: 'Prepare demo video outline',
      description: 'Draft the 2-5 minute walkthrough covering admin and member flows.',
      assignedToId: member.id,
      status: 'completed',
      priority: 'low',
      dueDate: addDays(-2),
    },
  ];

  for (const task of demoTasks) {
    const existingTask = await prisma.task.findFirst({
      where: {
        title: task.title,
        projectId: project.id,
      },
    });

    const data = {
      ...task,
      projectId: project.id,
      createdById: admin.id,
    };

    if (existingTask) {
      await prisma.task.update({
        where: { id: existingTask.id },
        data,
      });
    } else {
      await prisma.task.create({ data });
    }
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemoWorkspace()
    .then(async () => {
      console.log('Demo workspace is ready.');
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
