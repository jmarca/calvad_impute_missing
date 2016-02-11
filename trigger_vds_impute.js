/*global require process console */

var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('queue-async');
var _ = require('lodash');
var suss_detector_id = require('suss_detector_id')

var double_check_amelia = process.env.CALVAD_DOUBLE_CHECK_VDS_AMELIA



// on lysithia, don't go over 3
// num_CPUs=1

var pems_root = process.env.CALVAD_PEMS_ROOT ||'/data/pems/breakup/'
var root = path.normalize(pems_root)

//var statedb = 'vdsdata%2ftracking'

// configuration stuff
var rootdir = path.normalize(__dirname)
var Rhome = path.normalize(rootdir+'/../R')
var opts = {cwd: Rhome
           ,env: process.env
           }

var config_file = path.normalize(rootdir+'/../config.json')
var config
var config_okay = require('config_okay')

function _configure(cb){
    if(config === undefined){
        config_okay(config_file,function(e,c){
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

var glob = require('glob')


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

var year_district_handler = require('./lib/ydh')

var RCall = ['--no-restore','--no-save','vds_impute.R']


var opts = { cwd: undefined,
             env: process.env
           }
var ydq = queue(1);
years.forEach(function(year){
    districts.forEach(function(district){
        var o = _.clone(opts,true)
        o.env['RYEAR'] = year
        o.env['RDISTRICT']=district
        o.env['CALVAD_PEMS_ROOT']=pems_root

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


1;
