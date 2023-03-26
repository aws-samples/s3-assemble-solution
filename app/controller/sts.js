const {app} = require('electron')
var AWS = require('aws-sdk')
var db = require('better-sqlite3')(app.getPath('userData') + '/default.db')

class STS {

  getIdentity() {
    const credential = db.prepare("SELECT * FROM credential").get()
    let params = {
      apiVersion: '2011-06-15',
      accessKeyId: credential.access_key_id,
      secretAccessKey: credential.secret_access_key,
      signatureVersion: 'v4'
    }
    if (credential.region == 'MainlandChina') {
      params.region = 'cn-northwest-1'
    } else {
      params.region = 'ap-southeast-1'
    }
    let sts = new AWS.STS(params)
    let promise = new Promise((resolve, reject) => {
      let params = {}
      sts.getCallerIdentity(params, function(err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
    return promise
  }
}

exports.STS = STS
