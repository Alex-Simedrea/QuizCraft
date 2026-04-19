const RASTER_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const WEBP_MIME_TYPE = "image/webp";
const JPEG_MIME_TYPE = "image/jpeg";
const PNG_MIME_TYPE = "image/png";
const MAX_IMAGE_DIMENSION = 1600;
const TARGET_IMAGE_SIZE_BYTES = 900 * 1024;
const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.62] as const;

type PreparedImageSource = {
  image: CanvasImageSource;
  width: number;
  height: number;
  revoke: () => void;
};

export async function prepareContextResourceFile(file: File): Promise<File> {
  if (!RASTER_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  const source = await loadImageSource(file);

  try {
    const targetSize = getScaledDimensions(source.width, source.height);
    const needsResize =
      targetSize.width !== source.width || targetSize.height !== source.height;

    if (!needsResize && file.size <= TARGET_IMAGE_SIZE_BYTES) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(source.image, 0, 0, targetSize.width, targetSize.height);

    const variants = getExportVariants(file.type);
    let bestCandidate: Blob | null = null;

    for (const variant of variants) {
      for (const quality of variant.qualities) {
        const blob = await canvasToBlob(canvas, variant.type, quality);

        if (!blob) {
          continue;
        }

        if (!bestCandidate || blob.size < bestCandidate.size) {
          bestCandidate = blob;
        }

        if (blob.size <= TARGET_IMAGE_SIZE_BYTES) {
          return createPreparedFile(file, blob, variant.type);
        }
      }
    }

    if (!bestCandidate || bestCandidate.size >= file.size) {
      return file;
    }

    return createPreparedFile(file, bestCandidate, bestCandidate.type);
  } finally {
    source.revoke();
  }
}

async function loadImageSource(file: File): Promise<PreparedImageSource> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);

    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      revoke: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The selected image could not be processed."));
    image.src = src;
  });
}

function getScaledDimensions(width: number, height: number) {
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function getExportVariants(fileType: string) {
  if (fileType === PNG_MIME_TYPE) {
    return [
      { type: WEBP_MIME_TYPE, qualities: QUALITY_STEPS },
      { type: PNG_MIME_TYPE, qualities: [undefined] },
    ];
  }

  return [
    { type: WEBP_MIME_TYPE, qualities: QUALITY_STEPS },
    { type: JPEG_MIME_TYPE, qualities: QUALITY_STEPS },
  ];
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function createPreparedFile(originalFile: File, blob: Blob, type: string) {
  return new File([blob], getPreparedFileName(originalFile.name, type), {
    type,
    lastModified: originalFile.lastModified,
  });
}

function getPreparedFileName(name: string, type: string) {
  const extension = getExtensionForMimeType(type);
  const baseName = name.replace(/\.[^./\\]+$/, "");

  return `${baseName}.${extension}`;
}

function getExtensionForMimeType(type: string) {
  switch (type) {
    case WEBP_MIME_TYPE:
      return "webp";
    case JPEG_MIME_TYPE:
      return "jpg";
    case PNG_MIME_TYPE:
      return "png";
    default:
      return "bin";
  }
}
