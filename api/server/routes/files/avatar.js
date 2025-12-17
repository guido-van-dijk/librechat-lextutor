const fs = require('fs').promises;
const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { resizeAvatar, saveUserAvatar } = require('~/server/services/Files/images/avatar');
const { filterFile } = require('~/server/services/Files/process');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const appConfig = req.config;
    filterFile({ req, file: req.file, image: true, isAvatar: true });
    const userId = req.user.id;
    const { manual } = req.body;
    const input = await fs.readFile(req.file.path);

    if (!userId) {
      throw new Error('User ID is undefined');
    }

    const desiredFormat = appConfig.imageOutputType;
    const resizedBuffer = await resizeAvatar({
      userId,
      input,
      desiredFormat,
    });

    const mimeType = `image/${desiredFormat}`;
    const url = await saveUserAvatar({
      userId,
      buffer: resizedBuffer,
      mimeType,
      isCustom: manual === 'true',
    });

    res.json({ url });
  } catch (error) {
    const message = 'An error occurred while uploading the profile picture';
    logger.error(message, error);
    res.status(500).json({ message });
  } finally {
    try {
      await fs.unlink(req.file.path);
      logger.debug('[/files/images/avatar] Temp. image upload file deleted');
    } catch {
      logger.debug('[/files/images/avatar] Temp. image upload file already deleted');
    }
  }
});

module.exports = router;
