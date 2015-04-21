## need node_modules directories
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



district = Sys.getenv(c('RDISTRICT'))[1]

if('' == district){
  print('assign a district to the RDISTRICT environment variable')
  exit(1)
}

file = Sys.getenv(c('FILE'))[1]
if('' == file){
  print('assign a file to process to the FILE environment variable')
  exit(1)
}

year = as.numeric(Sys.getenv(c('RYEAR'))[1])
if('' == year){
  print('assign the year to process to the RYEAR environment variable')
  exit(1)
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

force.plot = Sys.getenv(c('CALVAD_FORCE_PLOT'))[1]
if('' == force.plot || force.plot==0 || force.plot == 'false'){
    force.plot = FALSE
}else{
    force.plot=TRUE
}
db <- config$couchdb$trackingdb

result <- calvadrscripts::get.and.plot.vds.amelia(
    vds.id,year=year,doplots=TRUE,
    remote=FALSE,
    path=path,
    force.plot=force.plot,
    trackingdb=db)

result <- calvadrscripts::plot.raw.data(
    fname,thefile,path,year,vds.id
   ,remote=FALSE
   ,force.plot=force.plot
   ,trackingdb=db)


quit(save='no',status=10)
