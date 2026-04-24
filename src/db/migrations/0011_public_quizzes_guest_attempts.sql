ALTER TABLE "quizzes" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD COLUMN "guest_name" varchar(120);--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD COLUMN "guest_access_token_hash" text;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD COLUMN "guest_result_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quiz_attempt_jobs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "quiz_attempts_guest_access_token_hash_idx" ON "quiz_attempts" USING btree ("guest_access_token_hash");
