all:
	docker-compose -f ./docker-compose.yml up --build --detach

debug:
	docker-compose -f ./docker-compose.yml up --build #--detach

down:
	docker-compose -f ./docker-compose.yml down

test:
	cd ./back/ && python3 manage.py test  --settings=back.test_settings
#	cd ./back/ && python3 manage.py test pong_game.tests.TournamentGameConsumerTests.test_disconnect_test2 --settings=back.test_settings
#	cd ./back/ && python3 manage.py test pong_game.tests.TournamentGameConsumerTests.test_overflow_user_connection_test --settings=back.test_settings



re: down
	docker-compose -f ./docker-compose.yml up --build --detach

clean: down
	docker system prune -a

fclean:
	docker-compose -f ./docker-compose.yml down -v
	docker system prune --all --force --volumes

linux:
	docker compose -f ./docker-compose.yml up --build --detach

linux-debug:
	docker compose -f ./docker-compose.yml up --build

linux-fclean:
	docker compose -f ./docker-compose.yml down -v
	docker system prune --all --force --volumes


.PHONY: all down re clean debug test
