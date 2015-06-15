
var util  = require('util'),
    spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var async = require('async');
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

var years_districts = []
_.each(years,function(year){
    _.each(districts,function(district){
        var o = { env: {} }
        o.env['RYEAR'] = year
        o.env['RDISTRICT']=district
        years_districts.push(o)
    })
});

// debugging, just do one combo for now
// years_districts=[years_districts[0]]
async.eachLimit(years_districts,1,function(opt,cb){
    // get the files
    var handler = vdsfile_handler(opt)
    console.log('getting '+ opt.env['RDISTRICT'] + ' '+opt.env['RYEAR'])
    get_files.get_yearly_vdsfiles_local({district:opt.env['RDISTRICT']
                                        ,year:opt.env['RYEAR']}
                                       ,function(err,list){
                                            if(err) throw new Error(err)
                                            async.eachLimit(list
                                                           ,5
                                                           ,handler
                                                           ,cb);
                                            return null
                                        });
});

1;
