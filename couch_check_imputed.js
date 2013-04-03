var superagent = require('superagent')
var server = process.env.COUCHDB_HOST || 'localhost'
var port = process.env.COUCHDB_PORT || 5984
var suss_detector_id = require('suss_detector_id')

function couchdb_check_imputed(file,year,cb){
    var result = /(\d{6,7})/.match(file)
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
        return cb(err,res.body)
    })
}
exports.get_yearly_vdsfiles=get_yearly_vdsfiles
