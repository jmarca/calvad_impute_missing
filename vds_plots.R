## pass it the raw data details, and either the raw data will get
## loaded and parsed and saved as a dataframe, or else the existing
## dataframe will get loaded.  In either case, the plots will get made
## and saved to couchdb
library('zoo')
library('Amelia')
library('RCurl')
library('RJSONIO')

source('node_modules/rstats_couch_utils/couchUtils.R',chdir=TRUE)

source('node_modules/calvad_rscripts/lib/vds_impute.R',chdir=TRUE)

source('node_modules/calvad_rscripts/lib/get.medianed.amelia.vds.R',chdir=TRUE)


plot.raw.data <- function(fname,f,path,year,vds.id,remote=FALSE,force.plot=FALSE){
  ## plot the data out of the detector
  fileprefix='raw'
  subhead='raw data'
  if(!force.plot){
      have.plot <- check.for.plot.attachment(vds.id,year,fileprefix,subhead)
      if(have.plot){
          print('already have plots')
          return (1)
      }
  }

  ## fname is the filename for the vds data.
  ## f is the full path to the file I need to grab

  ## is there a df available?
  ts <- data.frame()
  df <- data.frame()
  ## df.pattern =paste('**/',fname,'*df*',year,'RData',sep='')
  ##rdata.file <- make.amelia.output.file(path,fname,seconds,year)
  if(remote){
      fetched <- fetch.remote.file(server,service='vdsdata',root=path,file=f)
      r <- try(result <- load(file=fetched))
      if(class(r) == "try-error") {
          print (paste('need to get the raw file.  hold off for now'))
          return (FALSE)
      }
      unlink(x=fetched)
  }else{
      df <- load.file(f,fname,year,path)
  }
  ## break out ts
  ts <- df$ts
  df$ts <- NULL
  ## aggregate up to an hour?
  df.vds.agg <- vds.aggregate(df,ts,seconds=3600)
  if(is.null(dim(df.vds.agg))) return (FALSE)

  files.to.couch <- plot.vds.data(df.vds.agg,
                                  vds.id,year,
                                  fileprefix,subhead,
                                  force.plot=force.plot)

  for(f2a in files.to.attach){
      couch.attach('vdsdata%2ftracking',vds.id,f2a)
  }

  rm(df)
  gc()
  return (TRUE)
}

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
result <- plot.raw.data(fname,thefile,path,year,vds.id)#,force.plot=force.plot)

result <- get.and.plot.vds.amelia(vds.id,year=year,path=path,remote=FALSE,force.plot=force.plot)

quit(save='no',status=10)
