const {app} = require('electron')
const {CredentialsModel} = require('../model/credentials')
const AWS = require('aws-sdk')

class STS {

  getIdentity() {
    const credentialsModel = new CredentialsModel()
    const credential = credentialsModel.getActiveCredential()
    let params = {
      apiVersion: '2011-06-15',
      accessKeyId: credential.access_key_id,
      secretAccessKey: credential.secret_access_key,
      signatureVersion: 'v4'
    }
    if (credential.region_type == 'MainlandChina') {
      params.region = 'cn-north-1'
    } else {
      params.region = 'us-east-1'
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

  checkAKSK(access_key_id, secret_access_key, region_type) {
    let params = {
      apiVersion: '2011-06-15',
      accessKeyId: access_key_id,
      secretAccessKey: secret_access_key,
      signatureVersion: 'v4'
    }
    if (region_type == 'MainlandChina') {
      params.region = 'cn-north-1'
    } else {
      params.region = 'us-east-1'
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
