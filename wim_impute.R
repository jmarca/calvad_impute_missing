library('zoo')
## library('Hmisc')
library('Amelia')
library('lattice')
library('RCurl')
library('RJSONIO')
library('RPostgreSQL')
m <- dbDriver("PostgreSQL")
## requires environment variables be set externally
psqlenv = Sys.getenv(c("PSQL_HOST", "PSQL_USER", "PSQL_PASS"))

con <-  dbConnect(m
                  ,user=psqlenv[2]
                  ,password=psqlenv[3]
                  ,host=psqlenv[1]
                  ,dbname="spatialvds")

source('components/jmarca-rstats_couch_utils/couchUtils.R',chdir=TRUE)
##source('components/jmarca-calvad_rscripts/lib/wim.aggregate.fixed.R',chdir=TRUE)
##source('components/jmarca-calvad_rscripts/lib/wim.loading.functions.R',chdir=TRUE)
##source('components/jmarca-calvad_rscripts/lib/wim.pre.processing.R')
##source("components/jmarca-calvad_rscripts/master/lib/vds.processing.functions.R")
source('components/jmarca-calvad_rscripts/lib/process.wim.site.R',chdir=TRUE)

year <- as.numeric(Sys.getenv(c('RYEAR'))[1])
if(is.null(year)){
  print('assign the year to process to the RYEAR environment variable')
  exit(1)
}
print(year)

seconds <- 3600

wim.site <- Sys.getenv(c('WIM_SITE'))[1]
if(is.null(wim.site)){
  print('assign a valid site to the WIM_SITE environment variable')
  exit(1)
}

wim.path <- Sys.getenv(c('WIM_PATH'))[1]
if(is.null(wim.path)){
  print('assign a valid direectory to the WIM_PATH environment variable')
  exit(1)
}

plot <- as.numeric(Sys.getenv(c('WIM_PLOT'))[1])
if(plot==0){
    plot <- FALSE
}else{
    plot <- TRUE
}
impute <- as.numeric(Sys.getenv(c('WIM_IMPUTE'))[1])
if(impute==0){
    impute <- FALSE
}else{
    impute <- TRUE
}

done.sites <- c()


process.wim.site(wim.site=wim.site,year=year,plot=plot,impute=impute)


dbDisconnect(con)
