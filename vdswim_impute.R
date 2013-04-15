library('zoo')

server <- "http://calvad.ctmlabs.net"
vds.service <- 'vdsdata'
wim.service <- 'wimdata'
#vds.path <- "/data/pems/breakup"
#wim.path <- "/data/wim"
output.path <- "./imputed"
fschecks <- FALSE
source('components/jmarca-rstats_couch_utils/couchUtils.R')
source('components/jmarca-rstats_remote_files/remoteFiles.R')
source('components/jmarca-calvad_rscripts/lib/get.medianed.amelia.vds.R')
source('components/jmarca-calvad_rscripts/lib/amelia_plots_and_diagnostics.R')
source('components/jmarca-calvad_rscripts/lib/get_couch.R')
source('components/jmarca-calvad_rscripts/lib/just.amelia.call.R')

source('components/jmarca-calvad_rscripts/lib/wim.loading.functions.R')
source("components/jmarca-calvad_rscripts/lib/vds.processing.functions.R")



library('RPostgreSQL')
m <- dbDriver("PostgreSQL")
## requires environment variables be set externally
psqlenv = Sys.getenv(c("PSQL_HOST", "PSQL_USER", "PSQL_PASS"))

con <-  dbConnect(m
                  ,user=psqlenv[2]
                  ,password=psqlenv[3]
                  ,host=psqlenv[1]
                  ,dbname="spatialvds")


localcouch = Sys.getenv(c('RLOCALCOUCH'))[1]
if(is.null(localcouch)){
  localcouch = FALSE
  exit(1)
}else{
  localcouch = TRUE
}

## pass in the vdsid and the year

