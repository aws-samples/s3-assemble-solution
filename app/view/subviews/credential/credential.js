function login() {
  $("#btn_login").on("click", function() {

    $("#bucket_buttons").show()
    $("#object_buttons").hide()

    let {ipcRenderer} = require('electron')
    access_key_id = $('[name="access_key_id"]').val()
    secret_access_key = $('[name="secret_access_key"]').val()
    region_type = $('input:radio[name="region_type"]:checked').val()
    console.log("access_key_id is " + access_key_id + " and secret_access_key is" + secret_access_key + " and region_type is " + region_type)

    ipcRenderer.on('error-alert', (event, errorMessage) => {
      let Toast = Swal.mixin({
        toast: true,
        position: 'top-right',
        showConfirmButton: false,
        timer: 5000
      });
      Toast.fire({
        icon: 'error',
        title: errorMessage
      })
      $(".overlay").remove()
    })

    ipcRenderer.send('login-send', access_key_id, secret_access_key, region_type)
    ipcRenderer.on('login-response', (event, arg) => {

      globalBuckets.init()

    })
  })
}

function logout(event) {
  let {ipcRenderer} = require('electron')
  ipcRenderer.send('logout-send')
  ipcRenderer.on('logout-response', (event, arg) => {

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
