import { Schema } from 'mongoose';
import type { IBranding } from '~/types';

const brandingSchema = new Schema<IBranding>(
  {
    appTitle: {
      type: String,
      default: '',
      trim: true,
    },
    logoDataUri: {
      type: String,
      default: '',
    },
    helpUrl: {
      type: String,
      default: '',
      trim: true,
    },
    customFooter: {
      type: String,
      default: '',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

export default brandingSchema;
