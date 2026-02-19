# Mark It Down

**Mark It Down** is a minimalist, ultra-lightweight Markdown reader and editor built with React and **Tauri**.

It is designed to keep you away from clutter, allowing you to focus solely on your text and thoughts. It's ideal for blogging, reading and writing GDDs, or generating reports.

## Features
- ✨ Minimalist and distraction-free design
- 🚀 Extremely lightweight (~12MB app size)
- 🌓 Dark/Light modes with accent color customization
- 📖 Optimized Reading mode
- 📝 Powerful Writing mode with sync scrolling
- 🔗 File associations (open .md files directly from your OS)

## Tech Stack
- **Frontend:** React + Vite + TailwindCSS
- **Desktop Framework:** Tauri (Rust backend)
- **Icons:** Lucide React
- **Markdown Engine:** Marked

---

## Build it yourself

This project requires **Node.js** and **Rust** to be installed on your system.

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for your current platform (macOS/Windows/Linux)
./build.sh
```

*Note: The application size has been reduced by over 90% by switching from Electron to Tauri.*
