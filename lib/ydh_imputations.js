var queue = require('d3-queue').queue
var file_handler = require('./vds_files.js').file_handler
var get_files = require('calvad_vds_sites').get_yearly_vdsfiles_local
var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length;
var _ = require('lodash')

/**
 *
 * @param {} opt
 * @param {} Rcall
 * @param {} double_check_amelia
 * @param {} callback
 * @returns {}
 * @throws {}
 */
function year_district_handler_imputations(opt,Rcall,double_check_amelia,callback){
    // trying to nail down a copy by reference bug.
    // trigger the functions I need in a queue

    // need a local copy of parameters
    var _opt = _.clone(opt,true)

    var q = queue(3)

    // remember, the result is the first param in await_all callback result
    q.defer(get_files,{district:_opt.env['RDISTRICT']
                       ,year:_opt.env['RYEAR']
                       ,rdata:_opt.rdata
                       ,calvad:_opt.calvad
                      }
           )

    // this second call will execute simultaneous with the first, and return
    q.defer(get_files,{district:_opt.env['RDISTRICT']
                       ,year:_opt.env['RYEAR']
                       ,amelia:true
                       ,calvad:_opt.calvad
                      }
           )
    q.defer(file_handler,_opt,_opt.env['RYEAR'],Rcall,double_check_amelia)
    q.await(function(e,filelist,amelialist,filehandler){
        console.log(e)
        console.log('done with first q')
        console.log(filelist,amelialist)
        var fileq = queue(num_CPUs);
        filelist.forEach(function(f,idx){
            console.log('test ',f)
            fileq.defer(filehandler,f,amelialist)
            return null
        });

        fileq.awaitAll(function(e,r){
            return callback(e,r)
        })
        return null
    })
    return null
}


module.exports= year_district_handler_imputations
