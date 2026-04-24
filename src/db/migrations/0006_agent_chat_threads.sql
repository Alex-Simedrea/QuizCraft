CREATE TABLE "quiz_edit_agent_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_chats" ADD CONSTRAINT "quiz_edit_agent_chats_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_chats" ADD CONSTRAINT "quiz_edit_agent_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_chats_quiz_id_idx" ON "quiz_edit_agent_chats" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_chats_user_quiz_updated_at_idx" ON "quiz_edit_agent_chats" USING btree ("user_id","quiz_id","updated_at");--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_messages" ADD COLUMN "chat_id" uuid;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_undos" ADD COLUMN "chat_id" uuid;--> statement-breakpoint
INSERT INTO "quiz_edit_agent_chats" ("quiz_id", "user_id", "title", "created_at", "updated_at")
SELECT "quiz_id", "user_id", 'Chat 1', min("created_at"), now()
FROM (
	SELECT "quiz_id", "user_id", "created_at" FROM "quiz_edit_agent_messages"
	UNION ALL
	SELECT "quiz_id", "user_id", "created_at" FROM "quiz_edit_agent_undos"
) "agent_history"
GROUP BY "quiz_id", "user_id";--> statement-breakpoint
UPDATE "quiz_edit_agent_messages"
SET "chat_id" = "quiz_edit_agent_chats"."id"
FROM "quiz_edit_agent_chats"
WHERE "quiz_edit_agent_messages"."quiz_id" = "quiz_edit_agent_chats"."quiz_id"
	AND "quiz_edit_agent_messages"."user_id" = "quiz_edit_agent_chats"."user_id";--> statement-breakpoint
UPDATE "quiz_edit_agent_undos"
SET "chat_id" = "quiz_edit_agent_chats"."id"
FROM "quiz_edit_agent_chats"
WHERE "quiz_edit_agent_undos"."quiz_id" = "quiz_edit_agent_chats"."quiz_id"
	AND "quiz_edit_agent_undos"."user_id" = "quiz_edit_agent_chats"."user_id";--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_messages" ALTER COLUMN "chat_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_undos" ALTER COLUMN "chat_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_messages" ADD CONSTRAINT "quiz_edit_agent_messages_chat_id_quiz_edit_agent_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."quiz_edit_agent_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_edit_agent_undos" ADD CONSTRAINT "quiz_edit_agent_undos_chat_id_quiz_edit_agent_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."quiz_edit_agent_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_messages_chat_created_at_idx" ON "quiz_edit_agent_messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "quiz_edit_agent_undos_chat_message_idx" ON "quiz_edit_agent_undos" USING btree ("chat_id","message_id");
