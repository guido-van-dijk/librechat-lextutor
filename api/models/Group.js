const mongoose = require('mongoose');
const { SystemRoles } = require('librechat-data-provider');
const { Group, User, AclEntry } = require('~/db/models');

const GROUP_ROLES = ['owner', 'editor', 'viewer'];

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const ensureValidName = (name) => {
  const normalized = normalizeText(name);
  if (!normalized) {
    throw new Error('Group name is required');
  }
  return normalized;
};

const assertUniqueGroupName = async (name, excludeGroupId) => {
  const query = {
    name: {
      $regex: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
    },
  };
  if (excludeGroupId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeGroupId) };
  }

  const existing = await Group.findOne(query).select('_id').lean();
  if (existing) {
    throw new Error('Group name already exists');
  }
};

const formatMember = (member) => {
  if (!member) {
    return null;
  }
  const user = member.user || {};
  let userId = undefined;
  if (user && typeof user === 'object' && user._id) {
    userId = user._id.toString();
  } else if (user && typeof user === 'object' && typeof user.toString === 'function') {
    userId = user.toString();
  } else if (typeof user === 'string') {
    userId = user;
  }
  return {
    userId,
    email: user.email,
    name: user.name || user.username,
    role: member.role,
  };
};

const formatGroup = (doc) => {
  if (!doc) {
    return null;
  }
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: obj._id?.toString(),
    name: obj.name,
    description: obj.description || '',
    email: obj.email || '',
    avatar: obj.avatar || '',
    organizationId: obj.organizationId ? obj.organizationId.toString() : undefined,
    members: Array.isArray(obj.members) ? obj.members.map(formatMember).filter(Boolean) : [],
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const resolveUser = async ({ userId, email }) => {
  if (!userId && !email) {
    throw new Error('User identifier is required');
  }

  let user = null;
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user id');
    }
    user = await User.findById(userId, 'name email username role').lean();
  } else if (email) {
    user = await User.findOne({ email: email.toLowerCase() }, 'name email username role').lean();
  }

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

const listGroups = async ({ user, search }) => {
  const query = {};
  if (!user || user.role !== SystemRoles.ADMIN) {
    if (!user) {
      return [];
    }
    query['members.user'] = new mongoose.Types.ObjectId(user.id);
  }
  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [{ name: regex }, { description: regex }, { email: regex }];
  }

  const groups = await Group.find(query)
    .sort({ updatedAt: -1 })
    .populate('members.user', 'email name username')
    .lean();
  return groups.map(formatGroup);
};

const createGroup = async ({ name, description, email, avatar, organizationId, ownerId }) => {
  const normalizedName = ensureValidName(name);
  await assertUniqueGroupName(normalizedName);
  const groupData = {
    name: normalizedName,
    description: description != null ? normalizeText(description) : '',
    email: email != null ? normalizeText(email) : '',
    avatar: avatar != null ? normalizeText(avatar) : '',
    source: 'local',
    organizationId: organizationId ? new mongoose.Types.ObjectId(organizationId) : undefined,
    members: [],
  };

  if (ownerId) {
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
    groupData.members.push({ user: ownerObjectId, role: 'owner' });
    groupData.memberIds = [ownerObjectId.toString()];
  }

  const created = await Group.create(groupData);
  return formatGroup(created);
};

const updateGroup = async (groupId, data) => {
  const update = {};

  if (data.name !== undefined) {
    const normalizedName = ensureValidName(data.name);
    await assertUniqueGroupName(normalizedName, groupId);
    update.name = normalizedName;
  }

  if (data.description !== undefined) {
    update.description = normalizeText(data.description);
  }

  if (data.email !== undefined) {
    update.email = normalizeText(data.email);
  }

  if (data.avatar !== undefined) {
    update.avatar = normalizeText(data.avatar);
  }

  if (data.organizationId) {
    update.organizationId = new mongoose.Types.ObjectId(data.organizationId);
  }

  let updated;
  if (Object.keys(update).length === 0) {
    updated = await Group.findById(groupId).populate('members.user', 'email name username').lean();
  } else {
    updated = await Group.findByIdAndUpdate(groupId, update, { new: true })
      .populate('members.user', 'email name username')
      .lean();
  }
  if (!updated) {
    throw new Error('Group not found');
  }
  return formatGroup(updated);
};

const addGroupMember = async (groupId, { userId, email, role }) => {
  if (!GROUP_ROLES.includes(role)) {
    throw new Error('Invalid role');
  }
  const user = await resolveUser({ userId, email });
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  const memberExists =
    group.members &&
    group.members.some((member) => member.user.toString() === user._id.toString());

  if (memberExists) {
    await Group.updateOne(
      { _id: groupId, 'members.user': user._id },
      { $set: { 'members.$.role': role } },
    );
  } else {
    await Group.updateOne(
      { _id: groupId },
      {
        $push: {
          members: { user: user._id, role },
        },
        $addToSet: {
          memberIds: user._id.toString(),
        },
      },
    );
  }

  const updated = await Group.findById(groupId)
    .populate('members.user', 'email name username')
    .lean();
  return formatGroup(updated);
};

const updateGroupMember = async (groupId, memberId, role) => {
  if (!GROUP_ROLES.includes(role)) {
    throw new Error('Invalid role');
  }

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error('Invalid member id');
  }
  const memberObjectId = new mongoose.Types.ObjectId(memberId);

  const result = await Group.updateOne(
    { _id: groupId, 'members.user': memberObjectId },
    { $set: { 'members.$.role': role } },
  );
  if (!result.matchedCount) {
    throw new Error('Member not found');
  }

  const updated = await Group.findById(groupId)
    .populate('members.user', 'email name username')
    .lean();
  return formatGroup(updated);
};

const removeGroupMember = async (groupId, memberId) => {
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error('Invalid member id');
  }
  const memberObjectId = new mongoose.Types.ObjectId(memberId);

  await Group.updateOne(
    { _id: groupId },
    {
      $pull: { members: { user: memberObjectId } },
      $pullAll: { memberIds: [memberObjectId.toString()] },
    },
  );
  const updated = await Group.findById(groupId)
    .populate('members.user', 'email name username')
    .lean();
  return formatGroup(updated);
};

const deleteGroup = async (groupId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  await Group.deleteOne({ _id: groupId });
  await AclEntry.deleteMany({
    principalType: 'group',
    principalId: group._id,
  });

  return formatGroup(group);
};

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  addGroupMember,
  updateGroupMember,
  removeGroupMember,
  deleteGroup,
};
