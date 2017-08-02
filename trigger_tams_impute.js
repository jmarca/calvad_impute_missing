
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('d3-queue').queue

var suss_detector_id = require('suss_detector_id')
var argv = require('minimist')(process.argv.slice(2))


var tamspath = process.env.TAMS_PATH

var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length
// num_CPUs=1 // while testing

var R;


const setter = require('couch_set_state')
const wim_sites = require('calvad_wim_sites')
const tams_row_has_year = wim_sites.tams_row_has_year
const set_tams_data_state = wim_sites.set_tams_data_state
const tams_sitelist = wim_sites.tams_sitelist
var unique_tams = {}

// configuration stuff
var rootdir = path.normalize(process.cwd())
var RCall = ['--no-restore','--no-save','tams_impute.R']
var Rhome = path.normalize(rootdir+'/R')
var opts = {cwd: Rhome
           ,env: process.env
           }

var config_file = path.normalize(rootdir+'/config.json')
var config
var config_okay = require('config_okay')

// process command line arguments
if(argv.config !== undefined){
    config_file = path.normalize(rootdir+'/'+argv.config)
}
console.log('setting configuration file to ',config_file,'.  Change with the --config option.')


/**
 * refactor items
 *
 * 1. get files here
 * 2. send just a single file to R for processing
 * 3. which means make sure that each file that is sent to R really
 *    needs processing
 *
 */

var trigger_R_job = function(task,done){
    var R,logfile,logstream,errstream
    var tams = task.tams
    var year = task.year

    task.env.RYEAR=year
    task.env.TAMS_SITE=tams
    task.env.TAMS_IMPUTE=1
    task.env.TAMS_PLOT_PRE=1
    task.env.TAMS_PLOT_POST=1

    R  = spawn('Rscript', RCall, task);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    logfile = 'log/tamsimpute_'+tams+'_'+task.year+'.log'
    logstream = fs.createWriteStream(logfile
                                     ,{flags: 'a'
                                       ,encoding: 'utf8'
                                       ,mode: 0o666 })
    errstream = fs.createWriteStream(logfile
                                     ,{flags: 'a'
                                       ,encoding: 'utf8'
                                       ,mode: 0o666 })
    R.stdout.pipe(logstream)
    R.stderr.pipe(errstream)
    R.on('exit',async function(code){
        console.log('got exit: '+code+', for ',tams,' ',year)
        let state = 'finished'
        if(code !== 10 ){
            if(code === 'NULL' || code === null){
                state = 'possible RAM issues'
            }else{
                state = 'issues'
            }
        }
        await setter({'db':task.couchdb.db
                      ,'doc': tams
                      ,'year':year
                      ,'state':'imputed'
                      ,'value':state})

        // testing
        // throw new Error('croak')
        return done()
    })
}

var years = []//,2011];


var doover = process.env.TAMS_REDO

function _configure(cb){
    console.log('configuring')
    if(config === undefined){
        config_okay(config_file,function(e,c){
            if(e) throw new  Error(e)
            console.log(c)
            opts.env.R_CONFIG=config_file
            config = c
            if(config.calvad !== undefined){
                // override the above hard coding stuffs
                if(config.calvad.years !== undefined){
                    if(!Array.isArray(config.calvad.years)){
                        config.calvad.years = [config.calvad.years]
                    }
                    years = config.calvad.years
                }
                if(config.calvad.tams_redo !== undefined){
                    doover =config.calvad.tams_redo
                }

                opts.env.TAMS_PLOT_PRE  =config.calvad.tams_plot_pre  !== undefined ? config.calvad.tams_plot_pre  : 1
                opts.env.TAMS_PLOT_POST =config.calvad.tams_plot_post !== undefined ? config.calvad.tams_plot_post : 1
                opts.env.TAMS_IMPUTE    =config.calvad.tams_impute    !== undefined ? config.calvad.tams_impute    : 1
                opts.env.TAMS_FORCE_PLOT=config.calvad.tams_force_plot
                opts.env.TAMS_PATH      =config.calvad.tamspath

            }

            return cb(null,config)
        })
        return null
    }else{
        return cb(null,config)
    }
}

function redoer(year,queuer){

    // hack to force all to be redone?
    console.log('scheduling redo of all tams sites')

    const check_year = tams_row_has_year(year)


    // can do a little better than wim version here
    // because tams sites list has information on the
    // years of data available
    // so I can skip if data does not include year
    const site_years = []
    const couch_state_jobs = []
    tams_sitelist.forEach( row => {
        const siteid = row.site
        console.log(siteid)
        if(check_year(row) && unique_tams[siteid+year] === undefined){
            site_years.push({'tams':siteid,'year':year})
            unique_tams[siteid+year]=1
            queuer.defer(setter
                         ,Object.assign({}
                                        ,config.couchdb
                                        ,{'doc': 'tams.'+siteid
                                          ,'year':year
                                          ,'state':'data'
                                          ,'value':row.table_data}))
        }
        return null
    })

    site_years.forEach( sy =>{
        console.log(sy.tams,sy.year)
        var _opts = Object.assign({},opts)
        _opts.tams=sy.tams
        _opts.year=sy.year
        console.log('push ',sy.tams)
        queuer.defer(trigger_R_job,_opts)

        return null
    })
}


_configure(function(e,r){
    console.log('processing years')
    var fileq
    var yearq
    if(e) throw new Error(e)
    fileq = queue(num_CPUs);
    yearq = queue(1)


    years.forEach(function(year){
        console.log('checking ',year)
        var opt =Object.assign(opts,
                               {'year':year
                                ,'couchdb': config.couchdb})
        function handle_couch_query(e,r){
            console.log('couch error is\n',e)
            console.log('couch result is\n',r)
            if(r && r.rows !== undefined && r.rows.length >0){
                console.log("loaded r.rows of length "+r.rows.length)
            }else{
                console.log('got nothing from couchdb, forcing redo of ',year)
                redoer(year,fileq)
                return null
            }
            if(r && r.rows !== undefined && r.rows.length >0){
                r.rows.forEach(function(row){
                    const siteid = row.key[2]
                    if(unique_tams[siteid+year] === undefined){
                        var _opts = Object.assign({},opts)
                        _opts.tams=siteid
                        _opts.year=year
                        console.log('push site: ',siteid)

                        fileq.defer(trigger_R_job,_opts)
                    }
                    unique_tams[siteid+year]=1
                    return null
                })
            }
            return null
        }
        if(doover){
            console.log('forcing do over')
            // skip the couch query altogether
            console.log('forcing redo of ',year)
            redoer(year,fileq)
        }else{
            console.log('checking with couchdb for done state')
             console.log(opt.year)
             console.log(opt.couchdb)


            yearq.defer( cb => {
                wim_sites.get_tams_need_imputing(opt,function(e,r){
                    if(e) return cb(e)
                    var result = handle_couch_query(e,r)
                    return cb(null,result)
                })
                return null
            })
        }
        return null
    })

    yearq.await(function(){
        // done loading fileq, so set the final "await" on it
        console.log('done processing years and setting up jobs. Waiting for jobs to finish')
        fileq.await(function(){
            console.log('tams file processing has drained')
            return null
        })
        return null
    })

})




1
