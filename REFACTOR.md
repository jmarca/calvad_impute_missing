# refactoring vds_self_impute_missing_distributed

One of the problems with imputation right now is that I can only do it
on lysithia...the files get stored. there.  

However, the imputation program is also faffing about trying to make
plots and all that.  there is no reason for the imputation program to
make plots, when any other server can download the data and make
plots.

Therefore, split that out first.

1. program to impute data
2. program to generate diagnostic plots


Next, do try to make a file upload service, so I can work on files
anywhere and then upload them.
