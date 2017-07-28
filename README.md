# CalVAD impute missing

# Important note

This **REQUIRES** npm version greater than 5.0.  It will fail to
install the R libraries properly on npm version 5.0.x.  It has been
tested to work on version 5.3.0.

To install all of the dependecy libraries, run

```
npm install
```

The install process installs both javascript and R packages.  This
takes some time, because there are a lot of files to download
(including rather large files that are used to test the R code) and
because many of the R packages require compilation.  On lysithia this
took about 21 minutes.

# Description

A repository to hold code that triggers the various CalVAD imputation
routines

# Overview

This code imputes missing values in VDS (PeMS) and WIM data, and now TAMS data.

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

First, download all the JavaScript and R dependencies using npm.  As
noted above, make sure you are running npm version 5.3.0 or better.
To upgrade npm, just run

```
sudo npm i -g npm
```

Once you have verified that npm is recent, install the dependencies.

```
rm -rf node_modules .Rlibs
npm install
```

I highly recommend starting fresh as of the latest TAMS upgrade (July
2017) because many of the libraries have changed.

I have one test that makes sure that the program can get files from
the data repository that serves up the broken-up PeMS files.  This
functionality is not strictly necessary if you will be using files
stored on the local file system.  To run these tests and prepare for
running the program on real data, you need to set some environment
variables.

# Settings

*changed recently*

(This has changed recently to using a configuration file, config.json)

The code uses a config file, as well as I think just one environment
variable.

The tests also need a valid config file, called test.config.json

The one deviation from my usual practices is that the postgresql test
configuration need to point to a real database, or at least one that
contains everything it needs to load data from WIM site 108 in 2012.
I have not yet saved the required data to create this prior to running
the test.  If/When this condition changes, I will remove this note
here.


## Example test.config.json

An example test.config.json file looks like this:

```
{
    "couchdb": {
        "host": "127.0.0.1",
        "port":5984,
        "trackingdb":"test%2fvdsdata%2ftracking",
        "auth":{"username":"couchuser",
                "password":"my secret password"
               },
        "dbname":"testing",
        "design":"detectors",
        "view":"fips_year"
    },
    "postgresql":{
        "host":"127.0.0.1",
        "port":5432,
        "auth":{
         "username":"sqluser"
        },
        "db":"spatialvds"
    },
    "calvad":{
        "vdspath":"./tests/testthat/evenmorefiles/",
        "wimpath":"./tests/testthat/evenmorefiles/",
        "tamspath":"./tests/testthat/evenmorefiles/",
        "districts":["D01","D03","D04","D06","D09","D10","D11","D12"],
        "years":[2012,2016,2017]
    }
}
```

Two things to note.  First the database information is used primarily
so as to set up temporary, test-only databases.  Second, the "calvad"
part of the config file should point to the test files included in
this repository.

More notes:

The couchdb config file must have the correct username and password.
Also, the various other elements (trackingdb, dbname, design, and
view) need to be there, but the contents doesn't matter at all.

The postgresql configuration does not need the password if you are
using a .pgpass file, or if you have included the password in an
environment variable.  See the PostgreSQL documentation website for
more details.  Please search those docs for ".pgpass" to figure out
how to use this file, but in a nutshell, you need an entry like:

```
#hostname:port:database:username:password
127.0.0.1:*:*:sqluser:myocardial infarction
```

In the above example, the connection to *any* database on *any* port
to host 127.0.0.1 with username "sqluser" will try the password
"myocardial infarction".


Once that has been set up, you should run the tests and make sure all is well.

```
npm test
```

You might need to edit the package.json and give the test script a longer timeout value.  Currently the test script line reads:

```
    "test": "mocha ./test/test_* -R list --timeout 240000",
```

The 240000 is the number of miliseconds to allow before cancelling the test.
If you change 240000 to 0 you will give the test infinite time.


## Example config.json

The actual config.json file used in production is similar to the
test.config.json, except that the databases are the production
databases.

