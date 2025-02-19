# This file converts the typical svg string, copied to clipboard in xml format, 
# to a terminal output for copy/pasting into bujo.css.

# It allows the user to easily load new symbols into the preexisting code.

import urllib.parse

def svg_to_webkit_mask(svg_str):
    encoded_svg = urllib.parse.quote(svg_str)
    
    # Return the full CSS `-webkit-mask-image` declaration used in css snippet
    return f"-webkit-mask-image: url('data:image/svg+xml,{encoded_svg}');"

svg_content = """
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="fill: rgba(0, 0, 0, 1);transform: ;msFilter:;"><path d="M10.061 19.061 17.121 12l-7.06-7.061-2.122 2.122L12.879 12l-4.94 4.939z"></path></svg>
"""

css_declaration = svg_to_webkit_mask(svg_content)

print(css_declaration)
