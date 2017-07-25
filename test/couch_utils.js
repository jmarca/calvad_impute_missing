/*global require exports */
var superagent = require('superagent')
var queue = require('d3-queue').queue
var exec = require('child_process').exec

//var pg = require('pg')
var putview = require('couchdb_put_view')
var should = require('should')

function put_wim_views(config,db,cb){
    var opts = Object.assign({},config.couchdb)
    opts.db = db
    opts.doc = require('../node_modules/calvad_wim_sites/couchdb_views/wim.json')
    putview(opts,cb)
    return null
}


function create_tempdb(task,db,cb){

    var cdb
    if(typeof db === 'function'){
        throw new Error('db required now')
    }
    cdb =
        [task.options.couchdb.host+':'+task.options.couchdb.port
         ,db].join('/')

    const req = superagent.put(cdb)
          .type('json')
          .auth(task.options.couchdb.auth.username
                ,task.options.couchdb.auth.password)

    if(cb){
            req.end(function(err,result){
                cb()
            })
        return null
    }
    // else, not cb, so return req object
    return req
}

function delete_tempdb(task,db,cb){
    var cdb
    if(typeof db === 'function'){
        throw new Error('db required now')
    }
    cdb =
        [task.options.couchdb.host+':'+task.options.couchdb.port
         ,db].join('/')
    console.log('deleting ',cdb)
    superagent.del(cdb)
    .type('json')
    .auth(task.options.couchdb.auth.username
         ,task.options.couchdb.auth.password)
    .end(cb)
    return null
}


function put_file(file,couch,cb){

    var db_dump = require(file)
    superagent.post(couch)
    .type('json')
    .send(db_dump)
    .end(function(e,r){
        should.not.exist(e)
        should.exist(r)
        return cb(e,1)
    })
    return null
}

async function load_wim_async(task){
    return new Promise((resolve, reject)=>{
        load_wim(task,function(e,r){
            if(e){
                reject(e)
            }
            resolve(r)
            return null
        })
    })
}

function load_wim(task,cb){
    var db_files = ['./files/wim.10.N.json'  //done impute, with png files
                    ,'./files/wim.80.W.json' //not done impute, without png files, no data in db
                    ,'./files/wim.87.S.json' //not done impute, without png files
                    ,'./files/wim.83.W.json' //not done impute, without png files
                   ]
    var cdb = [task.options.couchdb.host+':'+task.options.couchdb.port
              ,task.options.couchdb.testdb].join('/')

    var q = queue()
    db_files.forEach(function(file){
        q.defer(put_file,file,cdb)
    })
    q.defer(put_wim_views,task.options,task.options.couchdb.testdb)
    q.awaitAll(function(err,r){
        should.not.exist(err)
        var req = superagent.get(cdb)
            .type('json')

        req.end(function(e,r){
            var superagent_sucks
            should.not.exist(e)
            should.exist(r)
            r.should.have.property('text')
            superagent_sucks = JSON.parse(r.text)
            superagent_sucks.should.have.property('doc_count',5)
            console.log('loaded wim data',superagent_sucks.doc_count)
            return cb()

        })

        return null

    })
    return null
}

function load_detector(task,cb){
    var db_files = ['./files/801447.json'  //with png files
                    ,'./files/801449.json' //with png files
                    ,'./files/801451.json' // without png files
                    ,'./files/822370.json' // without png files
                   ]
    var cdb = [task.options.couchdb.host+':'+task.options.couchdb.port
              ,task.options.couchdb.testdb].join('/')

    var q = queue()
    db_files.forEach(function(file){
        q.defer(put_file,file,cdb)
    })
    q.await(function(err,d1,d2,d3,d4){
        should.not.exist(err)
        superagent.get(cdb)
            .type('json')
            .end(function(e,r){
                var superagent_sucks
                should.not.exist(e)
                should.exist(r)
                r.should.have.property('text')
                superagent_sucks = JSON.parse(r.text)
                superagent_sucks.should.have.property('doc_count',d1+d2+d3+d4)
                return cb()

            })
        return null
    })
    return null
}


function demo_db_before(config){
    return function(done){
        var task = {options:config}
        // dummy up a done grid and a not done grid in a test db
        var dbs = [task.options.couchdb.testdb
                  ]

        var q = queue(1)
        dbs.forEach(function(db){
            q.defer(create_tempdb,task,db)
            return null
        })
        q.await(function(e){
            should.not.exist(e)
            queue(1)
                .defer(load_detector,task)
                .await(done)
            return null
        })
        return null
    }
}

function demo_db_after(config){
    return  function(done){
        var task = {options:config}
        var dbs = [config.couchdb.testdb
                  ]
        var q = queue()
        dbs.forEach(function(db){
            console.log('dropping '+db)
            if(!db) return null
            q.defer(delete_tempdb,task,db)
            return null
        })
        q.await(done)
        return null

    }
}

exports.load_detector = load_detector
exports.load_wim = load_wim
exports.load_wim_async = load_wim_async
exports.create_tempdb = create_tempdb
exports.delete_tempdb = delete_tempdb
exports.demo_db_after = demo_db_after
exports.demo_db_before= demo_db_before
