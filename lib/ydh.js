var queue = require('queue-async');
var vdsfile_handler_2 = require('./vds_files.js').vdsfile_handler_2
var get_files = require('calvad_vds_sites').get_yearly_vdsfiles_local
var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length;

function year_district_handler(opt,Rcall,double_check_amelia,callback){
    // get the files, load the queue

    // this handler, vdsfile_handler_2, will check the file system for
    // "imputed.RData" to see if this detector is done
    vdsfile_handler_2(opt,Rcall,double_check_amelia,function(e,handler){
        if(e) throw new Error(e)
        console.log('year_district handler, getting list for district:'+ opt.env['RDISTRICT'] + ' year: '+opt.env['RYEAR'])

        // first get all amelia files, then get all the rdata files

        var gf_opts = {district:opt.env['RDISTRICT']
                       ,year:opt.env['RYEAR']
                       ,rdata:true
                       ,calvad:opt.calvad
                      }
        get_files(
            gf_opts
            ,function(err,list){
                if(err) throw new Error(err)
                console.log('got '+list.length+' listed files.  Sending each to handler for queuing.')
                var fileq = queue(num_CPUs);
                list.forEach(function(f,idx){
                    console.log('test ',f)
                    fileq.defer(handler,f)
                    return null
                });
                fileq.awaitAll(function(e,r){
                    return callback(e,r)
                })
                return null
            })
        return null
    })
    return null
}
module.exports= year_district_handler
