dev:
	docker compose --profile dev up --build

dev-d:
	docker compose --profile dev up --build -d

dev-down:
	docker compose --profile dev down

prod:
	docker compose --profile prod up --build -d

prod-down:
	docker compose --profile prod down

logs-dev:
	docker compose --profile dev logs -f

logs-prod:
	docker compose --profile prod logs -f
