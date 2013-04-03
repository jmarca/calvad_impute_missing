var superagent = require('superagent')
var server = process.env.CALVAD_FILE_SERVER || 'http://calvad.ctmlabs.net'
var port = process.env.CALVAD_FILE_PORT || 80
var fileserver = port === 80 ? server : server +':'+port

function get_yearly_vdsfiles(opts,cb){
    if(opts.year === undefined) throw Error('need year in opts')
    if(opts.district === undefined) throw Error('need district in opts')
    var pattern
    if(opts.rdata){
        pattern = ["**/*ML_*df*",opts.year,"RData"].join('')
    }else{
        pattern = ["**/*ML_",opts.year,".txt.*z"].join('')
    }
    var query = fileserver+'/vdsdata/'+opts.district+'?pattern='+pattern
    console.log(query)
    superagent
    .get(query)
    .set('accept','application/json')
    .set('followRedirect',true)
    .end(function(err,res){
        if(err) return cb(err)
        if(res === undefined || res.body === undefined) throw new Error('problems with getting files')
        return cb(err,res.body)
    })
}
exports.get_yearly_vdsfiles=get_yearly_vdsfiles
