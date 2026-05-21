import { cloudinaryConfigured } from "@/lib/server/cloudinaryStorage";
import { buildImageUploadStatusPayload } from "@/lib/server/imageUploadStatus";
import { forbiddenResponse, successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";

const getHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") {
    return forbiddenResponse("Administrator access required");
  }

  try {
    const upload = await buildImageUploadStatusPayload();
    return successResponse({
      ...upload,
      env: {
        hasCloudinaryUrl: Boolean(process.env.CLOUDINARY_URL?.trim()),
        hasCloudName: Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim()),
        hasApiKey: Boolean(process.env.CLOUDINARY_API_KEY?.trim()),
        hasApiSecret: Boolean(process.env.CLOUDINARY_API_SECRET?.trim()),
        cloudinaryConfigured: cloudinaryConfigured(),
      },
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(getHandler);