```
{
    "couchdb": {
        "host": "127.0.0.1",
        "port":5984,
        "trackingdb":"vdsdata%2ftracking",
        "auth":{"username":"couchuser",
                "password":"couchpass"
               },
        "dbname":"vdsdata",
        "design":"detectors",
        "view":"fips_year"
    },
    "postgresql":{
        "host":"127.0.0.1",
        "port":5432,
        "auth":{
         "username":"sqlusername"
        },
        "db":"spatialvds"
    },
    "calvad":{
        "vdspath":"/data/pems/breakup/",
        "wimpath":"/data/wim/",
        "tamspath":"/data/tams/data/",
        "districts":["D03","D04","D05","D06","D07","D08","D10","D11","D12"],
        "years":[2012,2013,2014,2015,2016,2017]
    }
}

```


Make sure the right hosts, ports, usernames, and (for couchdb)
password are correct for your situation in the above, and also make
sure you have the right pasth for the "calvad" part, as well as the
districts and years you want to process.  In practice, it is best to
process just one year at a time.


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

To install the required libraries, at the command line, type

```
npm install
```

In earlier versions of this library, this would not have installed all
of the required R libraries.  Things have changed recently, and all of
the required libraries should be installed automatically if they are
not present in the system library.





# Running the imputations

There are five different kinds of imputation.

1. Impute missing data at VDS sites

2. Impute missing data at WIM sites

3. Impute missing data at TAMS sites

4. Impute truck counts at VDS sites

5. Impute vehicle counts at WIM and TAMS sites

Only the first three are handled with this library.  Imputations 4 and
5 are done elsewhere.



# Actually running the imputation (notes as I run it in 2014 for 2010)

Imputing VDS works

Imputing WIM works

I also set up code to exclusively trigger the pre and post impute
plots.

To keep all the couchdb databases synchronized properly, you should
run code from `calvad/strip_attachments_vdsdata_tracking`

After imputing WIM and VDS, you have to merge pairs.  That is what I
am working on now.
find D07/60/W -name *2012.120.imputed.RData  -size +100k -delete

# April 2015 notes (kept for historical interest only)

The backing R library has been completely redone, and there is a
slightly different procedure for loading the R code.  That said, the R
code should not be a concern.  npm install automatically installs the
CalVAD rscripts package, and the R code makes sure that the library is
accessible.

The one requirement, which is the same for the node.js code, is that
the configuration file has to exist.  The default configuration file for
testing is test.config.json, and the default  for production runs is
config.json.  These files should be chmod 0600 (readable and writable
only by the owner) because they contain passwords.  An example is:

```json
{
    "couchdb": {
        "host": "127.0.0.1",
        "port":5984,
        "trackingdb":"test%2fvdsdata%2ftracking",
        "auth":{"username":"couchuser",
                "password":"mycouchpassword"
               },
        "dbname":"testing",
        "design":"detectors",
        "view":"fips_year"
    },
    "postgresql":{
        "host":"127.0.0.1",
        "port":5432,
        "auth":{
         "username":"psqluser"
        },
        "db":"test_stationsparse"
    }
}
```

The production `config.json` file should look the same, but just use
the "real" couchdb and postgresql database names.

Two items of note.  First, that the PostgreSQL portion of the
configuration does not include a password.  That's because postgres
makes use of a .pgpass file, so I do too.  Put your postgresql
passwords there, not here.

Second, the couchdb part has a lot of cruft in the example.  The
"dbname" parameter is used to expand names.  It prepends any sequence
of names.  It doesn't really apply in production, but it is used
extensively in testing.  In production just set it to "vdsdata".

The trackingdb should be set to "vdsdata%2ftracking" in production,
and the dbname to "vdsdata".  The design and view aren't used here,
but are used in other CalVAD modules.

# Feb 2016 notes  (kept for historical interest only)

The test.config.json should have the following bit at the end

```
    "calvad":{
        "vdspath":"./tests/testthat/evenmorefiles/",
        "districts":["D01","D03","D04","D06","D09","D10","D11","D12"],
        "years":[2012]
    }
```

This will allow the trigger_vds_impute.js test to run properly.


## WIM imputation

WIM data imputation requires that the WIM raw data be processed into
CSV and summary reports and then loaded into the postgresql database.
Further, it also requires that the status spreadsheets be processed
and loaded into the database.
