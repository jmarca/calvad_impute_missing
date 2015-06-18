var should = require('should')
var vds_files = require('../lib/vds_files.js')
var config = {}

describe('load RData file, check message',function(){
    var goodfile ='./tests/testthat/files/1211682_ML_2012.120.imputed.RData'
    var notamelia ='./tests/testthat/files/1211682_ML_2012.df.2012.RData'
    var badamelia ='./tests/testthat/files/801320_ML_2012.120.imputed.RData'
    it('should get an amelia file just fine',
       function(done){
           vds_files.check_RData(config,
                                 goodfile,
                                 function(err,msg){
                                     should.not.exist(err)
                                     should.exist(msg)
                                     msg.should.eql(0)
                                     return done()
                                 })

       })
    it('should not crash on a non-amelia file',
       function(done){
           vds_files.check_RData(config,
                                 notamelia,
                                 function(err,msg){
                                     should.not.exist(err)
                                     should.exist(msg)
                                     msg.should.eql(2)
                                     return done()
                                 })

       })
    // even though it *claims* to be an amelia file, in fact this file
    // is a list that contains just the message and the imputation
    // code
    it('should get a broken amelia file just fine',
       function(done){
           vds_files.check_RData(config,
                                 badamelia,
                                 function(err,msg){
                                     should.not.exist(err)
                                     should.exist(msg)
                                     msg.should.eql(2) // not an amelia file
                                     return done()
                                 })

       })
    it('should not puke with no file',
       function(done){
           vds_files.check_RData(config,
                                 '',
                                 function(err,msg){
                                     should.not.exist(err)
                                     should.exist(msg)
                                     msg.should.eql(3) // no file passed
                                     return done()
                                 })

       })
})
