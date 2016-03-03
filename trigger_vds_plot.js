/*global require process console */

var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('d3-queue').queue

var _ = require('lodash');
var get_files = require('./lib/get_files')
var suss_detector_id = require('suss_detector_id')
var argv = require('minimist')(process.argv.slice(2));

var year_district_handler = require('./lib/ydh')

var RCall = ['--no-restore','--no-save','vds_impute.R']

var force_plot = true //process.env.CALVAD_FORCE_PLOT
var check_existing = process.env.CALVAD_CHECK_EXISTING_PLOT
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
var rootdir = path.normalize(__dirname)
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


function _configure(cb){
    if(config === undefined){
        config_okay(config_file,function(e,c){
            if(e) throw new  Error(e)
            config = c
            return cb(null,config)
            if(config.force_plot !== undefined){
                force_plot = config.force_plot
            }
            if(config.check_existing_plot){
                check_existing = config.check_existing_plot
            }

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

var trigger_R_job = function(task,done){
    var file = task.file
    var did = suss_detector_id(file)
    var opts = _.clone(task.opts)

    opts.env['FILE']=file
    console.log('processing ',file)

    var R  = spawn('Rscript', RCall, opts);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    var logfile = 'log/vdsplot_'+did+'_'+opts.env['RYEAR']+'.log'
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
        // throw new Error('die')
        return done()
    })
}


function year_district_handler(opt,callback){
    // get the files, load the queue

    // check if there is a plot file in couchdb
    var handler = vdsfile_handler(opt)
    console.log('year_district handler, getting list for district:'+ opt.env['RDISTRICT'] + ' year: '+opt.env['RYEAR'])
    get_files.get_yearly_vdsfiles_local(
        {district:opt.env['RDISTRICT']
        ,year:opt.env['RYEAR']}
      ,function(err,list){
           if(err) throw new Error(err)
           console.log('got '+list.length+' listed files.  Sending each to handler for queuing.')
           var fileq = queue(num_CPUs);
           list.forEach(function(f,idx){
               console.log('queue up ',f)
               fileq.defer(handler,f)
               return null
           });
           fileq.await(function(e){
               return callback(e)
           })
           return null
       })
}

_configure(function(e,r){
    if(e) throw new Error(e)

    var ydq = queue(1);
    years.forEach(function(year){
        districts.forEach(function(district){
            var o = _.clone(opts,true)
            o.env['RYEAR'] = year
            o.env['RDISTRICT']=district

            o.env['CALVAD_PEMS_ROOT']=config.calvad.vdspath
            o.env['R_CONFIG']=config_file
            o.calvad = config.calvad
            o.couchdb = config.couchdb

            ydq.defer(year_district_handler,o,trigger_R_job,double_check_amelia)
            //ydq.defer(year_district_handler,o)
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
