export type ContentKind = "script" | "image" | "video" | "sentiment";

export type ContentStatus = "pending" | "processing" | "completed" | "failed";

export type VideoScene = {
  text: string;
  searchTerms: string[];
};

export type VideoConfig = {
  paddingBack?: number;
  music?: string;
  voice?: string;
  captionPosition?: "top" | "center" | "bottom";
  captionBackgroundColor?: string;
  orientation?: "portrait" | "landscape";
};

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
  // Video fields
  videoId?: string;
  videoUrl?: string;
  videoStatus?: "pending" | "processing" | "ready" | "error";
  videoDuration?: number;
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
