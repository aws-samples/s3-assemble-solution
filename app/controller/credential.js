const {app, ipcMain} = require('electron')
const {STS} = require('./sts')
const {CredentialsModel} = require('../model/credentials')
const {InitModel} = require('../model/init')
const i18n = require('../service/i18n')
const path = require('path')
const fs = require('fs');

class Credential {

  constructor() {

    this.credentialsModel = new CredentialsModel()

    ipcMain.on('login-send', (event, access_key_id, secret_access_key, region_type) => {
      console.log(`login-send is called and access_key_id=${access_key_id} secret_access_key=${secret_access_key} region_type=${region_type}`)
      let sts = new STS()
      sts.checkAKSK(access_key_id, secret_access_key, region_type).then((result) => {
        this.login(access_key_id, secret_access_key, region_type)
        event.sender.send('login-response', result)
      }).catch((error) => {
        console.log("invalid ak/sk")
        event.sender.send('error-alert', i18n.t("error.InvalidAKSK"))
      })
    })

    ipcMain.on('logout-send', (event) => {
      console.log(`logout-send is called`)
      event.sender.send('logout-response', this.logout())
    })

    ipcMain.on('check-active-send', (event) => {
      console.log(`check-active-send is called`)
      event.sender.send('check-active-response', this.checkActive())
    })

    ipcMain.on('clear-cache-send', (event) => {
      console.log(`clear-cache-send is called`)
      const filePathToDelete = path.join(app.getPath('userData'), 'default.db');
      // Delete the database to rebuild it
      try {
        fs.unlinkSync(filePathToDelete);
        const initModl = new InitModel()
        initModl.init()
      } catch (err) {
        console.error(err)
      }
      event.sender.send('clear-cache-response')
    })

    ipcMain.on('get-i18n-language-send', (event) => {
      let lang = app.getLocale() == 'zh-CN' ? 'zh-CN' : 'en'
      event.sender.send('get-i18n-language-response', lang)
    })

  }

  login(access_key_id, secret_access_key, region_type) {
    console.log(`login is called and access_key_id=${access_key_id} secret_access_key=${secret_access_key} region_type=${region_type}`)

    // Save credential to sqlite
    try {
      const record = this.credentialsModel.getCredentialByAccessKeyId(access_key_id)
      if (record) {
        const data = {
          'secret_access_key': secret_access_key,
          'region_type': region_type,
          'active': 1
        }
        this.credentialsModel.updateCredentialByAccessKeyId(access_key_id, data)
      } else {
        const data = {
          'access_key_id': access_key_id,
          'secret_access_key': secret_access_key,
          'region_type': region_type,
          'active': 1
        }
        this.credentialsModel.createCredential(data)
      }
    } catch (e) {
      console.log(`login error: ${e}`)
    }
  }

  logout() {
    console.log(`logout is called`)
    this.credentialsModel.logout()
  }

  checkActive() {
    console.log(`checkActive is called`)
    const record = this.credentialsModel.getActiveCredential()
    return record ? true : false
  }
}

exports.Credential = Credential
