
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

//parse the command line args using optimist
// none for now

var R;


/**
 * refactor items
 *
 * 1. get files here
 * 2. send just a single file to R for processing
 * 3. which means make sure that each file that is sent to R really
 *    needs processing
 *
 */

function vdsfile_handler(opt){
    return function(f,cb){
        var did = suss_detector_id(f)

        couch_check({'db':statedb
                    ,'doc':did
                    ,'year':opt.env['RYEAR']
                    ,'state':'vdsraw_chain_lengths'
                    }
                   ,function(err,state){
                        if(err) return cb(err)
                        if(state === null)
                            file_queue.push({file:f
                                            ,env:opt})
                        return cb(err)
                    });
        return null;
    }
}


var trigger_R_job = function(task,done){
    var file = task.file
    var did = suss_detector_id(file)
    var opts = _.clone(task.opts)
    opts.env['FILE']=file

    var R  = spawn('Rscript', RCall, opts);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    var logfile = 'log/vdsimpute_log_'+did+'.log'
    var logstream = fs.createWriteStream(logfile
                                        ,{flags: 'a'
                                         ,encoding: 'utf8'
                                         ,mode: 0666 })
    R.stdout.pipe(logstream)
    R.stderr.pipe(logstream)
    R.on('exit',function(code){
        console.log('got exit: '+code+', for ',did)
        return done()
    })
}

var file_queue=async.queue(trigger_R_job,2)

var years = [2007,2008,2009,2010,2011];
var districts = ['D04'
                ,'D07'
                ,'D12'
                ,'D05'
                ,'D06'
                ,'D08'
                ,'D03'
                ,'D11'
                ,'D10'
                ]


var RCall = ['--no-restore','--no-save','vds_impute.R']


var opts = { cwd: undefined,
             env: process.env
           }
var years_districts = []
_.each(years,function(year){
    _.each(districts,function(district){
        var o = _.clone(opts)
        o.env['RYEAR'] = year
        o.env['RDISTRICT']=district
        years_districts.push(o)
    })
});

async.forEach(years_districts,function(opt,cb){
    // get the files
    var handler = vdsfile_handler(opt)
    get_files.get_yearly_vdsfiles({district:opt.env['RDISTRICT']
                                  ,year:opt.env['RYEAR']}
                                 ,function(err,list){
                                      if(err) throw new Error(err)
                                      async.forEach(list
                                                   ,handler
                                                   ,cb);
                                      return null
                                  });
});




1;