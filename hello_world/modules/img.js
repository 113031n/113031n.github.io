
export function img_init() {
    const container = document.createElement("div");

    container.style.display = "grid";
    container.style.gridTemplateColumns = "repeat(auto-fill, minmax(200px, 1fr))";
    container.style.gap = "10px";

    document.body.appendChild(container);


    let a = fetch("https://api.github.com/repos/113031n.github.io/")
    console.log(a)
    // const img = document.createElement("img");

    // img.src = URL.createObjectURL(file);

    // img.onload = () => {
    //     img.style.width = "100%";
    //     img.style.height = "200px";
    //     img.style.objectFit = "contain";

    //     container.appendChild(img);
    // };
}