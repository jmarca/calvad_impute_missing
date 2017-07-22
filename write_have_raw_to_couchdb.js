
var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var queue = require('d3-queue').queue
var _ = require('lodash');
var get_files = require('./lib/get_files')
var suss_detector_id = require('suss_detector_id')
var couch_check = require('couch_check_state')

var statedb = 'vdsdata%2ftracking'
var couch_set   = require('couch_set_state')

var R;

function vdsfile_handler(opt){
    return function(f,cb){
        var did = suss_detector_id(f)

        couch_set({'db':statedb
                  ,'doc':did
                  ,'year':opt.env['RYEAR']
                  ,'state':'have_raw_data'
                  ,'value':'1'
                  }
                 ,function(e,s){
                      if(e) throw new Error(e)
                      cb()
                  });
        return null
    }
}

var years = [//2006,2007,
    2008,2009,2010,2011];

var districts = ['D04'
                ,'D08'
                ,'D12'
                ,'D05'
                ,'D06'
                ,'D07'
                ,'D03'
                ,'D11'
                ,'D10'
                ]

function ydq_processor(opt,cb){
    // get the files
    var handler = vdsfile_handler(opt)
    console.log('getting '+ opt.env['RDISTRICT'] + ' '+opt.env['RYEAR'])
    get_files.get_yearly_vdsfiles_local(
        {district:opt.env['RDISTRICT']
         ,year:opt.env['RYEAR']}
        ,function(err,list){
            if(err) throw new Error(err)
            var vdsfileq = queue(5)
            list.forEach(function(file){
                vdsfileq.defer(handler,
                               file)
                return null
            })
            vdsfileq.await(function(e,r){
                // done
                return cb(e)
            })
        })
}

var ydq = queue(1)
var years_districts = []
years.forEach(function(year){
    districts.forEach(function(district){
        var o = { env: {} }
        o.env['RYEAR'] = year
        o.env['RDISTRICT']=district
        ydq.defer(ydq_processor,o)
        return null
    })
    ydq.awaitAll(function(e,r){
        // done
        console.log('done with year, district processing')
        if(e) console.log('error',e)
        return null
    })
    return null
});



// debugging, just do one combo for now
// years_districts=[years_districts[0]]
years_districts.forEach(function(yd
async.eachLimit(years_districts,1,
});

1;
