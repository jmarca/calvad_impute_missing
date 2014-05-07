source('./components/jmarca-rstats_couch_utils/couchUtils.R')
source('./components/jmarca-calvad_rscripts/lib/wim.aggregate.fixed.R')

## to get from the db directly, without aggregating
## pretty much use this for now
load.wim.data.straight <- function(wim.site,year){
  start.wim.time <-  paste(year,"-01-01",sep='')
  end.wim.time <-   paste(year+1,"-01-01",sep='')
  get.wim.site.2(wim.site,start.time=start.wim.time,end.time=end.wim.time)
}
add.time.of.day <- function(df){
  ## add time of day and day of week here
  ts.lt <- as.POSIXlt(df$ts)
  df$tod   <- ts.lt$hour + (ts.lt$min/60)
  df$day   <- ts.lt$wday
  df$hr   <- ts.lt$hr
  df
}
pf <- function(x,y){panel.smoothScatter(x,y,nbin=c(200,200))}
day.of.week <- c('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')
lane.defs <- c('left lane','right lane 1', 'right lane 2', 'right lane 3', 'right lane 4', 'right lane 5', 'right lane 6', 'right lane 7', 'right lane 8')
strip.function.a <- strip.custom(which.given=1,factor.levels=day.of.week, strip.levels = TRUE )


