
export async function img_init() {
    const container = document.createElement("div");

    container.style.display = "grid";
    container.style.gridTemplateColumns = "repeat(auto-fill, minmax(200px, 1fr))";
    container.style.gap = "10px";

    document.body.appendChild(container);


    const response = await fetch(
    "https://api.github.com/repos/113031n/113031n.github.io/contents/hello_world/modules/imgs"
    );

    const files = await response.json();
    // for (const file of files) {
    //     if (file.type !== "file") continue;

    //     const img = document.createElement("img");

    //     img.src = file.path;

    //     container.appendChild(img);
    // }
    for (const file of files) {

    if (file.type !== "file") continue;

    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(file.name)) {

        const img = document.createElement("img");

        img.src = file.path;
        //img.width = 300;

        document.body.appendChild(img);

    } else if (/\.(mp4|webm|ogg)$/i.test(file.name)) {

        const video = document.createElement("video");

        video.src = file.path;
        video.controls = true;
        video.width = 300;

        document.body.appendChild(video);
    }
}
    // const img = document.createElement("img");

    // img.src = URL.createObjectURL(file);

    // img.onload = () => {
    //     img.style.width = "100%";
    //     img.style.height = "200px";
    //     img.style.objectFit = "contain";

    //     container.appendChild(img);
    // };
}