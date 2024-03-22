all:
	docker-compose -f ./srcs/docker-compose.yml up --build --detach

debug:
	docker-compose -f ./srcs/docker-compose.yml up --build #--detach

down:
	docker-compose -f ./srcs/docker-compose.yml down

re: down
	docker-compose -f ./srcs/docker-compose.yml up --build --detach

clean: down
	docker system prune -a

fclean:
	docker-compose -f ./srcs/docker-compose.yml down -v
	docker system prune --all --force --volumes

linux:
	docker compose -f ./srcs/docker-compose.yml up --build --detach

linux-debug:
	docker compose -f ./srcs/docker-compose.yml up --build

linux-fclean:
	docker compose -f ./srcs/docker-compose.yml down -v
	docker system prune --all --force --volumes


.PHONY: all down re clean
