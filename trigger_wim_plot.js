
var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('queue-async');
var _ = require('lodash');
var get_files = require('./get_files')
var suss_detector_id = require('suss_detector_id')
var couch_check = require('couch_check_state')

var num_CPUs = require('os').cpus().length;

var statedb = 'vdsdata%2ftracking'

var R;


/**
 * refactor items
 *
 * 1. get files here
 * 2. send just a single file to R for processing
 * 3. which means make sure that each file that is sent to R really
 *    needs processing
 *
 */

var trigger_R_job = function(task,done){
    var wim = task.wim

    task.env['RYEAR']=task.year
    task.env['WIM_SITE']=wim
    task.env['WIM_IMPUTE']=0
    task.env['WIM_PLOT_PRE']=1
    task.env['WIM_PLOT_POST']=0 // for now

    var R  = spawn('Rscript', RCall, task);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    var logfile = 'log/wimplot_'+wim+'_'+task.year+'.log'
    var logstream = fs.createWriteStream(logfile
                                        ,{flags: 'a'
                                         ,encoding: 'utf8'
                                         ,mode: 0666 })
    R.stdout.pipe(logstream)
    R.stderr.pipe(logstream)
    R.on('exit',function(code){
        console.log('got exit: '+code+', for ',wim)
        return done()
    })
}
var file_queue=queue(num_CPUs)

var file_queue_drain =function(){
    console.log('queue drained')
    return null
}

var years = [2012]//,2010,2011];

var RCall = ['--no-restore','--no-save','wim_impute.R']

var wim_sites = require('calvad_wim_sites')

var unique_wim = {}
var opts = { cwd: undefined,
             env: process.env
           }

var rootdir = path.normalize(__dirname)
var config_file = rootdir+'/config.json'
var config={}
var sites = wim_sites.sites
years.forEach(function(year){
    sites.forEach(function(site){
        console.log(site.site,year)
        var _opts = _.clone(opts)
        if(unique_wim[site.site+year] === undefined){
            unique_wim[site.site+year] = 1
            _opts.wim=site.site
            _opts.year=year

            file_queue.defer(trigger_R_job,_opts)
        }
        return  null
    })
    return null


})

file_queue.await(file_queue_drain)


1;
