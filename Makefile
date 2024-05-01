.PHONY: all clean setup reset

all: setup

clean:
	npm run clean

setup:
	./fetch-notebooks.sh
	npm run embeddings:create

reset: clean setup