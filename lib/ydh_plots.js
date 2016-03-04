var queue = require('d3-queue').queue
var checker = require('./vds_couch_handler.js').check_plots
var get_files = require('calvad_vds_sites').get_yearly_vdsfiles_local
var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length;
var _ = require('lodash')


/**
 * This callback is used by the year district handler
 * @callback ydh-callback
 * @param {?Error} error null if all went well
 * @param {Array[Array[number]]} response from looped R calls
 */

/**
 *
 * @param {Object} opt the options object to pass to R command
 * @param {function} Rcall a function that will call R
 * @param {ydh-callback} callback
 * @returns {} nothing
 * @throws {} something
 */
function year_district_handler_plots(opt,Rcall,callback){

    var q = queue()
    // remember, the result is the first param in await_all callback result
    q.defer(get_files,Object.assign({},{district:""+opt.env.RDISTRICT
                                        ,year:opt.env.RYEAR
                                        ,rdata:opt.rdata
                                        ,calvad:opt.calvad
                                       }
                                   )
           )


    q.await(function(err,list){
        if(err) throw new Error(err)
        console.log('got '+list.length+' listed files.  Sending each to handler for queuing.')
        var fileq = queue(num_CPUs);
        list.forEach(function(f,idx){
            console.log('test '+f)
            fileq.defer(checker,opt,f,Rcall)
            return null
        });
        fileq.awaitAll(function(e,r){
            return callback(e,r)
        })
        return null
    })
    return null
}


module.exports= year_district_handler_plots
