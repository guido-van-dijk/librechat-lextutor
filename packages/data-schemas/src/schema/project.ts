import { Schema, Document, Types } from 'mongoose';

export interface IMongoProject extends Document {
  name: string;
  promptGroupIds: Types.ObjectId[];
  agentIds: string[];
  owner?: Types.ObjectId | null;
  description?: string;
  color?: string;
  icon?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const projectSchema = new Schema<IMongoProject>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    promptGroupIds: {
      type: [Schema.Types.ObjectId],
      ref: 'PromptGroup',
      default: [],
    },
    agentIds: {
      type: [String],
      ref: 'Agent',
      default: [],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#6366F1',
    },
    icon: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

projectSchema.index(
  { owner: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { owner: { $exists: true } },
  },
);

export default projectSchema;
