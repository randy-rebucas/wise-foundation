export const MAX_GALLERY_IMAGES = 12;
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_UPLOAD_BATCH = MAX_GALLERY_IMAGES;
export {
  IMAGE_UPLOAD_ACCEPT_WITH_EXTENSIONS as IMAGE_UPLOAD_ACCEPT,
} from "@/lib/utils/imageFileAccept";

/** Default upload root folder segment (server uses `getUploadRootFolder()` from env). */
export { UPLOAD_CLIENT_SLUG as UPLOAD_ROOT_SLUG } from "@/lib/constants/uploads";
