/*global require process console */

var spawn = require('child_process').spawn
var path = require('path')
var fs = require('fs')
var queue = require('d3-queue').queue

var suss_detector_id = require('suss_detector_id')
var argv = require('minimist')(process.argv.slice(2))

var double_check_amelia = process.env.CALVAD_DOUBLE_CHECK_VDS_AMELIA

var year_district_handler = require('./lib/ydh_imputations.js')

var years = [2012]//,2011];
var districts = [
    'D03'  //
    ,'D04' //
    ,'D05' //
    ,'D06' //
    ,'D07' //
    ,'D08' //
    ,'D10' //
    ,'D11' //
    ,'D12' //
]

// configuration stuff
var rootdir = path.normalize(process.cwd())
var RCall = ['--no-restore','--no-save','vds_impute.R']
var Rhome = path.normalize(rootdir+'/R')
var opts = {cwd: Rhome
           ,env: process.env
           }

var config_file = path.normalize(rootdir+'/config.json')
var config
var config_okay = require('config_okay')

// process command line arguments
if(argv.config !== undefined){
    config_file = path.normalize(rootdir+'/'+argv.config)
}
console.log('setting configuration file to ',config_file,'.  Change with the --config option.')

if(argv.rdata){ opts.rdata=true }

/**
 * parse configuration parameters
 *
 * The config.json parameters should contain postgresql and couchdb
 * connection information.  In addition, this program is going to look
 * for
 *
 * {calvad:{districts:  array or single string, in the form 'D03'
 *         ,years: array or a single number,
 *         ,double_check_amelia: true means to re-examine amelia output, and redo
 *                               those with a "fake" or "error" amelia result
 *         ,start_vdsid: whether double checking or not, the first
 *               **file path** to start on, which typically is a freeway
 *               number.  Use zero to do them all; use 50 to skip, say, all
 *               freeways that begin with 49 or lower, etc.  Put the
 *               complete filename of the last known file to have a good
 *               processing run.  Note that unlike the vds truck impute
 *               code, this is the file name (full path), as is written in
 *               the log file after the "test" statement, so for example,
 *               test 50/E/FOLSOM_BLVD/318550_HV_2012.txt.xz you would write
 *               start_vdsid:"50/E/FOLSOM_BLVD/318550_HV_2012.txt.xz" and
 *               every file that sorted less than that will get skipped and
 *               every file that sorted greater than or equal to that will
 *               get processed.
 *  }}
 *
 * @param {} cb
 *
 * @returns {null} nothing at all, but will call the callback with
 * null,config object if success in reading the config file
 */
function _configure(cb){
    if(config === undefined){
        config_okay(config_file,function(e,c){
            if(e) throw new  Error(e)
            opts.env.R_CONFIG=config_file
            config = c
            if(config.calvad !== undefined){
                // override the above hard coding stuffs
                if(config.calvad.districts !== undefined){
                    if(!Array.isArray(config.calvad.districts)){
                        config.calvad.districts = [config.calvad.districts]
                    }
                    districts = config.calvad.districts
                }
                if(config.calvad.years !== undefined){
                    if(!Array.isArray(config.calvad.years)){
                        config.calvad.years = [config.calvad.years]
                    }
                    years = config.calvad.years
                }
                if(config.calvad.double_check_amelia !== undefined){
                    double_check_amelia= config.calvad.double_check_amelia
                }
                opts.env.CALVAD_PEMS_ROOT=config.calvad.vdspath

            }

            return cb(null,config)
        })
        return null
    }else{
        return cb(null,config)
    }
}


/**
 * refactor items
 *
 * 1. get files here
 * 2. send just a single file to R for processing
 * 3. which means make sure that each file that is sent to R really
 *    needs processing
 *
 */

function trigger_R_job(task,done){
    var R,logfile,logstream,errstream
    var file = task.file
    var did = suss_detector_id(file)
    var _opts = Object.assign({},task.opts)

    _opts.env.FILE=file
    console.log('processing ',file)
    R  = spawn('Rscript', RCall, _opts)
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    logfile = 'log/vdsimpute_'+did+'_'+_opts.env.RYEAR+'.log'
    logstream = fs.createWriteStream(logfile
                                     ,{flags: 'a'
                                       ,encoding: 'utf8'
                                       ,mode: 0o666 })
    errstream = fs.createWriteStream(logfile
                                     ,{flags: 'a'
                                       ,encoding: 'utf8'
                                       ,mode: 0o666 })
    R.stdout.pipe(logstream)
    R.stderr.pipe(errstream)
    R.on('exit',function(code){
        console.log('got exit: '+code+', for ',did)
        //throw new Error('die')
        return done()
    })
}

_configure(function(e,r){
    var ydq
    if(e) throw new Error(e)
    ydq = queue(1)
    years.forEach(function(year){
        districts.forEach(function(district){
            var o = Object.assign({},opts)
            o.env = Object.assign({},opts.env)
            o.env.RYEAR = year
            o.env.RDISTRICT=district
            //o.district = district

            o.calvad = Object.assign({},config.calvad)

            ydq.defer(year_district_handler,o,trigger_R_job,double_check_amelia)
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
    return null

})

1
