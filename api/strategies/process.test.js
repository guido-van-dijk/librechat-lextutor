const { handleExistingUser } = require('./process');

jest.mock('~/server/services/Files/images/avatar', () => ({
  resizeAvatar: jest.fn(),
  saveUserAvatar: jest.fn(),
}));

jest.mock('~/models', () => ({
  updateUser: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn(),
}));

jest.mock('~/server/services/Config', () => ({
  getAppConfig: jest.fn().mockResolvedValue({}),
}));

jest.mock('@librechat/api', () => ({
  getBalanceConfig: jest.fn(() => ({
    enabled: false,
  })),
}));

const { resizeAvatar, saveUserAvatar } = require('~/server/services/Files/images/avatar');
const { updateUser } = require('~/models');

describe('handleExistingUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resizeAvatar.mockReset();
    saveUserAvatar.mockReset();
  });

  it('should save avatar when none exists', async () => {
    const oldUser = {
      _id: 'user123',
      avatar: null,
    };
    const avatarUrl = 'https://example.com/avatar.png';
    const buffer = Buffer.from('image');
    resizeAvatar.mockResolvedValue(buffer);
    saveUserAvatar.mockResolvedValue('data:image/png;base64,abc');

    await handleExistingUser(oldUser, avatarUrl);

    expect(resizeAvatar).toHaveBeenCalledWith({
      desiredFormat: undefined,
      input: avatarUrl,
      userId: 'user123',
    });
    expect(saveUserAvatar).toHaveBeenCalledWith({
      buffer,
      isCustom: false,
      mimeType: 'image/png',
      userId: 'user123',
    });
  });

  it('should not update avatar if it has manual=true flag', async () => {
    const oldUser = {
      _id: 'user123',
      avatar: 'https://example.com/avatar.png?manual=true',
    };
    const avatarUrl = 'https://example.com/new-avatar.png';

    await handleExistingUser(oldUser, avatarUrl);

    expect(resizeAvatar).not.toHaveBeenCalled();
    expect(saveUserAvatar).not.toHaveBeenCalled();
  });

  it('should handle oldUser being null gracefully', async () => {
    const avatarUrl = 'https://example.com/avatar.png';

    // This should throw an error when trying to access oldUser._id
    await expect(handleExistingUser(null, avatarUrl)).rejects.toThrow();
  });

  it('should update email when it has changed', async () => {
    const oldUser = {
      _id: 'user123',
      email: 'old@example.com',
      avatar: 'https://example.com/avatar.png?manual=true',
    };
    const newEmail = 'new@example.com';

    await handleExistingUser(oldUser, avatarUrl, {}, newEmail);

    expect(updateUser).toHaveBeenCalledWith('user123', { email: 'new@example.com' });
    expect(saveUserAvatar).not.toHaveBeenCalled();
  });

  it('should not update avatar when avatarIsCustom is true', async () => {
    const oldUser = {
      _id: 'user123',
      avatarIsCustom: true,
    };
    const avatarUrl = 'https://example.com/avatar.png';

    await handleExistingUser(oldUser, avatarUrl);

    expect(resizeAvatar).not.toHaveBeenCalled();
    expect(saveUserAvatar).not.toHaveBeenCalled();
  });

  it('should update both avatar and email when both have changed', async () => {
    const oldUser = {
      _id: 'user123',
      email: 'old@example.com',
      avatar: null,
    };
    const avatarUrl = 'https://example.com/new-avatar.png';
    const newEmail = 'new@example.com';

    const buffer = Buffer.from('img');
    resizeAvatar.mockResolvedValue(buffer);
    await handleExistingUser(oldUser, avatarUrl, {}, newEmail);

    expect(saveUserAvatar).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith('user123', {
      email: 'new@example.com',
    });
  });

  it('should not update email when it has not changed', async () => {
    const oldUser = {
      _id: 'user123',
      email: 'same@example.com',
      avatar: 'https://example.com/avatar.png?manual=true',
    };
    const avatarUrl = 'https://example.com/avatar.png';
    const sameEmail = 'same@example.com';

    await handleExistingUser(oldUser, avatarUrl, {}, sameEmail);

    expect(updateUser).not.toHaveBeenCalled();
  });

  it('should trim email before comparison and update', async () => {
    const oldUser = {
      _id: 'user123',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.png?manual=true',
    };
    const avatarUrl = 'https://example.com/avatar.png';
    const newEmailWithSpaces = '  newemail@example.com  ';

    await handleExistingUser(oldUser, avatarUrl, {}, newEmailWithSpaces);

    expect(updateUser).toHaveBeenCalledWith('user123', { email: 'newemail@example.com' });
  });

  it('should not update when email parameter is not provided', async () => {
    const oldUser = {
      _id: 'user123',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.png?manual=true',
    };
    const avatarUrl = 'https://example.com/avatar.png';

    await handleExistingUser(oldUser, avatarUrl, {});

    expect(updateUser).not.toHaveBeenCalled();
  });
});
