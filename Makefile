test: test-node test-r

test-r:
	Rscript Rtest.R


test-node:
	@./node_modules/.bin/mocha --reporter list --timeout 5000


.PHONY: test-r test-node test
