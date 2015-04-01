## pass it the raw data details, and either the raw data will get
## loaded and parsed and saved as a dataframe, or else the existing
## dataframe will get loaded.  In either case, the plots will get made
## and saved to couchdb
library('zoo')
## library('Hmisc')
library('Amelia')
library('lattice')
library('RCurl')
library('RJSONIO')

source('node_modules/rstats_couch_utils/couchUtils.R',chdir=TRUE)

source('node_modules/calvad_rscripts/lib/vds_impute.R',chdir=TRUE)


library('RPostgreSQL')
m <- dbDriver("PostgreSQL")
## requires environment variables be set externally
psqlenv = Sys.getenv(c("PSQL_HOST", "PSQL_USER"))

## this connection call assumes you are using .pgass, as you should be!
con <-  dbConnect(m
                  ,user=psqlenv[2]
                  ,host=psqlenv[1]
                  ,dbname="spatialvds")


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
maxiter = Sys.getenv(c('CALVAD_VDS_IMPUTE_MAXITER'))[1]
if(is.null(maxiter)){
    maxiter=300
}
path = paste(pems.root,district,sep='')
file <- paste(path,file,sep='/')
print(file)
goodfactor <-   3.5
seconds = 120
## using maxiter must be a number, not string
## so the env var is irritating.  Hard code at 20 for now

## by the way, 20 is from examining the first 2000 or so imputations
## and noticing that most are less than 20

done <- self.agg.impute.VDS.site.no.plots(fname,file,path,year,seconds=seconds,goodfactor=goodfactor,maxiter=20,con=con)
if (done != 1){
  couch.set.state(year,vds.id,list('vdsraw_chain_lengths'=done))
}
quit(save='no',status=10)
