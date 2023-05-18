const {app} = require('electron')
const Database = require('better-sqlite3')

class CredentialBucketModel {

  constructor() {
    this.db = new Database(app.getPath('userData') + '/default.db')
  }

  createOrUpdateRecord(credentialId, bucketId, isAuthorized) {
    const record = this.db.prepare("SELECT * FROM credential_bucket WHERE credential_id = ? AND bucket_id = ?").get(credentialId, bucketId)
    if (record) {
      this.db.prepare("UPDATE credential_bucket SET is_authorized = ?").run(isAuthorized)
    } else {
      this.db.prepare("INSERT INTO credential_bucket (credential_id, bucket_id, is_authorized) VALUES (?, ?, ?)").run(credentialId, bucketId, isAuthorized)
    }
  }

  getIsAuthorized(credentialId, bucketId) {
    return this.db.prepare("SELECT is_authorized FROM credential_bucket WHERE credential_id = ? AND bucket_id = ?").get(credentialId, bucketId)
  }

}

exports.CredentialBucketModel = CredentialBucketModel
