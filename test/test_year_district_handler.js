var should = require('should')
var vds_files = require('../lib/vds_files.js')
var config = {}

var year_district_handler = require('../lib/ydh')

var year = 2012
var queue = require('queue-async')

var path = require('path')


var path    = require('path')
var rootdir = path.normalize(__dirname)
var config_file = rootdir+'/../test.config.json'
var config={}
var config_okay = require('config_okay')
before(function(done){
    var district = 'files' // fake out the finder

    config_okay(config_file,function(err,c){
        if(err){
            throw new Error('node.js needs a good croak module')
        }
        config = c
        config.district = district // fake out the get_local_files.js
        return done()
    })
    return null
})



describe('year district handler should work',function(){
    var goodfile ='1211682_ML_2012.120.imputed.RData'
    var notamelia ='1211682_ML_2012.df.2012.RData'
    var badamelia ='801320_ML_2012.120.imputed.RData'
    var todoamelia ='801320_ML_2012.df.2012.RData'
    var fakefile ='1200001_ML_2012.df.2012.RData'

    var todomatches = [/801320/,/1200001/]

    it('should spawn jobs only for missing amelia files',
       function(done){
           var filecount = 0;
           var fake_R_call = function(Ropts,cb){
               // this should never get called
               filecount++
               cb(null,1)
               return null
           }

           var o ={env:{}}
           o.env['RYEAR'] = year
           o.env['RDISTRICT']=config.district
           o.env['CALVAD_PEMS_ROOT']=config.calvad.vdspath
           o.env['R_CONFIG']=config_file
           o.calvad = config.calvad
           o.district = config.district

           var q = queue()
           q.defer(year_district_handler,o,fake_R_call,false)
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               r.should.eql([[0,0]])
               filecount.should.eql(0)
               return done()
           })
       })
    it('should spawn jobs only for missing amelia files',
       function(done){
           var filecount = 0;
           var fake_R_call = function(Ropts,cb){
               should.exist(Ropts)
               Ropts.should.have.property('file')
               console.log(Ropts.file)
               Ropts.file.should.be.oneOf([todoamelia,notamelia])
               filecount++
               if(Ropts.file === todoamelia){
                   cb(null,1)
               }else{
                   cb(null,0)
               }
               return null
           }

           var o ={env:{}}
           o.env['RYEAR'] = year
           o.env['RDISTRICT']=config.district
           o.env['CALVAD_PEMS_ROOT']=config.calvad.vdspath
           o.env['R_CONFIG']=config_file
           o.calvad = config.calvad
           o.district = config.district

           var q = queue()
           q.defer(year_district_handler,o,fake_R_call,true)
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               r.should.eql([[0,1]])
               filecount.should.eql(1)
               return done()
           })
           return null
       })
    return null
})
