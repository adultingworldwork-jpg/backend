/**
 * Framework storage abstraction.
 * Business modules and the Upload service depend on this interface only —
 * never on the Cloudinary SDK directly.
 */
export type StoragePurpose =
  | "blog_cover"
  | "book_cover"
  | "book_pdf"
  | "avatar"
  | "cover"
  | "general";

export interface StorageUploadInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  purpose?: StoragePurpose;
  folder?: string;
}

export interface StorageUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  mimeType: string;
  size: number;
  format?: string;
  resourceType: "image" | "raw" | "video" | "auto";
}

export interface StorageService {
  readonly configured: boolean;
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  delete(publicId: string, resourceType?: "image" | "raw" | "video"): Promise<void>;
}
