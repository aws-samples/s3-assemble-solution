function formatDate(date) {
  let currDate = date.getDate();
  let currMonth = date.getMonth() + 1;
  let currYear = date.getFullYear();
  let h = date.getHours();
  let m = date.getMinutes();
  let s = date.getSeconds();
  String(currMonth).length < 2 ? (currMonth = "0" + currMonth) : currMonth;
  String(currDate).length < 2 ? (currDate = "0" + currDate) : currDate;
  String(h).length < 2 ? (h = "0" + h) : h;
  String(m).length < 2 ? (m = "0" + m) : m;
  String(s).length < 2 ? (s = "0" + s) : s;
  let timeformat = currYear + "-" + currMonth + "-" + currDate + " " + h + ":" + m + ":" + s;
  return timeformat;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function localize() {
  $('[data-i18n]').each(function() {
    $(this).html(i18n.t($(this).attr('data-i18n')))
  })
  $("input[name=table_search]").attr("placeholder", i18n.t("buckets.table.search"))
}

function walkPathSync(currentPath, callback) {
  let fs = require('fs')
  let path = require('path')
  let stat = fs.statSync(currentPath)
  if (stat.isFile()) {
    callback(currentPath, stat)
  } else {
    fs.readdirSync(currentPath).forEach(function (name) {
      let filePath = path.join(currentPath, name)
      let stat = fs.statSync(filePath)
      if (stat.isFile()) {
        callback(filePath, stat)
      } else if (stat.isDirectory()) {
        walkPathSync(filePath, callback)
      }
    })
  }
}

module.exports = {formatDate, formatBytes, localize, walkPathSync}
