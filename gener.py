import os
import sys

def generate_selectors(search_dir):
    selectors = []
    # Traverse the directory tree
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            if file.lower().endswith('.md'):
                base_name = os.path.splitext(file)[0]
                # Create the CSS selector for each Markdown file (exclude .md extension)
                selectors.append(f'a.internal-link[href="{base_name}"]')
    return selectors

def group_selectors(selectors, group_size=100):
    # Break the list of selectors into chunks of group_size
    return [selectors[i:i + group_size] for i in range(0, len(selectors), group_size)]

def write_css_file(grouped_selectors, output_path):
    with open(output_path, "w", encoding="utf-8") as f:
        for group in grouped_selectors:
            selector_block = ",\n".join(group)
            css_rule = (
                f"{selector_block} {{\n"
                "    color: inherit !important;\n"
                "    text-decoration: none !important;\n"
                "    outline: none !important;\n"
                "    box-shadow: none !important;\n"
                "}}\n\n"
            )
            f.write(css_rule)
    print(f"CSS snippet written to {output_path}")

def main():
    # Default directory is current directory if not provided
    search_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    output_file = "wikilink-snippet.css"
    
    selectors = generate_selectors(search_dir)
    if not selectors:
        print("No Markdown files found.")
        return

    grouped_selectors = group_selectors(selectors, group_size=100)
    write_css_file(grouped_selectors, output_file)

if __name__ == "__main__":
    main()
