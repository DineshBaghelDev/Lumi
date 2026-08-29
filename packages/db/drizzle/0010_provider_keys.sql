-- Provider API keys — users can configure their own keys through the UI
CREATE TABLE "provider_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "provider" text NOT NULL,
  "encrypted_key" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "provider_keys_user_provider_unique" UNIQUE ("user_id", "provider")
);

CREATE INDEX "provider_keys_user_idx" ON "provider_keys" ("user_id");
