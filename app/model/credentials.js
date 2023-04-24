const {app} = require('electron')
const Database = require('better-sqlite3')

class CredentialsModel {

  constructor() {
    this.db = new Database(app.getPath('userData') + '/default.db')
  }

  init() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS credentials (id INTEGER NOT NULL PRIMARY KEY, access_key_id TEXT NOT NULL, secret_access_key TEXT NOT NULL, region_type TEXT NOT NULL, active INTEGER DEFAULT 0)`).run()
  }

  getActiveCredential() {
    return this.db.prepare("SELECT * FROM credentials WHERE active = 1").get()
  }

  getCredentialByAccessKeyId(accessKeyId) {
    return this.db.prepare("SELECT * FROM credentials WHERE access_key_id = ?").get(accessKeyId)
  }

  createCredential(data) {
    try {
      const cols = Object.keys(data).join(", ")
      const placeholders = Object.keys(data).map(x => "'" + data[x] + "'").join(", ")
      const query = `INSERT INTO credentials (` + cols + `) VALUES (` + placeholders + `)`
      console.log("query ", query)
      return this.db.prepare(query).run()
    } catch (err) {
      throw ("createCredential error:", err)
    }
  }

  updateCredentialByAccessKeyId(accessKeyId, data) {
    try {
      const placeholders = Object.keys(data).map(x => x + " = '" + data[x] + "'").join(", ")
      const query = `UPDATE credentials SET ` + placeholders + ` WHERE access_key_id = '` + accessKeyId + `'`
      return this.db.prepare(query).run()
    } catch (err) {
      throw ("updateCredentialByAccessKeyId error:", err)
    }
  }

  logout() {
    try {
        return this.db.prepare("UPDATE credentials SET active = 0").run()
    } catch (error) {
        console.log(error)
    }
  }

}

exports.CredentialsModel = CredentialsModel
