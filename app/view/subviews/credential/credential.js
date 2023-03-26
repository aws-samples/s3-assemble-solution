function login() {
  $("#btn_login").on("click", function() {

    $("#bucket_buttons").show()
    $("#object_buttons").hide()

    let {ipcRenderer} = require('electron')
    access_key_id = $('[name="access_key_id"]').val()
    secret_access_key = $('[name="secret_access_key"]').val()
    region = $('input:radio[name="region"]:checked').val()
    console.log("access_key_id is " + access_key_id + " and secret_access_key is" + secret_access_key + " and region is " + region)
    ipcRenderer.send('save-credentials-send', access_key_id, secret_access_key, region)
    ipcRenderer.on('save-credentials-response', (event, arg) => {

      globalBuckets.init()

    })
  })
}

function logout(event) {
  let {ipcRenderer} = require('electron')
  ipcRenderer.send('clear-credentials-send')
  ipcRenderer.on('clear-credentials-response', (event, arg) => {

    $("#main_page").load("subviews/credential/credential.html", function() {
      $("#header_page").hide()
      $("#main_page").html()
      globalCredential.login()
      tool.localize()
    })

    $("#btn_nav_clear").hide()
    $("#btn_bar_upload").hide()
    $("#btn_bar_login").hide()

    $(".brand-link").off("click")
  })
}

module.exports = {login, logout}
