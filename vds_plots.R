## pass it the raw data details, and either the raw data will get
## loaded and parsed and saved as a dataframe, or else the existing
## dataframe will get loaded.  In either case, the plots will get made
## and saved to couchdb

config_file <- Sys.getenv('R_CONFIG')
if(is.null(config_file)){
    config_file <- 'config.json'
}
config <- rcouchutils::get.config(config_file)


district = Sys.getenv(c('RDISTRICT'))[1]
if(is.null(district)){
  print('assign a district to the RDISTRICT environment variable')
  exit(1)
}

file = Sys.getenv(c('FILE'))[1]
if(is.null(file)){
  print('assign a file to process to the FILE environment variable')
  exit(1)
}

year = as.numeric(Sys.getenv(c('RYEAR'))[1])
if(is.null(year)){
  print('assign the year to process to the RYEAR environment variable')
  exit(1)
}

## server <- "http://localhost/calvad"
## vds.service <- 'vdsdata'

trackingdb <- Sys.getenv(c('COUCHDB_TRACKINGDB'))[1]
if(is.null(trackingdb)){
  print('default setting tracking db to vdsdata/tracking')
  trackingdb <-  'vdsdata%2ftracking'
}

district.path=paste(district,'/',sep='')

file.names <- strsplit(file,split="/")
file.names <- file.names[[1]]
fname <-  strsplit(file.names[length(file.names)],"\\.")[[1]][1]

vds.id <-  get.vdsid.from.filename(fname)
pems.root = Sys.getenv(c('CALVAD_PEMS_ROOT'))[1]
path = paste(pems.root,district,sep='/')
file <- paste(path,file,sep='/')
print(file)

force.plot = Sys.getenv(c('CALVAD_FORCE_PLOT'))[1]
if(is.null(force.plot) || force.plot==0 || force.plot == 'false'){
    force.plot = FALSE
}else{
    force.plot=TRUE
}

result <- calvadrscripts::get.and.plot.vds.amelia(
    vds.id,year=year,doplots=TRUE,
    remote=FALSE,
    path=path,
    force.plot=force.plot,
    trackingdb=trackingdb)

result <- calvadrscripts::plot.raw.data(
    fname,thefile,path,year,vds.id
   ,remote=FALSE
   ,force.plot=force.plot
   ,trackingdb=trackingdb)


quit(save='no',status=10)
