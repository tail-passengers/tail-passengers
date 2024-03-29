all:
	docker-compose -f ./docker-compose.yml up --build --detach

down:
	docker-compose -f ./docker-compose.yml down

re: down
	docker-compose -f ./docker-compose.yml up --build --detach

clean: down
	docker system prune -a

fclean:
	docker-compose -f ./docker-compose.yml down -v
	docker system prune --all --force --volumes


.PHONY: all down re clean