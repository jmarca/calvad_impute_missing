/*global require process console */

var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('queue-async');
var _ = require('lodash');
var get_files = require('./get_files')
var suss_detector_id = require('suss_detector_id')
var couch_check = require('couch_check_state')

var num_CPUs = require('os').cpus().length;

// for testing, just one process at a time
// num_CPUs=1

var statedb = 'vdsdata%2ftracking'

var R;


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
    R.stdout.pipe(logstream)
    R.stderr.pipe(logstream)
    R.on('exit',function(code){
        console.log('got exit: '+code+', for ',did)
        // throw new Error('die')
        return done()
    })
}
var file_queue=queue(num_CPUs)
// async.queue(trigger_R_job,num_CPUs)

var file_queue_drain =function(){
    console.log('queue drained')
    return null
}

function vdsfile_handler(opt){
    // this checks couchdb
    return function(f,cb){
        var did = suss_detector_id(f)

        couch_check({'db':statedb
                    ,'doc':did
                    ,'year':'_attachments'
                    ,'state':[did,opt.env['RYEAR'],'raw','004.png'].join('_')
                    }
                   ,function(err,state){
                        if(err) return cb(err)
                        if(!state){
                            console.log('push to queue '+f)
                            file_queue.defer(trigger_R_job,{'file':f
                                                           ,'opts':opt
                                                           });
                        }
                        return cb()
                    });
        return null
    }
}


var years = [2012]//,2011];

var districts = ['D10'
                // ,
    // did these during debugging
                // , 'D03'
                // ,'D04'
                // ,'D05'
                // ,'D06'
                // ,'D07'
                // ,'D08'
                // ,'D10'
                // ,'D11'
                ]


function year_district_handler(opt,callback){
    // get the files, load the queue

    // this handler, vdsfile_handler_2, will check the file system for
    // "imputed.RData" to see if this detector is done
    var handler = vdsfile_handler(opt)
    console.log('year_district handler, getting list for district:'+ opt.env['RDISTRICT'] + ' year: '+opt.env['RYEAR'])
    get_files.get_yearly_vdsfiles_local(
        {district:opt.env['RDISTRICT']
        ,year:opt.env['RYEAR']}
      ,function(err,list){
           if(err) throw new Error(err)
           console.log('got '+list.length+' listed files.  Sending each to handler for queuing.')
           var fileq = queue(5);
           list.forEach(function(f,idx){
               console.log('pushed ',f)
               fileq.defer(handler,f)
               return null
           });
           fileq.await(function(e){
               return callback(e)
           })
           return null
       })
}

var RCall = ['--no-restore','--no-save','vds_plots.R']


var opts = { cwd: undefined,
             env: process.env
           }
var ydq = queue(1);
years.forEach(function(year){
    districts.forEach(function(district){
        var o = _.clone(opts,true)
        o.env['RYEAR'] = year
        o.env['RDISTRICT']=district
        ydq.defer(year_district_handler,o)
        return null
    })
    return null
})

ydq.await(function(){
    // finished loading up all of the files into the file_queue, so
    // set the await on that
    file_queue.await(file_queue_drain);
    return null
})

1;