//maxqueue = 20
var path = require('path');
var suss_detector_id = require('suss_detector_id')
var glob = require('glob')
var spawn = require('child_process').spawn

var _RCall = ['--no-restore','--no-save','check_RData.R']

/**
 * check_RData
 *
 * @param {object} config - the configuration settings
 * @param {string} file - the full path to the file to check
 * @param {function} done - a callback
 * @returns {} returns whatever done returns
 *
 * @api public
 */
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

function vdsfile_handler_2(opt,trigger_R_job,doublecheck){
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
        // console.log(did)
        var pattern = ["**/"+did+"_ML_",year,"*imputed.RData"].join('')
        glob(pattern,{cwd:searchpath,dot:true},function(err,result){

            if(err){
                console.log(err)
                return cb(err)
            }
            if(result.length === 0
                 //&& maxqueue // debug hook
	      ){
		//maxqueue-- // debug hook
                console.log('no imputed file output found under ',searchpath,', push ',did,' to queue')
                trigger_R_job({'file':f
                               ,'opts':opt
                              },cb)
              }else{
                // for debugging
		// if(!maxqueue){
		//     throw new Error('die bye')
		// }
                if(doublecheck){ // accept anything truthy
                    // actually look inside the RData file to see if
                    // it is a finished imputation
                    // console.log('inspecting: ',searchpath,'/',result)
                    check_RData(opt,searchpath+'/'+result,function(err,msg){
                        if(msg === 0){

                            // really done, amelia file is solid
                            // console.log('check_RData says already done: '+result)
                            return cb(null,0) // move on to the next

                        }
                        // not done, something is broken about amelia file
                        console.log('The imputed file had non-zero check: ',msg,', push ',did,' to queue')
                        trigger_R_job({'file':f
                                       ,'opts':opt
                                      },cb)
                        return null
                    })

                }else{
                    //console.log('no double check, already done: '+result)
                    cb(null,0) // move on to the next
                }
            }
            return null
        });
        return null
    }
}

module.exports.vdsfile_handler_2 = vdsfile_handler_2
module.exports.check_RData = check_RData
