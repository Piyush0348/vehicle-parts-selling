export default class UI {

    static renderList(container, items, template) {
        container.innerHTML = "";
        items.forEach(item => {
            container.innerHTML += template(item);
        });
    }

    static showMessage(msg) {
        alert(msg);
    }
}