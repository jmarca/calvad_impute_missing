##' Use the median daily max check, and plot both before and after.
##'
##' @title check.wim.with.plots
##' @param df the dataframe to check
##' @param wim.site the wim site number
##' @param direction the direction for this df data
##' @param year the year
##' @param trackingdb the trackingdb (couchdb, for saving plots)
##' @param wim.path the wim path
##' @param config the configuration file with all the passwords, etc
##' @return a new dataframe to use, missing outliers
##' @author James E. Marca
check.wim.with.plots <- function(df,wim.site,direction,year,trackingdb,wim.path){

    attach.files <- plot_wim.data(df
                                 ,wim.site
                                 ,direction
                                 ,year
                                 ,fileprefix='raw'
                                 ,subhead='\npre imputation'
                                 ,force.plot=TRUE
                                 ,trackingdb=trackingdb
                                 ,wim.path=wim.path)

    config <- rcouchutils::get.config()
    sqldf_postgresql(config)

    ##df.ts <- max.check(df)
    df.ts <- good.high.clustering(df)

    attach.files2 <- plot_wim.data(df.ts
                                 ,wim.site
                                 ,direction
                                 ,year
                                 ,fileprefix='raw_limited'
                                 ,subhead='\npre imputation'
                                 ,force.plot=TRUE
                                 ,trackingdb=trackingdb
                                 ,wim.path=wim.path)

    return( c(attach.files,attach.files2))

}

reassess <- function(wim.site,year,con,
                     wim.path='/data/backup/wim',
                     trackingdb='vdsdata%2ftracking'){
    wim.data <- load.wim.from.db(wim.site,year,con,wim.path,trackingdb)

    db_result <- get.wim.directions(wim.site=wim.site,con=con)
    directions <- db_result$direction


    for(direction in directions){
        wim.df <- wim.data[[direction]]
        plot.files <- check.wim.with.plots (wim.df,wim.site,direction,year,trackingdb,wim.path)
    }
}
