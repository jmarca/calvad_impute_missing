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

## JS and R dependencies

The package.json of this package and all of its dependencies have been
designed so that `npm install` should download and install everything
necessary for both R and JS.
As noted above, make sure you are running npm version 5.3.0 or
better.
To upgrade npm, just run

```
sudo npm i -g npm
```

Once you have verified that npm is recent, install the dependencies.
Be aware that this will take some time.

```
rm -rf node_modules .Rlibs ## see note below
npm install
```

I highly recommend running the `rm -rf node_modules .Rlibs` command
noted above so as to start fresh as of the latest TAMS upgrade (July
2017); many of the libraries have changed.  If you've cleaned up and
run npm install since July of 2017, you can save a lot of time by
*not* running that command.

One requirement that is not run by default is that the target couchdb
database must have some views pre-installed for the imputation step to
work properly.  This is noted below.

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
        "admin":{
            "user":"sqladminacct"
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

Three things to note.  First the database information is used primarily
so as to set up temporary, test-only databases.  Second, the "calvad"
part of the config file should point to the test files included in
this repository. Finally, if the usual "postgres" admin account is
inappropriate, then you can change that using the "admin->user" field
in the config file.  Note that "user" is not "username".  This is not
consistent, and may be changed in the future, but for now the admin
user is called "user" while the regular username is specified with
"username".  The postgresql admin account is only used to create a
temporary table, and then to delete that temporary table.  Look in
`test/pg_utils.js` for more details.

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

You might need to edit the package.json and give the test script a
longer timeout value.  Currently the test script line reads:

```
    "test": "mocha ./test/test_* -R list --timeout 240000",
```

The 240000 is the number of miliseconds to allow before cancelling the test.
If you change 240000 to 0 you will give the test infinite time.
Running the tests on lysithia currently needs about 15 minutes, which
is 900000 milliseconds.


# Running the imputation of missing values

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
        "db":"vdsdata%2ftracking",
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

## Deploy required views to CouchDB

### WIM and TAMS views

To install the WIM and TAMS views, run the utility program that comes
as part of the `calvad_wim_sites` package.  It should have been
installed under `./node_modules/.bin`.  To run it, do the following:

```
./node_modules/.bin/write_views --config config.json
```

To run it, you have to have a proper config file, as noted above.

In some cases, even with a recent version of npm, an incorrect version
of `config_okay` is assigned to the `calvad_wim_sites` package that
contains the `write_views` program.  If the above command gives an
error that looks like:

```
/home/james/repos/jem/calvad/calvad_impute_missing/node_modules/calvad_wim_sites/write_views.js:21
    .then(async (config) => {
    ^

TypeError: Cannot read property 'then' of null
    at Object.<anonymous> (/home/james/repos/jem/calvad/calvad_impute_missing/node_modules/calvad_wim_sites/write_views.js:21:5)
    at Module._compile (module.js:569:30)
    at Object.Module._extensions..js (module.js:580:10)
    at Module.load (module.js:503:32)
    at tryModuleLoad (module.js:466:12)
    at Function.Module._load (module.js:458:3)
    at Function.Module.runMain (module.js:605:10)
    at startup (bootstrap_node.js:158:16)
    at bootstrap_node.js:575:3
```

then the only solution at this time is to delete the node_modules
directory and reinstall the dependencies:

```
rm -rf node_modules
npm install
```

This has only happened a few times in testing, and so may not be an
issue in practice.

### VDS views

To install the VDS views to CouchDB, do the following (taken from the
README file for the `calvad_vds_sites` package).  With a config file
contained in a file called (as an example) "myconfig.json" (but most
likely it will be the usual config.json file as defined above), and
with the required views defined in the package `calvad_vds_sites`, you
can run the following command:


```
node ./node_modules/couchdb_put_view/put_view.js -c my.config.json -v node_modules/calvad_vds_sites/couchdb_views/view.json
```

A good result will look like:

```
{ _: [],
  c: 'test.config.json',
  v: 'node_modules/calvad_vds_sites/couchdb_views/view.json' }
/home/james/repos/jem/calvad/calvad_impute_missing
{ ok: true,
  id: '_design/vds',
  rev: '1-c6ed2c21589806f03e7a6d87839fcb2e' }
```

If you already have the view installed in the target database
(identified by the `{couchdb:{db:"vdsdata%2ftracking"}}` or similar
entry in the config JSON file), then the output will complain about a
conflict.  For example:

```
{ _: [],
  c: 'test.config.json',
  v: 'node_modules/calvad_vds_sites/couchdb_views/view.json' }
/home/james/repos/jem/calvad/calvad_impute_missing
/home/james/repos/jem/calvad/calvad_impute_missing/node_modules/couchdb_put_view/couchdb_put_view.js:67
        if(err) throw new Error(err)
                ^

Error: Error: Conflict
    at /home/james/repos/jem/calvad/calvad_impute_missing/node_modules/couchdb_put_view/couchdb_put_view.js:67:23
    at Request.callback (/home/james/repos/jem/calvad/calvad_impute_missing/node_modules/superagent/lib/node/index.js:688:3)
    at /home/james/repos/jem/calvad/calvad_impute_missing/node_modules/superagent/lib/node/index.js:883:18
    at IncomingMessage.<anonymous> (/home/james/repos/jem/calvad/calvad_impute_missing/node_modules/superagent/lib/node/parsers/json.js:16:7)
    at emitNone (events.js:91:20)
    at IncomingMessage.emit (events.js:188:7)
    at endReadableNT (_stream_readable.js:975:12)
    at _combinedTickCallback (internal/process/next_tick.js:80:11)
    at process._tickCallback (internal/process/next_tick.js:104:9)
```

This conflict error is okay.  All it means is that there is already a
view in the database with the same name as the view you are trying to
load, and couchdb is set up to reject such conflicts unless you also
provide it with a revision number.  Since the point is to put the view
into an empty database, not to update it in an active database, there
is no problem with this error message.



## Installing CalVAD R code

As noted above, all of the required R libraries are installed by
running `npm install`.  This works using two mechanisms.

First there is a script in this package called `RinstallDeps.R`.  An
identical script is contained in every one of the CalVAD R packages.
This script will locate or create a directory called `.Rlibs` as a
sibling of the top level `node_modules` directory in the current
directory tree.  This is used as the location for all library and
dependency installs.

In other words, with a completely baseline R installation, containing
only the required R libraries in the system library directories,
running npm install will set up a *local* .Rlibs directory that
contains everything else needed to run the CalVAD R code.

In earlier versions of this library, this was not the case.  Running
`npm install` would not have installed all of the required R
libraries.  Things have changed recently, and all of the required
libraries should be installed automatically if they are not present in
the system library.

# Running the imputations

There are five different kinds of imputation, three of which are
handled by this package.  In the example command lines below, the
number of simultaneous jobs is set to 1 (it is the only option for the
VDS imputation).  If your computer has a lot of RAM, you can run more
jobs, or, by using different config files, run different sets of years
or districts in simultaneous, parallel jobs.  Note that if the tests
pass okay, then these three command lines have already been run in a
reduced form.  Problems that arise are likely to be related to RAM
issues, or screwy input data.  If the tests don't pass, then you
shouldn't try to run the following command lines, as they are unlikely
to work.

1. Impute missing data at VDS sites

```
node ./trigger_vds_impute.js > vds_impute.log 2>&1 &
```

2. Impute missing data at WIM sites

```
NUM_RJOBS=1 node ./trigger_wim_impute.js > wim_impute.log 2>&1 &
```


3. Impute missing data at TAMS sites

```
NUM_RJOBS=1 node ./trigger_tams_impute.js > tams_impute.log 2>&1 &
```

4. Impute truck counts at VDS sites

This is handled by the package `calvad_impute_trucks`.

5. Impute vehicle counts at WIM and TAMS sites

This is handled by the package `calvad_impute_trucks`.





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
