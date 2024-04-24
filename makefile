# .env 파일이 없으면 임시 .env 파일을 생성한다.
ifeq ($(wildcard .env),)
$(info Creating .env file...)
$(shell cp .env_sample .env)
endif

# frontend 디렉토리에 .env 파일이 없으면 임시 .env 파일을 생성한다.
ifeq ($(wildcard frontend/.env),)
$(info Creating .env file in the frontend directory...)
$(shell cp .env frontend/.env)
endif

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