process.wim.site<- function(wim.site,year,bailout=FALSE){

  print(paste('starting to process  wim site ',wim.site))

  ## the bug is in the filed RData stuff, so need to load from db

  df.wim <- load.wim.data.straight(wim.site,year)
  ## only continue if I have real data
  if(dim(df.wim)[1]==0){
    couch.set.state(year=year,detector.id=paste('wim',wim.site,sep='.'),doc=list('imputed'='no wim data'))
    return()
  }
  df.wim.split <- split(df.wim, df.wim$direction)
  df.wim.speed <- get.wim.speed.from.sql(wim.site,seconds,year)
  df.wim.speed.split <- split(df.wim.speed, df.wim.speed$direction)
  rm(df.wim)
  gc()
  df.wim.dir <- list()
  for(direction in names(df.wim.split)){
    ## direction <- names(df.wim.split)[1]
    cdb.wimid <- paste('wim',wim.site,direction,sep='.')
    if(length(df.wim.split[[direction]]$ts)<100){
      couch.set.state(year=year,detector.id=cdb.wimid,doc=list('imputed'='no wim data'))
      next
    }
    if(length(df.wim.speed.split[[direction]]$ts)<100){
      couch.set.state(year=year,detector.id=cdb.wimid,doc=list('imputed'='no speed data'))
      next
    }

    ## direction <- names(df.wim.split)[1]
    print(paste(year,wim.site,direction))
    couch.set.state(year=year,detector.id=cdb.wimid,doc=list('imputed'='started'))
    ## for output files
    if(!file.exists(paste("images",direction,sep='/'))){dir.create(paste("images",direction,sep='/'))}
    df.wim.d <- process.wim.2(df.wim.split[[direction]])
    df.wim.s <- df.wim.speed.split[[direction]]

    # fix for site 16, counts of over 100,000 per hour (actually 30 million)
    too.many <- df.wim.s$veh_count > 10000 ## 10,000 veh in 5 minutes!
    df.wim.s <- df.wim.s[!too.many,]


    df.wim.split[[direction]] <- NULL
    df.wim.speed.split[[direction]] <- NULL
    gc()

    df.wim.d <- wim.additional.variables(df.wim.d)

    ## aggregate over time
    print(' aggregate ')
    df.wim.dagg <-wim.lane.and.time.aggregation(df.wim.d)
    ## hack around broken speed summaries but instead aborting above.
    ## The one such instance so far had junk measurements
    if(length(df.wim.s)==0){
      ## insert one dummy record per lane
      lastlane <- max(df.wim.d$lane)
      dummytime <- df.wim.d$ts[1]
      df.wim.s <- data.frame(cbind(lane=c('l1',paste('r',2:lastlane,sep=''))))
      df.wim.s$ts <- dummytime
      df.wim.s$veh_speed <- NA
      df.wim.s$veh_count <- NA

    }
    df.wim.sagg <- make.speed.aggregates(df.wim.s)

    ## merge, then explode time using zoo
    df.wim.d.joint <- merge(df.wim.dagg,df.wim.sagg)
    rm(df.wim.dagg, df.wim.sagg,df.wim.s,df.wim.d )
    gc()

    col.names <- names(df.wim.d.joint)
    local.df.wim.agg.ts <- as.ts(df.wim.d.joint)
    rm(df.wim.d.joint)
    ts.ts <- unclass(time(local.df.wim.agg.ts))+ISOdatetime(1970,1,1,0,0,0,tz='UTC')
    local.df.wim.agg <- data.frame(ts=ts.ts)
    local.df.wim.agg[col.names] <- local.df.wim.agg.ts ## [,col.names]
    rm(local.df.wim.agg.ts)
    local.df.wim.agg <- add.time.of.day(local.df.wim.agg)
##    df.wim.dir[[direction]] <- local.df.wim.agg

    gc()

    png(file = paste(paste('images/',direction,'/',sep=''),paste(wim.site,direction,year,'agg.redo','%03d.png',sep='_'),sep=''), width=900, height=600, bg="transparent",pointsize=18)

    plotvars <- grep('not_heavyheavy_',x=names(local.df.wim.agg),perl=TRUE,value=TRUE)
    f <- formula(paste('I(', paste(plotvars,collapse='+' ),') ~ tod | day'))
    a <- xyplot(f
                ,data=local.df.wim.agg
                ,main=paste("Scatterplot non-heavy heavy duty truck counts",year," by time of day at site",wim.site,direction,"\nRevised method, pre-imputation")
                ,strip=strip.function.a
                ,xlab="Hour of the day"
                ,ylab="Non HHD truck counts per hour"
              ,panel=pf
                ,auto.key=TRUE)
    print(a)
    plotvars <- grep('^heavyheavy_',x=names(local.df.wim.agg),perl=TRUE,value=TRUE)
    f <- formula(paste('I(', paste(plotvars,collapse='+' ),') ~ tod | day'))
    a <- xyplot(f
                ,data=local.df.wim.agg
                ,main=paste("Scatterplot heavy heavy duty truck counts",year," by time of day at site",wim.site,direction,"\nRevised method, pre-imputation")
                ,strip=strip.function.a
                ,xlab="Hour of the day"
                ,ylab="HHD truck counts per hour"
                ,panel=pf
                ,auto.key=TRUE)
    print(a)

    plotvars <- grep('^count_all',x=names(local.df.wim.agg),perl=TRUE,value=TRUE)
    f <- formula(paste('I(', paste(plotvars,collapse='+' ),') ~ tod | day'))
    a <- xyplot(f
                ,data=local.df.wim.agg
                ,main=paste("Scatterplot counts from summary reports,",year,"  by time of day at site",wim.site,direction,"\nRevised method, pre-imputation")
                ,strip=strip.function.a
                ,xlab="Hour of the day"
                ,ylab="Hourly vehicle counts, all classes"
              ,panel=pf
                ,auto.key=TRUE)
    print(a)

    splotvars <- grep('^wgt',x=names(local.df.wim.agg),perl=TRUE,value=TRUE)
    f <- formula(paste('I( (', paste(splotvars,collapse='+' ),') / (', paste(plotvars,collapse='+' ),')) ~ tod | day'))
    a <- xyplot(f
                ,data=local.df.wim.agg
                ,main=paste("Scatterplot mean speeds from summary reports,",year," by time of day at site",wim.site,direction,"\nRevised method, pre-imputation")
                ,strip=strip.function.a
                ,xlab="Hour of the day"
                ,ylab="Hourly mean speeds"
              ,panel=pf
                ,auto.key=TRUE)
    print(a)

    ## add plots of data over time

    plotvars <- grep('not_heavyheavy_',x=names(local.df.wim.agg),perl=TRUE,value=TRUE)
    f <- formula(paste('I(', paste(plotvars,collapse='+' ),') ~ ts'))
    a <- xyplot(f
                ,data=local.df.wim.agg
                ,main=paste("Scatterplot non-heavy heavy duty truck counts",year," over time at site",wim.site,direction,"\nRevised method, pre-imputation")
                ,strip=strip.function.a
                ,xlab="Date"
                ,ylab="non HHD truck counts per hour"
                ,auto.key=TRUE)
    print(a)

    plotvars <- grep('^heavyheavy_',x=names(local.df.wim.agg),perl=TRUE,value=TRUE)
    f <- formula(paste('I(', paste(plotvars,collapse='+' ),') ~ ts'))
    a <- xyplot(f
                ,data=local.df.wim.agg
                ,main=paste("Scatterplot heavy heavy duty truck counts",year," over time at site",wim.site,direction,"\nRevised method, pre-imputation")
                ,strip=strip.function.a
                ,xlab="Date"
                ,ylab="HHD truck counts per hour"
                ,auto.key=TRUE)
    print(a)

    plotvars <- grep('^count_all',x=names(local.df.wim.agg),perl=TRUE,value=TRUE)
    f <- formula(paste('I(', paste(plotvars,collapse='+' ),') ~ ts'))
    a <- xyplot(f
                ,data=local.df.wim.agg
                ,main=paste("Scatterplot counts from summary reports,",year," over time at site",wim.site,direction,"\nRevised method, pre-imputation")
                ,strip=strip.function.a
                ,xlab="Date"
                ,ylab="Hourly vehicle counts, all classes"
                ,auto.key=TRUE)
    print(a)

    splotvars <- grep('^wgt',x=names(local.df.wim.agg),perl=TRUE,value=TRUE)
    f <- formula(paste('I( (', paste(splotvars,collapse='+' ),') / (', paste(plotvars,collapse='+' ),')) ~ ts'))
    a <- xyplot(f
                ,data=local.df.wim.agg
                ,main=paste("Scatterplot mean speeds from summary reports,",year," over time at site",wim.site,direction,"\nRevised method, pre-imputation")
                ,strip=strip.function.a
                ,xlab="Date"
                ,ylab="Hourly mean speeds"
                ,auto.key=TRUE)
    print(a)

    dev.off()
    gc()


    files.to.attach <- dir(paste('images/',direction,sep=''),pattern=paste(wim.site,direction,year,'agg.redo_00',sep='_'),full.names=TRUE)

    for(f2a in files.to.attach){
      couch.attach(trackingdb
                   ,cdb.wimid
                   ,f2a
                   ,local=TRUE
                   )
    }

    ## save and move on to the next one

    ## but save where?
    ## to couchdb as hourly data??
    ## no, to fs on lysithia.  Need to write that still into node server
    ## really couchdb would be the best
    ##
    ## but for now, fs on lysithia.  sigh

    ## step through the path components, make directories
    savepath <- paste(wim.path,year,sep='/')
    if(!file.exists(savepath)){dir.create(savepath)}
    savepath <- paste(savepath,wim.site,sep='/')
    if(!file.exists(savepath)){dir.create(savepath)}
    savepath <- paste(savepath,direction,sep='/')
    if(!file.exists(savepath)){dir.create(savepath)}
    filepath <- paste(savepath,'wim.agg.RData',sep='/')

    db.legal.names  <- gsub("\\.", "_", names(local.df.wim.agg))

    names(local.df.wim.agg) <- db.legal.names
    save(local.df.wim.agg,file=filepath,compress='xz')

  }
