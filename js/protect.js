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