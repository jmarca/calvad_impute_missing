var queue = require('d3-queue').queue
var file_handler = require('./vds_files.js').file_handler
var get_files = require('calvad_vds_sites').get_yearly_vdsfiles_local
var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length

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

    // remember, the result is the first param in await_all callback result
    q.defer(get_files,Object.assign({},{district:""+opt.env.RDISTRICT
                                        ,year:opt.env.RYEAR
                                        ,rdata:opt.rdata
                                        ,calvad:opt.calvad
                                       }
                                   )
           )

    // this second call will execute simultaneous with the first, and return
    q.defer(get_files,{district:opt.env.RDISTRICT
                       ,year:opt.env.RYEAR
                       ,amelia:true
                       ,calvad:opt.calvad
                      }
           )
    q.defer(file_handler,opt,opt.env.RYEAR,Rcall,double_check_amelia)
    q.await(function(err,filelist,amelialist,filehandler){
        var fileq
        if(err) throw new Error(err)
        fileq = queue(num_CPUs)
        console.log('got list of '+filelist.length+' files; checking each against existing amelia files')
        filelist.forEach(function(f,idx){
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
