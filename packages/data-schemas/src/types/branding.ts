import type { Document, Types } from 'mongoose';

export interface IBranding extends Document {
  appTitle?: string;
  logoDataUri?: string;
  helpUrl?: string;
  customFooter?: string;
  updatedBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
