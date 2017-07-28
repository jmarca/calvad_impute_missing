/*eslint-env node, mocha */


var spawn = require('child_process').spawn
var fs = require('fs')

var queue = require('d3-queue').queue

var logfile = 'log/testtamsimpute.log'

var couch_utils=require('./couch_utils.js')
var pg_utils=require('./pg_utils.js')

var path = require('path')
var rootdir = path.normalize(process.cwd())
var config = {}
var config_file = rootdir+'/test.config.json'
var config_file_2 = 'tams.test.config.json'
var config_okay = require('config_okay')
var remove_images = require('./remove_images')

var should = require('should')


before(function(done){

    var date = new Date()
    var test_db_unique = 'tams%2f'+date.getHours()+'-'+date.getMinutes()+'-'+date.getSeconds()
    var test_pg_db_unique = 'tams'+date.getHours()+'_'+date.getMinutes()+'_'+date.getSeconds()

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
        q.defer(async function(cb){
            const create_result = await couch_utils.create_tempdb({options:config},config.couchdb.db)
            // console.log('create result is ',create_result)
            const load_jobs = couch_utils.load_tams(config)
            // console.log('load tams,  jobs isArray',Array.isArray(load_jobs),load_jobs.length)
            //console.log(load_jobs)
            const results = await Promise.all(load_jobs)
            // console.log('results.length is ',results.length)

            return cb()
        })
        // job 2 is pgsql
        // actually, at this time I do not need psql for tams processing
        // q.defer(pg_utils.create_pgdb,config,config.postgresql.db)

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
    // console.log('cleaning after test_tams_impute...dropping temp databases')
    // q.defer(pg_utils.delete_pgdb,config,config.postgresql.db)
    q.defer(couch_utils.delete_tempdb,{options:config},config.couchdb.testdb)

    q.defer(fs.unlink,path.normalize(process.cwd()+'/'+logfile))
    q.defer(fs.unlink,path.normalize(process.cwd()+'/'+config_file_2))
    q.awaitAll(function(e,r){
        return done()
   })
})


describe('trigger_tams_impute, a slow test',function(){
    it('should trigger the function',
       function(done){
           var logstream,errstream
           var commandline = ['trigger_tams_impute.js','--config',config_file_2]
           // console.log(commandline)
           // return done()
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
                       var push_match = new RegExp('^push\\s+(.*)')
                       lines.forEach(function(line){
                           var p = push_match.exec(line)
                           if(p && p[1]){
                               pushed[p[1]] = 1
                           }
                       })
                       var sites = Object.keys(pushed)
                       var plen = sites.length
                       plen.should.eql(104)
                       // one per site, 2 years, but not every one of
                       // the sites has data for each year (and none
                       // of the sites have data for 2012!)
                       sites.forEach( site =>{
                           pushed[site].should.eql(1)
                           return null
                       })
                       return cb()
                   })
                   return null
               })

               testq.defer(function(cb){
                   fs.readFile(logfile,{'encoding':'utf8'},function(err,data){
                       var lines = data.split(/\r?\n/)
                       var no_data = 0
                       var has_data = 0
                       var no_data_match = new RegExp('got exit:\\s+0')
                       var has_data_match = new RegExp('got exit:\\s+10')
                       lines.forEach(function(line){
                           if(no_data_match.test(line)){
                               no_data++
                           }
                           if(has_data_match.test(line)){
                               has_data++
                           }
                           return null
                       })
                       no_data.should.eql(175) // everything but 7005, 2 years
                       // this is less than 115 * 2 because some
                       // detectors do not have data for both years,
                       // and the code only processes detectors if it
                       // is known that they have data for that year
                       // in the original TAMS database archive tables
                       has_data.should.eql(1 * 2) // just 7005, 2 years
                       return cb()
                   })
                   return null
               })

           //     testq.defer(function(cb){
           //         fs.readFile('log/tamsimpute.log',{'encoding':'utf8'},function(err,data){
           //             var lines = data.split(/\r?\n/)
           //             var has_problem = false
           //             var imputations = []
           //             var problem_match = new RegExp('problem, dim df.tams is 0')
           //             var impute_match = new RegExp('-- Imputation')
           //             lines.forEach(function(line){
           //                 if(problem_match.test(line)){
           //                     has_problem = true
           //                 }
           //                 if(impute_match.test(line)){
           //                     imputations.push(line)
           //                 }
           //                 return null
           //             })
           //             has_problem.should.not.be.ok()
           //             imputations.length.should.eql(5)
           //             return cb()
           //         })
           //         return null
           //     })

               testq.await(function(e,r){
                   return done(e)
               })
           })
           return null
       })
    return null
})
