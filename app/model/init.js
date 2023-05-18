const {app} = require('electron')
const Database = require('better-sqlite3')

class InitModel {

  init() {
    // Create a database connection
    const db = new Database(app.getPath('userData') + '/default.db')

    // Create tables
    db.prepare(`CREATE TABLE IF NOT EXISTS uploads (id INTEGER NOT NULL PRIMARY KEY, file_name TEXT NOT NULL, progress INTEGER NOT NULL, create_time TEXT, update_time TEXT)`).run()
    db.prepare(`CREATE TABLE IF NOT EXISTS buckets (id INTEGER NOT NULL PRIMARY KEY, bucket_name TEXT NOT NULL, region TEXT DEFAULT NULL, region_type TEXT NOT NULL)`).run()
    db.prepare(`CREATE TABLE IF NOT EXISTS objects (id INTEGER NOT NULL PRIMARY KEY, bucket_id INTEGER NOT NULL, object_key TEXT NOT NULL)`).run()
    db.prepare(`CREATE TABLE IF NOT EXISTS credential_bucket (id INTEGER NOT NULL PRIMARY KEY, credential_id INTEGER NOT NULL, bucket_id INTEGER NOT NULL, is_authorized INTEGER NOT NULL)`).run()
    db.prepare(`CREATE TABLE IF NOT EXISTS credentials (id INTEGER NOT NULL PRIMARY KEY, access_key_id TEXT NOT NULL, secret_access_key TEXT NOT NULL, region_type TEXT NOT NULL, active INTEGER DEFAULT 0)`).run()

    // Close the database connection
    db.close()
  }
}

exports.InitModel = InitModel
