## need node_modules directories
setwd('..')
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
print(paste ('using config file =',config_file))
config <- rcouchutils::get.config(config_file)

## pass it the raw data details, and either the raw data will get
## loaded and parsed and saved as a dataframe, or else the existing
## dataframe will get loaded.  In either case, the plots will get made
## and saved to couchdb


seconds <- 3600

year = as.numeric(Sys.getenv(c('RYEAR'))[1])
if('' == year){
  print('assign the year to process to the RYEAR environment variable')
  stop(1)
}

tams.site <- Sys.getenv(c('TAMS_SITE'))[1]
if('' ==  tams.site){
  print('assign a valid site to the TAMS_SITE environment variable')
  stop(1)
}

tams.path <- Sys.getenv(c('TAMS_PATH'))[1]
if('' == tams.path){
  print('assign a valid direectory to the TAMS_PATH environment variable')
  stop(1)
}


plot <- as.numeric(Sys.getenv(c('TAMS_PLOT_PRE'))[1])
if( '' != plot && plot==0){
    plot <- FALSE
}else{
    plot <- TRUE
}
postplot <- as.numeric(Sys.getenv(c('TAMS_PLOT_POST'))[1])
if('' !=  postplot && postplot==0){
    postplot <- FALSE
}else{
    postplot <- TRUE
}
impute <- as.numeric(Sys.getenv(c('TAMS_IMPUTE'))[1])
if( '' != impute && impute==0){
    impute <- FALSE
}else{
    impute <- TRUE
}
force.plot <- as.numeric(Sys.getenv(c('TAMS_FORCE_PLOT'))[1])
if( !is.na(force.plot) && ('' != force.plot || force.plot==0)){
    force.plot <- FALSE
}else{
    force.plot <- TRUE
}
print(force.plot)


trackingdb <- config$couchdb$trackingdb

list.df.tams.amelia <- calvadrscripts::process.tams.site(

                                           tams.site=tams.site,
                                           year=year,
                                           seconds=seconds,
                                           impute=impute,
                                           preplot=plot,
                                           postplot=postplot,
                                           force.plot=force.plot,
                                           tams.path=tams.path,
                                           trackingdb=trackingdb
                                       )
status <- 10 ## lame convention, but 10 is good result
if(length(list.df.tams.amelia) == 0){
    status <- 0 ## means no data found or similar
}
quit(save='no',status=status)
