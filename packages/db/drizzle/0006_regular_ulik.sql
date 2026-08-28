ALTER TABLE "courses" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT c.id
    FROM courses c
    LEFT JOIN enrollments e ON e.course_id = c.id AND e.role = 'owner'
    GROUP BY c.id
    HAVING count(e.user_id) <> 1
  ) THEN
    RAISE EXCEPTION 'Every course must have exactly one owner enrollment before backfill';
  END IF;
END $$;--> statement-breakpoint
UPDATE courses c
SET owner_user_id = e.user_id
FROM enrollments e
WHERE e.course_id = c.id AND e.role = 'owner';--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
