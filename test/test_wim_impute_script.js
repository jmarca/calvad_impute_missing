/*eslint-env node, mocha */


var spawn = require('child_process').spawn
var fs = require('fs')

var queue = require('d3-queue').queue

var logfile = 'log/testwimimpute.log'

var utils=require('./couch_utils.js')

var path = require('path')
var rootdir = path.normalize(process.cwd())
var config = {}
var config_file = rootdir+'/test.config.json'
var config_file_2 = 'wim.test.config.json'
var config_okay = require('config_okay')
var remove_images = require('./remove_images')

var should = require('should')


before(function(done){

    var date = new Date()
    var test_db_unique = 'wim%2f'+date.getHours()+'-'+date.getMinutes()+'-'+date.getSeconds()
    var test_pg_db_unique = 'wim'+date.getHours()+'_'+date.getMinutes()+'_'+date.getSeconds()

    config_okay(config_file,function(err,c){
        var q
        if(err){
            throw new Error('node.js needs a good croak module')
        }
        config = Object.assign(config,c)
        config.couchdb={}
        config.couchdb=Object.assign(config.couchdb,c.couchdb)
        config.couchdb.testdb='test%2f'+test_db_unique
        config.couchdb.trackingdb = config.couchdb.testdb
        config.couchdb.db = config.couchdb.testdb
        config.postgresql.db=test_pg_db_unique
        q = queue(3) // parallel jobs
        q.defer(function(cb){
            // job 1 is couchdb
            var qb = queue(1) // sequential jobs
            qb.defer(utils.create_tempdb,{options:config},config.couchdb.testdb)
            qb.defer(utils.load_wim,{options:config})
            qb.await(function(e,r1,r2){
                console.log('couchdb sorted')
                should.not.exist(e)
                return cb()
            })

        })
        // job 2 is pgsql
        q.defer(utils.create_pgdb,config,config.postgresql.db)

        // job 3 is write out temporary config file
        q.defer(function(cb){
            fs.writeFile(config_file_2,JSON.stringify(config),
                         {'encoding':'utf8'
                          ,'mode':0o600
                         },function(e){
                             should.not.exist(e)
                             return cb(e)
                         })
        })

        q.await(function(e,r1,r2,r3){
            should.not.exist(e)
            return done()
        })
        return null
    })
    return null
})


after(function(done){
    var q = queue()
    console.log('cleaning after test_wim_impute...dropping temp databases')
    q.defer(utils.delete_pgdb,config,config.postgresql.db)

    q.defer(utils.delete_tempdb,{options:config},config.couchdb.testdb)

    q.defer(fs.unlink,path.normalize(process.cwd()+'/'+logfile))
    q.defer(fs.unlink,path.normalize(process.cwd()+'/'+config_file_2))
    q.defer(remove_images,'87','S',2012,config.calvad.wimpath)
    q.defer(fs.unlink,
            path.normalize(process.cwd()+'/'+'log/wimimpute_80_2012.log'))
    q.defer(fs.unlink,
            path.normalize(process.cwd()+'/'+'log/wimimpute_83_2012.log'))
    q.defer(fs.unlink,
            path.normalize(process.cwd()+'/'+'log/wimimpute_87_2012.log'))
    q.awaitAll(function(e,r){
        return done()
    })
})


describe('trigger_wim_impute, a slow test that takes 1 to 2 minutes',function(){
    it('should trigger the function',
       function(done){
           var logstream,errstream
           var commandline = ['trigger_wim_impute.js','--config',config_file_2]
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
               var testq = queue()
               testq.defer(function(cb){
                   fs.readFile(logfile,{'encoding':'utf8'},function(err,data){
                       // work through each line, parse the output
                       var lines = data.split(/\r?\n/)
                       var pushed = {}
                       var push_match = new RegExp('^push site:\\s+(.*)')
                       lines.forEach(function(line){
                           var p = push_match.exec(line)
                           if(p && p[1]){
                               pushed[p[1]] = 1
                           }
                       })
                       pushed.should.eql({
                           '80':1,
                           '83':1,
                           '87':1
                       })
                       return cb()
                   })
                   return null
               })

               testq.defer(function(cb){
                   fs.readFile('log/wimimpute_80_2012.log',{'encoding':'utf8'},function(err,data){
                       var lines = data.split(/\r?\n/)
                       var has_problem = false
                       var problem_match = new RegExp('problem, dim df.wim is 0')
                       lines.forEach(function(line){
                           if(problem_match.test(line)){
                               has_problem = true
                           }
                           return null
                       })
                       has_problem.should.be.ok()
                       return cb()
                   })
                   return null
               })

               testq.defer(function(cb){
                   fs.readFile('log/wimimpute_87_2012.log',{'encoding':'utf8'},function(err,data){
                       var lines = data.split(/\r?\n/)
                       var has_problem = false
                       var imputations = []
                       var problem_match = new RegExp('problem, dim df.wim is 0')
                       var impute_match = new RegExp('-- Imputation')
                       lines.forEach(function(line){
                           if(problem_match.test(line)){
                               has_problem = true
                           }
                           if(impute_match.test(line)){
                               imputations.push(line)
                           }
                           return null
                       })
                       has_problem.should.not.be.ok()
                       imputations.length.should.eql(5)
                       return cb()
                   })
                   return null
               })

               testq.await(function(e,r){
                   return done(e)
               })
           })
           return null
       })
    return null
})
