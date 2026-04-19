ALTER TABLE "users" ADD COLUMN "first_name" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(80);--> statement-breakpoint
UPDATE "users"
SET
  "first_name" = COALESCE(NULLIF(split_part("name", ' ', 1), ''), "name"),
  "last_name" = COALESCE(
    NULLIF(trim(substring("name" from length(split_part("name", ' ', 1)) + 1)), ''),
    COALESCE(NULLIF(split_part("name", ' ', 1), ''), "name")
  );--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;
