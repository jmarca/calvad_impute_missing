## need node_modules directories
dot_is <- getwd()
node_paths <- dir(dot_is,pattern='\\.Rlibs',
                  full.names=TRUE,recursive=TRUE,
                  ignore.case=TRUE,include.dirs=TRUE,
                  all.files = TRUE)
path <- normalizePath(node_paths, winslash = "/", mustWork = FALSE)
lib_paths <- .libPaths()
.libPaths(c(path, lib_paths))

## need env for test file
Sys.setenv(RCOUCHUTILS_TEST_CONFIG=paste(dot_is,'test.config.json',sep='/'))

devtools::check()
