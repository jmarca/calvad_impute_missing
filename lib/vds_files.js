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

/**
 *
 * @param {object} opt the options object to pass to R command
 * @param {function} trigger_R_job a function that will call R
 * @param {boolean} doublecheck if truthy, will run {@linkcode check_RData} to open the file and examine its contents in an external R process
 * @returns {function} returns a function that accepts a file and a callback.
 * @throws {}
 */
function vdsfile_handler_2(opt,trigger_R_job,doublecheck){
    // this checks the file system for an RData file
    var root = opt.env['CALVAD_PEMS_ROOT']
    var district = opt.env['RDISTRICT']
    var year=opt.env['RYEAR']
    var path_pattern = /(.*\/).+$/;
    var _searchpath = [root,district].join('/')

    /**
     *
     * @param {string} f a filename.  will be searched for on the path
     * that is the combination of the root
     * (opt.env['CALVAD_PEMS_ROOT']) and the district
     * (opt.env['RDISTRICT'])
     * @param {function} cb the callback to execute when done with
     * processing this file.  If this function decides to pass this
     * file along to the trigger_R_job function, then this callback
     * will also be passed to the trigger_R_job function
     * @returns {} will return null, but will call the callback
     * @throws {}
     */
    function file_handler(f,cb){

        var re = path_pattern.exec(f)
        // console.log(f)
        var searchpath = _searchpath
        //console.log(searchpath)
        if(re && re[1]){
            searchpath = path.normalize(_searchpath+'/'+re[1])
        }
        console.log('searchpath is '+searchpath)
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
    return file_handler
}

module.exports.vdsfile_handler_2 = vdsfile_handler_2
module.exports.check_RData = check_RData
