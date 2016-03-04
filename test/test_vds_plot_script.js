/*eslint-env node, mocha */
var should = require('should')
var config = {}
var spawn = require('child_process').spawn
var fs = require('fs')

var queue = require('d3-queue').queue

var utils=require('./couch_utils.js')

var path = require('path')
var rootdir = path.normalize(process.cwd())
var config_file = rootdir+'/test.config.json'
var config_file_2 = 'plot.test.config.json'
var config_okay = require('config_okay')
var logfile = 'log/testvdsplot.log'

before(function(done){

    var district = 'D08' // bunch Serfas Club Drive detectors
    var date = new Date()
    var test_db_unique = 'plots%2f'+date.getHours()+'-'+date.getMinutes()+'-'+date.getSeconds()

    config_okay(config_file,function(err,c){
        var qb
        if(err){
            throw new Error('node.js needs a good croak module')
        }
        config = Object.assign(config,c)
        config.calvad.districts = [district]
        config.couchdb=Object.assign({},c.couchdb)
        config.couchdb.testdb='test%2f'+test_db_unique
        config.couchdb.trackingdb = config.couchdb.testdb
        qb = queue()
        qb.defer(utils.demo_db_before(config))
        qb.defer(function(cb){
            // dump a temporary config file
            fs.writeFile(config_file_2,JSON.stringify(config),
                         {'encoding':'utf8'
                          ,'mode':0o600
                         },function(e){
                             should.not.exist(e)
                             return cb(e)
                         })
        })
        qb.await(function(e,r1,r2){
            should.not.exist(e)
            return done()
        })
        return null
    })
    return null
})

after(function(done){
    var qa = queue()
    //console.log('cleaning up test vds plot script with config.couchdb of ',config.couchdb)
    qa.defer(utils.demo_db_after(config))
    qa.defer(function(cb){
        fs.unlink(config_file_2,cb)
        return null
    })
    qa.defer(fs.unlink,logfile)
    // maybe also delete log files, but no real need.
    // qa.defer(fs.unlink,'./log/vdsplot_1122682_2012.log')
    // qa.defer(fs.unlink,'./log/vdsplot_322682_2012.log')
    qa.await(done)
    return null
})


describe('trigger_vds_plot',function(){
    it('should trigger the function, search 4 files, process 2 files',
       function(done){
           var logstream,errstream
           var commandline = ['trigger_vds_plot.js','--config',config_file_2]
           var job  = spawn('node', commandline)

           job.stderr.setEncoding('utf8')
           job.stdout.setEncoding('utf8')
           logstream = fs.createWriteStream(logfile
                                            ,{flags: 'a'
                                              ,encoding: 'utf8'
                                              ,mode: 0o666 })
           errstream = fs.createWriteStream(logfile
                                            ,{flags: 'a'
                                              ,encoding: 'utf8'
                                              ,mode: 0o666 })
           job.stdout.pipe(logstream)
           job.stderr.pipe(errstream)


           job.on('exit',function(code){
               fs.readFile(logfile,{'encoding':'utf8'},function(err,data){
                   //console.log(data)
                   // work through each line, parse the output
                   var lines = data.split(/\r?\n/)
                   var tested = {}
                   var processed = {}
                   var t_match = new RegExp('^test\\s+(.*).txt.xz')
                   var p_match = new RegExp('^processing\\s+(.*).txt.xz')
                   lines.forEach(function(line){
                       var t = t_match.exec(line)
                       var p = p_match.exec(line)
                       if(t && t[1]){
                           tested[t[1]] = 1
                       }
                       if(p && p[1]){
                           processed[p[1]] = 1
                       }
                   })
                   tested.should.eql({
                       "91/E/SERFAS_CLUB/801449_ML_2012": 1,
                       "91/E/SERFAS_CLUB/822370_ML_2012": 1
                   })
                   processed.should.eql({
                       "91/E/SERFAS_CLUB/822370_ML_2012": 1
                   })
                   return done()
               })
           })
           return null
       })
    return null
})
