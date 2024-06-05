function hashPassword(password) {
    return btoa(password);
}

function checkPassword() {
    var password = document.getElementById('password').value;
    let correctHash = ['TGlu', 'Q0hU'];

    for (i = 0; i < correctHash.length; i++) {
        if (hashPassword(password) === correctHash[i]) {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('pctpwd').style.display = 'block';
            localStorage.setItem('authenticated', 'true');
            alert('子彈將於6/6晚上封印此網頁, 謝謝妳曾經幫助他.')
            return;
        }
    }
    alert('你/妳無權瀏覽此頁面');
}

window.onload = function () {
    if (localStorage.getItem('authenticated') === 'true') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('pctpwd').style.display = 'block';
    }
}