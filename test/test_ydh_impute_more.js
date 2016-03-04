/*eslint-env node, mocha */
var should = require('should')
//var fs = require('fs')
var config = {}

var year_district_handler = require('../lib/ydh_imputations.js')

var year = 2012
var base_vdspath = './tests/testthat/'
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
//     var logfiles = ['vdscheck_1007610_2012.log'
//                     ,'vdscheck_411682_2012.log'
//                     ,'vdscheck_801447_2012.log'
//                     ,'vdscheck_801451_2012.log'
//                     ,'vdscheck_911320_2012.log'
//                     ,'vdscheck_1011682_2012.log'
//                     ,'vdscheck_611320_2012.log'
//                     ,'vdscheck_801449_2012.log'
//                     ,'vdscheck_822370_2012.log'
//                    ]
//     var qd = queue(5)
//     logfiles.forEach(function(f){
//         qd.defer(fs.unlink,path.normalize(process.cwd()+'/log/'+f))
//         return null
//     })
//     qd.await(done)
// })



describe('year district handler should work',function(){

    it('should spawn jobs for multiple directories, rdata=true, check amelia=true',
       function(done){
           var filecount = 0
           var q = queue(1)
           var districts = ['evenmorefiles']
           var seen = {'files':0
                       ,'morefiles':0}
           var fake_R_call = function(Ropts,cb){
               filecount++
               console.log('R is processing ',Ropts.file)
               seen[Ropts.opts.env.RDISTRICT] = 1
               cb(null,1)
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
               q.defer(year_district_handler,o,fake_R_call,true)
           })
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               seen.should.eql(
                   {'files':0
                    ,'evenmorefiles':1
                    ,'morefiles':0
                   }
               )
               filecount.should.eql(9)
               return done()
           })
           return null
       })
    return null
})
