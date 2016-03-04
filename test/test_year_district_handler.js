/*eslint-env node, mocha */
var should = require('should')
//var fs = require('fs')
var config = {}

var year_district_handler = require('../lib/ydh_imputations.js')

var year = 2012
var base_vdspath = './tests/testthat/'
var filesdirectory = 'files'
var queue = require('d3-queue').queue


var path = require('path')
var rootdir = path.normalize(__dirname)
var config_file = rootdir+'/../test.config.json'
var config={}
var config_okay = require('config_okay')
before(function(done){

    config_okay(config_file,function(err,c){
        if(err){
            throw new Error('node.js needs a good croak module')
        }
        config = Object.assign(config,c)
        return done()
    })
    return null
})

// after(function(done){
//     var logfiles = ['vdscheck_1211682_2012.log'
//                     ,'vdscheck_801320_2012.log'
//                    ]
//     var qd = queue(5)
//     logfiles.forEach(function(f){
//         qd.defer(fs.unlink,path.normalize(process.cwd()+'/log/'+f))
//         return null
//     })
//     qd.await(done)
// })

describe('year district handler should work',function(){
    var notamelia ='1211682_ML_2012.df.2012.RData'
    var todoamelia ='801320_ML_2012.df.2012.RData'

    it('should spawn jobs only for missing amelia files,rdata=false',
       function(done){
           var filecount = 0
           var fake_R_call = function(Ropts,cb){
               // this should never get called
               filecount++
               cb(null,1) // note test below expects [0]
               return null
           }

           var q = queue()
           var o ={env:{}}
           o.calvad = Object.assign({},config.calvad)
           o.calvad.vdspath = base_vdspath
           o.env.RYEAR = year
           o.env.RDISTRICT=filesdirectory
           o.env.CALVAD_PEMS_ROOT=base_vdspath
           o.env.R_CONFIG=config_file
           o.rdata=false

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
           var filecount = 0
           var fake_R_call = function(Ropts,cb){
               // this should never get called
               filecount++
               cb(null,1) // note test below expects [0]
               return null
           }

           var q = queue()
           var o ={env:{}}
           o.calvad = Object.assign({},config.calvad)
           o.calvad.vdspath = base_vdspath
           o.env.RYEAR = year
           o.env.RDISTRICT = filesdirectory
           o.env.CALVAD_PEMS_ROOT=base_vdspath
           o.env.R_CONFIG=config_file
           o.rdata=true

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
           var filecount = 0
           var fake_R_call = function(Ropts,cb){
               // should not get here because the only zip file is
               // 1211682_ML_2012.txt.xz, and there is a corresponding
               // imputed file, that is not empty (by design).
               console.log(Ropts.file)
               filecount++
               if(Ropts.file === todoamelia){
                   cb(null,1)
               }else{
                   cb(null,-1)
               }
               return null
           }

           var q = queue()
           var o ={env:{}}
           o.calvad = Object.assign({},config.calvad)
           o.calvad.vdspath = base_vdspath
           o.env.RYEAR = year
           o.env.RDISTRICT = filesdirectory
           o.env.CALVAD_PEMS_ROOT=base_vdspath
           o.env.R_CONFIG=config_file
           o.rdata=false

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
           var filecount = 0
           var fake_R_call = function(Ropts,cb){
               // should get here just once, for the 801320 file,
               // because that RData imputation file is broken
               should.exist(Ropts)
               Ropts.should.have.property('file')
               Ropts.file.should.be.oneOf([todoamelia,notamelia])
               filecount++
               if(Ropts.file === todoamelia){
                   cb(null,1)
               }else{
                   cb(null,-1)
               }
               return null
           }

           var q = queue()
           var o ={env:{}}
           o.calvad = Object.assign({},config.calvad)
           o.calvad.vdspath = base_vdspath
           o.env.RYEAR = year
           o.env.RDISTRICT = filesdirectory
           o.env.CALVAD_PEMS_ROOT=base_vdspath
           o.env.R_CONFIG=config_file
           o.rdata=true

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
           var filecount = 0
           var q = queue(1)
           var districts = ['files','evenmorefiles','morefiles']
           var seen = {'files':0
                       ,'morefiles':0}
           var fake_R_call = function(Ropts,cb){
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
               o.calvad = Object.assign({},config.calvad)
               o.calvad.vdspath = base_vdspath
               o.env.RYEAR = year
               o.env.RDISTRICT=d
               o.env.CALVAD_PEMS_ROOT=base_vdspath
               o.env.R_CONFIG=config_file
               o.rdata=true

               // putting true at the end forces a call to double check
               // whether the purported amelia file is in fact a good
               // amelia result
               //
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
