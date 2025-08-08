NODE ?= node
NPM ?= npm
PORT ?= 8003

install:
	$(NPM) install

build:
	$(NPM) run build

dev:
	$(NPM) run dev:server

start:
	$(NPM) start

test:
	$(NPM) test

clean:
	rm -rf node_modules dist

docker-build:
	docker build -t askadb-dashboard-core .

docker-run:
	docker run -p $(PORT):$(PORT) askadb-dashboard-core

