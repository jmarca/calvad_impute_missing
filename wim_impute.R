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

source('node_modules/rstats_couch_utils/couchUtils.R',chdir=TRUE)
source('node_modules/calvad_rscripts/lib/process.wim.site.R',chdir=TRUE)

seconds <- 3600

year <- as.numeric(Sys.getenv(c('RYEAR'))[1])
if(is.null(year)){
  print('assign the year to process to the RYEAR environment variable')
  exit(1)
}
print(year)


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


plot <- as.numeric(Sys.getenv(c('WIM_PLOT_PRE'))[1])
if( !is.na(plot) & plot==0){
    plot <- FALSE
}else{
    plot <- TRUE
}
postplot <- as.numeric(Sys.getenv(c('WIM_PLOT_POST'))[1])
if(! is.na(postplot) & postplot==0){
    postplot <- FALSE
}else{
    postplot <- TRUE
}
impute <- as.numeric(Sys.getenv(c('WIM_IMPUTE'))[1])
if(! is.na(impute) & impute==0){
    impute <- FALSE
}else{
    impute <- TRUE
}

done.sites <- c()

returnval <- 0
if(plot | impute){
    returnval <- process.wim.site(wim.site=wim.site,year=year,preplot=plot,postplot=postplot,impute=impute,wim.path=wim.path)
}
if(postplot && returnval > 0){
    post.impute.plots(wim.site=wim.site,year=year,wim.path=wim.path)
}

dbDisconnect(con)
