
var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var get_files = require('./get_files')
var suss_detector_id = require('suss_detector_id')
var couch_check = require('couch_check_state')

var num_CPUs = require('os').cpus().length;

var statedb = 'vdsdata%2ftracking'

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

var trigger_R_job = function(task,done){
    var file = task.file
    console.log('processing '+file)
    var did = suss_detector_id(file)
    var opts = _.clone(task.opts)
    opts.env['FILE']=file

    var R  = spawn('Rscript', RCall, opts);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    var logfile = 'log/vdsimpute_'+did+'_'+opts.env['RYEAR']+'.log'
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
var file_queue=async.queue(trigger_R_job,num_CPUs)
file_queue.drain =function(){
    console.log('queue drained')
    return null
}

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
                        console.log({file:f,state:state})
                        if( !state || !_.isArray(state) ){
                            console.log('push to queue')
                            file_queue.push({'file':f
                                            ,'opts':opt
                                            }
                                           ,function(){
                                                console.log('file '+f+' done, ' + file_queue.length()+' files remaining')
                                                return null
                                            })
                        }
                        return cb()
                    });
        return null
    }
}


var years = [2010]//,2011];

var districts = [//'D03'
                //,'D04'
    // did these during debugging
                //,'D05'
                //,'D06'
                //,
                'D07'
                ,'D08'
                ,'D10'
                ,'D11'
                ,'D12'
                ]



var RCall = ['--no-restore','--no-save','vds_impute.R']


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


async.eachSeries(years_districts
            ,function(opt,ydcb){
                 // get the files, load the queue
                 var handler = vdsfile_handler(opt)
                 console.log('getting '+ opt.env['RDISTRICT'] + ' '+opt.env['RYEAR'])
                 get_files.get_yearly_vdsfiles_local({district:opt.env['RDISTRICT']
                                                     ,year:opt.env['RYEAR']}
                                                    ,function(err,list){
                                                         if(err) throw new Error(err)
                                                         console.log('got '+list.length+' listed files.  Sending each to handler for queuing.')
                                                         async.eachSeries(list
                                                                     ,handler
                                                                     ,ydcb);
                                                         return null
                                                     });

             });





1;
