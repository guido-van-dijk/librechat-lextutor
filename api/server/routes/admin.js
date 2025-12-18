const express = require('express');
const { CacheKeys } = require('librechat-data-provider');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const checkAdmin = require('~/server/middleware/roles/admin');
const { getBrandingConfig, upsertBrandingConfig } = require('~/models/Branding');
const getLogStores = require('~/cache/getLogStores');

const router = express.Router();

const MAX_LOGO_LENGTH = 1024 * 1024; // ~1MB string length limit
const MAX_FOOTER_LENGTH = 2000;
const MAX_TITLE_LENGTH = 80;
const MAX_URL_LENGTH = 512;

const defaults = () => ({
  appTitle: process.env.APP_TITLE || 'LibreChat',
  logoDataUri: '',
  helpUrl: process.env.HELP_AND_FAQ_URL || 'https://librechat.ai',
  customFooter: typeof process.env.CUSTOM_FOOTER === 'string' ? process.env.CUSTOM_FOOTER : '',
});

const formatResponse = (branding) => {
  const base = defaults();
  if (!branding) {
    return base;
  }

  return {
    ...base,
    appTitle: branding.appTitle ?? base.appTitle,
    logoDataUri: branding.logoDataUri ?? base.logoDataUri,
    helpUrl: branding.helpUrl ?? base.helpUrl,
    customFooter: branding.customFooter ?? base.customFooter,
  };
};

router.use(requireJwtAuth);
router.use(checkAdmin);

router.get('/branding', async (_req, res) => {
  try {
    const branding = await getBrandingConfig();
    res.json(formatResponse(branding));
  } catch (error) {
    logger.error('[admin.branding] Failed to fetch branding config', error);
    res.status(500).json({ message: 'Failed to fetch branding configuration' });
  }
});

router.put('/branding', async (req, res) => {
  try {
    const { appTitle, logoDataUri, helpUrl, customFooter } = req.body ?? {};

    const payload = {};

    if (typeof appTitle === 'string') {
      payload.appTitle = appTitle.trim().slice(0, MAX_TITLE_LENGTH);
    }

    if (typeof helpUrl === 'string') {
      payload.helpUrl = helpUrl.trim().slice(0, MAX_URL_LENGTH);
    }

    if (typeof customFooter === 'string') {
      payload.customFooter = customFooter.slice(0, MAX_FOOTER_LENGTH);
    }

    if (typeof logoDataUri === 'string') {
      if (logoDataUri.length > MAX_LOGO_LENGTH) {
        return res.status(400).json({ message: 'Logo is too large' });
      }
      if (logoDataUri && !logoDataUri.startsWith('data:image')) {
        return res.status(400).json({ message: 'Logo must be a valid data URL' });
      }
      payload.logoDataUri = logoDataUri;
    }

    payload.updatedBy = req.user.id;

    const branding = await upsertBrandingConfig(payload);

    const cache = getLogStores(CacheKeys.CONFIG_STORE);
    await cache.delete(CacheKeys.STARTUP_CONFIG);

    res.json(formatResponse(branding));
  } catch (error) {
    logger.error('[admin.branding] Failed to update branding config', error);
    res.status(500).json({ message: 'Failed to update branding configuration' });
  }
});

module.exports = router;
