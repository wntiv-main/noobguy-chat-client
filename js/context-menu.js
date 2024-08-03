window.addEventListener("click", e => {
	for(const el of document.getElementsByClassName("OPAL-active")) {
		el.classList.remove("OPAL-active");
	}
	for(const el of document.getElementsByClassName("OPAL-context-menu")) {
		el.remove();
	}
});

window.OPAL_CLIENT.showContextMenu = (e, items) => {
	e.preventDefault();
	for(const el of document.getElementsByClassName("OPAL-context-menu")) {
		el.remove();
	}
	const contextMenuContainer = document.createElement("ul");
	contextMenuContainer.classList.add("OPAL-context-menu");
	for(const item of items) {
		/* skip false values for ease of use */
		if(!item) continue;
		const itemEl = document.createElement("li");
		itemEl.textContent = item.label;
		itemEl.title = item.label;
		if(item.classes) itemEl.classList.add(...item.classes);
		itemEl.addEventListener("click", (e) => {
			e.stopPropagation();
			item.action(e);
			e.currentTarget.parentElement.remove();
		});
		contextMenuContainer.appendChild(itemEl);
	}
	let left = e.clientX;
	let top = e.clientY;
	contextMenuContainer.style.left = `${left}px`;
	contextMenuContainer.style.top = `${top}px`;
	document.body.appendChild(contextMenuContainer);
	const rect = contextMenuContainer.getBoundingClientRect();
	if(rect.bottom > window.innerHeight - 5) {
		top -= rect.height;
		if(top < 5) top = 5;
	}
	if(rect.right > window.innerWidth - 5) {
		left -= rect.width;
		if(left < 5) left = 0;
	}
	contextMenuContainer.style.left = `${left}px`;
	contextMenuContainer.style.top = `${top}px`;
};
