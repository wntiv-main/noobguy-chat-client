const DeltaMode = {
	DOM_DELTA_PIXEL: 0x00,
	DOM_DELTA_LINE: 0x01,
	DOM_DELTA_PAGE: 0x02,
};

let themeUrl = null;
const canvas = new OffscreenCanvas(1, 1).getContext("2d", {
	willReadFrequently: true
});

let hoveredUrl = null;
let customThemeLabel = null;

function parseCSSColor(color) {
	if(color instanceof HTMLImageElement) {
		canvas.imageSmoothingEnabled = true;
		canvas.drawImage(color, 0, 0, 1, 1);
	} else {
		canvas.fillStyle = color;
		canvas.fillRect(0, 0, 1, 1);
	}
	const imgd = canvas.getImageData(0, 0, 1, 1);
	canvas.clearRect(0, 0, 1, 1);
	return imgd.data;
}

function isLight(color) {
	const [r, g, b, a] = parseCSSColor(color);
	const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	if(color instanceof HTMLImageElement) {
		return luma > 159;
	}
	return luma > 127;
}

function setThemeFromImage(hash) {
	localStorage.theme = `custom-background-${hash}`;
	window.OPAL_CLIENT.db.getFile(Number.parseInt(hash), blob => {
		if(themeUrl) URL.revokeObjectURL(themeUrl);
		themeUrl = URL.createObjectURL(blob);
		document.body.style.background = `url("${themeUrl}")`;
		const img = new Image();
		img.addEventListener("load", e => {
			if(isLight(e.currentTarget)) {
				document.body.classList.remove("OPAL-dark-style");
			} else {
				document.body.classList.add("OPAL-dark-style");
			}
		});
		img.src = themeUrl;
	});
}

function setTheme(value) {
	localStorage.theme = value;
	let match;
	// biome-ignore lint/suspicious/noAssignInExpressions: no >.<
	if(match = /^custom-background-(.*)$/.exec(value)) {
		setThemeFromImage(match[1]);
	} else {
		document.body.style.background = value;
		if(isLight(value)) {
			document.body.classList.remove("OPAL-dark-style");
		} else {
			document.body.classList.add("OPAL-dark-style");
		}
	}
}

function addThemeTooltip(el, open, close) {
	const tooltip = document.createElement("div");
	tooltip.classList.add("OPAL-tooltip");
	tooltip.classList.add("OPAL-theme-tooltip");
	el.addEventListener("mouseenter", e => {
		tooltip.style.setProperty("--OPAL-tooltip-shift", "0px");
		tooltip.classList.add("OPAL-active");
		const rect = tooltip.getBoundingClientRect();
		let shift = 0;
		if(rect.right + 5 > window.innerWidth) {
			shift = window.innerWidth - rect.right - 5;
		} else if(rect.left < 5) {
			shift = 5 - rect.left;
		}
		tooltip.style.setProperty("--OPAL-tooltip-shift", `${shift}px`);
		open(tooltip);
	});
	el.addEventListener("mouseleave", e => {
		tooltip.classList.remove("OPAL-active");
		close(tooltip);
	});
	el.appendChild(tooltip);
	return tooltip;
}

function addThemeButton(hash, icon, handleScroll) {
	const iconUrl = URL.createObjectURL(icon);
	const button = document.createElement("button");
	button.classList.add("OPAL-settings-button");
	button.classList.add("OPAL-theme-button");
	button.classList.add("OPAL-theme-button-removable");
	addThemeTooltip(button, t => {
		window.OPAL_CLIENT.db.getFile(hash, file => {
			if(hoveredUrl) URL.revokeObjectURL(hoveredUrl);
			hoveredUrl = URL.createObjectURL(file);
			t.style.backgroundImage = `url("${hoveredUrl}")`;
		});
	}, t => {
		if(hoveredUrl) URL.revokeObjectURL(hoveredUrl);
	});
	button.style.backgroundImage = `url("${iconUrl}")`;
	button.addEventListener("contextmenu", e => {
		window.OPAL_CLIENT.showContextMenu(e, [
			{
				label: "Remove",
				classes: ["OPAL-important-action"],
				action() {
					window.OPAL_CLIENT.db.removeFile(hash);
					URL.revokeObjectURL(iconUrl);
					e.currentTarget.remove();
				}
			}
		]);
	});
	button.addEventListener("click", e => {
		e.stopPropagation();
		document.getElementById("OPAL-theme-tooltip").classList.toggle("OPAL-active", false);
		setThemeFromImage(hash);
	});
	customThemeLabel.parentElement.insertBefore(button, customThemeLabel);
}

if("theme" in localStorage) {
	setTheme(localStorage.theme);
} else {
	setTheme("#202020");
}

