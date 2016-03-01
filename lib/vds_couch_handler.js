/** this code is not yet tested and will break */

var couch_check = require('couch_check_state')

function vdsfile_handler(opt){
    // this checks couchdb
    return function(f,cb){
        var did = suss_detector_id(f)

        couch_check({'db':statedb
                    ,'doc':did
                    ,'year':opt.env['RYEAR']
                    ,'state':'vdsraw_chain_lengths'
                    }
                   ,function(err,state){
                        if(err) return cb(err)
                        console.log({file:f,state:state})
                        if( !state || !_.isArray(state) ){
                            console.log('queue up for processing')
                            trigger_R_job({'file':f
                                           ,'opts':opt
                                          },cb)
                        }else{
                            console.log('already done')
                            cb() // move on to the next
                        }
                       return null
                    })
        return null
    }
}
