const { Branding } = require('~/db/models');

const BRANDING_PROJECTION = {
  __v: 0,
};

const sanitizeResult = (doc) => {
  if (!doc) {
    return null;
  }

  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const updatedBy =
    obj.updatedBy && typeof obj.updatedBy === 'object'
      ? obj.updatedBy.toString()
      : obj.updatedBy || undefined;
  return {
    id: obj._id?.toString(),
    appTitle: obj.appTitle || '',
    logoDataUri: obj.logoDataUri || '',
    helpUrl: obj.helpUrl || '',
    customFooter: obj.customFooter || '',
    updatedAt: obj.updatedAt,
    createdAt: obj.createdAt,
    updatedBy,
  };
};

const getBrandingConfig = async () => {
  const doc = await Branding.findOne({}, BRANDING_PROJECTION).lean();
  if (!doc) {
    return null;
  }
  return sanitizeResult(doc);
};

const upsertBrandingConfig = async (data) => {
  const updated = await Branding.findOneAndUpdate({}, data, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  return sanitizeResult(updated);
};

module.exports = {
  getBrandingConfig,
  upsertBrandingConfig,
};