function onload() {
	const inputContainer = document.querySelector(".input-container") ?? document.querySelector(".message:has(form)");
	const themeSelector = document.createElement("button");
	themeSelector.textContent = String.fromCodePoint(0x1F3A8);
	themeSelector.classList.add("OPAL-settings-button");
	const themeSelectorTooltipContainer = document.createElement("div");
	themeSelectorTooltipContainer.id = "OPAL-theme-tooltip";
	themeSelectorTooltipContainer.classList.add("OPAL-tooltip");
	const themeSelectorTooltip = document.createElement("div");
	themeSelectorTooltip.classList.add("OPAL-grid");
	function scroll(e) {
		e.stopPropagation();
		const target = themeSelectorTooltip;
		if(!e.deltaX && Math.abs(e.deltaY) > 0) {
			let pageMultiplier;
			switch(e.deltaMode) {
				case DeltaMode.DOM_DELTA_LINE:
					pageMultiplier = target.scrollWidth / target.children.length;
					break;
				case DeltaMode.DOM_DELTA_PAGE:
					pageMultiplier = target.scrollWidth;
					break;
				case DeltaMode.DOM_DELTA_PIXEL:
					pageMultiplier = 1;
					break;
				default:
					pageMultiplier = 0;
			}
			target.scrollBy.bind(target)({
				left: e.deltaY * pageMultiplier,
				behavior: "smooth"
			});
		}
	}
	themeSelectorTooltip.addEventListener("wheel", scroll, { passive: true });
	themeSelectorTooltip.addEventListener("scroll", e => {
		e.currentTarget.style.setProperty("--OPAL-theme-scroll", `${e.currentTarget.scrollLeft}px`);
		const tooltip = e.currentTarget.querySelector(":scope .OPAL-theme-tooltip.OPAL-active");
		if(tooltip) {
			const rect = tooltip.getBoundingClientRect();
			let shift = Number.parseInt(tooltip.style.getPropertyValue("--OPAL-tooltip-shift") || "0");
			if(rect.right + 5 > window.innerWidth) {
				shift += window.innerWidth - rect.right - 5;
			} else if(rect.left < 5) {
				shift += 5 - rect.left;
			}
			tooltip.style.setProperty("--OPAL-tooltip-shift", `${shift}px`);
		}
	}, { passive: true });

	themeSelector.addEventListener("click", e => {
		e.stopPropagation();
		document.getElementById("OPAL-theme-tooltip").classList.toggle("OPAL-active");
	});

	const customThemeButton = document.createElement("input");
	customThemeButton.type = "file";
	customThemeButton.setAttribute("multiple", true);
	customThemeButton.style.display = "none";
	customThemeButton.id = "OPAL-custom-theme-selector";
	const iconCanvas = new OffscreenCanvas(32, 32);
	const iconContext = iconCanvas.getContext("2d", {
		willReadFrequently: true
	});
	customThemeButton.addEventListener("change", function(e) {
		document.getElementById("OPAL-theme-tooltip").classList.toggle("OPAL-active", false);
		if(!this.files.length) return;
		const files = [...this.files];
		function addImage(blob, callback) {
			const tempUrl = URL.createObjectURL(blob);
			const img = new Image();
			img.addEventListener("load", e => {
				iconContext.imageSmoothingEnabled = true;
				iconContext.clearRect(0, 0, 32, 32);
				/* Center image in square */
				let hPad = 0;
				let vPad = 0;
				if(img.naturalWidth > img.naturalHeight) {
					hPad = (img.naturalWidth - img.naturalHeight) / 2;
				} else {
					vPad = (img.naturalHeight - img.naturalWidth) / 2;
				}
				iconContext.drawImage(e.currentTarget, hPad, vPad, img.naturalWidth - 2 * hPad, img.naturalHeight - 2 * vPad, 0, 0, 32, 32);
				iconCanvas.convertToBlob().then(icon => {
					window.OPAL_CLIENT.db.addFile(blob, icon, hash => {
						const result = callback(hash, icon);
						if(result) {
							addImage(result, callback);
						}
					});
				});
				URL.revokeObjectURL(tempUrl);
			});
			img.src = tempUrl;
		}
		if(files.length > 1) {
			addImage(files.shift(), (hash, icon) => {
				addThemeButton(hash, icon, scroll);
				return files.shift();
			});
		} else {
			addImage(files.shift(), (hash, icon) => {
				addThemeButton(hash, icon, scroll);
				setThemeFromImage(hash);
			});
		}
	});

	customThemeLabel = document.createElement("label");
	customThemeLabel.title = "Custom Background";
	customThemeLabel.classList.add("OPAL-settings-button", "OPAL-theme-button");
	customThemeLabel.id = "OPAL-custom-theme-label";
	customThemeLabel.classList.add("OPAL-custom-background-theme");
	customThemeLabel.setAttribute("for", "OPAL-custom-theme-selector");
	customThemeLabel.addEventListener("click", e => e.stopPropagation());
	themeSelectorTooltip.appendChild(customThemeLabel);
	themeSelectorTooltip.appendChild(customThemeButton);

	const randomThemeButton = document.createElement("button");
	randomThemeButton.textContent = String.fromCodePoint(0x1F3B2);
	randomThemeButton.title = "Random Theme";
	randomThemeButton.classList.add("OPAL-settings-button", "OPAL-theme-button");
	randomThemeButton.id = "OPAL-random-theme-button";
	randomThemeButton.addEventListener("click", e => {
		e.stopPropagation();
		const buttons = [...e.currentTarget.parentElement.querySelectorAll(":scope .OPAL-theme-button")];
		buttons[Math.floor(Math.random() * buttons.length)].click();
	});
	themeSelectorTooltip.appendChild(randomThemeButton);

	const colorThemeButton = document.createElement("input");
	colorThemeButton.type = "color";
	colorThemeButton.title = "Coloured Theme";
	colorThemeButton.classList.add("OPAL-settings-button", "OPAL-theme-button");
	colorThemeButton.addEventListener("click", e => e.stopPropagation());
	colorThemeButton.addEventListener("change", e => setTheme(e.target.value));

	themeSelectorTooltip.appendChild(colorThemeButton);

	window.OPAL_CLIENT.db.forAllFiles(file => {
		addThemeButton(file.hash, file.icon, scroll);
	});

	const settingsContainer = document.createElement("div");
	settingsContainer.id = "OPAL-settings-container";
	settingsContainer.appendChild(themeSelector);
	themeSelectorTooltipContainer.appendChild(themeSelectorTooltip);
	settingsContainer.appendChild(themeSelectorTooltipContainer);

	inputContainer.appendChild(settingsContainer);
}
