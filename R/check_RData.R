## need node_modules directories
devtools::wd('..')
dot_is <- getwd()
node_paths <- dir(dot_is,pattern='\\.Rlibs',
                  full.names=TRUE,recursive=TRUE,
                  ignore.case=TRUE,include.dirs=TRUE,
                  all.files = TRUE)
path <- normalizePath(node_paths, winslash = "/", mustWork = FALSE)
lib_paths <- .libPaths()
.libPaths(c(path, lib_paths))

print(.libPaths())

## need env for test file
config_file <- Sys.getenv('R_CONFIG')

if(config_file ==  ''){
    config_file <- 'config.json'
}
##print(paste ('using config file =',config_file))
config <- rcouchutils::get.config(config_file)

file = Sys.getenv(c('FILE'))[1]
if('' == file || is.na(file)){
  print('assign a file to process to the FILE environment variable')
  quit(save='no',status=3)
}
status <- calvadrscripts::amelia_output_file_status(file)
quit(save='no',status=status)
