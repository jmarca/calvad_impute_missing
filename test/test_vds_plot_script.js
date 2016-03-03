var should = require('should')
var vds_files = require('../lib/vds_files.js')
var config = {}
var spawn = require('child_process').spawn;
var fs = require('fs')

var year = 2012
var queue = require('d3-queue').queue

var path = require('path')

var rootdir = path.normalize(process.cwd())
var config_file = rootdir+'/test.config.json'
var config_okay = require('config_okay')
before(function(done){
    var district = 'files' // fake out the finder

    config_okay(config_file,function(err,c){
        if(err){
            throw new Error('node.js needs a good croak module')
        }
        config = c
        config.district = district // fake out the get_local_files.js

        //FIXME initialize temporary couchdb database

        return done()
    })
    return null
})



describe('trigger_vds_plot',function(){
    var logfile = 'log/testvdsplot.log'
    after(function(done){
        // uncomment the following when test is stable
        // var q = queue()
        // q.defer(fs.unlink,logfile)
        // q.defer(fs.unlink,'./log/vdsplot_1122682_2012.log')
        // q.defer(fs.unlink,'./log/vdsplot_322682_2012.log')
        // q.await(function(e,r){
        //     return done()
        // })
        // and comment out the following line
        return done()
    })
    it('should trigger the function, search 4 files, process 2 files',
       function(done){
           var commandline = ['trigger_vds_plot.js','--config','test.config.json']
           var job  = spawn('node', commandline);

           job.stderr.setEncoding('utf8')
           job.stdout.setEncoding('utf8')
           var logstream = fs.createWriteStream(logfile
                                                ,{flags: 'a'
                                                  ,encoding: 'utf8'
                                                  ,mode: 0666 })
           var errstream = fs.createWriteStream(logfile
                                                ,{flags: 'a'
                                                  ,encoding: 'utf8'
                                                  ,mode: 0666 })
           job.stdout.pipe(logstream)
           job.stderr.pipe(errstream)


           job.on('exit',function(code){
               fs.readFile(logfile,{'encoding':'utf8'},function(err,data){
                   //console.log(data)
                   // work through each line, parse the output
                   var lines = data.split(/\r?\n/)
                   var tested = {}
                   var queued = {}
                   var processed = {}
                   var t_match = new RegExp('^test\\s+(.*).txt.xz')
                   var q_match = new RegExp('^queue up\\s+(.*).txt.xz')
                   var p_match = new RegExp('^processing\\s+(.*).txt.xz')
                   lines.forEach(function(line){
                       var t = t_match.exec(line)
                       var q = q_match.exec(line)
                       var p = p_match.exec(line)
                       if(t && t[1]){
                           tested[t[1]] = 1
                       }
                       if(q && q[1]){
                           queued[q[1]] = 1
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
                   queued.should.eql({
                       '322682_ML_2012':1,
                       '1122682_ML_2012':1
                   })
                   processed.should.eql({
                       '322682_ML_2012':1,
                       '1122682_ML_2012':1
                   })
                   return done()
               })
           })
           return null
       })
    return null
})
