const {app} = require('electron')
const Database = require('better-sqlite3')

class UploadsModel {

  constructor() {
    this.db = new Database(app.getPath('userData') + '/default.db')
  }

  createUpload(data) {
    try {
      const cols = Object.keys(data).join(", ");
      const placeholders = Object.keys(data).map(x => "'" + data[x] + "'").join(", ");
      const query = `INSERT INTO uploads (` + cols + `) VALUES (` + placeholders + `)`
      console.log("query ", query)
      return this.db.prepare(query).run()
    } catch (err) {
      throw ("createCredential error:", err)
    }
  }

  updateUploadById(id, data) {
    try {
      const placeholders = Object.keys(data).map(x => x + " = '" + data[x] + "'").join(", ")
      const query = `UPDATE uploads SET ` + placeholders + ` WHERE id = '` + id + `'`
      return this.db.prepare(query).run()
    } catch (err) {
      throw ("updateUploadById error:", err)
    }
  }

  deleteUploadById(id) {
    try {
      return this.db.prepare("DELETE FROM uploads WHERE id = ?").run(id)
    } catch (err) {
      throw ("deleteUploads error:", err)
    }
  }

  getUploads() {
    try {
      return this.db.prepare("SELECT * FROM uploads ORDER BY id DESC").all()
    } catch (err) {
      throw ("getUploads error:", err)
    }
  }

}

exports.UploadsModel = UploadsModel
