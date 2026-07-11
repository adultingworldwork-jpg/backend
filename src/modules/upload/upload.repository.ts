import { Upload } from "./upload.model";
import { UploadPurpose } from "./upload.schema";

export class UploadRepository {
  async create(data: {
    ownerId?: string;
    purpose: UploadPurpose;
    originalName: string;
    mimeType: string;
    size: number;
    publicId: string;
    url: string;
    resourceType: string;
  }) {
    return Upload.create(data);
  }

  async findById(id: string) {
    return Upload.findById(id).lean();
  }

  async deleteById(id: string) {
    return Upload.findByIdAndDelete(id).lean();
  }
}
