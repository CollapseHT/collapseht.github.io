function playAudio() {
    const audioElement = document.getElementById("audio1");
    audioElement
        .play()
        .then(() => {
            console.log("音頻已播放！");
        })
        .catch((error) => {
            console.log("播放失敗：", error);
        });
}
