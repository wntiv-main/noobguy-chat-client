const textarea = document.createElement("div");
textarea.id = "input_textarea_special";
textarea.style.overflowY = "auto";
textarea.style.maxHeight = "30vh";
textarea.setAttribute("contenteditable", true);
textarea.setAttribute("autofocus", true);
textarea.setAttribute("tabindex", 0);

function onload() {
	const input = document.getElementById("input_special");
	const submitButton = input.parentElement.querySelector(`:scope input[type="submit"]`);
	textarea.addEventListener("keypress", e => {
		if(e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
			e.preventDefault();
			input.parentElement.requestSubmit(submitButton);
		}
	});
	input.parentElement.prepend(textarea);
	input.setAttribute("type", "hidden");
	textarea.focus();
}
