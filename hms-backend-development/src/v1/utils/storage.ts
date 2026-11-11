import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

const client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}
export interface StorageProvider {
    put(key: string, body: Buffer, opts?: any): Promise<any>;
    get(key: string): Promise<Buffer | null>;
    del(key: string): Promise<void>;
    getSignedUrl(key: string, opts?: any): Promise<string>;
    getUploadSignedUrl(key: string, opts?: any): Promise<string>;
}
export const storage: StorageProvider = {
    async put(key: string, body: Buffer | Uint8Array | string, opts?: { contentType?: string }) {
        await client.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: body,
                ContentType: opts?.contentType,
            }),
        );

        return { key };
    },

    async get(key: string) {
        const res = await client.send(
            new GetObjectCommand({
                Bucket: BUCKET,
                Key: key,
            }),
        );

        if (!res.Body) return null;
        return streamToBuffer(res.Body as Readable);
    },

    async del(key: string) {
        await client.send(
            new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: key,
            }),
        );
    },

    async getSignedUrl(key: string, opts?: { expiresIn?: number }) {
        const cmd = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });

        return getSignedUrl(client, cmd, {
            expiresIn: opts?.expiresIn ?? 300,
        });
    },

    async getUploadSignedUrl(key: string, opts?: { expiresIn?: number; contentType?: string }) {
        const cmd = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: opts?.contentType,
        });

        return getSignedUrl(client, cmd, {
            expiresIn: opts?.expiresIn ?? 300,
        });
    },
};
