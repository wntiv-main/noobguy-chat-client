const OPAL_CLIENT_SCRIPT_ELEMENT = document.currentScript;

let autoID = 1;

function onload() {
	autoID = Math.max(autoID, ...[...document.querySelectorAll(".message span:first-child")]
		.map(el => Number.parseInt(el.textContent.replace(/^.*#([0-9]+).*$/, "$1")))
		.filter(x => !Number.isNaN(x)));
	const cleanMessage = str => str.replace(sq, sq + sq).replace(bs, bse);
	const input = document.getElementById("input_special");
	const inputContainer = document.querySelector(".message:has(form)");
	inputContainer.classList.remove("message");
	inputContainer.classList.add("input-container");
	document.body.append(inputContainer);
	const messageForm = inputContainer.querySelector(":scope form:has(#input_special)");
	const deleteForm = inputContainer.querySelector(`:scope form:has(input[value*="elete"])`);
	const board = document.querySelector(".board");
	board.scrollTop = board.scrollHeight;

	messageForm.addEventListener("submit", e => {
		e.preventDefault();
		input.value = cleanMessage(window.OPAL_CLIENT.markdown(textarea.innerHTML))
			.replace(rx`^(?:${bs}s|<${bs}s*br${bs}s*/?${bs}s*>)*`.rx("gi"), "")
			.replace(rx`(?:${bs}s|<${bs}s*br${bs}s*/?${bs}s*>)*$`.rx("gi"), "");
		if(!input.value) return false;
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
			const content = document.createElement("p");
			content.innerHTML = input.value;
			msg.append(content);
		}
		msg.classList.add("message", "OPAL_message_sending");
		board.append(msg);
		board.scrollTop = board.scrollHeight;
		fetch(location.href, {
			method: "POST",
			body: new FormData(e.target, e.submitter)
		}).then(resp => {
			if(resp.ok) return resp;
			return Promise.reject(resp);
		}).then(resp => {
			/* TODO: handle response */
			msg.classList.remove("OPAL_message_sending");
		}).catch(err => {
			/* TODO: handle response */
			msg.classList.remove("OPAL_message_sending");
			msg.classList.add("OPAL_message_error");
			autoID--;
		});
		e.target.reset();
		input.value = textarea.innerHTML = "";
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
			board.replaceChildren(OPAL_CLIENT_SCRIPT_ELEMENT.parentElement.parentElement);
			autoID = 1;
			const request = new FormData(messageForm);
			request.set(input.getAttribute("name"), cleanMessage(OPAL_CLIENT_SCRIPT_ELEMENT.parentElement.innerHTML));
			/* Beacon, we dont care about response just want it sent */
			navigator.sendBeacon(location.href, request);
		}).catch(err => {/* TODO: handle error */ });
	});
}
