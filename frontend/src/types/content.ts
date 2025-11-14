export type ContentKind = "script" | "image" | "video" | "sentiment";

export type ContentStatus = "pending" | "completed" | "failed";

export type ContentResult = {
  text?: string;
  summary?: string;
  output?: string;
  description?: string;
  category?: string;
  feelings?: string;
  imageUrl?: string;
  imageData?: string;
  imageType?: string;
  imageBase64?: string;
  imageMimeType?: string;
  sentiment?: string;
  score?: number;
  [key: string]: unknown;
};

export type ContentHistoryItem = {
  _id: string;
  id?: string;
  type: ContentKind;
  prompt: string;
  metadata?: Record<string, unknown>;
  result?: ContentResult;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};
