ALTER TABLE "quiz_attempts" ADD COLUMN "status" varchar(24) DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD COLUMN "error_message" text;--> statement-breakpoint
CREATE TABLE "quiz_attempt_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by" varchar(160),
	"last_heartbeat_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_attempt_jobs" ADD CONSTRAINT "quiz_attempt_jobs_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_jobs" ADD CONSTRAINT "quiz_attempt_jobs_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_jobs" ADD CONSTRAINT "quiz_attempt_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempt_jobs_attempt_id_unique_idx" ON "quiz_attempt_jobs" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "quiz_attempt_jobs_status_idx" ON "quiz_attempt_jobs" USING btree ("status");
