import { sql } from "drizzle-orm";
import type { LumiDb } from "@lumi/db";
import { decryptKey } from "@lumi/db";
import type { LiteLlmConfig } from "@lumi/llm";

/**
 * Read the per-course model override stored in course_generation_usage.limits.model.
 * Returns undefined when no override is set, letting the LLM client use its default.
 */
export const getCourseModel = async (db: LumiDb, courseId: string): Promise<string | undefined> => {
  const result = await db.execute<{ model: string | null }>(sql`
    select limits->>'model' as model
    from course_generation_usage
    where course_id = ${courseId}
  `);
  return result.rows[0]?.model ?? undefined;
};

/**
 * Map a LiteLLM model_name to a provider key.
 * e.g. "groq-gpt-5.5" → "groq", "codex-gpt-5.5" → "codex"
 */
const modelToProvider = (model: string): string | undefined => {
  const prefix = model.split("-")[0] ?? "";
  const knownProviders = ["groq", "codex", "moonshot", "gemini", "claude", "openrouter"];
  return knownProviders.includes(prefix) ? prefix : undefined;
};

/**
 * For a given courseId, look up the course owner's stored API key for the selected provider.
 * Returns a full LiteLlmConfig with the user's key if found, or undefined to fall back to env vars.
 */
export const getCourseLlmConfig = async (
  db: LumiDb,
  courseId: string,
  globalConfig: LiteLlmConfig,
): Promise<{ config: LiteLlmConfig; model: string | undefined }> => {
  const model = await getCourseModel(db, courseId);
  if (!model) return { config: globalConfig, model: undefined };

  const provider = modelToProvider(model);
  if (!provider) return { config: globalConfig, model };

  // Find the course owner's API key for this provider
  const result = await db.execute<{ encrypted_key: string }>(sql`
    select pk.encrypted_key
    from provider_keys pk
    join courses c on c.owner_user_id = pk.user_id
    where c.id = ${courseId} and pk.provider = ${provider}
    limit 1
  `);

  const encrypted = result.rows[0]?.encrypted_key;
  if (!encrypted) return { config: globalConfig, model };

  // Decrypt the key and build a per-course config
  try {
    const apiKey = decryptKey(encrypted, globalConfig.apiKey);
    return {
      config: { ...globalConfig, apiKey },
      model,
    };
  } catch {
    // Decryption failed — fall back to env config
    return { config: globalConfig, model };
  }
};
