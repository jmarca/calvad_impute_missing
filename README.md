# CalVAD impute missing

A repository to hold code that triggers the various CalVAD imputation
routines

# Overview

This code should be run on raw PeMS and WIM data, but after that data
has been broken up into detector-specific files, using the perl
program `breakup_pems_raw.pl` in the repository called `bdp` (which
stands for bulk download pems).

The instructions below step through how to run this code.

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
the data repository that serves up the broken-up PeMS files.
The server is defined using the environment variables:

```
var server = process.env.CALVAD_FILE_SERVER || 'http://calvad.ctmlabs.net'
var port = process.env.CALVAD_FILE_PORT || 80
```

The default is to get the files from https://calvad.ctmlabs.net.
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

## R dependencies

The R code of course requires R, as well as many packages like Amelia
and Zoo.  The best way to make sure that your R environment has all
the dependencies is to just try to run the code and see where it crashes.

To get the R dependencies, you need to have the node program called
`component` installed.  Install it using npm like so:

```
npm install -g component
```

You might need to run that as `sudo`, depending on your node setup.

Once component is installed, use it to download the dependencies from
my github repository like so:

```
component install
```

This will hit github and download the dependencies listed in
`component.json` into a subdirectory called `components`.  The R
scripts expect to find the code there.  Note that component is only
used here for its ability to download listed dependencies from github.

## TODO, sort out a way to identify the required R packages


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
