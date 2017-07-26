var exec = require('child_process').exec
var get_pool = require('psql_pooler').get_pool


async function command(c,config,f){
    const psql_opts = config.postgresql
    console.log(psql_opts)
    const host = psql_opts.host
    const user = psql_opts.username
    // const pass = psql_opts.password
    const port = psql_opts.port
    const db   = psql_opts.db

    return new Promise((resolve, reject)=>{
        const commandline =  ["/usr/bin/psql",
                              "-d", db,
                              "-U", user,
                              "-h", host,
                              "-p", port].join(' ')

        if(c){
            const commandc = commandline + ' -c ' + c
            console.log(commandc)
            exec (commandc
                  ,function(e,stdout,stderr){
                      if(e){
                          return reject(e)
                      }
                      resolve([stdout,stderr])
                      return null
                  })
            return null
        }
        // will only be here if not c
        if(f){
            const commandf = commandline + ' -f ' + f
            console.log(commandf)
            exec (commandf
                  ,function(e,stdout,stderr){
                      if(e){
                          reject(e)
                      }
                      resolve([stdout,stderr])
                      return null
                  })
            return null
        }
        throw new Error('need c (first argument) or f (third argument)')

    })

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


async function create_pgdb(config,db,create_pgdb_cb){
    var user = ''
    var host = config.postgresql.host || '127.0.0.1'
    var port = config.postgresql.port || 5432

    var admindb   = 'template1'
    var adminuser = 'postgres'
    var admin_conn_string
    var conn_string

    if(config.postgresql.auth !== undefined &&
       config.postgresql.auth.username !== undefined){
        user = config.postgresql.auth.username
    }

    if(config.postgresql.admin !== undefined){
        if(config.postgresql.admin.db !== undefined){
            admindb = config.postgresql.admin.db
        }
        if(config.postgresql.admin.user !== undefined){
            adminuser = config.postgresql.admin.user
        }
    }
    var admin_config = {'postgresql': Object.assign({},config.postgresql) }
    admin_config.postgresql.db = admindb
    admin_config.postgresql.username = adminuser

    var user_config = {'postgresql': Object.assign({},config.postgresql) }

    user_config.postgresql.db = db
    user_config.postgresql.username = user

    var create_query = '"create database '+db+';"'
    // create database
    await command ( create_query,admin_config )


    // create the necessary extensions in the created db
    var c =  '"CREATE EXTENSION postgis;"'
    await command(c,user_config)

    var f =  'test/files/wim.tables.schema_data.sql'

    await command(null,user_config,f)

    f =  process.cwd()+'/test/files/wim.summ.speed.sql'
    await command(null,user_config,f)

    c = '"\\\copy wim_data from \''+process.cwd()+'/test/sql/some_wim_data.dump\' with (format binary);"'
    await command(c,user_config)

    c = '"\\\copy wim_data from \''+process.cwd()+'/test/sql/some_more_wim_data.dump\' with (format binary);"'
    await command(c,user_config)


    c = '"\\\copy wim.summaries_5min_speed from \''+process.cwd()+'/test/sql/some_wim_summaries_5min_speed.dump\' with (format binary);"'
    await command(c,user_config)

    f =  process.cwd()+'/test/files/wim.tables.constraints.sql'
    await command(null,user_config,f)
    console.log('done creating pg stuff')

    return create_pgdb_cb()

}

exports.create_pgdb=create_pgdb
exports.delete_pgdb=delete_pgdb
