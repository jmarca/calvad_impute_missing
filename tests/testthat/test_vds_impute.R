config <- rcouchutils::get.config(Sys.getenv('RCOUCHUTILS_TEST_CONFIG'))

library('RPostgreSQL')
m <- dbDriver("PostgreSQL")
## requires environment variables be set externally

con <-  dbConnect(m
                  ,user=config$postgresql$auth$username
                  ,host=config$postgresql$host
                  ,dbname=config$postgresql$db)

unlink('./files/1211682_ML_2012.120.imputed.RData')
unlink('./files/1211682_ML_2012.df.2012.RData')

## test database

parts <- c('test','vds','impute')
result <- rcouchutils::couch.makedb(parts)

context('impute missing data')
test_that("vds impute works okay",{

    file  <- './files/1211682_ML_2012.txt.xz'
    fname <- '1211682_ML_2012'
    vds.id <- 1211682
    year <- 2012
    seconds <- 120
    path <- '.'
    result <- calvadrscripts::self.agg.impute.VDS.site.no.plots(
        fname=fname,
        f=file,
        path=path,
        year=year,
        seconds=seconds,
        goodfactor=3.5,
        maxiter=20,
        con=con,
        trackingdb=parts)


    expect_that(result,equals(1))
    createdfile <- dir(path='.',pattern='df.2012.RData',full.names=TRUE,recursive=TRUE)
    expect_that(createdfile[1],matches(fname))

    createdfile <- dir(path='.',pattern='vds_hour_agg',full.names=TRUE,recursive=TRUE)
    expect_that(createdfile[1],matches(paste('vds_hour_agg',vds.id,sep='.')))

    createdfile <- dir(path='.',
                   pattern=paste(vds.id,'.*imputed.RData$',sep=''),
                   full.names=TRUE,recursive=TRUE)

    expect_that(createdfile[1],matches(paste(vds.id,
                                         '_ML_',
                                         year,'.',
                                         seconds,'.',
                                         'imputed.RData',
                                         sep='')))


    saved.state.doc <- rcouchutils::couch.get(parts,vds.id)
    saved.state <- saved.state.doc[[paste(year)]]$vdsraw_chain_lengths
    expect_that(saved.state,is_a('numeric'))
    expect_that(saved.state,
                equals(c(3,3,3,3,3)))

})


unlink('./vds_hour_agg.1211682.2012.dat')
rcouchutils::couch.deletedb(parts)
