ALTER TABLE "quiz_edit_agent_messages" ADD COLUMN "operation_details" jsonb DEFAULT '[]'::jsonb NOT NULL;
