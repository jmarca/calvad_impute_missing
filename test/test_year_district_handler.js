var should = require('should')
var vds_files = require('../lib/vds_files.js')
var config = {}

var year_district_handler = require('../lib/ydh_imputations.js')

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
    var zipfile ='1211682_ML_2012.txt.xz'

    var todomatches = [/801320/,/1200001/]

    it('should spawn jobs only for missing amelia files,rdata=false',
       function(done){
           var filecount = 0;
           var fake_R_call = function(Ropts,cb){
               // this should never get called
               filecount++
               cb(null,1) // note test below expects [0]
               return null
           }

           var o ={env:{}}
           o.calvad = config.calvad
           o.calvad.vdspath = './tests/testthat/'
           o.env['RYEAR'] = year
           o.env['RDISTRICT']=config.district
           o.env['CALVAD_PEMS_ROOT']=o.calvad.vdspath
           o.env['R_CONFIG']=config_file
           o.rdata=false
           o.district = config.district

           var q = queue()
           q.defer(year_district_handler,o,fake_R_call,false)
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               filecount.should.eql(0)
               r.should.eql([[0]])
               return done()
           })
       })
    it('should spawn jobs only for missing amelia files,rdata=true',
       function(done){
           var filecount = 0;
           var fake_R_call = function(Ropts,cb){
               // this should never get called
               filecount++
               cb(null,1) // note test below expects [0]
               return null
           }

           var o ={env:{}}
           o.env['RYEAR'] = year
           o.env['RDISTRICT']=config.district
           o.env['CALVAD_PEMS_ROOT']=config.calvad.vdspath
           o.env['R_CONFIG']=config_file
           o.rdata=true
           o.calvad = config.calvad
           o.district = config.district

           var q = queue()
           q.defer(year_district_handler,o,fake_R_call,false)
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               filecount.should.eql(0)
               r.should.eql([[0,0]])
               return done()
           })
       })
    it('should spawn jobs only for missing AND broken (check is true) amelia files,rdata=false version',
       function(done){
           var filecount = 0;
           var fake_R_call = function(Ropts,cb){
               // should not get here because the only zip file is
               // 1211682_ML_2012.txt.xz, and there is a corresponding
               // imputed file, that is not empty (by design).
               filecount++
               if(Ropts.file === todoamelia){
                   cb(null,1)
               }else{
                   cb(null,-1)
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
           o.rdata=false

           var q = queue()
           // putting true at the end forces a call to double check
           // whether the purported amelia file is in fact a good
           // amelia result
           //
           q.defer(year_district_handler,o,fake_R_call,true)
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               filecount.should.eql(0)
               r.should.eql([[0]])
               return done()
           })
           return null
       })
    it('should spawn jobs only for missing OR broken (check is true) amelia files,rdata=true version',
       function(done){
           var filecount = 0;
           var fake_R_call = function(Ropts,cb){
               // should get here just once, for the 801320 file,
               // because that RData imputation file is broken
               should.exist(Ropts)
               Ropts.should.have.property('file')
               console.log(Ropts.file)
               Ropts.file.should.be.oneOf([todoamelia,notamelia])
               filecount++
               if(Ropts.file === todoamelia){
                   cb(null,1)
               }else{
                   cb(null,-1)
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
           o.rdata=true

           var q = queue()
           // putting true at the end forces a call to double check
           // whether the purported amelia file is in fact a good
           // amelia result
           //
           q.defer(year_district_handler,o,fake_R_call,true)
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               filecount.should.eql(1)
               r.should.eql([[0,1]])
               return done()
           })
           return null
       })
    it('should spawn jobs for multiple directories, rdata=false',
       function(done){
           var filecount = 0;
           var q = queue(1)
           var districts = ['files','evenmorefiles','morefiles']
           var seen = {'files':0
                       ,'morefiles':0}
           var fake_R_call = function(Ropts,cb){
               console.log('fake R call:',Ropts.opts.env.RDISTRICT)
               filecount++
               seen[Ropts.opts.env.RDISTRICT] = 1
               if(Ropts.file === todoamelia){
                   cb(null,1)
               }else{
                   cb(null,-1)
               }
               return null
           }
           districts.forEach(function(d){
               var o ={env:{}}
               o.env['RYEAR'] = year
               o.env['RDISTRICT']=d
               o.env['CALVAD_PEMS_ROOT']=config.calvad.vdspath
               o.env['R_CONFIG']=config_file
               o.calvad = config.calvad
               o.district = d
               console.log(d)
               o.rdata=true

               // putting true at the end forces a call to double check
               // whether the purported amelia file is in fact a good
               // amelia result
               //
               console.log('in the call loop: ',o.env.RDISTRICT)
               q.defer(year_district_handler,o,fake_R_call,false)
           })
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               seen.should.eql(
                   {'files':0
                    ,'evenmorefiles':1
                    ,'morefiles':1
                   }
                              )
               return done()
           })
           return null
       })
    return null
})
