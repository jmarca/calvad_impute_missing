/**
 * trigger vdswim impute, which means guessing truck traffic for vds sites
 *
 * the logic is similar to others, but a bit more involved.  instead
 * of using R to check for files, use node, and then send in filenames
 * to R via environment variables, as before.
 *
 * I need to get filenames for
 *
 * vds year imputed RData
 * for all neighbor wim/vds sites
 *    vds wim paired RData
 *
 * hmm, that last is a problem to pass via env vars.
 *
 * perhaps just make sure that the things exist, and let R do the work.
 *
 *
 * Need to make sure
 *   ## check if we're already done with this one
 *   if(couch.check.is.truck.imputed(district,year,vdsid)){
 *      print('truck imputed is done or inprocess')
 *      return()
 *   }
 *
 *   if(!couch.checkout.for.processing.truck.imputed(district,year,vdsid)){
 *      print('failed to checkout for processing')
 *      return()
 *   }
 *
 *   if(! couch.check.is.raw.imputed(year,vdsid) ){
 *      print('raw data is not imputed')
 *      ## if the raw data isn't ready, can't do anything here
 *      return()
 *   }
 *
 */


var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var get_files = require('./get_files')
var suss_detector_id = require('suss_detector_id')
var couch_check = require('couch_check_state')
var couch_set   = require('couch_set_state')

var pg = require('pg')

var statedb = 'vdsdata%2ftracking'

var R;

//psql
var host = options.host ? options.host : '127.0.0.1';
var user = options.username ? options.username : 'myname';
var pass = options.password ? options.password : 'secret';
var port = options.port ? options.port :  5432;
var area_param = options.area_param ? options.area_param : 'areaid';
var area_type = options.area_type ? options.area_type : 'area';

var spatialvdsConnectionString = "pg://"+user+":"+pass+"@"+host+":"+port+"/spatialvds";

var neighborquery = 'select distinct site_no, direction from imputed.vds_wim_neighbors where vds_id='

var finish_regex = /finish/;
var date=new Date()
var inprocess_string = process.env.INPROCESS_STRING || date.toISOString()+' inprocess'
var finish_string = process.env.FINISH_STRING || date.toISOString()+' finish'

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
        // need to check that truck vols have not yet been imputed
        async.series([function(done){ // check for truckimputed variable
                          couch_check({'db':statedb
                                      ,'doc':did
                                      ,'year':opt.env['RYEAR']
                                      ,'state':'truckimputed'
                                      }
                                     ,function(err,state){
                                          if(err) throw new Error(err)
                                          if(state && (finish_regex.test(state)) || state === inprocess_string){
                                              return done('quit')
                                          }
                                          return done()
                                      })
                          return null
                      }
                     ,function(done){ // double check, via truckimputation_chain_lengths
                          couch_check({'db':statedb
                                      ,'doc':did
                                      ,'year':opt.env['RYEAR']
                                      ,'state':'truckimputation_chain_lengths'
                                      }
                                     ,function(err,state){
                                          if(err) throw new Error(err)
                                          if(state && _.isArray(state) && state.length==5){
                                              return done('quit')
                                          }
                                          return done()
                                      })
                          return null
                      }
                     ,function(done){
                          // need to verify that the raw imputation is okay
                          couch_check({'db':statedb
                                      ,'doc':did
                                      ,'year':opt.env['RYEAR']
                                      ,'state':'vdsraw_chain_lengths'
                                      }
                                     ,function(err,state){
                                          if(err) throw new Error(err)
                                          if(state && _.isArray(state) && state.length==5){
                                              // the raw data is okay to proceed
                                              return done()
                                          }
                                          console.log(did +' no vds imputation')
                                          return done('quit')
                                      })
                          return null
                      }
                     ,function(done){
                          // verify that there are neighbors to work with
                          var queryHandler = function(err,client){
                              if(err) throw new Error(err)
                              var neighbors = []
                              var query = client.query(neighborquery+'did')
                              query.on('error',function(err){
                                  throw new Error(err)
                              })
                              query.on('row', function(row) {
                                  //fired once for each row returned
                                  neighbors.push(row);
                              });
                              query.on('end',function(result){
                                  couch_set({'db':statedb
                                            ,'doc':did
                                            ,'year':opts.env['RYEAR']
                                            ,'state':'wim_neighbors'
                                            ,'value':neighbors}
                                           ,function(){})
                                  if(result.rowCount<1){
                                      console.log('no neighbor WIM sites')
                                      return done('quit')
                                  }
                                  return done()
                              })
                          }
                          pg.connect(spatialvdsConnectionString, queryHandler);
                          return null
                      }]
                    ,function(err){
                         if(err){
                             if(err === 'quit')
                                 return cb()
                             return cb(err)
                         }
                         file_queue.push({'file':f
                                         ,'opts':opt
                                         ,'cb':cb})
                         return null
                     })
        return null
    }
}


