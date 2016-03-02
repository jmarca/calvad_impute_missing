var queue = require('queue-async');
var vdsfile_handler_2 = require('./vds_files.js').vdsfile_handler_2
var get_files = require('calvad_vds_sites').get_yearly_vdsfiles_local
var num_CPUs = process.env.NUM_RJOBS || require('os').cpus().length;
var _ = require('lodash')

function year_district_handler_imputations(opt,Rcall,double_check_amelia,callback){
    // get the files, load the queue

    // need a local copy of parameters
    var _opt = _.clone(opt,true)

    // this handler, vdsfile_handler_2, will check the file system for
    // "imputed.RData" to see if this detector is done
    vdsfile_handler_2(_opt,Rcall,double_check_amelia,function(e,handler){
        if(e) throw new Error(e)
        console.log('year_district handler, getting list for district:'+ _opt.env['RDISTRICT'] + ' year: '+_opt.env['RYEAR'])

        var gf_opts = {district:_opt.env['RDISTRICT']
                       ,year:_opt.env['RYEAR']
                       ,rdata:_opt.rdata
                       ,calvad:_opt.calvad
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

function year_district_handler(opt,setup_checker,Rcall,double_check,callback){
    // get the files, load the queue

    // need a local copy of parameters
    var _opt = _.clone(opt,true)

    setup_checker(_opt,Rcall,double_check,function(e,checker){
        if(e) throw new Error(e)
        console.log('in handler, processing district:'+ _opt.env['RDISTRICT'] + ' year: '+_opt.env['RYEAR'])

        // first get all amelia files, then get all the rdata files

        var gf_opts = {district:_opt.env['RDISTRICT']
                       ,year:_opt.env['RYEAR']
                       ,rdata:_opt.rdata
                       ,calvad:_opt.calvad
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
