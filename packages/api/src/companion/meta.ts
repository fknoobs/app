import { z } from 'zod';

const metaSchema = z
	.object({
		version: z.string().optional()
	})
	.passthrough();

export function readMetaVersion(meta: unknown): string | null {
	const parsed = metaSchema.safeParse(meta);
	if (!parsed.success) {
		return null;
	}

	const version = parsed.data.version;
	return typeof version === 'string' && version ? version : null;
}
