
var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');


//parse the command line args using optimist
// none for now

var R;


var  increment = function(keys){
    var years = [2007,2008,2009,2010,2011];
    var districts = [//'/data/pems/breakup/D04'
                     //,'/data/pems/breakup/D07'
                     //,'/data/pems/breakup/D12'
                     //,'/data/pems/breakup/D05'
                     //,'/data/pems/breakup/D06'
                     ,'/data/pems/breakup/D08'
                     //,'/data/pems/breakup/D03'
                     //,'/data/pems/breakup/D11'
                     //,'/data/pems/breakup/D10'
    ]
    var yidx = []
    var didx = []
    _.each(keys
           ,function(k){
               yidx[k]=-1;
               didx[k]=100;
           })

    function _increment(k){
        if(didx[k] >= districts.length - 1){
            // increment year, reset didx
            yidx[k] += 1;
            didx[k] = 0;
        }else{
            didx[k] += 1;
        }
        if(yidx[k] >= years.length){
            return false;
        }else{
            return true;
        }
    }
    _increment.getDistrict=function(k){
        if(yidx[k] >= years.length)
            return null;
        return districts[didx[k]];
    }
    _increment.getYear=function(k){
        if(yidx[k] >= years.length)
            return null;
        return years[yidx[k]];
    }
    return _increment;
}([1,2]);


var RCall = {1:['--no-restore','--no-save','vds_plots.R']
             ,2:['--no-restore','--no-save','vds_plots.R']
            };

function loop(f){

    function _loop(cb){

        function exithandler(code) {
            if (code == 10 || code == 1) {
                console.log('got exit: '+code+', repeating');
                async.nextTick(innerloop)
            }else{
                console.log('got exit, code is '+code);
                cb()
            }
            return null;
        }


        function innerloop(){
            console.log('looping '+f);
            var opts = { cwd: undefined,
                         env: process.env
                       }
            opts.env['RREVERSE']=f;
            opts.env['RYEAR'] = increment.getYear(f);
            opts.env['RDISTRICT'] =  increment.getDistrict(f);

            R  = spawn('Rscript', RCall[f],opts);
            R.stderr.setEncoding('utf8');
            R.stdout.setEncoding('utf8');

            var logstream = fs.createWriteStream('vdsimpute_log_'+f+'.log', { flags: 'a',
                                                                              encoding: 'utf8',
                                                                              mode: 0666 });


            R.stdout.pipe(logstream)
            R.stderr.pipe(logstream)

            R.on('exit',exithandler);

        }
        async.nextTick(innerloop)
    }
    return _loop;
};


var paused_start ;

var dual_R_calls = [loop(1)
                    ,function(cb){
                        f = loop(2)
                        setTimeout(function(){
                            f(cb)
                        }
                                   , 10000);
                    }];


async.whilst(function(){return increment(1);}
             ,loop(1)
             ,function(err){
                 console.log('alldone with 1');
             } );
async.whilst(function(){return increment(2);}
             ,loop(2)
             ,function(err){
                 console.log('alldone with 2');
             } );


1;