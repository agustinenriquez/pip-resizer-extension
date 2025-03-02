(async function() {
    const video = document.querySelector("video");
    if (!video) {
        alert("No video found!");
        return;
    }

    // Request Picture-in-Picture mode
    const pipWindow = await video.requestPictureInPicture();

    // Attempt to resize PiP (Currently limited by browser security)
    setTimeout(() => {
        console.log("PiP Mode Activated!");
    }, 500);
})();
