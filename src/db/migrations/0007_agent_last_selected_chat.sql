ALTER TABLE "quiz_edit_agent_chats" ADD COLUMN "last_selected_at" timestamp with time zone;--> statement-breakpoint
UPDATE "quiz_edit_agent_chats"
SET "last_selected_at" = "updated_at"
WHERE "last_selected_at" IS NULL;--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_chats_user_quiz_last_selected_at_idx" ON "quiz_edit_agent_chats" USING btree ("user_id","quiz_id","last_selected_at");
