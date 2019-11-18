.PHONY: prepare
prepare:
	yarn prettier --write tests/**/*.js
	yarn prettier --write lib/**/*.js
	yarn jest
