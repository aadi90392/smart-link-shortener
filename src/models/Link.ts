import mongoose, { Schema, Document } from 'mongoose';

export interface ILink extends Document {
  originalUrl: string;
  shortId: string; 
  userId: mongoose.Types.ObjectId; 
  clicks: number; 
}

const LinkSchema = new Schema<ILink>({
  originalUrl: { type: String, required: true },
  shortId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clicks: { type: Number, default: 0 }
}, { timestamps: true });

export const Link = mongoose.model<ILink>('Link', LinkSchema);