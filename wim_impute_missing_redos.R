library('RPostgreSQL')
m <- dbDriver("PostgreSQL")
## requires environment variables be set externally
psqlenv = Sys.getenv(c("PSQL_HOST", "PSQL_USER", "PSQL_PASS"))

con <-  dbConnect(m
                  ,user=psqlenv[2]
                  ,password=psqlenv[3]
                  ,host=psqlenv[1]
                  ,dbname="spatialvds")

source('components/jmarca-calvad_rscripts/lib/wim.aggregate.fixed.R')
source('components/jmarca-calvad_rscripts/lib/wim.loading.functions.R')
source('components/jmarca-calvad_rscripts/lib/wim.pre.processing.R')
source("components/jmarca-calvad_rscripts/lib/vds.processing.functions.R")
source('components/jmarca-calvad_rscripts/lib/wim.vds.processing.functions.R')

year = as.numeric(Sys.getenv(c('RYEAR'))[1])
print(year)

seconds <- 3600

wim.path <- "/data/wim/"

done.sites <- c()

if(year == 2007){
  done.sites <- c(98)
  ## 98 N, 2007 has no data for speed, can't do pre
  ## plots, can't impute missing
}

## get the new, corrected version of imputing and agg processing
source('components/jmarca-calvad_rscripts/lib/wim_impute_distributed.R')


  todo.docs <- couch.allDocs(trackingdb
                             , query=list(
                                 'startkey'=paste('%5b%22no_agg_plots%22,%22',year,'%22%5d',sep='')
                                 ,'endkey'=paste('%5b%22no_agg_plots%22,%22',year+1,'%22%5d',sep='')
                                 ,'reduce'='false')
                             , view='_design/wim/_view/no_aggplots'
                             , include.docs = FALSE)
rows <- todo.docs$rows
wim.sites <- sapply(rows,function(r){
  return (c('year'=r$key[[2]],'wim.site'=r$key[[3]],'direction'=r$key[[4]]))
})
wim.sites <- unique(t(wim.sites))
while(length(wim.sites[,1]) > 1) {
  row = wim.sites[1,]         ## shift
  wim.sites <- wim.sites[-1,] ## shift

  if( is.element(row[2],done.sites) ){
    next
  }
  done.sites[length(done.sites)+1] <- row[2]
  process.wim.site(wim.site=row[2],year=as.numeric(row[1]),bailout=TRUE) ## bailout =  no imputation, just plots
  todo.docs <- couch.allDocs(trackingdb
                             , query=list(
                                 'startkey'=paste('%5b%22no_agg_plots%22,%22',year,'%22%5d',sep='')
                                 ,'endkey'=paste('%5b%22no_agg_plots%22,%22',year+1,'%22%5d',sep='')
                                 ,'reduce'='false')
                             , view='_design/wim/_view/no_aggplots'
                             , include.docs = FALSE)
  rows <- todo.docs$rows
  wim.sites <- sapply(rows,function(r){
    return (c('year'=r$key[[2]],'wim.site'=r$key[[3]],'direction'=r$key[[4]]))
  })
  wim.sites <- unique(t(wim.sites))
}  ## loop here to process all WIM

dbDisconnect(con)
