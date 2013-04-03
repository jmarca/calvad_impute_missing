
var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');

//parse the command line args using optimist
// none for now

var R;



var  increment = function(){
    var years = [2007,2008,2009,2010];
    var districts = ['/data/pems/breakup/D04'
                     ,'/data/pems/breakup/D12'
                     ,'/data/pems/breakup/D07'
                     ,'/data/pems/breakup/D05'
                     ,'/data/pems/breakup/D06'
                     ,'/data/pems/breakup/D08'
                     ,'/data/pems/breakup/D03'
                     ,'/data/pems/breakup/D11'
                     ,'/data/pems/breakup/D10']
    var yidx = -1;
    var didx = 100;

    return function(){
        if(didx >= districts.length){
            // increment year, reset didx
            yidx += 1;
            didx=0;
        }else{
            didx += 1;
        }
        if(yidx >= years.length){
            return false;
        }else{
            process.env['RYEAR'] = years[yidx];
            process.env['RDISTRICT'] =  districts[didx]
            return true;
        }
    }
}();


function loop(f){
    var logstream = fs.createWriteStream('vdsimpute_log_'+f+'.log', { flags: 'a',
                                                                      encoding: 'utf8',
                                                                      mode: 0666 });

    function _loop(cb){

        var opts = { cwd: undefined,
                     env: process.env
                   }
        opts.env['RREVERSE']=f;

        R  = spawn('Rscript', ['--no-restore','--no-save','vds_self_impute_missing_distributed.b.R'],opts);
        R.stderr.setEncoding('utf8');
        R.stdout.setEncoding('utf8');

        R.stdout.pipe(logstream)
        R.stderr.pipe(logstream)

        R.on('exit', function (code) {
            if (code == 10) {
                console.log('got exit: done, repeating');
                async.nextTick(_loop(cb))
            }else{
                console.log('got exit, code is '+code);
                cb()
            }
            return null;
        });

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


async.whilst(increment,
       function(whcb){
           async.parallel(dual_R_calls,whcb);
       }
       ,function(err){
           console.log('alldone');
       } );

