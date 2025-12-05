import ContentItemModel, { ContentItem } from "@/models/ContentItem";
import { connectToDatabase } from "@/lib/db";

export type ContentOperationType = "script" | "image" | "video" | "sentiment";

export async function saveContentItem(data: {
  type: ContentOperationType;
  prompt: string;
  metadata?: Record<string, unknown>;
  result?: Record<string, unknown>;
  status?: "pending" | "processing" | "completed" | "failed";
  n8nTaskId?: string;
  error?: string;
}) {
  await connectToDatabase();
  const doc = await ContentItemModel.create({
    ...data,
    status: data.status ?? "completed",
  });
  return doc.toObject() as ContentItem;
}

export async function updateContentItem(
  id: string,
  update: Partial<ContentItem>
) {
  await connectToDatabase();
  const doc = await ContentItemModel.findByIdAndUpdate(id, update, {
    new: true,
  });
  return doc ? (doc.toObject() as ContentItem) : null;
}

export async function getRecentContent(limit = 20) {
  await connectToDatabase();
  const docs = await ContentItemModel.find()
    .sort({ createdAt: -1 })
    .limit(limit);
  return docs.map((doc) => doc.toObject() as ContentItem);
}
