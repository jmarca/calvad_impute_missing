var queue = require('d3-queue').queue
var checker = require('./vds_couch_handler.js').check_plots
var get_files = require('calvad_vds_sites').get_yearly_vdsfiles_local
var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length


/**
 * This callback is used by the year district handler
 * @callback ydh-callback
 * @param {?Error} error null if all went well
 * @param {number[][]} response from looped R calls
 */

/**
 *
 * @param {Object} opt the options object to pass to R command
 * @param {Object} config.couchdb how to access couchdb
 * @param {string} config.couchdb.trackingdb the tracking databse to check
 * @param {Object} config.couchdb.auth where teh couchdb username and
 *     password are stashed
 * @param {Object} config.couchdb.auth.username  couchdb username
 * @param {Object} config.couchdb.auth.password couchdb password
 * @param {Object} config.env the environment settings for the R job
 * @param {number} config.env.RYEAR the year of the analysis
 * @param {function} Rcall a function that will call R
 * @param {boolean} redo_plot set to true to force plot redo code.  Otherwise will call couchdb to test whether or not plot exists
 * @param {ydh-callback} callback
 * @returns {} nothing
 * @throws {} something
 */
function year_district_handler_plots(opt,Rcall,redo_plot,callback){

    var q = queue()
    var fileq
    if(callback === undefined){
        callback = redo_plot
        redo_plot = false
    }

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
        fileq = queue(num_CPUs)
        list.forEach(function(f,idx){
            if(redo_plot){
                fileq.defer(Rcall,{'file':f
                                   ,'opts':opt
                                  })
            }else{
                console.log('test '+f)
                fileq.defer(checker,opt,f,Rcall)
            }
            return null
        })
        fileq.awaitAll(function(e,r){
            return callback(e,r)
        })
        return null
    })
    return null
}


module.exports= year_district_handler_plots
