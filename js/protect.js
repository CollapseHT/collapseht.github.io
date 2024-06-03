function hashPassword(password) {
    return btoa(password);
}

function checkPassword() {
    var password = document.getElementById('password').value;
    var correctHash = 'TGlu';

    if (hashPassword(password) === correctHash) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('pctpwd').style.display = 'block';
        localStorage.setItem('authenticated', 'true');
    } else {
        alert('你/妳無權瀏覽此頁面');
    }
}

window.onload = function () {
    if (localStorage.getItem('authenticated') === 'true') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('pctpwd').style.display = 'block';
    }
}