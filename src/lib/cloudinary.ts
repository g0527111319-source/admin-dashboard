import { v2 as cloudinary } from "cloudinary";

// Configure only if env vars are set
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

type UploadResult = {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
};

export async function uploadImage(
  fileBuffer: Buffer,
  folder: string = "zirat"
): Promise<UploadResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log("[Cloudinary Mock] Would upload to folder:", folder);
    return {
      success: true,
      url: "/placeholder-image.jpg",
      publicId: "mock-" + Date.now(),
    };
  }

  try {
    const result = await new Promise<UploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        }
      );
      uploadStream.end(fileBuffer);
    });

    return result;
  } catch (err) {
    console.error("[Cloudinary Error]", err);
    return { success: false, error: String(err) };
  }
}

export async function deleteImage(publicId: string): Promise<boolean> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log("[Cloudinary Mock] Would delete:", publicId);
    return true;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (err) {
    console.error("[Cloudinary Delete Error]", err);
    return false;
  }
}

export function getImageUrl(publicId: string, width?: number, height?: number): string {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return "/placeholder-image.jpg";
  }

  return cloudinary.url(publicId, {
    width: width || 400,
    height: height || 400,
    crop: "fill",
    gravity: "auto",
    quality: "auto",
    fetch_format: "auto",
  });
}