impute.vds.site <- function(vdsid,year,vdsfile,district){

  print(paste('processing ',paste(vdsid,collapse=', ')))
  ## load the vds data
  df.vds.zoo <- get.zooed.vds.amelia(vdsid,serverfile=vdsfile,path=district)
  if(is.null(df.vds.zoo)){
    stop()
  }

  ## standard unzoo incantation
  df.vds <- unzoo.incantation(df.vds.zoo)
  rm(df.vds.zoo)
  ## so that I can pluck out just this site's data at the end of imputation
  df.vds[,'vds_id'] <- vdsid
  ## probably not necessary yet
  ## gc()

  ## pick off the lane names so as to drop irrelevant lanes in the loop below
  vds.names <- names(df.vds)
  vds.nvars <- grep( pattern="^n(l|r)\\d+",x=vds.names,perl=TRUE,value=TRUE)

  lanes = length(vds.nvars)
  #####################
  ## loading WIM data paired with VDS data from WIM neighbor sites
  ######################

  ## wim.ids <- get.list.neighbor.wim.sites(vdsid)
  ## widen the net
  wim.ids <- get.list.district.neighbor.wim.sites(vdsid)
  
  bigdata <- load.wim.pair.data(wim.ids,vds.nvars=vds.nvars,lanes=lanes)

  ## iterate a bit here
  if(dim(bigdata)[1] < 100){
    
    more.lanes <- wim.ids$lanes == wim.ids$lanes[1]
    ## drop to the next lane size
    wim.ids <- wim.ids[!more.lanes,]
    while(dim(bigdata)[1] < 100 && dim(wim.ids)[1]>0){
        bigdata <- load.wim.pair.data(wim.ids,vds.nvars=vds.nvars,lanes=lanes)
    }
  }
  
  print('concatenating merged and to-do data sets')
  if(dim(bigdata)[1] < 100){
    print('bigdata looking pretty empty')
    couch.set.state(year,vds.id,list('truck_imputation_failed'=paste(dim(bigdata)[1], 'records in wim neighbor sites')),local=localcouch)
    stop()
  }
  ## bigdata <- concatenate.two.sites(bigdata,aout.agg,maximp=keepimp)
  wimsites.names <-  names(bigdata)
  vds.names <- names(df.vds)
  miss.names.wim <- setdiff(wimsites.names,vds.names)
  miss.names.vds <- setdiff(vds.names,wimsites.names)
  ## could be more lanes at the VDS site, for example
  if(length(miss.names.vds)>0){
    bigdata[,miss.names.vds] <- NA
  }
  ## of course this will be necessary, as the wimsites have truck data and the vds does not
  df.vds[,miss.names.wim] <- NA

  ## merge into bigdata
  bigdata <- rbind(bigdata,df.vds)
  miss.names.vds <- union(miss.names.vds,c('vds_id'))
  i.hate.r <- c(miss.names.vds,'nr1') ## need a dummy index or R will simplify
  holding.pattern <- bigdata[,i.hate.r]

  this.vds <- bigdata['vds_id'] == vdsid
  this.vds <- !is.na(this.vds)  ## lordy I hate when NA isn't falsey

  for(i in miss.names.vds){
    bigdata[,i] <- NULL
  }
  rm(df.vds)
  gc()

  ## bugfix.  vds amelia runs might have been done with improper
  ## limits on occ.  Very old runs only, but need to fix here
  occ.pattern <- "^o(l|r)\\d$"
  occ.vars <-  grep( pattern=occ.pattern,x=names(bigdata),perl=TRUE,value=TRUE)
  ## truncate mask
  toobig <-  !( bigdata[,occ.vars]<1 | is.na(bigdata[,occ.vars]) )
  bigdata[,occ.vars][toobig] <- 1

  ## run amelia to impute missing (trucks)
  print('all set to impute')
  big.amelia <- fill.truck.gaps(bigdata)


  ## I used to save here, but now that this is distributed, I should
  ## probably convert to csv and push to psql sooner

  ## write out the imputation chains information to couchdb for later analysis
  ## and also generate plots as attachments

  itercount <- store.amelia.chains(big.amelia,year,vdsid,'truckimputation')


  ## extract just this vds_id data and
  ## put back any variables I took out above

  df.amelia.c <- big.amelia$imputations[[1]][this.vds,]
  df.amelia.c[,miss.names.vds] <- holding.pattern[this.vds,miss.names.vds]

  ## limit to what I did impute only
  varnames <- names(df.amelia.c)
  var.list <- names.munging(varnames)
  keep.names <- setdiff(varnames,var.list$exclude.as.id.vars)
  keep.names <- union(keep.names,c('ts','tod','day','vds_id'))
  df.amelia.c <- df.amelia.c[,keep.names]

  if(length(big.amelia$imputations) > 1){
    for(i in 2:length(big.amelia$imputations)){
      temp <- big.amelia$imputations[[i]][this.vds,]
      temp[,miss.names.vds] <- holding.pattern[this.vds,miss.names.vds]
      temp <- temp[,keep.names]
      df.amelia.c <- rbind(df.amelia.c,temp)
    }
  }
  ## get rid of stray dots in variable names
  db.legal.names  <- gsub("\\.", "_", names(df.amelia.c))
  names(df.amelia.c) <- db.legal.names

  ## unsure about this.  seems like lots of NA values could likely be produced.
  df.amelia.c.l <- transpose.lanes.to.rows(df.amelia.c)

  ## okay, actually write the csv file
  filename <- paste('vds_id',vdsid,'truck.imputed',year,'csv',sep='.')
  ## don't prior imputations
  exists <- dir(output.path,filename)
  tick <- 0
  while(length(exists)==1){
    tick = tick+1
    filename <- paste('vds_id',vdsid,'truck.imputed',year,tick,'csv',sep='.')
    ## don't overwrite files
    exists <- dir(output.path,filename)
  }
  file <- paste(output.path,filename,sep='/')

  write.csv(df.amelia.c.l,file=file,row.names = FALSE)
  ## run perl code to slurp output
  ## system2('perl',paste(' -w /home/james/repos/bdp/parse_imputed_vds_trucks_to_couchDB.pl --cdb=imputed/breakup/ --file=',file,sep='')
  ##         ,stdout = FALSE, stderr = paste(output.path,paste(vdsid,year,'parse_output.txt',sep='.'),sep='/'),wait=FALSE)

  ## while that runs, make some plots
  df.amelia.c$vds_id <- NULL
  ## generate a df for plots.  Use median here, because that is what I will do with final output

  df.amelia.zoo <- medianed.aggregate.df(df.amelia.c)
  df.med <- unzoo.incantation(df.amelia.zoo)
  rm(df.amelia.zoo)
  make.truck.plots(df.med,year,vdsid,'vds',vdsid,imputed=TRUE)
  rm(df.med)

  ## again, a save on a remote stystem is useles.  move on to csv,
  ## possibly push to psql or couchdb

  make.truck.plots.by.lane(df.amelia.c.l,year,vdsid,'vds',vdsid,imputed=TRUE)
  quit(save='no',status=10)

}



district = Sys.getenv(c('RDISTRICT'))[1]
if(is.null(district)){
  print('assign a district to the RDISTRICT environment variable')
  exit(1)
}

vdsfile = Sys.getenv(c('FILE'))[1]
if(is.null(vdsfile)){
  print('assign a file to process to the FILE environment variable')
  exit(1)
}

year = as.numeric(Sys.getenv(c('RYEAR'))[1])
if(is.null(year)){
  print('assign the year to process to the RYEAR environment variable')
  exit(1)
}

seconds <- 3600

wim.vds.pairs <- get.list.closest.wim.pairs()

file.names <- strsplit(vdsfile,split="/")
file.names <- file.names[[1]]
fname <-  strsplit(file.names[length(file.names)],"\\.")[[1]][1]
vds.id <-  get.vdsid.from.filename(fname)


impute.vds.site(vds.id,year,vdsfile=vdsfile,district=district)
