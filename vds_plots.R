## pass it the raw data details, and either the raw data will get
## loaded and parsed and saved as a dataframe, or else the existing
## dataframe will get loaded.  In either case, the plots will get made
## and saved to couchdb
library('zoo')
library('Amelia')
library('RCurl')
library('RJSONIO')

source('node_modules/rstats_couch_utils/couchUtils.R',chdir=TRUE)
source('node_modules/calvad_rscripts/lib/get.medianed.amelia.vds.R',chdir=TRUE)



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

server <- "http://localhost/calvad"
vds.service <- 'vdsdata'

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
print(paste('force plot = ',force.plot))
plot.raw.data(fname,thefile,path,year,vds.id
                       ,remote=FALSE
                       ,force.plot=force.plot
                       ,trackingdb=trackingdb)

print('done with raw plots')

get.and.plot.vds.amelia(vds.id,year=year,doplots=TRUE,
                                  remote=FALSE,
                                  path=path,
                                  force.plot=force.plot,
                                  trackingdb=trackingdb)

print('done with post impute plots')

quit(save='no',status=10)
