/*global require process console */

var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('queue-async');
var _ = require('lodash');
var suss_detector_id = require('suss_detector_id')
var argv = require('minimist')(process.argv.slice(2));

var double_check_amelia = process.env.CALVAD_DOUBLE_CHECK_VDS_AMELIA

var year_district_handler = require('./lib/ydh')

var RCall = ['--no-restore','--no-save','vds_impute.R']


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
var Rhome = path.normalize(rootdir+'/R')
var opts = {cwd: Rhome
           ,env: process.env
           }

var config_file = path.normalize(rootdir+'/config.json')
var config
var config_okay = require('config_okay')

if(argv.config !== undefined){
    config_file = path.normalize(rootdir+'/'+argv.config)
}
console.log('setting configuration file to ',config_file,'.  Change with the --config option.')


function _configure(cb){
    if(config === undefined){
        config_okay(config_file,function(e,c){
            if(e) throw new  Error(e)
            config = c
            return cb(null,config)
        })
        return null
    }else{
        return cb(null,config)
    }
}


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
    var file = task.file
    var did = suss_detector_id(file)
    var opts = _.clone(task.opts)

    opts.env['FILE']=file
    console.log('processing ',file)

    var R  = spawn('Rscript', RCall, opts);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    var logfile = 'log/vdsimpute_'+did+'_'+opts.env['RYEAR']+'.log'
    var logstream = fs.createWriteStream(logfile
                                        ,{flags: 'a'
                                         ,encoding: 'utf8'
                                         ,mode: 0666 })
    var errstream = fs.createWriteStream(logfile
                                        ,{flags: 'a'
                                         ,encoding: 'utf8'
                                         ,mode: 0666 })
    R.stdout.pipe(logstream)
    R.stderr.pipe(errstream)
    R.on('exit',function(code){
        console.log('got exit: '+code+', for ',did)
        //throw new Error('die')
        return done()
    })
    // return done()
}

_configure(function(e,r){
    if(e) throw new Error(e)
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

    }
    var ydq = queue(1);
    console.log(districts)
    years.forEach(function(year){
        districts.forEach(function(district){
            console.log(district)
            var o = _.clone(opts,true)
            o.env['RYEAR'] = year
            o.env['RDISTRICT']=district
            o.district = district

            o.env['CALVAD_PEMS_ROOT']=config.calvad.vdspath
            o.env['R_CONFIG']=config_file
            o.calvad = config.calvad

            ydq.defer(year_district_handler,o,trigger_R_job,double_check_amelia)
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


1;
