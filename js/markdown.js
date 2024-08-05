const regex = (...args) => {
	return {
		src: String.raw(...args),
		rx(flags) {
			return new RegExp(this.src, flags);
		},
		toString() {
			return this.src;
		}
	};
};
const unescaped = regex`(?<!(?:^|[^\\])\\(?:\\\\)*)`;

const markdown_replacements = [
	{
		symbol: "**",
		regex: regex`${unescaped}\*{2}([^\*](?:.|\n)*?)${unescaped}\*{2}`.rx("g"),
		element: "span",
		attr: e => { e.style.fontWeight = "bold"; }
	},
	{
		symbol: "*",
		regex: regex`${unescaped}\*((?:.|\n)+?)${unescaped}\*`.rx("g"),
		element: "span",
		attr: e => { e.style.fontStyle = "italic"; }
	},
	{
		symbol: "__",
		regex: regex`${unescaped}_{2}([^_](?:.|\n)*?)${unescaped}_{2}`.rx("g"),
		element: "span",
		attr: e => { e.style.textDecoration = "underline"; }
	},
	{
		symbol: "_",
		regex: regex`${unescaped}_((?:.|\n)+?)${unescaped}_`.rx("g"),
		element: "span",
		attr: e => { e.style.fontStyle = "italic"; }
	},
	{
		symbol: "~~",
		regex: regex`${unescaped}~{2}([^~](?:.|\n)*?)${unescaped}~{2}`.rx("g"),
		element: "span",
		attr: e => { e.style.textDecoration = "line-through"; }
	},
	{
		symbol: "```",
		regex: regex`${unescaped}${"`"}{3}\s*([^${"`"}](?:.|\n)*?)\s*${unescaped}${"`"}{3}`.rx("g"),
		element: "pre",
		attr: e => { e.classList.add("OPAL-code", "OPAL-large-code"); }
	},
	{
		symbol: "`",
		regex: regex`${unescaped}${"`"}((?:.|\n)+?)${unescaped}${"`"}`.rx("g"),
		element: "code",
		attr: e => { e.classList.add("OPAL-code", "OPAL-small-code"); }
	},
];
function markdown(msg) {
	/* Special case: block quote */
	let final_msg = msg.replace(regex`(?:(?:^|(?<=<\s*br\s*\/?\s*>))(?:>|&gt;)\s.*?(?:$|(?=<\s*br\s*\/?\s*>))(?:\s*<\s*br\s*\/?\s*>)?\s*)+`.rx("gim"), match => {
		const el = document.createElement("blockquote");
		el.classList.add("OPAL-blockquote");
		el.innerHTML = match.replace(/(?:^|(?<=<\s*br\s*\/?\s*>))(?:>|&gt;)\s/gim, "");
		return el.outerHTML;
	});
	for(const r of markdown_replacements) {
		final_msg = final_msg.replace(r.regex, (match, content, offset, string) => {
			const el = document.createElement(r.element);
			r.attr(el);
			el.innerHTML = content;
			return el.outerHTML;
		});
	}
	final_msg = final_msg.replaceAll("\\\\", "\\");
	for(const r of markdown_replacements) {
		final_msg = final_msg.replaceAll(`\\${r.symbol}`, r.symbol);
	}
	return final_msg;
};
