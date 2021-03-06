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


library('RPostgreSQL')
m <- dbDriver("PostgreSQL")
con <-  dbConnect(m
                  ,user=config$postgresql$auth$username
                  ,host=config$postgresql$host
                  ,port=config$postgresql$port
                  ,dbname=config$postgresql$db)

district = Sys.getenv(c('RDISTRICT'))[1]

if('' == district){
  print('assign a district to the RDISTRICT environment variable')
  stop(1)
}

file = Sys.getenv(c('FILE'))[1]
if('' == file){
  print('assign a file to process to the FILE environment variable')
  stop(1)
}

year = as.numeric(Sys.getenv(c('RYEAR'))[1])
if('' == year){
  print('assign the year to process to the RYEAR environment variable')
  stop(1)
}

district.path=paste(district,'/',sep='')

file.names <- strsplit(file,split="/")
file.names <- file.names[[1]]
fname <-  strsplit(file.names[length(file.names)],"\\.")[[1]][1]
vds.id <-  calvadrscripts::get.vdsid.from.filename(fname)
pems.root = Sys.getenv(c('CALVAD_PEMS_ROOT'))[1]
path = paste(pems.root,district,sep='')
file <- paste(path,file,sep='/')
print(file)

goodfactor = Sys.getenv(c('CALVAD_VDS_IMPUTE_GOODFACTOR'))[1]
if('' == goodfactor){
    goodfactor <-   3.5
}else{
    goodfactor <- as.numeric(goodfactor)
}

seconds = 120
## using maxiter must be a number, not string
## so the env var is irritating.  Hard code at 20 for now
maxiter = Sys.getenv(c('CALVAD_VDS_IMPUTE_MAXITER'))[1]
if('' == maxiter){
    maxiter=20
}else{
    maxiter <- as.numeric(maxiter)
}


print(paste('goodfactor',goodfactor,' and maxiter',maxiter))

## by the way, 20 is from examining the first 2000 or so imputations
## and noticing that most are less than 20

## if you crank goodfactor to 10, crank maxiter as well

db <- config$couchdb$trackingdb

done <- calvadrscripts::self.agg.impute.VDS.site.no.plots(
    fname=fname,
    f=file,
    path=path,
    year=year,
    seconds=seconds,
    goodfactor=goodfactor,
    maxiter=maxiter,
    con=con,
    trackingdb=db)

## if (done != 1){
##     rcouchutils::couch.set.state(year,vds.id,
##                                  list('vdsraw_chain_lengths'=done),
##                                  db=db)
## }
quit(save='no',status=10)
