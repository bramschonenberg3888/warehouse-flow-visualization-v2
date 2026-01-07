CREATE TYPE "public"."element_category" AS ENUM('racking', 'lane', 'area', 'equipment', 'custom');--> statement-breakpoint
CREATE TABLE "element_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "element_category" NOT NULL,
	"excalidraw_data" jsonb,
	"icon" text NOT NULL,
	"default_width" integer DEFAULT 100 NOT NULL,
	"default_height" integer DEFAULT 100 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"element_sequence" jsonb NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"canvas_state" jsonb,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placed_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"element_template_id" uuid NOT NULL,
	"excalidraw_id" text NOT NULL,
	"label" text,
	"position_x" real NOT NULL,
	"position_y" real NOT NULL,
	"width" real NOT NULL,
	"height" real NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placed_elements" ADD CONSTRAINT "placed_elements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placed_elements" ADD CONSTRAINT "placed_elements_element_template_id_element_templates_id_fk" FOREIGN KEY ("element_template_id") REFERENCES "public"."element_templates"("id") ON DELETE restrict ON UPDATE no action;