//github : ravindu01manoj
document.addEventListener("DOMContentLoaded", function() {
    let Count = Number(countdown)
    const timerElement = document.querySelector("#second");
    timerElement.textContent = `Please wait ${Count} seconds...`;

    const downloadSection = document.querySelector(".download-section");

    function applyUrl() {
        document.querySelector("#box").style.display = "block";
        document.querySelector("#count").style.display = "none";
    }
    if(active == 'true') {
    const intervalId = setInterval(function() {
        Count--;
        timerElement.textContent = `Please wait ${Count} seconds...`;
        if (Count <= 0) {
            clearInterval(intervalId);
            applyUrl();
        }
    }, 1000);
} else {
    applyUrl();
}
});