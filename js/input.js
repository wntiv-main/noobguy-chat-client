const textarea = document.createElement("div");
textarea.id = "OPAL-message-textarea";
textarea.style.overflowY = "auto";
textarea.style.maxHeight = "30vh";
textarea.setAttribute("contenteditable", true);
textarea.setAttribute("autofocus", true);
textarea.setAttribute("tabindex", 0);

function onload() {
	const inputField = document.getElementById("input_special");
	const submitButton = inputField.parentElement.querySelector(`:scope input[type="submit"]`);
	textarea.addEventListener("keypress", e => {
		if(e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
			e.preventDefault();
			inputField.parentElement.requestSubmit(submitButton);
		}
	});
	inputField.parentElement.prepend(textarea);
	inputField.setAttribute("type", "hidden");
	textarea.focus();
}
