var should = require('should')
var vds_files = require('../lib/vds_files.js')
var config = {}
var vdsfile_handler_2 = vds_files.vdsfile_handler_2
var year = 2012
var queue = require('queue-async')

var path = require('path')
var root = path.normalize('./tests/testthat')
var district = 'files'

describe('vdsfile_handler_2 should work',function(){
    var goodfile ='1211682_ML_2012.120.imputed.RData'
    var notamelia ='1211682_ML_2012.df.2012.RData'
    var badamelia ='801320_ML_2012.120.imputed.RData'
    var fakefile ='1200001_ML_2012.df.2012.RData'

    var todomatches = [/801320/,/1200001/]

    it('should spawn jobs only for missing amelia files',
       function(done){

           var fake_R_call = function(Ropts,cb){
               should.exist(Ropts)
               Ropts.should.have.property('file')
               Ropts.file.should.eql(fakefile)
               cb(null,1)
               return null
           }

           var o ={env:{}}
           o.env['RYEAR'] = year
           o.env['RDISTRICT']=district
           o.env['CALVAD_PEMS_ROOT']=root
           var handler = vdsfile_handler_2(o,fake_R_call,false)
           var filelist = [goodfile,notamelia,badamelia,fakefile]
           var q = queue()
           filelist.forEach(function(f){
               q.defer(handler,f)
               return null
           })
           q.awaitAll(function(e,r){
               //console.log(r)
               should.not.exist(e)
               should.exist(r)
               r.should.eql([0,0,0,1])
               return done()
           })
       })
    it('should spawn jobs only for missing and broken amelia files',
       function(done){

           var fake_R_call = function(Ropts,cb){
               should.exist(Ropts)
               Ropts.should.have.property('file')
               var gotone = todomatches.filter(function(m){
                   return m.test(Ropts.file)
               })

               should.exist(gotone)
               gotone.should.have.lengthOf(1)
               cb(null,1)
               return null
           }

           var o ={env:{}}
           o.env['RYEAR'] = year
           o.env['RDISTRICT']=district
           o.env['CALVAD_PEMS_ROOT']=root
           var handler = vdsfile_handler_2(o,fake_R_call,true)
           var filelist = [goodfile,notamelia,badamelia,fakefile]
           var q = queue()
           filelist.forEach(function(f){
               q.defer(handler,f)
               return null
           })
           q.awaitAll(function(e,r){
               //console.log(r)
               should.not.exist(e)
               should.exist(r)
               r.should.eql([0,0,1,1])
               return done()
           })
       })
})
