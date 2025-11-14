import { Schema, model, models, InferSchemaType } from "mongoose";

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
      enum: ["pending", "completed", "failed"],
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
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret._id = ret._id.toString();
  },
});

ContentItemSchema.set("toObject", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret._id = ret._id.toString();
  },
});

export type ContentItem = InferSchemaType<typeof ContentItemSchema> & {
  _id: string;
  id: string;
};

const ContentItemModel =
  models.ContentItem || model("ContentItem", ContentItemSchema);

export default ContentItemModel;
