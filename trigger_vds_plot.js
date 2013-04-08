
var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var get_files = require('./get_files')
var suss_detector_id = require('suss_detector_id')
var couch_check = require('couch_check_state')

var statedb = 'vdsdata%2ftracking'

var R;

/**
 * mimic the refactor from trigger_vds_impute
 * 1. get files here
 * 2. send single files to R
 * 3. so make sure here that the file really needs plotting
 *
 */

function vdsfile_handler(opt){
    return function(f,cb){
        var did = suss_detector_id(f)

        couch_check({'db':statedb
                    ,'doc':did
                    ,'year':'_attachments'
                    ,'state':[did,opt.env['RYEAR'],'raw','004.png'].join('_')
                    }
                   ,function(err,state){
                        if(err) return cb(err)
                        console.log({file:f,state:state})
                        if(!state){
                            console.log('push to queue')
                            file_queue.push({'file':f
                                            ,'opts':opt
                                            ,'cb':cb})
                            return null
                        }
                        return cb(err)
                    });
        return null;
    }
}


var trigger_R_job = function(task,done){
    var file = task.file
    console.log('processing '+file)
    // trigger the file loop callback
    if(task.cb !== undefined)   task.cb()
    var did = suss_detector_id(file)
    var opts = _.clone(task.opts)
    opts.env['FILE']=file

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

var file_queue=async.queue(trigger_R_job,2)

var years = [2007,2008,2009,2010,2011];

var districts = ['D04'
                ,'D08'
                ,'D12'
                ,'D05'
                ,'D06'
                ,'D07'
                ,'D03'
                ,'D11'
                ,'D10'
                ]


var RCall = ['--no-restore','--no-save','vds_plots.R']


var opts = { cwd: undefined,
             env: process.env
           }
var years_districts = []
_.each(years,function(year){
    _.each(districts,function(district){
        var o = _.clone(opts,true)
        o.env['RYEAR'] = year
        o.env['RDISTRICT']=district
        years_districts.push(o)
    })
});


// debugging, just do one combo for now
// years_districts=[years_districts[0]]
async.eachLimit(years_districts,2,function(opt,cb){
    // get the files
    var handler = vdsfile_handler(opt)
    console.log('checking '+opt.env['RDISTRICT']+' '+opt.env['RYEAR'])
    get_files.get_yearly_vdsfiles({'district':opt.env['RDISTRICT']
                                  ,'year':opt.env['RYEAR']
                                  ,'rdata':1}
                                 ,function(err,list){
                                      if(err) throw new Error(err)
                                      async.each(list
                                                ,handler
                                                ,cb);
                                      return null
                                  });
});



1;