const rx = (...args) => {
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
const bs = String.fromCharCode(0x5c);
const bse = bs + bs;
const sq = String.fromCharCode(0x27);
const unescaped = rx`(?<!(?:^|[^${bse}])${bse}(?:${bse + bse})*)`;

const markdown_replacements = [
	{
		symbol: "**",
		regex: rx`${unescaped}${bs}*{2}([^${bs}*](?:.|${bs}n)*?)${unescaped}${bs}*{2}`.rx("g"),
		element: "span",
		attr: e => { e.style.fontWeight = "bold"; }
	},
	{
		symbol: "*",
		regex: rx`${unescaped}${bs}*((?:.|${bs}n)+?)${unescaped}${bs}*`.rx("g"),
		element: "span",
		attr: e => { e.style.fontStyle = "italic"; }
	},
	{
		symbol: "__",
		regex: rx`${unescaped}_{2}([^_](?:.|${bs}n)*?)${unescaped}_{2}`.rx("g"),
		element: "span",
		attr: e => { e.style.textDecoration = "underline"; }
	},
	{
		symbol: "_",
		regex: rx`${unescaped}_((?:.|${bs}n)+?)${unescaped}_`.rx("g"),
		element: "span",
		attr: e => { e.style.fontStyle = "italic"; }
	},
	{
		symbol: "~~",
		regex: rx`${unescaped}~{2}([^~](?:.|${bs}n)*?)${unescaped}~{2}`.rx("g"),
		element: "span",
		attr: e => { e.style.textDecoration = "line-through"; }
	},
	{
		symbol: "```",
		regex: rx`${unescaped}${"`"}{3}${bs}s*([^${"`"}](?:.|${bs}n)*?)${bs}s*${unescaped}${"`"}{3}`.rx("g"),
		element: "pre",
		attr: e => { e.classList.add("OPAL-code", "OPAL-large-code"); }
	},
	{
		symbol: "`",
		regex: rx`${unescaped}${"`"}((?:.|${bs}n)+?)${unescaped}${"`"}`.rx("g"),
		element: "code",
		attr: e => { e.classList.add("OPAL-code", "OPAL-small-code"); }
	},
];
window.OPAL_CLIENT.markdown = (msg) => {
	/* Special case: block quote */
	let final_msg = msg.replace(rx`(?:^(?:>|&gt;) .*$${bs}s*)+`.rx("gim"), match => {
		const el = document.createElement("blockquote");
		el.classList.add("OPAL-blockquote");
		el.innerHTML = match.replace(/^(?:>|&gt;) /gim, "");
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
	final_msg = final_msg.replaceAll(bse, bs);
	for(const r of markdown_replacements) {
		final_msg = final_msg.replaceAll(`${bs}${r.symbol}`, r.symbol);
	}
	return msg;
};
