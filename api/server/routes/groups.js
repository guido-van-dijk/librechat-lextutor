const express = require('express');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const checkAdmin = require('~/server/middleware/roles/admin');
const {
  listGroups,
  createGroup,
  updateGroup,
  addGroupMember,
  updateGroupMember,
  removeGroupMember,
  deleteGroup,
} = require('~/models/Group');

const router = express.Router();

router.use(requireJwtAuth);

router.get('/', async (req, res) => {
  try {
    const groups = await listGroups({
      user: req.user,
      search: req.query?.search,
    });
    res.json(groups);
  } catch (error) {
    logger.error('[GET /groups] Failed to list groups', error);
    res.status(500).json({ message: 'Failed to load groups' });
  }
});

router.post('/', checkAdmin, async (req, res) => {
  try {
    const { name, description, email, avatar, organizationId, ownerId } = req.body ?? {};
    const owner = ownerId || req.user.id;
    const group = await createGroup({
      name,
      description,
      email,
      avatar,
      organizationId,
      ownerId: owner,
    });
    res.status(201).json(group);
  } catch (error) {
    logger.error('[POST /groups] Failed to create group', error);
    res.status(400).json({ message: error.message || 'Failed to create group' });
  }
});

router.patch('/:groupId', checkAdmin, async (req, res) => {
  try {
    const group = await updateGroup(req.params.groupId, req.body ?? {});
    res.json(group);
  } catch (error) {
    logger.error('[PATCH /groups/:groupId] Failed to update group', error);
    res.status(400).json({ message: error.message || 'Failed to update group' });
  }
});

router.post('/:groupId/members', checkAdmin, async (req, res) => {
  try {
    const { userId, email, role } = req.body ?? {};
    const group = await addGroupMember(req.params.groupId, { userId, email, role });
    res.json(group);
  } catch (error) {
    logger.error('[POST /groups/:groupId/members] Failed to add member', error);
    res.status(400).json({ message: error.message || 'Failed to update members' });
  }
});

router.patch('/:groupId/members/:memberId', checkAdmin, async (req, res) => {
  try {
    const { role } = req.body ?? {};
    const group = await updateGroupMember(req.params.groupId, req.params.memberId, role);
    res.json(group);
  } catch (error) {
    logger.error('[PATCH /groups/:groupId/members/:memberId] Failed to update member', error);
    res.status(400).json({ message: error.message || 'Failed to update member' });
  }
});

router.delete('/:groupId/members/:memberId', checkAdmin, async (req, res) => {
  try {
    const group = await removeGroupMember(req.params.groupId, req.params.memberId);
    res.json(group);
  } catch (error) {
    logger.error('[DELETE /groups/:groupId/members/:memberId] Failed to remove member', error);
    res.status(400).json({ message: error.message || 'Failed to remove member' });
  }
});

router.delete('/:groupId', checkAdmin, async (req, res) => {
  try {
    await deleteGroup(req.params.groupId);
    res.status(204).send();
  } catch (error) {
    logger.error('[DELETE /groups/:groupId] Failed to delete group', error);
    res.status(400).json({ message: error.message || 'Failed to delete group' });
  }
});

module.exports = router;
