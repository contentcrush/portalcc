CREATE TYPE "public"."account_type" AS ENUM('corrente', 'poupanca', 'investimento', 'pagamento');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('pf', 'pj');--> statement-breakpoint
CREATE TABLE "client_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"type" text,
	"category" text,
	"cnpj" text,
	"website" text,
	"contact_name" text,
	"contact_position" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"city" text,
	"since" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"client_id" integer,
	"task_id" integer,
	"type" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"all_day" boolean DEFAULT false,
	"location" text,
	"color" text,
	"creation_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" timestamp NOT NULL,
	"paid_by" integer,
	"reimbursement" boolean DEFAULT false,
	"receipt" text,
	"approved" boolean DEFAULT false,
	"creation_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"client_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text,
	"amount" double precision NOT NULL,
	"due_date" timestamp,
	"paid" boolean DEFAULT false,
	"payment_date" timestamp,
	"status" text DEFAULT 'pending',
	"creation_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text
);
--> statement-breakpoint
CREATE TABLE "project_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"completed" boolean DEFAULT false,
	"completion_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"client_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"budget" double precision,
	"start_date" timestamp,
	"end_date" timestamp,
	"progress" integer DEFAULT 0,
	"thumbnail" text,
	"creation_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"revoked" boolean DEFAULT false,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "task_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
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
CREATE TABLE "task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"creation_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_id" integer,
	"assigned_to" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium',
	"due_date" timestamp,
	"start_date" timestamp,
	"estimated_hours" double precision,
	"completed" boolean DEFAULT false,
	"completion_date" timestamp,
	"creation_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"department" text,
	"position" text,
	"bio" text,
	"avatar" text,
	"user_type" "user_type",
	"document" text,
	"phone" text,
	"mobile_phone" text,
	"website" text,
	"address" text,
	"area" text,
	"contact_name" text,
	"contact_position" text,
	"contact_email" text,
	"bank" text,
	"bank_agency" text,
	"bank_account" text,
	"account_type" "account_type",
	"pix_key" text,
	"notes" text,
	"permissions" json DEFAULT '[]'::json,
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;