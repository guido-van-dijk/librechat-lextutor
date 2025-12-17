export const DEFAULT_AVATAR_MIME = 'image/png';

/**
 * Converts an avatar value that might be a Buffer or string to a data URI string.
 * If the value is already a string, it is returned as-is.
 */
export const bufferToDataUri = (
  avatar: Buffer | string | undefined | null,
  mimeType?: string,
): string | undefined => {
  if (avatar == null) {
    return undefined;
  }

  if (typeof avatar === 'string') {
    return avatar;
  }

  if (Buffer.isBuffer(avatar)) {
    const type = mimeType || DEFAULT_AVATAR_MIME;
    return `data:${type};base64,${avatar.toString('base64')}`;
  }

  return undefined;
};
