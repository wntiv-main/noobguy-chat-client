const parser = new DOMParser();

function handleHydratedResponse(updatedDOM, mimeType) {
	const dom = parser.parseFromString(updatedDOM, mimeType);
	console.log(dom);
}
