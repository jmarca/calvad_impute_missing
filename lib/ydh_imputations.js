var queue = require('d3-queue').queue
var file_handler = require('./vds_files.js').file_handler
var get_files = require('calvad_vds_sites').get_yearly_vdsfiles_local
var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length
var suss_detector_id = require('suss_detector_id')

/**
 *
 * @param {Object} opt
 * @param {function} Rcall
 * @param {boolean} double_check_amelia
 * @param {ydh-callback} callback
 * @returns {} nothing
 * @throws {} something
 */
function year_district_handler_imputations(opt,Rcall,double_check_amelia,callback){
    // trying to nail down a copy by reference bug.
    // trigger the functions I need in a queue

    var q = queue()
    var minimum_vds_file = opt.calvad.start_vdsid
    console.log('minimum_vds_file is',minimum_vds_file)
    var localopt = JSON.parse(JSON.stringify(opt))
    // remember, the result is the first param in await_all callback result
    // this call will get any VDS files
    q.defer(get_files,Object.assign({},{district:""+localopt.env.RDISTRICT
                                        ,year:localopt.env.RYEAR
                                        ,rdata:localopt.rdata
                                        ,calvad:localopt.calvad
                                       }
                                   )
           )

    // this second call will execute simultaneous with the first, and
    // return any amelia output files it finds
    q.defer(get_files,{district:""+localopt.env.RDISTRICT
                       ,year:localopt.env.RYEAR
                       ,amelia:true
                       ,calvad:localopt.calvad
                      }
           )
    // and this call will also execute simultaneous with the other two.
    // all it does is to call the "file_handler" function in order to create
    // the actual file handler function that is used after the await, below
    q.defer(file_handler,localopt,localopt.env.RYEAR,Rcall,double_check_amelia)

    q.await(function(err,filelist,amelialist,filehandler){
        filelist.sort(function(a,b){
            var did_a = suss_detector_id(a)
            var did_b = suss_detector_id(b)
            return did_a - did_b
        })
        //console.log('file list',filelist)
        //console.log('amelia list',amelialist)
        var fileq
        if(err) throw new Error(err)
        fileq = queue(num_CPUs)
        console.log('got list of '+filelist.length+' files; checking each against existing amelia files')
        filelist.forEach(function(f,idx){
            var did = suss_detector_id(f)

            if(did<minimum_vds_file){
                // don't do files that sort lower than the minimum
                console.log('skipping '+f+' due to minimum vds file set to '+minimum_vds_file)
                return null
            }
            console.log('test '+f)
            fileq.defer(filehandler,f,amelialist)
            return null
        })

        fileq.awaitAll(function(e,r){
            return callback(e,r)
        })
        return null
    })
    return null
}


module.exports= year_district_handler_imputations
