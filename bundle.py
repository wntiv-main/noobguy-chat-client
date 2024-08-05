# pylint: disable=missing-docstring,import-error
from pathlib import Path
import re
import requests

root = Path(__file__).parent


css = ""
for css_file in root.joinpath("css/").rglob("*"):
    if css_file.is_file():
        css += "\n\n" + css_file.read_text(encoding="utf-8")

JS_LOAD = re.compile(r"function\s*onload\s*\(\s*\)\s*\{(.*)\}", re.DOTALL)
JS_LINE = re.compile(
    r"(?<![/+*-|&;{}[\],:(\s])(\s*)$([\s\n]*)(?![\s\n\.)}\]/+*-|&])", re.M)
JS_COMMENT = re.compile(r"//\s*(.*)$", re.MULTILINE)
init_js = ""
load_js = ""
for js_file in root.joinpath("js/").rglob("*"):
    if js_file.is_file():
        content = js_file.read_text(encoding="utf-8")
        if (match := JS_LOAD.search(content)) is not None:
            load_js += f"\n((/* {js_file.name} */) => {{{match.group(1)}}})();"
        init_js += f"\n/* {js_file.name} */\n{JS_LOAD.sub("", content)}"

init_js = JS_LINE.sub(
    lambda m: f"{m.group(1)};{m.group(2)}",
    JS_COMMENT.sub("", init_js))
load_js = JS_LINE.sub(
    lambda m: f"{m.group(1)};{m.group(2)}",
    JS_COMMENT.sub("", load_js))

init_js = re.sub(r"\bconst\b", "let", init_js)
load_js = re.sub(r"\bconst\b", "let", load_js)

init_js = re.sub(r"\(\s*(\w+)\s*\)(\s*=>)", r"\1\2", init_js)
load_js = re.sub(r"\(\s*(\w+)\s*\)(\s*=>)", r"\1\2", load_js)
init_js = re.sub(r"\(\s*\)(\s*=>)", r"_\1", init_js)
load_js = re.sub(r"\(\s*\)(\s*=>)", r"_\1", load_js)

NOT_IN_STR = r"(?=[^\"'`\n]*+(?:(?:\"(?:[^\"\n]|\\\")*+\"|'(?:[^'\n]|\\')*+'|`(?:[^$`\n]|\\`|\$(?:\{[^}\n]*})?+)*+`)[^\"'`\n]*+)*?$)"

arg_bindings: set[str] = set()
str_bindings: set[str] = set()
frequency: dict[str, int] = {}
extra_cost: dict[str, int] = {}
replace_template: dict[str, str] = {
    "member": ('"{name}"', "[{binding}]")
}
init_matches: list[re.Match[str]] = []
load_matches: list[re.Match[str]] = []

names = re.findall(
    r"\blet\s*(\w+)|function\s*(\w*)\s*\(((?:\w+(?:\s*=[^,)]*?)?,\s*)*(?:\.{3}\s*)?\w+(?:\s*=[^,)]*?)?)\)|\(((?:\w+,\s*(?:\s*=[^,)]*?)?)*(?:\.{3})?\w+(?:\s*=[^,)]*?)?)\)\s*=>|(\w+)\s*=>", init_js + load_js)
x = [
    name for match in names for group in match if group for name in group.split(",")]
for name in set(name for match in names for group in match if group for name in group.split(",")):
    assert isinstance(name, str)
    name = name.split('=')[0].removeprefix("...").strip()
    if not name:
        continue

    rx = re.compile(r"(?<!(?<!\.\.)\.)\b" + name +
                    r"\b(?![:])" + NOT_IN_STR
                    + r"|(?<![.])\b" + name +
                    r"\b(?=[^{}`\n]*}(?:[^`$\n]|\\`|\$(?:\{[^}\n]*})?+)*+`[^\"'`\n]*+(?:(?:\"(?:[^\"\n]|\\\")*+\"|'(?:[^'\n]|\\')*+'|`(?:[^`$\n]|\\`|\$(?:\{[^}\n]*})?+)*+`)[^\"'`\n]*+)*?$)", re.M)
    init_ms, load_ms = list(rx.finditer(init_js)), list(rx.finditer(load_js))
    freq = len(init_ms) + len(load_ms)
    if freq < 1:
        continue
    frequency[name] = frequency.get(name, 0) + freq
    init_matches += init_ms
    load_matches += load_ms

