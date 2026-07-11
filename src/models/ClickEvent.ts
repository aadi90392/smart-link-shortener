import mongoose, { Schema, Document } from 'mongoose';

export interface IClickEvent extends Document {
  linkId: mongoose.Types.ObjectId;
  timestamp: Date;
  referrer: string;
  userAgent: string;
  ipHash: string; 
  country?: string;
}

const ClickEventSchema = new Schema<IClickEvent>({
  linkId: { type: Schema.Types.ObjectId, ref: 'Link', required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  referrer: { type: String, default: 'Direct' },
  userAgent: { type: String, default: 'Unknown' },
  ipHash: { type: String, required: true },
  country: { type: String }
});

export const ClickEvent = mongoose.model<IClickEvent>('ClickEvent', ClickEventSchema);