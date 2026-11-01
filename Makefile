.PHONY: install dev build start deploy lint typecheck check test migrate migrate-sqlite migrate-from-sqlite migrate-media db db-stop setup-admin seed clean help

# Default target
help:
	@echo "Targets:"
	@echo "  install             Install dependencies"
	@echo "  dev                 Start the dev server"
	@echo "  build               Build for production"
	@echo "  start               Start the production server"
	@echo "  deploy             Build, push to origin main, and trigger a Render deploy"
	@echo "  lint                Run ESLint"
	@echo "  typecheck           Run TypeScript type checking"
	@echo "  check               Run lint + typecheck + tests"
	@echo "  test                Run tests (vitest)"
	@echo "  migrate             Run database migrations (Postgres)"
	@echo "  migrate-sqlite      Run SQLite migrations"
	@echo "  migrate-from-sqlite Migrate data from SQLite to Postgres"
	@echo "  migrate-media       Migrate media to Supabase"
	@echo "  setup-admin         Set up the admin account"
	@echo "  seed                Seed the database"
	@echo "  db                  Start the local Postgres container (port 55432)"
	@echo "  db-stop             Stop and remove the local Postgres container"
	@echo "  clean               Remove build artifacts"

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

# The Render service this repository deploys to (see render.yaml). The Render
# CLI must be installed and logged in (`render login`).
RENDER_SERVICE_ID ?= srv-dbc7nqjbc2fs73bj27c0

deploy:
	npm run build
	git push origin main
	render deploys create $(RENDER_SERVICE_ID) --confirm

lint:
	npm run lint

typecheck:
	npm run typecheck

check: lint typecheck test

test:
	npm test

# ---------------------------------------------------------------------------
# Local development database
#
# The same disposable Postgres container the test harness uses
# (see src/test/postgres.ts). The database scripts below fall back to it and
# start it when DATABASE_URL is not set; an explicitly configured
# DATABASE_URL always wins, e.g. the Supabase pooler string on a deployment.
# ---------------------------------------------------------------------------
LOCAL_DB_NAME := winnie-portfolio-test-pg
LOCAL_DB_PORT := 55432
LOCAL_DB_PASSWORD := portfolio_test_password
LOCAL_DB_IMAGE := postgres:16-alpine
LOCAL_DATABASE_URL := postgresql://postgres:$(LOCAL_DB_PASSWORD)@127.0.0.1:$(LOCAL_DB_PORT)/postgres?sslmode=disable

ifndef DATABASE_URL
LOCAL_DB_NEEDED := 1
export DATABASE_URL := $(LOCAL_DATABASE_URL)
endif

db:
	@docker inspect -f '{{.State.Running}}' $(LOCAL_DB_NAME) 2>/dev/null | grep -q true || \
	  docker run -d --rm --name $(LOCAL_DB_NAME) \
	    -e POSTGRES_PASSWORD=$(LOCAL_DB_PASSWORD) \
	    -e POSTGRES_DB=postgres \
	    -p $(LOCAL_DB_PORT):5432 \
	    $(LOCAL_DB_IMAGE)
	@docker exec $(LOCAL_DB_NAME) sh -c \
	  'for i in $$(seq 1 120); do pg_isready -U postgres -q && exit 0; sleep 0.5; done; \
	   echo "The local database did not become ready." >&2; exit 1'

db-stop:
	@docker rm -f $(LOCAL_DB_NAME) 2>/dev/null || true

migrate: $(if $(LOCAL_DB_NEEDED),db)
	npm run migrate

migrate-sqlite:
	npm run migrate:sqlite

migrate-from-sqlite: $(if $(LOCAL_DB_NEEDED),db)
	npm run migrate:from-sqlite

migrate-media:
	npm run migrate:media

setup-admin: $(if $(LOCAL_DB_NEEDED),db)
	npm run setup-admin

seed: $(if $(LOCAL_DB_NEEDED),db)
	npm run seed

clean:
	rm -rf .next tsconfig.tsbuildinfo
