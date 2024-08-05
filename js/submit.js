const OPAL_CLIENT_SCRIPT_ELEMENT = document.currentScript;

let autoID = 1;

function onload() {
	autoID = Math.max(autoID, ...[...document.querySelectorAll(".message span:first-child")]
		.map(el => Number.parseInt(el.textContent.replace(/^.*#([0-9]+).*$/, "$1")))
		.filter(x => !Number.isNaN(x)));
	const cleanMessage = str =>
		str.replace(regex`^(?:\s|&nbsp;|<\s*br\s*/?\\s*>)*`.rx("gi"), "")
			.replace(regex`(?:\s|&nbsp;|<\s*br\s*/?\\s*>)*$`.rx("gi"), "")
			.replace(regex`(?:\s|&nbsp;)+`.rx("gi"), " ");
	const escapeMessage = str =>
		str.replaceAll("'", "''")
			.replaceAll("\\", "\\\\");
	const inputField = document.getElementById("input_special");
	const inputContainer = document.querySelector(".message:has(form)");
	inputContainer.classList.remove("message");
	inputContainer.classList.add("OPAL-input-container");
	document.body.append(inputContainer);
	const messageForm = inputContainer.querySelector(":scope form:has(#input_special)");
	const deleteForm = inputContainer.querySelector(`:scope form:has(input[value*="elete"])`);
	const board = document.querySelector(".board");
	board.scrollTop = board.scrollHeight;

	messageForm.addEventListener("submit", e => {
		e.preventDefault();
		inputField.value = cleanMessage(markdown(textarea.innerHTML));
		if(!inputField.value) return false;
		const msg = document.createElement("div");
		{
			const idSpan = document.createElement("span");
			idSpan.textContent = `#${++autoID}`;
			msg.append(idSpan);
		}
		{
			const timestamp = document.createElement("span");
			timestamp.textContent = new Date(Date.now()).toISOString().replace(/^(.*?)T(.*?)(?:[.][0-9]+)?Z$/, "$1 $2");
			msg.append(timestamp);
		}
		{
			const content = document.createElement("div");
			content.classList.add("OPAL-message-content");
			content.innerHTML = inputField.value;
			msg.append(content);
			// Wrap content in <div> to prevent <p> weirdness
			inputField.value = content.outerHTML;
		}
		msg.classList.add("message", "OPAL-message-sending");
		board.append(msg);
		board.scrollTop = board.scrollHeight;
		inputField.value = escapeMessage(inputField.value);
		fetch(location.href, {
			method: "POST",
			body: new FormData(e.target, e.submitter)
		}).then(resp => {
			if(resp.ok) return resp;
			return Promise.reject(resp);
		}).then(resp => {
			resp.text().then(body => {
				handleHydratedResponse(body, resp.headers.get("content-type").split(";")[0]);
			});
			msg.classList.remove("OPAL-message-sending");
		}).catch(err => {
			msg.classList.remove("OPAL-message-sending");
			msg.classList.add("OPAL-message-error");
			autoID--;
		});
		e.target.reset();
		inputField.value = textarea.innerHTML = "";
	});
	deleteForm.addEventListener("submit", e => {
		e.preventDefault();
		fetch(location.href, {
			method: "POST",
			body: new FormData(e.target, e.submitter)
		}).then(resp => {
			if(resp.ok) return resp;
			return Promise.reject(resp);
		}).then(resp => {
			// TODO: replace with hydrate here???
			// resp.text().then(body => {
			// 	handleHydratedResponse(body, resp.headers.get("content-type").split(";")[0]);
			// });
			board.replaceChildren(OPAL_CLIENT_SCRIPT_ELEMENT.parentElement.parentElement);
			autoID = 1;
			const request = new FormData(messageForm);
			request.set(inputField.getAttribute("name"), escapeMessage(OPAL_CLIENT_SCRIPT_ELEMENT.parentElement.innerHTML));
			// Beacon, we dont care about response just want it sent
			navigator.sendBeacon(location.href, request);
		}).catch(err => {/* TODO: handle error */ });
	});
}
