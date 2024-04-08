all:
	docker-compose -f ./docker-compose.yml up --build --detach

debug:
	docker-compose -f ./docker-compose.yml up --build #--detach

down:
	docker-compose -f ./docker-compose.yml down

re: fclean all
	
clean: down
	docker system prune -a

fclean: clean
	docker-compose -f ./docker-compose.yml down -v
	docker system prune --all --force --volumes

linux:
	docker compose -f ./docker-compose.yml up --build --detach

linux-debug:
	docker compose -f ./docker-compose.yml up --build

linux-fclean:
	docker compose -f ./docker-compose.yml down -v
	docker system prune --all --force --volumes


.PHONY: all down re clean
