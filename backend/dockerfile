#https://github.com/docker/awesome-compose/tree/master/official-documentation-samples/django

FROM python:3.12.1-alpine3.19

#.pyc 파일을 생성을 금지
# Docker 컨테이너 내에서 Django 애플리케이션을 실행할 때, 로그를 빠르게 확인하고 애플리케이션 출력을 실시간으로 볼 수 있도록 도와줌
#https://stackoverflow.com/questions/59812009/what-is-the-use-of-pythonunbuffered-in-docker-file
ENV PYTHONDONTWRITEBYTECODE=1

#버퍼링을 꺼서 바로 터미널에 출력되게 함
#이 설정은 애플리케이션 출력(예: Django 로그)을 실시간으로 확인할 수 있도록 함
#버퍼링을 끄는 것은 주로 컨테이너 로그에서 실행 중인 애플리케이션의 정보를 빠르게 얻기 위한 것이며, 크래시 발생 시 출력이 손실되지 않도록 하는 목적
#https://stackoverflow.com/questions/59812009/what-is-the-use-of-pythonunbuffered-in-docker-file
ENV PYTHONUNBUFFERED=1

RUN apk update && apk upgrade && apk add dumb-init && rm -rf /var/cache/apk/*

RUN python3.12 -m pip install --upgrade pip

WORKDIR /app

COPY requirements.txt /app

RUN pip install -r requirements.txt --no-cache-dir

EXPOSE 8000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
