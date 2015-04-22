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

var force_plot = true //process.env.CALVAD_FORCE_PLOT
var check_existing = process.env.CALVAD_CHECK_EXISTING_PLOT
var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length;

// for testing, just one process at a time
//num_CPUs=1

var pems_root = process.env.CALVAD_PEMS_ROOT ||'/data/pems/breakup/'
var root = path.normalize(pems_root)

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
    opts.env['CALVAD_PEMS_ROOT']=pems_root
    opts.env['CALVAD_FORCE_PLOT']=force_plot
    opts.env['COUCHDB_TRACKINGDB']=statedb
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

function vdsfile_handler(opt){
    // this checks couchdb
    return function(f,cb){
        var did = suss_detector_id(f)

        if(check_existing){
	    console.log({'db':statedb
			 ,'doc':did
			 ,'year':'_attachments'
			 ,'state':[did,opt.env['RYEAR'],'raw','004.png'].join('_')
			})
            couch_check({'db':statedb
			 ,'doc':did
			 ,'year':'_attachments'
			 ,'state':[did,opt.env['RYEAR'],'raw','004.png'].join('_')
			}
			,function(err,state){
                            if(err) return cb(err)
                            console.log(state)
                            if(!state){
				console.log('push to queue '+f)
				trigger_R_job({'file':f
                                               ,'opts':opt
                                              },cb);
                            }else{
                                console.log('already done')
                                cb() // move on to the next
                            }
                            return null
			});
            return null
	}else{
            console.log('push to queue '+f)
            trigger_R_job({'file':f
                           ,'opts':opt
                          },cb);
	    return null
	}

    }
}

var years = [2012]//,2011];

var districts = [
    // 'D03' // done 2012
    // 'D04' // done 2012
    //'D05' // done 2012
    //,'D06' // done 2012
    'D07' // activimetrics
    // 'D08' // done 2012
    ,'D10' // activimetrics
    ,'D11' // activimetrics
    ,'D12' // activimetrics
]


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
    console.log('ydq has drained')
    return null
})

1;
