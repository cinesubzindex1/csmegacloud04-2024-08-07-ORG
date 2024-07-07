function check(url) {
    try {
        if (!file || !expiry || !mac || !tag || !iv || !path || iv.length < 1) {
            return '/'
        }
        return url
    } catch {
        return '/'
    }
}
const link = path + 'file=' + 'meta.id' + '&expiry=' + 'meta.expiry' + '&mac=' + mac + '&iv=' + iv + '&tag=' + tag
document.set_dl = link
const direct = document.getElementById('link1');
direct.addEventListener('click', () => {
    window.open(check(link + '&server=cs_old'), '_blank');
});

// const sv = document.getElementById('link2');
// sv.addEventListener('click', () => {
//     window.open(check(link), '_blank');
// });

const drive = document.getElementById('link3');
drive.addEventListener('click', () => {
    window.open(check(link + '&server=gdrive'), '_blank');
});