import { Schema, model, models, InferSchemaType, Document } from "mongoose";

const ContentItemSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["script", "image", "video", "sentiment"],
      required: true,
    },
    prompt: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed, default: {} },
    n8nTaskId: { type: String },
    error: { type: String },
  },
  {
    timestamps: true,
  }
);

ContentItemSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    ret._id = String(ret._id);
  },
});

ContentItemSchema.set("toObject", {
  virtuals: true,
  versionKey: false,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    ret._id = String(ret._id);
  },
});

export type ContentItem = InferSchemaType<typeof ContentItemSchema> & {
  _id: string;
  id: string;
};

const ContentItemModel =
  models.ContentItem || model("ContentItem", ContentItemSchema);

export default ContentItemModel;