for member in set(re.findall(r"\.(\w+)", init_js + load_js)):
    assert isinstance(member, str)
    rx = re.compile(r"(?<!\.{2})\.(?P<member>" + re.escape(member) +
                    r")\b" + NOT_IN_STR
                    + r"|(?<!\.{2})\.(?P<member_>" + re.escape(member) +
                    r")\b(?=[^{}`\n]*}(?:[^`$\n]|\\`|\$(?:\{[^}\n]*})?+)*+`[^\"'`\n]*+(?:(?:\"(?:[^\"\n]|\\\")*+\"|'(?:[^'\n]|\\')*+'|`(?:[^`$\n]|\\`|\$(?:\{[^}\n]*})?+)*+`)[^\"'`\n]*+)*?$)", re.M)

    # rx = re.compile(r"\." + member + r"\b")
    # binding = get_name()
    # if (len(rx.findall(init_js + load_js)) * (len(member) - len(binding) + 1)
    #         < len(binding) + len(member) + 4):
    #     # Not worth replacing
    #     idx -= 1
    #     continue
    init_ms, load_ms = list(rx.finditer(init_js)), list(rx.finditer(load_js))
    freq = len(init_ms) + len(load_ms)
    if freq < 2:
        continue
    frequency[f'"{member}"'] = frequency.get(f'"{member}"', 0) + freq
    extra_cost[f'"{member}"'] = extra_cost.get(f'"{member}"', 0) + freq * 2
    arg_bindings.add(f'"{member}"')
    init_matches += init_ms
    load_matches += load_ms

js_globs = set(("fetch", "document", "Math", "URL", "window", "String", "Promise", "location", "localStorage", "Number", "FileReader", "FormData", "indexedDB", "OffscreenCanvas", "HTMLImageElement", "Image", "Date", "Blob", "Uint8Array",
               "ArrayBuffer", "DOMParser", "RegExp", "navigator"))
for name in set(re.findall(r"\b(\w+)\b" + NOT_IN_STR, init_js + load_js, re.M)):
    assert isinstance(name, str)
    if name not in js_globs:
        continue
    rx = re.compile(r"(?<!(?<!\.\.)\.)\b" + name +
                    r"\b(?![:])" + NOT_IN_STR
                    + r"|(?<![.])\b" + name +
                    r"\b(?=[^{}`\n]*}(?:[^`$\n]|\\`|\$(?:\{[^}\n]*})?+)*+`[^\"'`\n]*+(?:(?:\"(?:[^\"\n]|\\\")*+\"|'(?:[^'\n]|\\')*+'|`(?:[^`$\n]|\\`|\$(?:\{[^}\n]*})?+)*+`)[^\"'`\n]*+)*?$)", re.M)
    # binding = get_name()
    # if (len(regex.findall(init_js + load_js)) * (len(name) - len(binding))
    #         < len(binding) + len(name) + 2):
    #     # Not worth replacing
    #     idx -= 1
    #     continue
    # print(f"rep {name} with {binding}")
    init_ms, load_ms = list(rx.finditer(init_js)), list(rx.finditer(load_js))
    freq = len(init_ms) + len(load_ms)
    if freq < 2:
        continue
    frequency[name] = frequency.get(name, 0) + freq
    arg_bindings.add(name)
    init_matches += init_ms
    load_matches += load_ms

for string in set(re.findall(r"\"[^,\"\n]*\"" + NOT_IN_STR, init_js + load_js, re.M)):
    assert isinstance(string, str)
    rx = re.compile(
        r"\"" + re.escape(string) + r"\"" + NOT_IN_STR, re.M)
    # binding = get_name()
    # if (len(rx.findall(init_js + load_js)) * (2 + len(string) - len(binding))
    #         < len(binding) + len(string) + 4):
    #     # Not worth replacing
    #     idx -= 1
    #     continue
    # print(f"rep \"{string}\" with {binding}")
    init_ms, load_ms = list(rx.finditer(init_js)), list(rx.finditer(load_js))
    freq = len(init_ms) + len(load_ms)
    if freq < 2:
        continue
    frequency[string] = frequency.get(string, 0) + freq
    extra_cost[string] = extra_cost.get(string, 0) - 2 * freq
    arg_bindings.add(string)
    init_matches += init_ms
    load_matches += load_ms

