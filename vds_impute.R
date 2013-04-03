## pass it the raw data details, and either the raw data will get
## loaded and parsed and saved as a dataframe, or else the existing
## dataframe will get loaded.  In either case, the plots will get made
## and saved to couchdb
source("components/jmarca-calvad_rscripts/lib/load.pems.raw.file.R")
library('zoo')
library('Hmisc')
library('Amelia')
library('lattice')
library('RCurl')
library('RJSONIO')

source("components/jmarca-calvad_rscripts/lib/vds.processing.functions.R")
source('components/jmarca-rstats_couch_utils/couchUtils.R')
source('components/jmarca-rstats_remote_files/remoteFiles.R')

source('components/jmarca-calvad_rscripts/lib/get.medianed.amelia.vds.R')
source('components/jmarca-calvad_rscripts/lib/amelia_plots_and_diagnostics.R')



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

server <- "http://calvad.ctmlabs.net"
vds.service <- 'vdsdata'



district.path=paste(district,'/',sep='')

file.names <- strsplit(file,split="/")
file.names <- file.names[[1]]
fname <-  strsplit(file.names[length(file.names)],"\\.")[[1]][1]
vds.id <-  get.vdsid.from.filename(fname)
path = paste('/data/pems/breakup/',district,sep='')
goodfactor <-   3.5
seconds = 60

done <- self.agg.impute.VDS.site.no.plots(fname,file,path,year,seconds=60,goodfactor=goodfactor)
if (done != 1){
  couch.set.state(year,vds.id,list('vdsraw_chain_lengths'=done))
}
quit(save='no',status=10)

