const editor = document.getElementById("editor");
const preview = document.getElementById("preview");


const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(script);

script.onload = () => {
  function updatePreview() {
    preview.innerHTML = marked.parse(editor.value);
  }

  editor.addEventListener("input", updatePreview);

  updatePreview();
};
