export const maps: string[] = [];

export class DescriptionInfo {

    public element: HTMLElement;
    public detailsElement: HTMLElement;
    public select: HTMLSelectElement;
    private callback: ((evt: Event) => any);

    constructor(element: HTMLElement, callback: ((evt: Event) => any)) {
        this.element = element;
        this.select = document.createElement("select");
        this.select.style.width = "320px";
        this.select.style.fontSize = "1.5em";

        this.callback = callback;
    }

    async getMapList(dir: string) {
        const dec = new TextDecoder();
        const response = await fetch(dir);
        const buffer = await response.arrayBuffer();
        const rawHTML = dec.decode(buffer);
        
        var doc = document.createElement("html");
        doc.innerHTML = rawHTML;
        var links = doc.querySelectorAll("a[href$='.bsp']");

        for (const link of links) {
            maps.push(dir + link.getAttribute('title'));
        }
        return maps;
    }

    renderMapList() {
        maps.forEach(map => {
            const option = document.createElement("option");
            option.text = map;
            this.select.add(option);
        });

        this.select.addEventListener("change", this.callback);

        this.element.appendChild(this.select);

        const detailsElement = document.createElement("div");
        detailsElement.className = "details";

        this.detailsElement = detailsElement;
        this.element.appendChild(this.detailsElement);

        // Build controls

        this.addText("Click anywhere to lock mouse pointer");
        this.addText("F - Toggle fullscreen");
        this.addText("1 - Cycle through mesh modes");
        this.addText("2 - Toggle model volume visibility");
        this.addText("3 - Toggle entity visibility");
        this.addText("Use the dropdown to change maps");
        this.addText("Drag and drop a .bsp to load it");

        const github = document.createElement("a");
        github.href = "https://github.com/sbuggay/bspview";
        github.innerText = "https://github.com/sbuggay/bspview";
        
        const githubDiv = document.createElement("div");
        githubDiv.appendChild(github);
        githubDiv.style.paddingTop = "20px";

        this.detailsElement.appendChild(githubDiv);
    }

    addText(data: string) {
        const div = document.createElement("div");
        div.className = "row";
        div.innerText = data;
        this.detailsElement.appendChild(div);
    }

}