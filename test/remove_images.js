var fs = require('fs')
var path = require('path')
var queue = require('d3-queue').queue

function remove_images(site_no,dir,year,wim_root,cb){
    var i,filename,filenum
    var type =['raw','imputed']
    var extended_path = [year,site_no,dir]
    var wim_dir = path.normalize(process.cwd() + '/'
                                 + wim_root + '/'
                                 + extended_path.join('/'))
    var imgpath = wim_dir+'/images'
    var imgroot = site_no+'_'+dir+'_'+year+'_'
    var q = queue()
    console.log('remove images')
    for(i=1;i<7;i++){
        filenum = '00'+i+'.png'
        type.forEach(function(t){
            filename = imgpath + '/' + imgroot + t + '_'+filenum
            q.defer(fs.unlink,filename)
            return null
        })
    }

    q.defer(fs.unlink,wim_dir+'/wim.agg.RData')
    q.defer(fs.unlink,wim_dir+'/wim'+site_no+dir+'.3600.imputed.RData')
    q.await(function(e,r){
        var qq
        if(e) cb(e)
        qq = queue(1)
        console.log('remove directories: ',imgpath)
        qq.defer(fs.rmdir,imgpath)
        while(extended_path.length){
            qq.defer(fs.rmdir,wim_dir)
            extended_path.pop() // = [year,site_no,dir] to [year,site_no], etc
            wim_dir = path.normalize(process.cwd() + '/'
                                     + wim_root + '/'
                                     + extended_path.join('/'))
        }

        qq.await(function(e,r){
            if(e){
                console.log(e)
            }
            return cb(e)
        })
        return null
    })
}
module.exports=remove_images
