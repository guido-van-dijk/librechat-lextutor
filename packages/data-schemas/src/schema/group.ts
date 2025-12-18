import { Schema } from 'mongoose';
import type { IGroup } from '~/types';

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      index: true,
    },
    avatar: {
      type: String,
      required: false,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
    },
    members: [
      {
        _id: false,
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'editor', 'viewer'],
          default: 'viewer',
        },
      },
    ],
    memberIds: [
      {
        type: String,
        required: false,
      },
    ],
    source: {
      type: String,
      enum: ['local', 'entra'],
      default: 'local',
    },
    /** External ID (e.g., Entra ID) */
    idOnTheSource: {
      type: String,
      sparse: true,
      index: true,
      required: function (this: IGroup) {
        return this.source !== 'local';
      },
    },
  },
  { timestamps: true },
);

groupSchema.index(
  { idOnTheSource: 1, source: 1 },
  {
    unique: true,
    partialFilterExpression: { idOnTheSource: { $exists: true } },
  },
);
groupSchema.index({ memberIds: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ organizationId: 1 });

export default groupSchema;
