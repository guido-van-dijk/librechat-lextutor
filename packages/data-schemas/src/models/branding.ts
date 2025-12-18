import brandingSchema from '~/schema/branding';
import type { IBranding } from '~/types';

export function createBrandingModel(mongoose: typeof import('mongoose')) {
  return mongoose.models.Branding || mongoose.model<IBranding>('Branding', brandingSchema);
}
