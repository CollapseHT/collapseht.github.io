function hashPassword(password) {
    return btoa(password);
}

function checkPassword() {
    var password = document.getElementById('password').value;
    let correctHash = ['eW9zaGlubzM5'];

    for (i = 0; i < correctHash.length; i++) {
        if (hashPassword(password) === correctHash[i]) {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('pctpwd').style.display = 'block';
            localStorage.setItem('authenticated', 'true');
            alert('子彈已經封印此網頁, 你現在是以祕密的身份查看此頁面.')
            return;
        }
    }
    alert('子彈已經封印此網頁, 謝謝你/妳曾幫助他');
}

window.onload = function () {
    if (localStorage.getItem('authenticated') === 'true') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('pctpwd').style.display = 'block';
    }
}