# CalVAD impute missing

A repository to hold code that triggers the various CalVAD imputation
routines

# Overview

This code imputes missing values in VDS (PeMS) and WIM data.

The instructions below step through how to run this code.

# Prerequisites

Before anything can be done here, the analyst must first download and
extract the VDS and WIM observations.

The WIM data is available from Caltrans.  The binary files must be
extracted as ASCII records and then loaded into the PostgreSQL
database.  The WIM status spreadsheets must also have been processed
and stored in the PostgreSQL database.

The VDS 30-second loop detector data is available from Caltrans' PeMS
website.  The daily 30-second files and the detector metadata should
be downloaded.  PeMS data is made available as daily summaries of all
detectors by district.  These files need to be processed and
transposed, so that there is one file per detector per year, rather
than many detectors in one file per day.

The detector metadata needs to be processed and stored in the
PostgreSQL database.  The PeMS data should be stored in the file
system, and then broken up into the one-file-per-detector format.


# Process the PeMS broken up data with R processing code

Once the PeMS data is broken up, you can run the R code in this
repository to impute missing data.

To do this, change directory into the `/calvad_impute_missing`
repository (you're probably in that repo now if you're reading this
README file).  You can clone this repository from
<https://github.com/jmarca/calvad_impute_missing> with the command
`git clone https://github.com/jmarca/calvad_impute_missing`.

To make sure you're running the latest code, from within the repo type

```
git pull
```

in order to download the latest code and merge with any changes you've
made.


From within the `calvad_impute_missing` directory, you need to
download the requirements to run both the node.js/JavaScript, and the
R code.

## JS dependencies

First, download all the JavaScript dependencies using npm:

```
npm install
```

I have one test that makes sure that the program can get files from
the data repository that serves up the broken-up PeMS files.  This
functionality is not strictly necessary if you will be using files
stored on the local file system.  To run these tests and prepare for
running the program on real data, you need to set some environment
variables.

# settings

*Soon to change*

(This will soon change to using a configuration file, config.json)


The server is defined using the environment variables:

```
CALVAD_FILE_SERVER = 'http://lysithia.its.uci.edu'
CALVAD_FILE_PORT = 80
```

The default is to get the files from https://calvad.ctmlabs.net, which
sadly appears to be an expired domain (funding for that project was cut).
There is also a parallel version of the fetching code that will pull
from a local file system, looking by default under the directory
'/data/pems/breakup/' that is currently hardcoded in the file
`get_files.js`.

The test program should exercise both the remote get and the local
get.  Run the test with the command:

```
mocha test --timeout 5000
```

Increase the timeout if you have a slow network connection or the test
times out.

# R dependencies

The R code of course requires R, as well as many packages like Amelia
and Zoo.  One perfect way to make sure that your R environment has all
the dependencies is to just try to run the code in an interactive R
session and see where it crashes.


## CalVAD R code

Previously, I was using component to install R dependencies, with the
ambition of packaging all of the files into a single R file.  That
didn't work as well as planned, so I've switched to using npm.  All of
*my* R libraries should have been installed automatically from github
using the prior `npm install` command.

## CRAN R code

There are many packages that are used from the Comprehensive R Archive
Network, and others that can be loaded from github directly using the
R devtools package.

Aside from devtools itself, at the moment the required R packages can
be loaded using CRAN versions.  The list of R packages follows.

```
install.packages(
    c('Amelia',
      'Hmisc',
      'MASS',
      'MBA',
      'OpenStreetMap',
      'RCurl',
      'RJSONIO',
      'RPostgreSQL',
      'Zelig',
      'animation',
      'cluster',
      'doMC',
      'fields',
      'ggplot2',
      'lattice',
      'maps',
      'mgcv',
      'plyr',
      'read.ogr',
      'sp',
      'spBayes',
      'spTimer',
      'spatial',
      'testthat',
      'zoo'))
```



# Running the imputations

There are four different kinds of imputation.

1. Impute missing data at VDS sites

2. Impute missing data at WIM sites

3. Impute truck counts at VDS sites

4. Impute vehicle counts at WIM sites


# Actually running the imputation (notes as I run it in 2014 for 2010)

Imputing VDS works

Imputing WIM works

I also set up code to exclusively trigger the pre and post impute
plots.

To keep all the couchdb databases synchronized properly, you should
run code from `calvad/strip_attachments_vdsdata_tracking`

After imputing WIM and VDS, you have to merge pairs.  That is what I
am working on now.
