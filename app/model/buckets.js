const {app} = require('electron')
const Database = require('better-sqlite3')

class BucketsModel {

  constructor() {
    this.db = new Database(app.getPath('userData') + '/default.db')
  }

  getBucketByNameAndRegionType(bucketName, regionType) {
    const mainlandChinaRegions = ['cn-north-1', 'cn-northwest-1']
    let bucket = null
    if (regionType == 'MainlandChina') {
      bucket = this.db.prepare("SELECT * FROM buckets WHERE bucket_name = ? AND region IN (" + mainlandChinaRegions.map(() => '?').join(',') + ")").get(bucketName, mainlandChinaRegions)
    } else {
      bucket = this.db.prepare("SELECT * FROM buckets WHERE bucket_name = ? AND region NOT IN (" + mainlandChinaRegions.map(() => '?').join(',') + ")").get(bucketName, mainlandChinaRegions)
    }
    return bucket
  }

  createBucketIfNotExist(bucketName, regionType) {
    try {
      const record = this.db.prepare("SELECT * FROM buckets WHERE bucket_name = ? AND region_type = ?").get(bucketName, regionType)
      if (!record) {
        const info = this.db.prepare('INSERT INTO buckets (bucket_name, region_type) VALUES (?, ?)').run([bucketName, regionType])
        return info.lastInsertRowid
      } else {
        return record.id
      }
    } catch (err) {
      console.log(err)
    }
  }

  updateBucketByNameAndRegionType(bucketName, regionType, data) {
    try {
      const placeholders = Object.keys(data).map(x => x + " = '" + data[x] + "'").join(", ");
      const query = `UPDATE buckets SET ` + placeholders + ` WHERE bucket_name = '` + bucketName + `' AND region_type = '` + regionType + `'`
      return this.db.prepare(query).run();
    } catch (err) {
      throw ("updateBucketByNameAndRegionType error:", err);
    }
  }

}

exports.BucketsModel = BucketsModel
