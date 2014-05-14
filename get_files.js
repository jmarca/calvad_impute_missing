var superagent = require('superagent')
var server = process.env.CALVAD_FILE_SERVER || 'http://calvad.ctmlabs.net'
var port = process.env.CALVAD_FILE_PORT || 80
var fileserver = port === 80 ? server : server +':'+port
var path = require('path')
var glob = require('glob')

var pems_root = process.env.CALVAD_PEMS_ROOT ||'/data/pems/breakup/'
var root = path.normalize(pems_root)
function get_yearly_vdsfiles_local(opts,cb){
    if(opts.year === undefined) throw Error('need year in opts')
    if(opts.district === undefined) throw Error('need district in opts')
    var district = opts.district
    var pattern
    if(opts.rdata){
        pattern = ["**/*ML_*df*",opts.year,".*RData"].join('')
    }else{
        pattern = ["**/*ML_",opts.year,".txt.*z"].join('')
    }
    if(opts.amelia){
        // looking for 814480_ML_2010.120.imputed.RData
        pattern = ["**/*ML_",opts.year,"*imputed.RData"].join('')
    }
    var searchpath = [root,district].join('/')
    console.log(searchpath,pattern)
    glob(pattern,{cwd:searchpath,dot:true},cb);
    return null

}
function get_yearly_vdsfiles(opts,cb){
    if(opts.year === undefined) throw Error('need year in opts')
    if(opts.district === undefined) throw Error('need district in opts')
    var pattern = ["**/*ML_",opts.year,".txt.*z"].join('')
    if(opts.rdata){
        pattern = ["**/*ML_*df*",opts.year,"RData"].join('')
    }
    if(opts.amelia){
        pattern = ["**/*ML_*imputed*",opts.year,"RData"].join('')
    }
    var query = fileserver+'/vdsdata/'+opts.district+'?pattern='+pattern
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
exports.get_yearly_vdsfiles_local=get_yearly_vdsfiles_local
