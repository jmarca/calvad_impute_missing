//maxqueue = 20
var path = require('path');
var suss_detector_id = require('suss_detector_id')
var glob = require('glob')
var spawn = require('child_process').spawn
var fs = require('fs')
var get_files = require('calvad_vds_sites').get_yearly_vdsfiles_local

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
function check_RData(config){

    var RCall = _RCall
    var Ropts = { cwd: 'R',
                  env: process.env
                }
    if(config.env !== undefined){
        var keys = Object.keys(config.env)
        keys.forEach(function(k){
            Ropts.env[k]=config.env[k]
        })
    }


    if(config.check_RData){
        RCall = config.check_RData
    }
    function trigger(file,did,year,done){
        Ropts.env.FILE=file
        var R  = spawn('Rscript', RCall, Ropts);
        R.stderr.setEncoding('utf8')
        R.stdout.setEncoding('utf8')

        var logfile = path.resolve('log/vdscheck_'+did+'_'+year+'.log')

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
            console.log('got exit: '+code+', for ',file)
            return done(null,code)
        })
    }
    return trigger
}


/**
 * create the file handler function
 * @param {Object} opt the options object to pass to R command
 * @param {function} trigger_R_job a function that will call R
 * @param {boolean} doublecheck if truthy, will run {@linkcode
 *     check_RData} to open the file and examine its contents in an
 *     external R process
 * @param {Array[string]} ameliafiles the list of amelia output files
 *     found below the top level target directory.  Used so as to skip
 *     having to search again.  One FS hit rather than many
 * @param {callme} callback error, the function to call with each file
 * @returns {} nothing
 * @throws {}
 * @public
 */
function file_handler(opt,year,trigger_R_job,doublecheck,cb){
    var _year=year
    // opt.env['RYEAR']
    var root = opt.calvad.vdspath
    var district = opt.district
    var path_pattern = /(.*\/).+$/;
    var _searchpath = path.normalize([root,district].join('/'))
    //console.log('file_handler init with ',_searchpath)
    var R_checker = check_RData(opt)
    /**
     * @callback callme
     * @param {string} f a filename.  will be searched for on the path
     * that is the combination of the calvad.vdspath option and the district option
     * @param {function} cb the callback to execute when done with
     * processing this file.  If this function decides to pass this
     * file along to the trigger_R_job function, then this callback
     * will also be passed to the trigger_R_job function
     * @returns {} will return null, but will call the callback
     * @throws {}
     */
    function callme(f,ameliafiles,cb){
        var re,directorypath,apath,a
        // check if the file f exists as an entry in the amelia file list
        var did = suss_detector_id(f)
        var pattern = new RegExp(did+".*"+_year+".*imputed.RData$");
        console.log('pattern for test is ',pattern)
        // look for "match" to f (same detector id, but with
        // imputed.RData ending) in the list of amelia files
        // console.log('looking for ',f,' in ',ameliafiles.join(', '))
        a = ameliafiles.find(function(a){
            // compare a and f
            return pattern.test(a)
        })
        if(a === undefined){
            // do not have the file
            console.log('queue up ',f)
            trigger_R_job({'file':f
                           ,'opts':opt
                          },cb)
        }else{
            // might need to doublecheck
            if(doublecheck){
                // fixme, this might need full path info?
                re = path_pattern.exec(f)
                directorypath = _searchpath
                if(re && re[1]){
                    directorypath = path.normalize(_searchpath+'/'+re[1])
                }
                //console.log(searchpath)
                apath = path.normalize(directorypath + '/'+a)
                console.log(apath)
                R_checker(apath,did,_year,function(err,msg){
                    if(msg === 0){

                        // really done, amelia file is solid
                        console.log('check_RData says already done: '+apath)
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
                console.log('found a match for ',f,' in amelia file ',a)
                cb(null,0) // move on to the next
            }
        }
        return null
    }

    return cb(null,callme)
}

module.exports.check_RData = check_RData
module.exports.file_handler=file_handler
