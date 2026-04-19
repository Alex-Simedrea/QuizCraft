CREATE TABLE "quiz_generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"status" varchar(24) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by" varchar(160),
	"last_heartbeat_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_generation_jobs" ADD CONSTRAINT "quiz_generation_jobs_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_generation_jobs_quiz_id_unique_idx" ON "quiz_generation_jobs" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_generation_jobs_status_idx" ON "quiz_generation_jobs" USING btree ("status");
