file = Sys.getenv(c('FILE'))[1]
if('' == file || is.na(file)){
  print('assign a file to process to the FILE environment variable')
  quit(save='no',status=3)
}
## cleancouch = Sys.getenv(c('CLEAN_COUCH'))[1]
## if(!is.na(cleancouch) || '' != cleancouch){
##     cleancouch <- FALSE
## }else{
##     cleancouch <- TRUE
## }

env <- new.env()
res <- load(file=file,envir=env)

if(class(x=env[[res]]) != "amelia"){
    quit(save='no',2)
}

message <- env[[res]]$message

## print(message)
match_it <- grep(pattern='^Normal EM',ignore.case=TRUE,perl=TRUE,x=message)
if(match_it == 1){
    ## good result
    if(length(env[[res]]$imputations) == 5){
        ## good number of imputations
        quit(save='no',0)
    }
}

## ## still here, save the error conditions?
## if(cleancouch){
##     rcouchutils::couch.set.state(
##         year=year,id=vds.id,db=trackingdb,
##         doc=list(
##             'raw_imputation_code'=env[[res]]$code,
##             'raw_imputation_message'=env[[res]]$message
##         )
##     )
## }
quit(save='no',1)
