## pass it the raw data details, and either the raw data will get
## loaded and parsed and saved as a dataframe, or else the existing
## dataframe will get loaded.  In either case, the plots will get made
## and saved to couchdb
library('zoo')
##library('Hmisc')
library('Amelia')
library('lattice')
library('RCurl')
library('RJSONIO')

source('node_modules/rstats_couch_utils/couchUtils.R',chdir=TRUE)

source('node_modules/calvad_rscripts/lib/vds_impute.R',chdir=TRUE)

source('node_modules/calvad_rscripts/lib/get.medianed.amelia.vds.R',chdir=TRUE)
source('node_modules/calvad_rscripts/lib/amelia_plots_and_diagnostics.R',chdir=TRUE)


plot.raw.data <- function(fname,f,path,year,vds.id,remote=FALSE){
  ## plot the data out of the detector
  fileprefix='raw'
  subhead='raw data'
  have.plot <- check.for.plot.attachment(vds.id,year,fileprefix,subhead)
  if(have.plot){
    print('already have plots')
    return (1)
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
  ts <- df.vds.agg$ts

  ts.lt <- as.POSIXlt(ts)
  df.vds.agg$tod   <- ts.lt$hour + (ts.lt$min/60)
  df.vds.agg$day   <- ts.lt$wday

  plot.vds.data(df.vds.agg,vds.id,year,fileprefix,subhead)

  rm(df)
  gc()
  return (TRUE)
}

district = Sys.getenv(c('RDISTRICT'))[1]
if(is.null(district)){
  print('assign a district to the RDISTRICT environment variable')
  exit(1)
}

thefile = Sys.getenv(c('FILE'))[1]
if(is.null(thefile)){
  print('assign a file to process to the FILE environment variable')
  exit(1)
}

year = as.numeric(Sys.getenv(c('RYEAR'))[1])
if(is.null(year)){
  print('assign the year to process to the RYEAR environment variable')
  exit(1)
}

file.names <- strsplit(thefile,split="/")
file.names <- file.names[[1]]
fname <-  strsplit(file.names[length(file.names)],"\\.")[[1]][1]

vds.id <-  get.vdsid.from.filename(fname)
pems.root = Sys.getenv(c('CALVAD_PEMS_ROOT'))[1]
path = paste(pems.root,district,sep='/')
thefile <- paste(path,thefile,sep='/')
print(thefile)

result <- plot.raw.data(fname,thefile,path,year,vds.id)

have.plot <- check.for.plot.attachment(vds.id,year,NULL,subhead='\npost imputation')
if(! have.plot ){
    print('going to plot amelia output diagnostics with remote = false')
  result <- get.and.plot.vds.amelia(vds.id,year=year,path=path,remote=FALSE)
}
1
quit(save='no',status=10)
