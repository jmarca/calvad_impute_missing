//maxqueue = 20
var path = require('path');
var suss_detector_id = require('suss_detector_id')
var glob = require('glob')
var spawn = require('child_process').spawn

var _RCall = ['--no-restore','--no-save','check_RData.R']

function check_RData(config,file,done){
    var RCall = _RCall
    var Ropts = { cwd: 'R',
                  env: process.env
                }

    Ropts.env.FILE=file

    if(config.check_RData){
        RCall = config.check_RData
    }
    var R  = spawn('Rscript', RCall, Ropts);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')


    R.stdout.on('data', function (data) {
        //console.log('stdout: ' + data);
    });

    R.stderr.on('data', function (data) {
        //console.log('stderr: ' + data);
    });

    R.on('exit',function(code){
        //console.log('got exit: '+code+', for ',file)
        return done(null,code)
    })
}


function vdsfile_handler_2(opt,trigger_R_job){
    // this checks the file system for an RData file
    var root = opt.env['CALVAD_PEMS_ROOT']
    var district = opt.env['RDISTRICT']
    var year=opt.env['RYEAR']
    var path_pattern = /(.*\/).+$/;
    var searchpath = [root,district].join('/')
    return function(f,cb){

        var re = path_pattern.exec(f)
        if(re && re[1]){
            searchpath = path.normalize(searchpath+'/'+re[1])
        }
        var did = suss_detector_id(f)
        var pattern = ["**/"+did+"_ML_",year,"*imputed.RData"].join('')
        glob(pattern,{cwd:searchpath,dot:true},function(err,result){

            if(err){
                console.log(err)
                return cb(err)
            }
            //console.log(result)
            //throw new Error('die')
            if(result.length === 0
                 //&& maxqueue
	      ){
		//maxqueue--
                console.log('no imputed file output found under ',searchpath,', push ',did,' to queue')
                // throw new Error('die')
                trigger_R_job({'file':f
                               ,'opts':opt
                              },cb)
            }else{
		// if(!maxqueue){
		//     throw new Error('die bye')
		// }
                console.log('already done: '+result)
                cb() // move on to the next
            }
            return null
        });
        return null
    }
}

module.exports.vdsfile_handler_2 = vdsfile_handler_2
module.exports.check_RData = check_RData