var setup_R_job = function(task,done){
    var file = task.file
    var did = suss_detector_id(file)
    var opts = _.clone(task.opts,true)
    // need to check again that truck vols have not yet been imputed
    couch_check({'db':statedb
                ,'doc':did
                ,'year':opts.env['RYEAR']
                ,'state':'truckimputed'
                }
               ,function(err,state){
                    if(err) return done(err)
                    if(state && (finish_regex.test(state)) || state === inprocess_string){
                        return done()
                    }
                    // check out for processing
                    couch_set({'db':statedb
                              ,'doc':did
                              ,'year':opts.env['RYEAR']
                              ,'state':'truckimputed'
                              ,'value':inprocess_string
                              }
                             ,function(err){
                                  if(err) return done(err)
                                  return spawnR(task,done)
                              })
                    return null
                })
    return null
}


var trigger_R_date = new Date()

var trigger_R_job = function(task,done){
    console.log('waiting to start '+task.file)
    var new_R_date = new Date()
    if(new_R_date - trigger_R_date > 10 * 1000) return spawnR(task,done)
    setTimeout(function(){
        trigger_R_job(task,done)
    }, 5*1000);
    return null
}

function spawnR(task,done){
    trigger_R_date = new Date()

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
    var logfile = 'log/vdswim_impute_'+did+'_'+opts.env['RYEAR']+'.log'
    var logstream = fs.createWriteStream(logfile
                                        ,{flags: 'a'
                                         ,encoding: 'utf8'
                                         ,mode: 0666 })
    R.stdout.pipe(logstream)
    R.stderr.pipe(logstream)
    R.on('exit',function(code){
        console.log('got exit: '+code+', for ',did)
        if(code==10){
                    couch_set({'db':statedb
                              ,'doc':did
                              ,'year':opts.env['RYEAR']
                              ,'state':'truckimputed'
                              ,'value':finish_string
                              }
                             ,function(err){
                                  if(err) throw new Error(err)
                                  //throw new Error('die in testing')
                                  return done()
                              })
        }else{
            //throw new Error('die in testing')
            done()
        }
        return null
    })
}
var jobs = process.env.NUM_R_JOBS || 2
var file_queue=async.queue(setup_R_job,jobs)

var years = [2007,2008,2009,2010] // 2011

var districts = ['D03'
                ,'D04'
                ,'D08'
                ,'D12'
                ,'D05'
                ,'D06'
                ,'D07'
                ,'D11'
                ,'D10'
                ]


var RCall = ['--no-restore','--no-save','vdswim_impute.R']


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
async.eachLimit(years_districts,1,function(opt,cb){
    // get the files
    var handler = vdsfile_handler(opt)
    console.log('getting '+ opt.env['RDISTRICT'] + ' '+opt.env['RYEAR'])
    get_files.get_yearly_vdsfiles({district:opt.env['RDISTRICT']
                                  ,year:opt.env['RYEAR']
                                  ,'amelia':1}
                                 ,function(err,list){
                                      if(err) throw new Error(err)
                                      async.each(list
                                                ,handler
                                                ,cb);
                                      return null
                                  });
});




1;
