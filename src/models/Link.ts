import mongoose, { Schema, Document } from 'mongoose';

export interface ILink extends Document {
  originalUrl: string;
  shortId: string; 
  customAlias?: string; 
  userId: mongoose.Types.ObjectId; 
  clicks: number; 
  isActive: boolean;
  expiresAt?: Date; 
  createdAt: Date;
  updatedAt: Date;
}

const LinkSchema = new Schema<ILink>({
  originalUrl: { type: String, required: true },
  shortId: { type: String, required: true, unique: true },
  customAlias: { type: String, unique: true, sparse: true }, 
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clicks: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date }
}, { timestamps: true });

LinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Link = mongoose.model<ILink>('Link', LinkSchema);