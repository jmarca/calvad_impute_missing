/*global require process console */

var spawn = require('child_process').spawn
var path = require('path')
var fs = require('fs')
var queue = require('d3-queue').queue

var suss_detector_id = require('suss_detector_id')
var argv = require('minimist')(process.argv.slice(2))

var year_district_handler = require('./lib/ydh_plots.js')

var redo_plot = process.env.CALVAD_REDO_PLOT


var years = [2012]//,2011];
var districts = [
    'D03'  //
    ,'D04' //
    ,'D05' //
    ,'D06' //
    ,'D07' //
    ,'D08' //
    ,'D10' //
    ,'D11' //
    ,'D12' //
]

// configuration stuff
var rootdir = path.normalize(process.cwd())
var RCall = ['--no-restore','--no-save','vds_plots.R']
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

if(argv.rdata){ opts.rdata=true }

function _configure(cb){
    if(config === undefined){
        config_okay(config_file,function(e,c){
            if(e) throw new  Error(e)
            config = c
            if(config.calvad !== undefined){
                // override the above hard coding stuffs
                if(config.calvad.districts !== undefined){
                    if(!Array.isArray(config.calvad.districts)){
                        config.calvad.districts = [config.calvad.districts]
                    }
                    districts = config.calvad.districts
                }
                if(config.calvad.years !== undefined){
                    if(!Array.isArray(config.calvad.years)){
                        config.calvad.years = [config.calvad.years]
                    }
                    years = config.calvad.years
                }
                if(config.calvad.redo_plot !== undefined){
                    redo_plot= config.calvad.redo_plot
                }
            }
            return cb(null,config)

        })
        return null
    }else{
        return cb(null,config)
    }
}


/**
 * mimic the refactor from trigger_vds_impute
 * 1. get files here
 * 2. send single files to R
 * 3. so make sure here that the file really needs plotting
 *
 */

function trigger_R_job(task,done){
    var R,logfile,logstream,errstream
    var file = task.file
    var did = suss_detector_id(file)
    var _opts = Object.assign({},task.opts)

    _opts.env.FILE=file
    console.log('processing ',file)
    R  = spawn('Rscript', RCall, _opts)
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    logfile = 'log/vdsplot_'+did+'_'+_opts.env.RYEAR+'.log'
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
        console.log('got exit: '+code+', for ',did)
        // throw new Error('die')
        return done()
    })
}

_configure(function(e,r){
    var ydq
    if(e) throw new Error(e)
    ydq = queue(1)
    years.forEach(function(year){
        districts.forEach(function(district){
            var o = Object.assign({},opts)
            o.env = Object.assign({},opts.env)
            o.env.RYEAR = year
            o.env.RDISTRICT=district
            //o.district = district

            o.env.CALVAD_PEMS_ROOT=config.calvad.vdspath
            o.env.R_CONFIG=config_file
            o.calvad = Object.assign({},config.calvad)
            o.couchdb = config.couchdb

            o.env.CALVAD_FORCE_PLOT=redo_plot

            ydq.defer(year_district_handler,o,trigger_R_job,redo_plot)
            return null
        })
        return null
    })

    ydq.await(function(){
        // finished loading up all of the files into the file_queue, so
        // set the await on that
        console.log('ydq has drained')
        return null
    })
    return null

})

1