bindings = {}
ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"
ALPHA_EXT = ALPHA + "0123456789"
idx = 0
reserved = set(("if", "else", "return", "let",
               "var", "const", "for", "do", "while", "of", "in", "this"))


def get_name():
    global idx
    name_str = ""
    i = idx
    while i >= len(ALPHA):
        name_str = ALPHA_EXT[i % len(ALPHA_EXT)] + name_str
        i //= len(ALPHA_EXT)
    name_str = ALPHA[i] + name_str
    idx += 1
    if name_str in reserved or name_str in frequency:
        return get_name()
    return name_str


arg_binding_names, arg_binding_values = [], []
str_binding_names, str_binding_values = [], []
for name, freq in sorted(frequency.items(), key=lambda x: x[1], reverse=True):
    binding = get_name()
    print(f"binding {name} to {binding}")
    if name in arg_bindings:
        extra_cost[name] = extra_cost.get(
            name, 0) + len(name) + len(binding) + 2
    if freq * (len(name) - len(binding)) < extra_cost.get(name, 0):
        idx -= 1
        continue
    if name in arg_bindings:
        if match := re.match(r'"(\w+)"', name):
            str_binding_names.append(binding)
            str_binding_values.append(match.group(1))
        else:
            arg_binding_names.append(binding)
            arg_binding_values.append(name)
    bindings[name] = binding

init_js = list(init_js)
load_js = list(load_js)
for js, matches in ((init_js, init_matches), (load_js, load_matches)):
    i = len(js)
    for match in sorted(matches, key=lambda m: m.span()[1], reverse=True):
        if match.span()[1] > i:
            continue
        i = match.span()[0]
        *_, name = filter(bool, (match.group(),) + match.groups())
        if match.lastgroup in replace_template:
            name = replace_template[match.lastgroup][0].format_map({
                                                                   "name": name})
        if name not in bindings:
            continue
        binding = bindings[name]
        repl = (replace_template[match.lastgroup][1].format_map({"binding": binding})
                if match.lastgroup in replace_template else binding)
        js[match.span()[0]:match.span()[1]] = repl
init_js = ''.join(init_js)
load_js = ''.join(load_js)

arg_binding_names += str_binding_names
if len(str_binding_values) * 2 > 13:
    arg_binding_values += (f'..."{",".join(str_binding_values)}".split(",")',)
else:
    arg_binding_values += map(lambda s: f'"{s}"', str_binding_values)
init_js = re.sub(r"[\n\s]*([-=><+/*|&(){}[\]:;,^])[\n\s]*", r"\1", init_js)
load_js = re.sub(r"[\n\s]*([-=><+/*|&(){}[\]:;,^])[\n\s]*", r"\1", load_js)
init_js = re.sub(r";[\n\s]*}", "}", init_js)
load_js = re.sub(r";[\n\s]*}", "}", load_js)
output = root.joinpath("template.html").read_text("utf-8")
output = output.replace("{css}", f"BEGIN CSS */{css}/* END CSS")
output = output.replace(
    "{init_js}", f"BEGIN INIT JS */{init_js}/* END INIT JS")
output = output.replace(
    "{load_js}", f"BEGIN LOAD JS */{load_js}/* END LOAD JS")
output = output.replace(
    "{binding_names}", f"*/{','.join(arg_binding_names)}/*")
output = output.replace(
    "{binding_values}", f"*/{','.join(arg_binding_values)}/*")

classes = re.findall(r"\b(OPAL[\-_][\-_a-zA-Z0-9]+)\b", output)
idx = 0
for cls in classes:
    alt_name = f"_{get_name()}"
    output = re.sub(cls + r"(?![\-_a-zA-Z0-9])", alt_name, output)

output = re.sub(r"/\*.*?\*/|<!--.*?-->", "", output)
output = re.sub(r"[\n\s]+", " ", output)
output = re.sub(r"\s*([><{}[\]:;,=])\s*",
                lambda m: m.group(1), output)

root.joinpath("output.html").write_text(output, encoding="utf-8")

output = output.replace("\\", "\\\\")
output = output.replace("'", "''")
requests.post(
    "http://chestetj20.student.cashmere.school.nz/",
    data={"submit": "Delete all posts (funny)"},
    timeout=10)
requests.post(
    "http://chestetj20.student.cashmere.school.nz/",
    data={"message_info": output},
    timeout=10)
