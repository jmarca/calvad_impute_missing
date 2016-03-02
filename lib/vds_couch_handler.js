var couch_check = require('couch_check_state')


/**
 * check if the plots already exist in couchdb for this detector/year
 * @param {Object} config the general config file that you're using.
 * @param {Object} config.couchdb how to access couchdb
 * @param {string} config.couchdb.trackingdb the tracking databse to check
 * @param {Object} config.couchdb.auth where teh couchdb username and
 *     password are stashed
 * @param {Object} config.couchdb.auth.username  couchdb username
 * @param {Object} config.couchdb.auth.password couchdb password
 * @param {Object} config.env the environment settings for the R job
 * @param {number} config.env.RYEAR the year of the analysis
 * @param {string} file the raw data or RData file that you're going to analyze
 * @param {string|number} did the detector id
 * @param {function} trigger_R_job a function to call that will start
 *     an R job if the check of the plot files fails (there are no
 *     plots and R needs to be run)
 * @param {@callback} done what to call when this is all over, either
 *     because no plot needs to run; because the plots needed to be
 *     run and R is finished; or there is an error
 * @returns {} null
 */
function check_plots(config,file,did,trigger_R_job,done){
    console.log({'db':config.couchdb.trackingdb
		 ,'doc':did
		 ,'year':'_attachments'
		 ,'state':[did,config.env['RYEAR'],'raw','004.png'].join('_')
		})
    couch_check({'db':config.couchdb.trackingdb
		 ,'doc':did
		 ,'year':'_attachments'
		 ,'state':[did,config.env['RYEAR'],'raw','004.png'].join('_')
		}
		,function(err,state){
                    if(err) return done(err)
                    console.log(state)
                    if(!state){
			console.log('push to queue '+f)
			trigger_R_job({'file':file
                                       ,'opts':config
                                      },done);
                    }else{
                        console.log('already done')
                        done() // move on to the next
                    }
                    return null
		});
    return null

}




module.exports.check_plots = check_plots
