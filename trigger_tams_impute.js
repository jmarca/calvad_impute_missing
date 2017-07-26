
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

    task.env.RYEAR=task.year
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
    R.on('exit',function(code){
        console.log('got exit: '+code+', for ',tams)
        // testing
        // throw new Error('croak')
        return done()
    })
}

var years = []//,2011];


var tams_sites = require('calvad_tams_sites')

var unique_tams = {}

var doover = process.env.TAMS_REDO

function _configure(cb){
    if(config === undefined){
        config_okay(config_file,function(e,c){
            if(e) throw new  Error(e)
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

_configure(function(e,r){
    var fileq
    var yearq
    if(e) throw new Error(e)
    fileq = queue(num_CPUs);
    yearq = queue(1)


    years.forEach(function(year){

        var opt =Object.assign(opts,
                               {'year':year
                                ,'config_file':config_file})
        //opt.couchdb = config.couchdb
        function handle_couch_query(e,r){
            var w
            // // how to hack to force a few detectors to be redone
            // r.rows = [{ id: 'tams.12.S ',  key: [ 2010, 'nothing', '12' ,'S'  ], value: null }
            //          ,{ id: 'tams.28.N ', key: [ 2010, 'nothing', '28' ,'N' ], value: null }
            //          ,{ id: 'tams.23.W ', key: [ 2010, 'nothing', '23' ,'W'  ], value: null }
            //          ,{ id: 'tams.108.S', key: [ 2010, 'nothing', '108','S' ], value: null }
            //          ,{ id: 'tams.27.S ', key: [ 2010, 'nothing', '27' ,'S'  ], value: null }
            //          ,{ id: 'tams.26.E ', key: [ 2010, 'nothing', '26' ,'E'  ], value: null }
            //          ,{ id: 'tams.22.W ', key: [ 2010, 'nothing', '22' ,'W'  ], value: null }
            //          ]
            console.log(e,r)
            if(r && r.rows !== undefined && r.rows.length >0){
                console.log("loaded r.rows of length "+r.rows.length)
            }else{
                console.log('got nothing from couchdb')
                doover = 1
            }

            // hack to force all to be redone?
            if(doover){
                console.log('scheduling redo of all tams sites')
                var allsites = tams_sites.sites

                allsites.forEach(function(row){
                    w = row.site
                    if(unique_tams[w+year] === undefined){
                        var _opts = Object.assign({},opts)
                        _opts.tams=w
                        _opts.year=year
                        if(row.site < 800){
                            console.log('push ',row.site)
                            fileq.defer(trigger_R_job,_opts)
                        }
                        unique_tams[w+year]=1
                    }
                    return null
                })
            }
            if(r && r.rows !== undefined && r.rows.length >0){
                r.rows.forEach(function(row){
                    w = row.key[2]
                    if(unique_tams[w+year] === undefined){
                        var _opts = Object.assign({},opts)
                        _opts.tams=w
                        _opts.year=year
                        console.log('push site: ',w)

                        fileq.defer(trigger_R_job,_opts)
                    }
                    unique_tams[w+year]=1
                    return null
                })
            }
            return null
        }
        //console.log(opt)
        yearq.defer(tams_sites,opt,handle_couch_query)
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
