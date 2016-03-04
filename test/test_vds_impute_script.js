/*eslint-env node, mocha */


var config = {}
var spawn = require('child_process').spawn
var fs = require('fs')

var queue = require('d3-queue').queue

var logfile = 'log/testvdsimpute.log'
var path = require('path')
var rootdir = path.normalize(process.cwd())
var config_file = rootdir+'/test.config.json'
var config_okay = require('config_okay')
require('should')

before(function(done){
    var district = 'files' // fake out the finder

    config_okay(config_file,function(err,c){
        if(err){
            throw new Error('node.js needs a good croak module')
        }
        config = c
        return done()
    })
    return null
})

after(function(done){
    var q = queue()
    q.defer(fs.unlink,logfile)
    q.defer(fs.unlink,'./tests/testthat/evenmorefiles/D10/5/N/LOUISE_AVE/1007610_ML_2012.120.imputed.RData')
    //q.defer(fs.unlink,'./log/vdsimpute_1122682_2012.log')
    //q.defer(fs.unlink,'./log/vdsimpute_322682_2012.log')
    q.await(function(e,r){
        return done()
    })
})


describe('trigger_vds_impute, a slow test that takes 5 minutes',function(){
    it('should trigger the function, search 4 files, process 2 files',
       function(done){
           var logstream,errstream
           var commandline = ['trigger_vds_impute.js','--config','test.config.json']
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
                       '322682_ML_2012': 1,
                       '411682_ML_2012': 1,
                       '1011682_ML_2012': 1,
                       '1122682_ML_2012': 1,
                       '5/N/LOUISE_AVE/1007610_ML_2012':1
                   })
                   processed.should.eql({
                       '322682_ML_2012':1,
                       '1122682_ML_2012':1,
                       '5/N/LOUISE_AVE/1007610_ML_2012':1
                   })
                   return done()
               })
           })
           return null
       })
    return null
})
