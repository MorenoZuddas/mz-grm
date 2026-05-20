import 'server-only';

import type { EquipmentItem } from '@/components/EquipmentPage';

type EquipmentJsonItem = Omit<EquipmentItem, 'condition'> & {
  condition: string;
};

function normalizeCondition(value: string): EquipmentItem['condition'] {
  if (value === 'Nuovo' || value === 'Buono' || value === 'Usurato') {
    return value;
  }

  return 'Buono';
}

interface CloudinaryResource {
  public_id?: string;
  secure_url?: string;
  metadata?: Record<string, string | number | undefined>;
}

interface CloudinaryEquipmentMeta {
  publicId: string;
  image?: string;
  productDescription?: string;
  productUrl?: string;
}

function getCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}

function metadataValue(metadata: Record<string, string | number | undefined>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = asString(metadata[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function extractPublicIdFromCloudinaryUrl(imageUrl: string, cloudName: string): string | null {
  const marker = `/res.cloudinary.com/${cloudName}/image/upload/`;
  if (!imageUrl.includes(marker)) {
    return null;
  }

  try {
    const url = new URL(imageUrl);
    const uploadPath = url.pathname.split(`/image/upload/`)[1];
    if (!uploadPath) {
      return null;
    }

    const segments = uploadPath.split('/').filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));

    // URL Cloudinary standard: .../upload/<transform>/v123/folder/name.ext
    const publicIdSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
    if (publicIdSegments.length === 0) {
      return null;
    }

    const last = publicIdSegments[publicIdSegments.length - 1];
    publicIdSegments[publicIdSegments.length - 1] = last.replace(/\.[a-zA-Z0-9]+$/, '');

    const publicId = publicIdSegments.join('/');
    return publicId || null;
  } catch {
    return null;
  }
}

async function fetchSingleResourceMetadata(
  publicId: string,
  env: { cloudName: string; apiKey: string; apiSecret: string },
): Promise<CloudinaryEquipmentMeta | null> {
  const auth = Buffer.from(`${env.apiKey}:${env.apiSecret}`).toString('base64');
  const url = `https://api.cloudinary.com/v1_1/${env.cloudName}/resources/image/upload/${encodeURIComponent(publicId)}?metadata=true`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[cloudinary:equipment] Resource fetch failed for ${publicId}`, response.status);
      return null;
    }

    const resource = (await response.json()) as CloudinaryResource;
    const metadata = resource.metadata ?? {};

    const productDescription = metadataValue(metadata, [
      'productDescription',
      'productdescription',
      'product_description',
    ]);
    const productUrl = metadataValue(metadata, [
      'productUrl',
      'producturl',
      'product_url',
      'officialUrl',
      'officialurl',
      'official_url',
    ]);

    return {
      publicId,
      image: resource.secure_url,
      productDescription,
      productUrl,
    };
  } catch (error) {
    console.error(`[cloudinary:equipment] Error fetching ${publicId}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function fetchCloudinaryMetadataByPublicId(publicIds: string[]): Promise<Map<string, CloudinaryEquipmentMeta>> {
  const env = getCloudinaryEnv();
  if (!env || publicIds.length === 0) {
    return new Map();
  }

  const results = await Promise.all(publicIds.map((id) => fetchSingleResourceMetadata(id, env)));
  const byPublicId = new Map<string, CloudinaryEquipmentMeta>();

  for (const result of results) {
    if (result) {
      byPublicId.set(result.publicId, result);
    }
  }

  return byPublicId;
}

export async function hydrateEquipmentFromCloudinary(baseItems: EquipmentJsonItem[]): Promise<EquipmentItem[]> {
  const env = getCloudinaryEnv();
  const cloudName = env?.cloudName ?? '';

  const cloudinaryPublicIds = Array.from(
    new Set(
      baseItems
        .map((item) => (item.image && cloudName ? extractPublicIdFromCloudinaryUrl(item.image, cloudName) : null))
        .filter((value): value is string => Boolean(value))
    )
  );

  const cloudinaryByPublicId = await fetchCloudinaryMetadataByPublicId(cloudinaryPublicIds);

  return baseItems.map((item) => {
    const normalizedCondition = normalizeCondition(item.condition);
    const publicId = item.image && cloudName ? extractPublicIdFromCloudinaryUrl(item.image, cloudName) : null;
    const cloud = publicId ? cloudinaryByPublicId.get(publicId) : undefined;

    if (!cloud) {
      return {
        ...item,
        condition: normalizedCondition,
      };
    }

    return {
      ...item,
      condition: normalizedCondition,
      image: cloud.image || item.image,
      productDescription: cloud.productDescription || item.productDescription,
      productUrl: cloud.productUrl || item.productUrl || item.url,
    };
  });
}







