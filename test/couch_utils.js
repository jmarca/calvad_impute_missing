/*global require exports */
var superagent = require('superagent')
var queue = require('d3-queue').queue
var exec = require('child_process').exec
var get_pool = require('psql_pooler').get_pool

var pg = require('pg')
var putview = require('couchdb_put_view')
var should = require('should')

function put_wim_views(config,db,cb){
    var opts = Object.assign({},config.couchdb)
    opts.db = db
    opts.doc = require('../node_modules/calvad_wim_sites/couchdb_views/wim.json')
    putview(opts,cb)
    return null
}

function delete_pgdb(config,db,delete_pgdb_cb){
    var host = config.postgresql.host || '127.0.0.1'
    var port = config.postgresql.port || 5432
    var adminuser =  'postgres'
    if(config.postgresql.admin !== undefined){
        if(config.postgresql.admin.user !== undefined){
            adminuser = config.postgresql.admin.user
        }
    }

    var commandline = ["/usr/bin/dropdb",
                       "-U", adminuser,
                       "-h", host,
                       "-p", port
                       , db
                      ].join(' ');
    console.log('deleting pgsql db ',db)

    exec(commandline
         ,function(e,out,err){
             if(e !== null ){
                 throw new Error(e)

             }
             return delete_pgdb_cb()
         })
    return null
}

function create_pgdb(config,db,create_pgdb_cb){
    var q = queue(1) // one after the other jobs
    var user = ''
    var host = config.postgresql.host || '127.0.0.1'
    var port = config.postgresql.port || 5432

    var admindb   = 'postgres'
    var adminuser = 'postgres'
    var admin_conn_string
    var conn_string

    if(config.postgresql.auth !== undefined &&
       config.postgresql.auth.username !== undefined){
        user = config.postgresql.auth.username
    }
    conn_string = "postgres://"+user+"@"+host+":"+port+"/"+db

    if(config.postgresql.admin !== undefined){
        if(config.postgresql.admin.db !== undefined){
            admindb = config.postgresql.admin.db
        }
        if(config.postgresql.admin.user !== undefined){
            adminuser = config.postgresql.admin.user
        }
    }
    admin_conn_string = "postgres://"+adminuser+"@"+host+":"+port+"/"+admindb

    config.postgresql.admin_conn_string = admin_conn_string
    config.postgresql.conn_string = conn_string

    // create the testing database
    q.defer(function(cb){
        // pg connect is no longer.  need to fix this

        pg.connect(admin_conn_string, function(err, client,clientdone) {
            if(err) {
                console.log( 'must have valid admin credentials in test.config.json, and a valid admin password setup in your .pgpass file' )
                throw new Error(err)
            }
            // create database
            var create_query = "create database " + db

            if(user != adminuser){
                create_query += " with owner " + user;
            }

            client.query(create_query,function(e,r){
                if(e){
                    console.log('failed: '+create_query)
                    console.log( {
                        'host_psql':host,
                        'port_psql':port,
                        'dbname_psql':db,
                        'admin database':admindb,
                        'admin user':adminuser
                    } )

                    throw new Error(e)
                }
                clientdone()
                // database successfully created

                return cb()
            })
        })
        return null
    })

    // create the necessary extensions in the created db
    q.defer(function(cb){
        var commandline = ["/usr/bin/psql",
                           "-d", db,
                           "-U", user,
                           "-h", host,
                           "-p", port,
                           "-c", '"CREATE EXTENSION postgis;"'].join(' ');
        exec(commandline
             ,function(e,out,err){
                 if(e !== null ){
                     throw new Error(e)

                 }
                 return cb()
             })
        return null
    })

    q.defer(function(cb){
        var commandline = ["/usr/bin/psql",
                           "-d", db,
                           "-U", user,
                           "-h", host,
                           "-p", port,
                           "-f", 'test/files/wim.tables.schema_data.sql'].join(' ');
        console.log(commandline)
        exec(commandline
             ,function(e,out,err){
                 if(e !== null ){
                     throw new Error(e)

                 }
                 return cb()
             })
        return null
    })

    q.defer(function(cb){
        var commandline = ["/usr/bin/psql",
                           "-d", db,
                           "-U", user,
                           "-h", host,
                           "-p", port,
                           "-f", 'test/files/wim.summ.speed.sql'].join(' ');
        console.log(commandline)
        exec(commandline
             ,function(e,out,err){
                 if(e !== null ){
                     throw new Error(e)

                 }
                 return cb()
             })
        return null
    })


    q.defer(function(cb){
        var commandline = ["/usr/bin/psql",
                           "-d", db,
                           "-U", user,
                           "-h", host,
                           "-p", port,
                           "-c", '"\\\copy wim_data from \''+process.cwd()+'/test/sql/some_wim_data.dump\' with (format binary);"'].join(' ');
        console.log(commandline)
        exec(commandline
             ,function(e,out,err){
                 console.log('done copying')
                 if(e !== null ){
                     throw new Error(e)

                 }
                 return cb()
             })
        return null
    })

    q.defer(function(cb){
        var commandline = ["/usr/bin/psql",
                           "-d", db,
                           "-U", user,
                           "-h", host,
                           "-p", port,
                           "-c", '"\\\copy wim_data from \''+process.cwd()+'/test/sql/some_more_wim_data.dump\' with (format binary);"'].join(' ');
        console.log(commandline)
        exec(commandline
             ,function(e,out,err){
                 console.log('done copying')
                 if(e !== null ){
                     throw new Error(e)

                 }
                 return cb()
             })
        return null
    })

    q.defer(function(cb){
        var commandline = ["/usr/bin/psql",
                           "-d", db,
                           "-U", user,
                           "-h", host,
                           "-p", port,
                           "-c", '"\\\copy wim.summaries_5min_speed from \''+process.cwd()+'/test/sql/some_wim_summaries_5min_speed.dump\' with (format binary);"'].join(' ');
        console.log(commandline)
        exec(commandline
             ,function(e,out,err){
                 console.log('done copying')
                 if(e !== null ){
                     throw new Error(e)

                 }
                 return cb()
             })
        return null
    })

    q.defer(function(cb){
        var commandline = ["/usr/bin/psql",
                           "-d", db,
                           "-U", user,
                           "-h", host,
                           "-p", port,
                           "-f", process.cwd()+
                           '/test/files/wim.tables.constraints.sql'
                          ].join(' ');
        console.log(commandline)
        exec(commandline
             ,function(e,out,err){
                 if(e !== null ){
                     throw new Error(e)

                 }
                 return cb()
             })
        return null
    })
    q.await(function(e){
        console.log('done with create pgdb')
        if(e){ throw new Error(e)}
        return create_pgdb_cb()
    })
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
    superagent.put(cdb)
    .type('json')
    .auth(task.options.couchdb.auth.username
         ,task.options.couchdb.auth.password)
    .end(function(err,result){
        cb()
    })
    return null
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
        superagent.get(cdb)
            .type('json')
            .end(function(e,r){
                var superagent_sucks
                should.not.exist(e)
                should.exist(r)
                r.should.have.property('text')
                superagent_sucks = JSON.parse(r.text)
                superagent_sucks.should.have.property('doc_count',5)
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
exports.create_tempdb = create_tempdb
exports.delete_tempdb = delete_tempdb
exports.demo_db_after = demo_db_after
exports.demo_db_before= demo_db_before
exports.create_pgdb=create_pgdb
exports.delete_pgdb=delete_pgdb
