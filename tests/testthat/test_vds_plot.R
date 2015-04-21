config <- rcouchutils::get.config(Sys.getenv('RCOUCHUTILS_TEST_CONFIG'))

## test database
parts <- c('test','vds','plots')
result <- rcouchutils::couch.makedb(parts)

test_that('can plot raw and imputed data',{

    file  <- './files/1211682_ML_2012.txt.xz'
    fname <- '1211682_ML_2012'
    vds.id <- 1211682
    year <- 2012
    seconds <- 120
    path <- './files/'


    context('plot imputed data')
    df_agg <- calvadrscripts::get.and.plot.vds.amelia(
        vds.id,year=year,doplots=TRUE,
        remote=FALSE,
        path=path,
        force.plot=TRUE,
        trackingdb=parts)

    context('plot raw data')
    result <- calvadrscripts::plot_raw.data(fname,file,path,year,vds.id
                       ,remote=FALSE
                       ,force.plot=TRUE
                       ,trackingdb=parts)


    expect_that(min(df_agg$nl1,na.rm=TRUE),equals(0.0))
    ## print(sprintf("%0.10f",mean(df_agg$nl1,na.rm=TRUE)))
    expect_that(mean(df_agg$nl1,na.rm=TRUE),equals(269.98356,tolerance = .001))
    expect_that(median(df_agg$nl1,na.rm=TRUE),equals(210,tolerance = .001))
    expect_that(max(df_agg$nl1,na.rm=TRUE),equals(1567))

    createdfiles <- dir(path='.',
                        pattern='png$',
                        full.names=TRUE,
                        recursive=TRUE)
    expect_that(sort(createdfiles),equals(
        c("./images/1211682/1211682_2012_amelia_001.png"
        , "./images/1211682/1211682_2012_imputed_001.png"
        , "./images/1211682/1211682_2012_imputed_002.png"
        , "./images/1211682/1211682_2012_imputed_003.png"
        , "./images/1211682/1211682_2012_imputed_004.png"
        , "./images/1211682/1211682_2012_raw_001.png"
        , "./images/1211682/1211682_2012_raw_002.png"
        , "./images/1211682/1211682_2012_raw_003.png"
        , "./images/1211682/1211682_2012_raw_004.png")))

    doc <- rcouchutils::couch.get(parts,vds.id)
    attachments <- doc[['_attachments']]
    expect_that(attachments,is_a('list'))

    expect_that(sort(names(attachments)),equals(
        c("1211682_2012_amelia_001.png"
        , "1211682_2012_imputed_001.png"
        , "1211682_2012_imputed_002.png"
        , "1211682_2012_imputed_003.png"
        , "1211682_2012_imputed_004.png"
        , "1211682_2012_raw_001.png"
        , "1211682_2012_raw_002.png"
        , "1211682_2012_raw_003.png"
        , "1211682_2012_raw_004.png")))

})



unlink('./files/1211682_ML_2012.120.imputed.RData')
unlink('./files/1211682_ML_2012.df.2012.RData')
rcouchutils::couch.deletedb(parts)
