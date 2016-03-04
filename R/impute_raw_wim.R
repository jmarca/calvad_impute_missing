wim.path <- "/data/wim"

filepath = Sys.getenv(c('FILE'))[1]
if(is.null(file)){
  print('assign a file to process to the FILE environment variable')
  exit(1)
}

year = as.numeric(Sys.getenv(c('RYEAR'))[1])
if(is.null(year)){
  print('assign the year to process to the RYEAR environment variable')
  exit(1)
}
filepath <- paste(wim.path,filepath,sep='/')

load.result <-  load(file=filepath)

df.wim.amelia <- fill.wim.gaps(local.df.wim.agg
                               ,count.pattern='^(not_heavyheavy|heavyheavy|count_all_veh_speed)'
                               )

## have a WIM site data with no gaps.  save it
aout.name <- make.vds.wim.imputed.name(wim.site,direction,year)
## fs write
file.names <- strsplit(filepath,split="/")

savepath <- file.names[1:(length(file.names)-1)]
savepath <- paste(savepath,sep='/')

save(df.wim.amelia,file=paste(savepath,aout.name,sep="/"),compress="xz")

## plot the imputed result

