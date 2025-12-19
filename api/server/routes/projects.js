const express = require('express');
const mongoose = require('mongoose');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const {
  listUserProjects,
  createUserProject,
  updateUserProject,
  deleteUserProject,
} = require('~/models/Project');

const router = express.Router();

router.use(requireJwtAuth);

const toResponse = (project) => ({
  id: project._id?.toString() ?? project.id,
  name: project.name,
  description: project.description ?? '',
  color: project.color,
  icon: project.icon,
  owner: project.owner?.toString?.() ?? project.owner,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

router.get('/', async (req, res) => {
  try {
    const projects = await listUserProjects(req.user.id);
    res.json(projects.map(toResponse));
  } catch (error) {
    logger.error('[GET /projects] Failed to list projects', error);
    res.status(500).json({ message: 'Failed to load projects' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body ?? {};
    const project = await createUserProject({
      ownerId: req.user.id,
      name,
      description,
      color,
      icon,
    });
    res.status(201).json(toResponse(project));
  } catch (error) {
    logger.error('[POST /projects] Failed to create project', error);
    if (error.message?.includes('duplicate key')) {
      return res.status(409).json({ message: 'Project name already exists' });
    }
    res.status(400).json({ message: error.message || 'Failed to create project' });
  }
});

router.patch('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: 'Invalid project id' });
  }

  try {
    const project = await updateUserProject({
      ownerId: req.user.id,
      projectId,
      data: req.body ?? {},
    });
    res.json(toResponse(project));
  } catch (error) {
    logger.error('[PATCH /projects/:projectId] Failed to update project', error);
    if (error.message?.includes('duplicate key')) {
      return res.status(409).json({ message: 'Project name already exists' });
    }
    res.status(400).json({ message: error.message || 'Failed to update project' });
  }
});

router.delete('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: 'Invalid project id' });
  }

  try {
    const project = await deleteUserProject({
      ownerId: req.user.id,
      projectId,
    });
    res.json(toResponse(project));
  } catch (error) {
    logger.error('[DELETE /projects/:projectId] Failed to delete project', error);
    res.status(400).json({ message: error.message || 'Failed to delete project' });
  }
});

module.exports = router;
