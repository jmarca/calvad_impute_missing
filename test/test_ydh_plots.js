var should = require('should')
var vds_files = require('../lib/vds_files.js')
var utils=require('./couch_utils.js')
var year_district_handler = require('../lib/ydh_plots.js')

var year = 2012
var queue = require('d3-queue').queue

var path = require('path')


var rootdir = process.cwd()
var config_file = path.normalize(rootdir+'/test.config.json')
var config={}
var config_okay = require('config_okay')
before(function(done){
    var district = 'D08' // bunch Serfas Club Drive detectors
    var date = new Date()
    var test_db_unique = date.getHours()+'-'+date.getMinutes()+'-'+date.getSeconds()

    config_okay(config_file,function(err,c){
        if(err){
            throw new Error('node.js needs a good croak module')
        }
        config = Object.assign(config,c)
        config.calvad.districts = [district]
        config.couchdb=c.couchdb
        config.couchdb.testdb='test%2f'+test_db_unique
        config.couchdb.trackingdb = config.couchdb.testdb
        utils.demo_db_before(config)(done)
        return null
    })
    return null
})

after(utils.demo_db_after(config))


describe('year district plot handler should work',function(){

    it('should spawn jobs only for missing plot files,rdata=false',
       function(done){
           var filecount = 0;
           var fake_R_call = function(Ropts,cb){
               // only one file here
               Ropts.file.should.match(/822370/)
               filecount++
               cb(null,1) // note test below expects [0]
               return null
           }

           var o ={env:{}}
           o.calvad = config.calvad
           o.couchdb = config.couchdb
           o.env['RYEAR'] = year
           o.env['RDISTRICT']=o.calvad.districts[0]
           o.env['CALVAD_PEMS_ROOT']=o.calvad.vdspath
           o.env['R_CONFIG']=config_file
           o.rdata=false

           var q = queue()
           q.defer(year_district_handler,o,fake_R_call)
           q.awaitAll(function(e,r){
               should.not.exist(e)
               should.exist(r)
               filecount.should.eql(1) // I have just one txt.xz files
               r.should.eql([[0,1]])
               return done()
           })
       })
    return null
})
