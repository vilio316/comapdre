import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3) {
    const endpoint = process.env.CLOUDFLARE_API_BASE_URL;
    const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("Cloudflare R2 credentials not configured");
    }

    s3 = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return s3;
}

export async function deleteObjectFromR2(key: string) {
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: "compadre-bucket-one",
      Key: key,
    }),
  );

  return { key };
}

export async function uploadToR2(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  tags?: string[],
) {
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: "compadre-bucket-one",
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      Metadata: tags ? { tags: JSON.stringify(tags) } : undefined,
    }),
  );

  return { key: fileName };
}

export async function listObjectsInBucket() {
  const client = getS3Client();

  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: "compadre-bucket-one",
    }),
  );

  return (result.Contents ?? []).map((obj) => ({
    name: obj.Key ?? "unknown",
    size: obj.Size ?? 0,
    uploaded: obj.LastModified ?? new Date(),
  }));
}

export async function getObjectSignedUrl(key: string) {
  const client = getS3Client();

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: "compadre-bucket-one",
      Key: key,
    }),
    { expiresIn: 3600 },
  );

  return url;
}
