CREATE TABLE "quiz_edit_agent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	"content" text NOT NULL,
	"references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operation_summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_edit_agent_undos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message_id" uuid,
	"before_title" varchar(160) NOT NULL,
	"before_draft_snapshot" jsonb NOT NULL,
	"before_generated_sections" jsonb NOT NULL,
	"result_content_hash" varchar(64) NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_messages" ADD CONSTRAINT "quiz_edit_agent_messages_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_messages" ADD CONSTRAINT "quiz_edit_agent_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_undos" ADD CONSTRAINT "quiz_edit_agent_undos_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_undos" ADD CONSTRAINT "quiz_edit_agent_undos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_undos" ADD CONSTRAINT "quiz_edit_agent_undos_message_id_quiz_edit_agent_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."quiz_edit_agent_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_messages_quiz_id_idx" ON "quiz_edit_agent_messages" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_messages_user_quiz_created_at_idx" ON "quiz_edit_agent_messages" USING btree ("user_id","quiz_id","created_at");--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_undos_quiz_id_idx" ON "quiz_edit_agent_undos" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_undos_user_quiz_used_created_idx" ON "quiz_edit_agent_undos" USING btree ("user_id","quiz_id","used_at","created_at");
