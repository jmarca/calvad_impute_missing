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

var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length;

// on lysithia, don't go over 3
// num_CPUs=1

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
    var did = suss_detector_id(file)
    var opts = _.clone(task.opts)

    opts.env['FILE']=file
    opts.env['CALVAD_PEMS_ROOT']=pems_root
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
// var file_queue=queue(num_CPUs)
// async.queue(trigger_R_job,num_CPUs)

function vdsfile_handler(opt){
    // this checks couchdb
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
                            console.log('queue up for processing')
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
    }
}
var glob = require('glob')

var pems_root = process.env.CALVAD_PEMS_ROOT ||'/data/pems/breakup/'

var root = path.normalize(pems_root)

function vdsfile_handler_2(opt){
    // this checks the file system for an RData file
    var district = opt.env['RDISTRICT']
    var year=opt.env['RYEAR']
    var searchpath = [root,district].join('/')

    return function(f,cb){
        var did = suss_detector_id(f)
        var pattern = ["**/"+did+"_ML_",year,"*imputed.RData"].join('')
        // console.log(pattern)
        glob(pattern,{cwd:searchpath,dot:true},function(err,result){

            if(err){
                console.log(err)
                return cb(err)
            }
            //console.log(result)
            //throw new Error('die')
            if(result.length === 0){
                console.log('no imputed file output, push ',did,' to queue')
                // throw new Error('die')
                trigger_R_job({'file':f
                               ,'opts':opt
                              },cb)
            }else{
                console.log('already done: '+result)
                cb() // move on to the next
            }
            return null
        });
        return null
    }
}


var years = [2012]//,2011];

var districts = [
                // 'D03' // done
                 'D04' 
                // ,'D05'
                // ,'D06'
                // ,'D07'
                // ,'D08'
                // ,'D10' // done
                // ,'D11' // done
                // ,'D12' //in progress activimetrics
]


function year_district_handler(opt,callback){
    // get the files, load the queue

    // this handler, vdsfile_handler_2, will check the file system for
    // "imputed.RData" to see if this detector is done
    var handler = vdsfile_handler_2(opt)
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
