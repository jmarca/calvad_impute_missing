
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('d3-queue').queue

var suss_detector_id = require('suss_detector_id')
var argv = require('minimist')(process.argv.slice(2))


var wimpath = process.env.WIM_PATH

var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length
// num_CPUs=1 // while testing

var statedb = 'vdsdata%2ftracking'

var R;

// configuration stuff
var rootdir = path.normalize(process.cwd())
var RCall = ['--no-restore','--no-save','wim_impute.R']
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
    var wim = task.wim

    task.env.RYEAR=task.year
    task.env.WIM_SITE=wim
    task.env.WIM_IMPUTE=1
    task.env.WIM_PLOT_PRE=1
    task.env.WIM_PLOT_POST=1

    R  = spawn('Rscript', RCall, task);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    logfile = 'log/wimimpute_'+wim+'_'+task.year+'.log'
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
        console.log('got exit: '+code+', for ',wim)
        // testing
        // throw new Error('croak')
        return done()
    })
}

var years = [2012]//,2011];


var wim_sites = require('calvad_wim_sites')

var unique_wim = {}

var doover = process.env.WIM_REDO

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
                if(config.calvad.wim_redo !== undefined){
                    doover =config.calvad.wim_redo
                }

                opts.env.WIM_PLOT_PRE  =config.calvad.wim_plot_pre  !== undefined ? config.calvad.wim_plot_pre  : 1
                opts.env.WIM_PLOT_POST =config.calvad.wim_plot_post !== undefined ? config.calvad.wim_plot_post : 1
                opts.env.WIM_IMPUTE    =config.calvad.wim_impute    !== undefined ? config.calvad.wim_impute    : 1
                opts.env.WIM_FORCE_PLOT=config.calvad.wim_force_plot
                opts.env.WIM_PATH      =config.calvad.wimpath

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
            // r.rows = [{ id: 'wim.12.S ',  key: [ 2010, 'nothing', '12' ,'S'  ], value: null }
            //          ,{ id: 'wim.28.N ', key: [ 2010, 'nothing', '28' ,'N' ], value: null }
            //          ,{ id: 'wim.23.W ', key: [ 2010, 'nothing', '23' ,'W'  ], value: null }
            //          ,{ id: 'wim.108.S', key: [ 2010, 'nothing', '108','S' ], value: null }
            //          ,{ id: 'wim.27.S ', key: [ 2010, 'nothing', '27' ,'S'  ], value: null }
            //          ,{ id: 'wim.26.E ', key: [ 2010, 'nothing', '26' ,'E'  ], value: null }
            //          ,{ id: 'wim.22.W ', key: [ 2010, 'nothing', '22' ,'W'  ], value: null }
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
                console.log('scheduling redo of all wim sites')
                var allsites = wim_sites.sites

                allsites.forEach(function(row){
                    w = row.site
                    if(unique_wim[w+year] === undefined){
                        var _opts = Object.assign({},opts)
                        _opts.wim=w
                        _opts.year=year
                        if(row.site < 800){
                            console.log('push ',row.site)
                            fileq.defer(trigger_R_job,_opts)
                        }
                        unique_wim[w+year]=1
                    }
                    return null
                })
            }
            if(r && r.rows !== undefined && r.rows.length >0){
                r.rows.forEach(function(row){
                    w = row.key[2]
                    if(unique_wim[w+year] === undefined){
                        var _opts = Object.assign({},opts)
                        _opts.wim=w
                        _opts.year=year
                        console.log('push site: ',w)

                        fileq.defer(trigger_R_job,_opts)
                    }
                    unique_wim[w+year]=1
                    return null
                })
            }
            return null
        }
        //console.log(opt)
        yearq.defer(wim_sites,opt,handle_couch_query)
        return null
    })

    yearq.await(function(){
        // done loading fileq, so set the final "await" on it
        console.log('done processing years and setting up jobs. Waiting for jobs to finish')
        fileq.await(function(){
            console.log('wim file processing has drained')
            return null
        })
        return null
    })

})




1
