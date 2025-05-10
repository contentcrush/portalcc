CREATE TYPE "public"."accent_color" AS ENUM('blue', 'green', 'purple', 'orange', 'red', 'pink');--> statement-breakpoint
CREATE TYPE "public"."theme_type" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."view_mode" AS ENUM('grid', 'list', 'table');--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"email" text,
	"phone" text,
	"is_primary" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction_type" text DEFAULT 'like' NOT NULL,
	"creation_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"file_type" text,
	"file_url" text NOT NULL,
	"uploaded_by" integer,
	"upload_date" timestamp DEFAULT now(),
	"encrypted" boolean DEFAULT false,
	"encryption_iv" text,
	"encryption_key_id" text
);
--> statement-breakpoint
CREATE TABLE "project_comment_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction_type" text DEFAULT 'like' NOT NULL,
	"creation_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"parent_id" integer,
	"creation_date" timestamp DEFAULT now(),
	"edited" boolean DEFAULT false,
	"edit_date" timestamp,
	"deleted" boolean DEFAULT false,
	"delete_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"theme" "theme_type" DEFAULT 'light',
	"accent_color" "accent_color" DEFAULT 'blue',
	"clients_view_mode" "view_mode" DEFAULT 'grid',
	"sidebar_collapsed" boolean DEFAULT false,
	"dashboard_widgets" json DEFAULT '["tasks","projects","clients"]'::json,
	"quick_actions" json DEFAULT '["new-task","new-project","new-client"]'::json,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "logo" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "segments" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "financial_document_id" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "expense_id" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "paid" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "payment_notes" text;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "payment_term" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "task_comments" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "task_comments" ADD COLUMN "edited" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "task_comments" ADD COLUMN "edit_date" timestamp;--> statement-breakpoint
ALTER TABLE "task_comments" ADD COLUMN "deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "task_comments" ADD COLUMN "delete_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'America/Sao_Paulo';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;