config <- rcouchutils::get.config(Sys.getenv('RCOUCHUTILS_TEST_CONFIG'))

library('RPostgreSQL')
m <- dbDriver("PostgreSQL")
## requires environment variables be set externally

con <-  dbConnect(m
                  ,user=config$postgresql$auth$username
                  ,host=config$postgresql$host
                  ,dbname=config$postgresql$db)

## this has to contain real data for site 108, year 2012

## test couchdb database

parts <- c('test','wim','impute')
result <- rcouchutils::couch.makedb(parts)

wim.path <- './data'
dir.create(wim.path)

context('impute missing WIM data')
test_that("WIM impute works okay",{

    wim.site <-  108
    seconds <- 3600
    year <- 2012

    list.df.wim.amelia <- calvadrscripts::process.wim.site(
        wim.site=wim.site,
        year=year,
        seconds=seconds,
        preplot=TRUE,
        postplot=TRUE,
        force.plot=FALSE,
        wim.path=wim.path,
        trackingdb=parts,
        con=con
        )
    expect_that(list.df.wim.amelia,is_a('list'))
    directions <- c('S','N')
    for(direction in directions){
        expect_that(list.df.wim.amelia[[direction]]$code,equals(1))
        docid <- paste('wim',wim.site,direction,sep='.')
        doc <- rcouchutils::couch.get(parts,docid)
        attachments <- doc[['_attachments']]
        expect_that(attachments,is_a('list'))
        ## print(sort(names(attachments)))
        expect_that(sort(names(attachments)),equals(
            c(paste(wim.site,direction,year,
                    c(rep('imputed',6),rep('raw',6)),
                    c("001.png",
                      "002.png",
                      "003.png",
                      "004.png",
                      "005.png",
                      "006.png"),
                    sep='_'))
            ))
    }

})

## cleanup
unlink(wim.path,recursive=TRUE)
rcouchutils::couch.deletedb(parts)
