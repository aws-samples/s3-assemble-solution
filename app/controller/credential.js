const {app, ipcMain} = require('electron')
var AWS = require('aws-sdk')
var db = require('better-sqlite3')(app.getPath('userData') + '/default.db')

class Credential {

  constructor() {

    db.prepare(`CREATE TABLE IF NOT EXISTS credential (id INTEGER NOT NULL PRIMARY KEY, access_key_id TEXT NOT NULL, secret_access_key TEXT NOT NULL, region TEXT NOT NULL)`).run()

    ipcMain.on('save-credentials-send', (event, access_key_id, secret_access_key, region) => {
      console.log(`save-credentials-send is called and access_key_id=${access_key_id} secret_access_key=${secret_access_key} region=${region}`)
      event.sender.send('save-credentials-response', this.saveCredentials(access_key_id, secret_access_key, region))
    })

    ipcMain.on('clear-credentials-send', (event) => {
      console.log(`clear-credentials-send is called`)
      event.sender.send('clear-credentials-response', this.clearCredentials())
    })

    ipcMain.on('check-credentials-exist-send', (event) => {
      console.log(`check-credentials-exist-send is called`)
      event.sender.send('check-credentials-exist-response', this.checkCredentials())
    })

    ipcMain.on('clear-cache-send', (event) => {
      console.log(`clear-cache-send is called`)
      db.prepare(`DELETE FROM uploads`).run()
      db.prepare(`DELETE FROM buckets`).run()
      db.prepare(`DELETE FROM credential`).run()
      event.sender.send('clear-cache-response')
    })

    ipcMain.on('get-i18n-language-send', (event) => {
      let lang = app.getLocale() == 'zh-CN' ? 'zh-CN' : 'en'
      event.sender.send('get-i18n-language-response', lang)
    })

  }

  saveCredentials(access_key_id, secret_access_key, region) {
    console.log(`saveCredentials is called and access_key_id=${access_key_id} secret_access_key=${secret_access_key} region=${region}`)

    // Save credential to sqlite
    try {
      const info = db.prepare("INSERT INTO credential (access_key_id, secret_access_key, region) VALUES (?, ?, ?)").run(access_key_id, secret_access_key, region)
      console.log(info.changes)
      return "success"
    } catch (e) {
      console.log(`saveCredentials error: ${e}`)
      return "fail " + e
    }
  }

  clearCredentials() {
    console.log(`clearCredentials is called`)
    db.prepare("DELETE FROM credential").run()
    return ""
  }

  checkCredentials() {
    console.log(`checkCredentials is called`)
    const record = db.prepare("SELECT count(*) as num FROM credential").get()
    if (record.num > 0) {
      return true
    } else {
      return false
    }
  }
}

exports.Credential = Credential
