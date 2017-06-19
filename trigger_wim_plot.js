
var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('d3-queue').queue

var _ = require('lodash');
//var get_files = require('./lib/get_files')
var suss_detector_id = require('suss_detector_id')
var year_handler = require('./lib/wim_yh_plots.js')

var redo_plot = process.env.CALVAD_REDO_PLOT
var argv = require('minimist')(process.argv.slice(2))
var years = []

// configuration stuff
var rootdir = path.normalize(process.cwd())
var RCall = ['--no-restore','--no-save','wim_impute.R']
var Rhome = path.normalize(rootdir+'/R')
var opts = {cwd: Rhome
           ,env: process.env
           }
var config_file = path.normalize(rootdir+'/config.json')
var config
var config_okay = require('config_okay')

var wim_sites = require('calvad_wim_sites')
var unique_wim = {}





var wimpath = process.env.WIM_PATH
if(!wimpath){
    throw new Error('assign a value to env variable WIM_PATH')
}

var num_CPUs = require('os').cpus().length;
//num_CPUs=1 // while testing

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
    var R,logfile,logstream,errstream
    var wim = task.wim

    task.env['RYEAR']=task.year
    task.env['WIM_SITE']=wim
    task.env['WIM_IMPUTE']=0
    task.env['WIM_PLOT_PRE']=1
    task.env['WIM_PLOT_POST']=1

    R  = spawn('Rscript', RCall, task);
    R.stderr.setEncoding('utf8')
    R.stdout.setEncoding('utf8')
    logfile = 'log/wimplot_'+wim+'_'+task.year+'.log'
    logstream = fs.createWriteStream(logfile
                                     ,{flags: 'a'
                                       ,encoding: 'utf8'
                                       ,mode: 0o666 })
    errstream = fs.createWriteStream(logfile
                                     ,{flags: 'a'
                                       ,encoding: 'utf8'
                                       ,mode: 0o666 })
    R.stdout.pipe(logstream)
    R.stderr.pipe(errstream)
    R.on('exit',function(code){
        console.log('got exit: '+code+', for ',wim)
        // testing
        //throw new Error('croak')
        return done()
    })
}
var file_queue=queue(num_CPUs)

var file_queue_drain =function(){
    console.log('queue drained')
    return null
}

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
