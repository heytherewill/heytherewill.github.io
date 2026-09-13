(() => {
  const aboutText = `William Barbosa

Brazilian, living in Italy.
Android Engineer @ Spotify.`;

  const helpText = `Available commands:
  whoami             learn a little about me
  neofetch           show this terminal's system card
  ls [dir]           list files and directories
  tree               display the current directory tree
  cd <dir>           change directory (use .. for parent)
  cat <file>         read a text file
  find <term>        search the filesystem
  open <file.url>    open a link in a new tab
  pwd                print working directory
  theme <option>     change the colour theme
  clear, cls         clear the terminal
  help               show this message`;

  const tree = {
    type: "dir",
    children: {
      "about.txt": {
        type: "file",
        content: aboutText,
      },
      contact: {
        type: "dir",
        children: {
          "email.url": {
            type: "link",
            url: "mailto:heytherewill@gmail.com",
            label: "heytherewill@gmail.com",
          },
          "linkedin.url": {
            type: "link",
            url: "https://www.linkedin.com/in/heytherewill/",
            label: "linkedin.com/in/heytherewill",
          },
          "github.url": {
            type: "link",
            url: "https://github.com/heytherewill/",
            label: "My GitHub",
          },
        },
      },
      projects: {
        type: "dir",
        children: {
          "coffee.url": {
            type: "link",
            url: "https://coffee.heytherewill.com/",
            label: "My Coffee Recipes",
          },
          "art.url": {
            type: "link",
            url: "https://art.heytherewill.com/",
            label: "Some drawings",
          },
          "nemesis.url": {
            type: "link",
            url: "https://play.google.com/store/apps/details?id=com.heytherewill.archenemy",
            label: "Nemesis - Magic: The Gathering Archenemy client",
          },
          "code.url": {
            type: "link",
            url: "https://code.heytherewill.com/",
            label: "Writing about code",
          },
          "jam-games.url": {
            type: "link",
            url: "https://github.com/halfnibblegames",
            label: "My game jam projects",
          },
          "poshfiles.url": {
            type: "link",
            url: "https://github.com/heytherewill/poshfiles",
            label: "My powershell files",
          },
        },
      },
      "README.md": {
        type: "file",
        content: helpText,
      },
    },
  };

  const history = document.querySelector("#history");
  const form = document.querySelector("#terminal-form");
  const input = document.querySelector("#command-input");
  const prompt = document.querySelector("#prompt");
  const terminal = document.querySelector("#terminal");
  const autocomplete = document.querySelector("#autocomplete");
  const body = document.body;

  let cwd = [];
  let commandHistory = [];
  let historyIndex = -1;
  let draftCommand = "";

  const themeStorageKey = "will-terminal-theme";
  const commands = [
    "whoami",
    "neofetch",
    "ls",
    "tree",
    "cd",
    "cat",
    "find",
    "open",
    "pwd",
    "theme",
    "clear",
    "cls",
    "help",
  ];
  const mobileViewport = window.matchMedia("(max-width: 560px)");
  const platform = (
    navigator.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent
  ).toLowerCase();

  const osGlyph = platform.includes("win")
    ? ""
    : platform.includes("android")
      ? ""
      : platform.includes("linux")
        ? ""
        : "";

  const osName = platform.includes("win")
    ? "Windows"
    : platform.includes("android")
      ? "Android"
      : platform.includes("linux")
        ? "Linux"
        : "macOS";

  function escape(value) {
    return value.replace(/[&<>"']/g, (character) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[character];
    });
  }

  function cwdNode() {
    return cwd.reduce((node, part) => node.children[part], tree);
  }

  function pathLabel() {
    return cwd.length ? `~/${cwd.join("/")}` : "~";
  }

  function promptMarkup() {
    return `<span class="prompt-decoration">┌ ${osGlyph}</span> <span class="prompt-path">${escape(pathLabel())}</span>`;
  }

  function updatePrompt() {
    prompt.innerHTML = promptMarkup();
  }

  function print(html, className = "") {
    const line = document.createElement("div");
    line.className = `line output ${className}`;
    line.innerHTML = html;
    history.append(line);
  }

  function printCommand(command) {
    const line = document.createElement("div");
    line.className = "line command";
    line.innerHTML =
      `<span class="prompt">${promptMarkup()}</span>` +
      `<div><span class="prompt-decoration command-prefix">└ $</span>` +
      `<span class="command-text">${escape(command)}</span></div>`;
    history.append(line);
  }

  function scrollDown() {
    const scroll = () => {
      terminal.scrollTop = terminal.scrollHeight;
    };

    scroll();
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
  }

  function updateAutocomplete() {
    const query = input.value.trimStart().toLowerCase();
    const isCommand = query && !query.includes(" ");
    const matches = isCommand
      ? commands.filter((command) => command.startsWith(query)).slice(0, 6)
      : [];

    autocomplete.hidden = !mobileViewport.matches || !matches.length;
    input.setAttribute("aria-expanded", String(!autocomplete.hidden));

    if (!autocomplete.hidden) {
      autocomplete.innerHTML = matches
        .map(
          (command) =>
            `<button class="autocomplete-option" type="button" role="option" data-suggestion="${command}">${command}</button>`,
        )
        .join("");
    } else {
      autocomplete.innerHTML = "";
    }
  }

  function currentTheme() {
    return body.classList.contains("theme-light") ? "light" : "dark";
  }

  function setTheme(theme) {
    body.classList.toggle("theme-light", theme === "light");
    localStorage.setItem(themeStorageKey, theme);
  }

  function themeHelp() {
    return `Usage: <span class="accent">theme</span> &lt;option&gt;

  <span class="accent">theme dark</span>     use the dark theme
  <span class="accent">theme light</span>    use the light theme
  <span class="accent">theme toggle</span>   switch between themes`;
  }

  function resolve(raw) {
    if (!raw || raw === ".") {
      return { node: cwdNode(), parts: [...cwd] };
    }

    const fromRoot =
      raw === "~" || raw.startsWith("/") || raw.startsWith("~/");
    let node = fromRoot ? tree : cwdNode();
    let parts = fromRoot ? [] : [...cwd];

    for (const part of raw.replace(/^~\/?/, "").split("/")) {
      if (!part || part === ".") {
        continue;
      }

      if (part === "..") {
        if (parts.length) {
          parts.pop();
        }

        node = tree;
        for (const item of parts) {
          node = node.children[item];
        }
        continue;
      }

      if (!node.children || !node.children[part]) {
        return null;
      }

      node = node.children[part];
      parts.push(part);
    }

    return { node, parts };
  }

  function help() {
    return escape(tree.children["README.md"].content);
  }

  function renderDirectory(directory) {
    return Object.entries(directory.children)
      .map(([file, item]) => {
        if (item.type === "link") {
          return `<a class="file-link executable" data-link="${escape(file)}">${escape(file)}</a>`;
        }

        const className = item.type === "dir" ? "directory" : "file";
        const suffix = item.type === "dir" ? "/" : "";
        return `<span class="${className}">${escape(file + suffix)}</span>`;
      })
      .join("    ");
  }

  function renderTree(directory) {
    const lines = ['<span class="directory">.</span>'];

    function visit(node, prefix = "", relativePath = "") {
      const entries = Object.entries(node.children);

      entries.forEach(([name, item], index) => {
        const isLast = index === entries.length - 1;
        const branch = isLast ? "└── " : "├── ";
        const className =
          item.type === "dir"
            ? "directory"
            : item.type === "link"
              ? "executable"
              : "file";
        const suffix = item.type === "dir" ? "/" : "";
        const itemPath = relativePath ? `${relativePath}/${name}` : name;
        const renderedName =
          item.type === "link"
            ? `<a class="file-link ${className}" data-link="${escape(itemPath)}">${escape(name)}</a>`
            : `<span class="${className}">${escape(name + suffix)}</span>`;

        lines.push(`${prefix}${branch}${renderedName}`);

        if (item.type === "dir") {
          visit(item, `${prefix}${isLast ? "    " : "│   "}`, itemPath);
        }
      });
    }

    visit(directory);
    return lines.join("\n");
  }

  function whoami() {
    return escape(tree.children["about.txt"].content);
  }

  function neofetch() {
    return `<span class="accent">will@heytherewill</span>
-------------------
<span class="directory">OS</span>       ${osName}
<span class="directory">Shell</span>    pwsh
<span class="directory">Theme</span>    Catppuccin ${currentTheme() === "light" ? "Latte" : "Macchiato"}
<span class="directory">Location</span> Italy
<span class="directory">Origin</span>   Brazil`;
  }

  function findMatches(term, node = tree, basePath = "~") {
    const matches = [];
    const query = term.toLowerCase();

    for (const [name, item] of Object.entries(node.children)) {
      const path = `${basePath}/${name}`;
      const searchableText = [
        name,
        item.label,
        item.url,
        item.content,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (searchableText.includes(query)) {
        matches.push({ path, item });
      }

      if (item.type === "dir") {
        matches.push(...findMatches(term, item, path));
      }
    }

    return matches;
  }

  function renderFindResults(matches) {
    return matches
      .map(({ path, item }) => {
        const className =
          item.type === "dir"
            ? "directory"
            : item.type === "link"
              ? "executable"
              : "file";
        const suffix = item.type === "dir" ? "/" : "";
        return `<span class="${className}">${escape(path + suffix)}</span>`;
      })
      .join("\n");
  }

  function execute(raw) {
    const command = raw.trim();
    if (!command) {
      return;
    }

    printCommand(command);
    commandHistory.push(command);
    historyIndex = commandHistory.length;

    const [name, ...args] = command.split(/\s+/);
    const arg = args.join(" ");

    if (name === "help") {
      print(help());
    } else if (name === "whoami") {
      print(whoami());
    } else if (name === "neofetch") {
      print(neofetch());
    } else if (name === "theme") {
      if (arg === "-h" || arg === "--help") {
        print(themeHelp());
      } else if (arg === "dark" || arg === "light") {
        setTheme(arg);
        print(`Theme set to <span class="accent">${arg}</span>.`);
      } else if (arg === "toggle") {
        const theme = currentTheme() === "dark" ? "light" : "dark";
        setTheme(theme);
        print(`Theme set to <span class="accent">${theme}</span>.`);
      } else {
        print("theme: expected dark, light, toggle, or -h", "error");
      }
    } else if (name === "pwd") {
      print(`<span class="muted">${pathLabel()}</span>`);
    } else if (name === "find") {
      if (!arg) {
        print("find: missing search term", "error");
      } else {
        const matches = findMatches(arg);
        if (matches.length) {
          print(renderFindResults(matches));
        } else {
          print(`find: no matches for ${escape(arg)}`, "muted");
        }
      }
    } else if (name === "ls") {
      const target = arg ? resolve(arg) : { node: cwdNode() };

      if (!target) {
        print(`ls: ${escape(arg)}: No such file or directory`, "error");
      } else if (target.node.type !== "dir") {
        print(escape(arg), "file");
      } else {
        print(renderDirectory(target.node));
      }
    } else if (name === "tree") {
      print(renderTree(cwdNode()), "tree-output");
    } else if (name === "cd") {
      const target = resolve(arg || "~");

      if (!target) {
        print(`cd: no such file or directory: ${escape(arg)}`, "error");
      } else if (target.node.type !== "dir") {
        print(`cd: not a directory: ${escape(arg)}`, "error");
      } else {
        cwd = target.parts;
        updatePrompt();
      }
    } else if (name === "cat") {
      if (!arg) {
        print("cat: missing operand", "error");
      } else {
        const target = resolve(arg);

        if (!target) {
          print(`cat: ${escape(arg)}: No such file or directory`, "error");
        } else if (target.node.type === "dir") {
          print(`cat: ${escape(arg)}: Is a directory`, "error");
        } else if (target.node.type === "link") {
          print(`${escape(target.node.label)}
<span class="muted">${escape(target.node.url)}
(use open ${escape(arg)} to visit)</span>`);
        } else {
          print(escape(target.node.content));
        }
      }
    } else if (name === "open") {
      const target = resolve(arg);

      if (!arg) {
        print("open: missing file operand", "error");
      } else if (!target) {
        print(`open: ${escape(arg)}: No such file or directory`, "error");
      } else if (target.node.type !== "link") {
        print(`open: ${escape(arg)}: not a link`, "error");
      } else {
        window.open(target.node.url, "_blank", "noopener");
        print(`Opening <span class="executable">${escape(target.node.label)}</span>…`);
      }
    } else if (name === "clear" || name === "cls") {
      history.innerHTML = "";
    } else if (name === "sudo") {
      print("Nice try.", "muted");
    } else {
      print(
        `${escape(name)} : The term '${escape(name)}' is not recognized as the name of a cmdlet, function, script file, or operable program.`,
        "error",
      );
    }

    if (name !== "clear" && name !== "cls") {
      history.lastElementChild?.classList.add("command-complete");
    }

    scrollDown();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    draftCommand = "";
    updateAutocomplete();
    execute(value);
  });

  input.addEventListener("input", () => {
    if (historyIndex === commandHistory.length) {
      draftCommand = input.value;
    }

    updateAutocomplete();
  });

  autocomplete.addEventListener("click", (event) => {
    const option = event.target.closest("[data-suggestion]");
    if (!option) {
      return;
    }

    input.value = `${option.dataset.suggestion} `;
    updateAutocomplete();
    input.focus();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (commandHistory.length) {
        if (historyIndex === commandHistory.length) {
          draftCommand = input.value;
        }

        historyIndex = Math.max(0, historyIndex - 1);
        input.value = commandHistory[historyIndex];
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();

      if (commandHistory.length) {
        historyIndex = Math.min(commandHistory.length, historyIndex + 1);
        input.value =
          historyIndex === commandHistory.length
            ? draftCommand
            : commandHistory[historyIndex];
      }
    } else if (event.key === "Tab") {
      event.preventDefault();

      const bits = input.value.split(/\s+/);
      const partial = bits.at(-1);
      const slashIndex = partial.lastIndexOf("/");
      const directoryPart =
        slashIndex < 0 ? "" : partial.slice(0, slashIndex + 1);
      const namePart =
        slashIndex < 0 ? partial : partial.slice(slashIndex + 1);
      const targetDirectory = directoryPart
        ? resolve(directoryPart)?.node
        : cwdNode();
      const candidates =
        targetDirectory?.type === "dir"
          ? Object.keys(targetDirectory.children).filter((item) =>
              item.startsWith(namePart),
            )
          : [];

      if (candidates.length === 1) {
        const item = candidates[0];
        const suffix = targetDirectory.children[item].type === "dir" ? "/" : "";
        bits[bits.length - 1] = directoryPart + item + suffix;
        input.value = bits.join(" ");
      } else if (candidates.length > 1) {
        const matches = candidates
          .map((item) => {
            const suffix =
              targetDirectory.children[item].type === "dir" ? "/" : "";
            return escape(directoryPart + item + suffix);
          })
          .join("    ");

        print(matches, "muted");
      }

      updateAutocomplete();
      scrollDown();
    }
  });

  history.addEventListener("click", (event) => {
    const link = event.target.closest("[data-link]");
    if (!link) {
      return;
    }

    input.value = `open ${link.dataset.link}`;
    form.requestSubmit();
  });

  terminal.addEventListener("click", () => input.focus());

  mobileViewport.addEventListener("change", updateAutocomplete);

  const savedTheme = localStorage.getItem(themeStorageKey);
  setTheme(savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark");

  updatePrompt();
  execute("tree");
  input.focus();
})();
